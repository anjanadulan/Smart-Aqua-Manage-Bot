"use strict";

const STORAGE_KEY = "aqua-sentinel-config-v1";
const MAX_EVENTS = 30;
const RECONNECT_MAX_MS = 15000;

const defaultConfig = {
    wsUrl: defaultWebSocketUrl(),
    cameraMode: "mjpeg",
    cameraUrl: ""
};

const state = {
    mode: "connecting",
    socket: null,
    reconnectAttempt: 0,
    reconnectTimer: null,
    simulatorTimer: null,
    lastTelemetryAt: 0,
    pendingAction: null,
    alertAcknowledged: false,
    config: loadConfig(),
    telemetry: {
        waterLevelPercent: 95,
        waterClarityPercent: 88,
        waterLow: false,
        waterDirty: false,
        filterOn: false,
        uvOn: false,
        uvMode: "auto",
        nextFeedSeconds: 21599,
        uvWindow: "18:00-06:00",
        irObstacle: false,
        cleaning: false,
        cleaningSupported: false,
        clockValid: false
    }
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    bindEvents();
    populateSettings();
    configureCamera();
    renderAll();
    updateClock();
    window.setInterval(updateClock, 1000);
    window.setInterval(updateTelemetryAge, 1000);
    addEvent("SYSTEM", "info", "Dashboard started. Waiting for the ESP32 controller.");
    connectController();
});

function defaultWebSocketUrl() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.hostname}:82`;
    }
    return "ws://192.168.4.1:82";
}

function loadConfig() {
    try {
        return { ...defaultConfig, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
        return { ...defaultConfig };
    }
}

function cacheElements() {
    const ids = [
        "connection-state", "connection-label", "local-clock", "open-settings",
        "safety-banner", "safety-kicker", "safety-message", "acknowledge-alert",
        "water-level-value", "water-level-meter", "water-level-status",
        "clarity-value", "clarity-meter", "clarity-status", "feed-countdown",
        "feed-status", "uv-window", "uv-schedule-status", "camera-health",
        "camera-frame", "camera-mjpeg", "camera-webrtc", "camera-empty",
        "camera-mode-label", "telemetry-age", "configure-camera", "water-fill",
        "water-dirty-layer", "visual-caption", "filter-control", "filter-switch",
        "filter-note", "uv-mode", "uv-note", "feed-now", "feeder-note",
        "clean-now", "cleaner-note", "automation-mode", "event-list", "event-empty",
        "clear-events", "settings-dialog", "settings-form", "ws-url", "camera-mode",
        "camera-url", "enable-notifications", "start-simulator", "save-settings",
        "confirm-dialog", "confirm-title", "confirm-message", "confirm-action"
    ];
    ids.forEach((id) => { elements[id] = document.getElementById(id); });
}

function bindEvents() {
    elements["open-settings"].addEventListener("click", openSettings);
    elements["configure-camera"].addEventListener("click", openSettings);
    elements["settings-form"].addEventListener("submit", handleSettingsSubmit);
    elements["start-simulator"].addEventListener("click", startSimulator);
    elements["enable-notifications"].addEventListener("click", requestNotifications);
    elements["clear-events"].addEventListener("click", clearEvents);
    elements["acknowledge-alert"].addEventListener("click", acknowledgeAlert);

    elements["filter-switch"].addEventListener("change", (event) => {
        sendCommand("set_filter", { value: event.target.checked });
    });
    elements["uv-mode"].addEventListener("change", (event) => {
        sendCommand("set_uv_mode", { value: event.target.value });
    });
    elements["feed-now"].addEventListener("click", () => confirmHardwareAction(
        "Feed fish now?",
        "The feeder servo will dispense one portion and bypass the scheduled IR check.",
        "feed_now"
    ));
    elements["clean-now"].addEventListener("click", () => confirmHardwareAction(
        "Run glass cleaner?",
        "The two-axis cleaning gantry will begin a full sweep.",
        "clean_now"
    ));
    elements["confirm-dialog"].addEventListener("close", () => {
        if (elements["confirm-dialog"].returnValue === "confirm" && state.pendingAction) {
            sendCommand(state.pendingAction);
        }
        state.pendingAction = null;
    });

    window.addEventListener("online", () => {
        if (state.mode === "offline") connectController();
    });
    window.addEventListener("beforeunload", closeConnections);
}

function openSettings() {
    populateSettings();
    elements["settings-dialog"].showModal();
}

function populateSettings() {
    elements["ws-url"].value = state.config.wsUrl;
    elements["camera-mode"].value = state.config.cameraMode;
    elements["camera-url"].value = state.config.cameraUrl;
    updateNotificationButton();
}

function handleSettingsSubmit(event) {
    event.preventDefault();
    if (event.submitter && event.submitter.value === "cancel") {
        elements["settings-dialog"].close();
        return;
    }

    state.config = {
        wsUrl: elements["ws-url"].value.trim() || defaultWebSocketUrl(),
        cameraMode: elements["camera-mode"].value,
        cameraUrl: elements["camera-url"].value.trim()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
    elements["settings-dialog"].close();
    configureCamera();
    stopSimulator();
    closeSocket();
    connectController();
}

function connectController() {
    if (!state.config.wsUrl) {
        setConnectionState("offline", "Not configured");
        return;
    }

    clearTimeout(state.reconnectTimer);
    setConnectionState("connecting", "Connecting");

    try {
        const socket = new WebSocket(state.config.wsUrl);
        state.socket = socket;

        socket.addEventListener("open", () => {
            state.reconnectAttempt = 0;
            state.lastTelemetryAt = Date.now();
            setConnectionState("live", "Controller live");
            addEvent("NETWORK", "normal", `Connected to ${safeHost(state.config.wsUrl)}.`);
            sendRaw({ type: "sync_clock", epoch: Math.floor(Date.now() / 1000), timezoneOffsetMinutes: -new Date().getTimezoneOffset() });
            sendRaw({ type: "get_state" });
        });

        socket.addEventListener("message", (event) => handleControllerMessage(event.data));
        socket.addEventListener("error", () => {
            if (state.mode !== "offline") addEvent("NETWORK", "warning", "Controller connection error.");
        });
        socket.addEventListener("close", () => {
            if (state.socket !== socket || state.mode === "simulator") return;
            state.socket = null;
            setConnectionState("offline", "Controller offline");
            scheduleReconnect();
        });
    } catch (error) {
        setConnectionState("offline", "Invalid address");
        addEvent("NETWORK", "critical", error.message || "Invalid WebSocket URL.");
    }
}

function scheduleReconnect() {
    const delay = Math.min(1000 * (2 ** state.reconnectAttempt), RECONNECT_MAX_MS);
    state.reconnectAttempt += 1;
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = window.setTimeout(connectController, delay);
}

function handleControllerMessage(raw) {
    let message;
    try {
        message = JSON.parse(raw);
    } catch {
        addEvent("PROTOCOL", "warning", "Ignored a non-JSON controller message.");
        return;
    }

    if (message.type === "telemetry" || message.type === "state") {
        applyTelemetry(message);
        return;
    }
    if (message.type === "event") {
        addEvent(message.category || "CONTROLLER", normalizeLevel(message.level), message.message || "Controller event received.");
        if (message.level === "critical") notifyUser("Aqua Sentinel alert", message.message || "Critical aquarium alert");
        return;
    }
    if (message.type === "ack") {
        addEvent("COMMAND", message.ok === false ? "warning" : "normal", message.message || `${message.command || "Command"} acknowledged.`);
        return;
    }
    if (message.type === "hello") {
        addEvent("DEVICE", "info", `Controller ${message.device || "ESP32"} is ready.`);
    }
}

function applyTelemetry(message) {
    const previousLow = state.telemetry.waterLow;
    const previousDirty = state.telemetry.waterDirty;
    const next = { ...state.telemetry };
    const keys = Object.keys(next);
    keys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(message, key)) next[key] = message[key];
    });
    next.waterLevelPercent = clamp(Number(next.waterLevelPercent), 0, 100);
    next.waterClarityPercent = clamp(Number(next.waterClarityPercent), 0, 100);
    next.nextFeedSeconds = Math.max(0, Number(next.nextFeedSeconds) || 0);
    state.telemetry = next;
    state.lastTelemetryAt = Date.now();
    state.alertAcknowledged = false;
    if (state.mode !== "simulator" && state.socket?.readyState === WebSocket.OPEN) {
        setConnectionState("live", "Controller live");
    }

    if (!previousLow && next.waterLow) {
        addEvent("SAFETY", "critical", "Low water detected. Filtration relay forced off.");
        notifyUser("Critical water level", "Filtration has been shut down. Check the aquarium immediately.");
    } else if (previousLow && !next.waterLow) {
        addEvent("SAFETY", "normal", "Water level restored. Filtration remains off until manually enabled.");
    }
    if (!previousDirty && next.waterDirty) {
        addEvent("WATER QUALITY", "warning", "Water clarity is below the configured clean threshold.");
        notifyUser("Water quality warning", "Water is not clean. Inspect the filter and consider a water change.");
    }
    renderAll();
}

function sendCommand(command, payload = {}) {
    if (state.mode === "simulator") {
        applySimulatorCommand(command, payload);
        return;
    }
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    if (!sendRaw({ type: "command", command, requestId, ...payload })) {
        addEvent("COMMAND", "warning", "Command not sent because the controller is offline.");
        renderAll();
    }
}

function sendRaw(message) {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return false;
    state.socket.send(JSON.stringify(message));
    return true;
}

function confirmHardwareAction(title, message, command) {
    state.pendingAction = command;
    elements["confirm-title"].textContent = title;
    elements["confirm-message"].textContent = message;
    elements["confirm-dialog"].showModal();
}

function setConnectionState(mode, label) {
    state.mode = mode;
    elements["connection-state"].dataset.state = mode;
    elements["connection-label"].textContent = label;
    elements["automation-mode"].textContent = mode === "simulator" ? "Browser simulator" : "Local controller";
    renderControls();
}

function renderAll() {
    renderMetrics();
    renderSafety();
    renderControls();
    renderAquarium();
    updateTelemetryAge();
}

function renderMetrics() {
    const t = state.telemetry;
    setText("water-level-value", Math.round(t.waterLevelPercent));
    setMeter("water-level-meter", t.waterLevelPercent, t.waterLow ? "danger" : "accent");
    setText("water-level-status", t.waterLow ? "Critical low" : t.waterLevelPercent < 60 ? "Low" : "Normal");

    setText("clarity-value", Math.round(t.waterClarityPercent));
    setMeter("clarity-meter", t.waterClarityPercent, t.waterDirty ? "warning" : "accent");
    setText("clarity-status", t.waterDirty ? "Needs attention" : t.waterClarityPercent < 75 ? "Watch" : "Clean");
    setText("feed-countdown", formatDuration(t.nextFeedSeconds));
    setText("feed-status", t.irObstacle ? "Feed may be skipped: food detected" : "Automatic every 6 hours");
    setText("uv-window", t.uvWindow || "18:00-06:00");
    setText("uv-schedule-status", t.clockValid ? (t.uvOn ? "UV currently on" : "UV currently off") : "Clock sync required for auto mode");
}

function renderSafety() {
    const t = state.telemetry;
    let level = "normal";
    let kicker = "SYSTEM NORMAL";
    let message = "Water level and control loops are within limits.";

    if (t.waterLow) {
        level = "critical";
        kicker = "CRITICAL LOW WATER";
        message = "Filtration is shut down. Refill the tank and inspect for leaks.";
    } else if (t.waterDirty) {
        level = "warning";
        kicker = "WATER QUALITY ALERT";
        message = "Water clarity is below the clean threshold. Inspect filtration and water condition.";
    } else if (state.mode === "offline") {
        level = "warning";
        kicker = "CONTROLLER OFFLINE";
        message = "The dashboard has no live telemetry. Local ESP32 automation should continue independently.";
    }

    elements["safety-banner"].dataset.level = level;
    setText("safety-kicker", kicker);
    setText("safety-message", message);
    elements["acknowledge-alert"].hidden = level === "normal" || state.alertAcknowledged;
}

function renderControls() {
    const t = state.telemetry;
    const enabled = state.mode === "live" || state.mode === "simulator";
    elements["filter-switch"].checked = Boolean(t.filterOn);
    elements["filter-switch"].disabled = !enabled || t.waterLow;
    elements["filter-control"].dataset.alert = String(Boolean(t.waterLow));
    setText("filter-note", t.waterLow ? "Locked off by low-water safety" : t.filterOn ? "Relay energized" : "Relay off");

    elements["uv-mode"].value = ["auto", "on", "off"].includes(t.uvMode) ? t.uvMode : "auto";
    elements["uv-mode"].disabled = !enabled || t.waterLow;
    setText("uv-note", t.waterLow ? "Safety lockout active" : `${t.uvOn ? "Light on" : "Light off"}, ${String(t.uvMode).toUpperCase()} mode`);
    elements["feed-now"].disabled = !enabled;
    elements["clean-now"].disabled = !enabled || t.cleaning || !t.cleaningSupported;
    setText("cleaner-note", t.cleaning ? "Cleaning cycle in progress" : t.cleaningSupported ? "CNC gantry ready" : "Needs limit switches and pin setup");
}

function renderAquarium() {
    const t = state.telemetry;
    elements["water-fill"].style.height = `${t.waterLevelPercent}%`;
    elements["water-dirty-layer"].style.opacity = String(clamp((100 - t.waterClarityPercent) / 85, 0.05, 0.75));
    setText("visual-caption", `Water level ${Math.round(t.waterLevelPercent)}%, clarity ${Math.round(t.waterClarityPercent)}%`);
    elements["camera-frame"].dataset.filter = t.filterOn ? "on" : "off";
}

function configureCamera() {
    const mode = state.config.cameraMode;
    const url = state.config.cameraUrl;
    elements["camera-mjpeg"].hidden = true;
    elements["camera-webrtc"].hidden = true;
    elements["camera-empty"].hidden = Boolean(url);
    elements["camera-health"].dataset.state = url ? "connecting" : "idle";
    setText("camera-health", url ? "Connecting" : "Not configured");
    setText("camera-mode-label", mode === "webrtc" ? "WEBRTC GATEWAY" : "LOCAL MJPEG");

    if (!url) return;
    if (mode === "webrtc") {
        elements["camera-webrtc"].src = url;
        elements["camera-webrtc"].hidden = false;
        elements["camera-health"].dataset.state = "live";
        setText("camera-health", "Gateway loaded");
    } else {
        elements["camera-mjpeg"].src = url;
        elements["camera-mjpeg"].hidden = false;
        elements["camera-mjpeg"].onload = () => {
            elements["camera-health"].dataset.state = "live";
            setText("camera-health", "Stream live");
        };
        elements["camera-mjpeg"].onerror = () => {
            elements["camera-health"].dataset.state = "error";
            setText("camera-health", "Stream unavailable");
        };
    }
}

function startSimulator() {
    closeSocket();
    clearTimeout(state.reconnectTimer);
    state.lastTelemetryAt = Date.now();
    state.telemetry.cleaningSupported = true;
    setConnectionState("simulator", "Simulator mode");
    elements["settings-dialog"].close();
    addEvent("SIMULATOR", "info", "Simulator enabled. Hardware commands remain local to this browser.");
    clearInterval(state.simulatorTimer);
    state.simulatorTimer = window.setInterval(() => {
        state.telemetry.nextFeedSeconds = Math.max(0, state.telemetry.nextFeedSeconds - 1);
        if (state.telemetry.nextFeedSeconds === 0) {
            state.telemetry.nextFeedSeconds = 21600;
            addEvent("FEEDER", "normal", "Simulated scheduled feed completed.");
        }
        state.telemetry.waterClarityPercent = clamp(state.telemetry.waterClarityPercent - 0.008, 0, 100);
        state.telemetry.waterDirty = state.telemetry.waterClarityPercent < 60;
        state.lastTelemetryAt = Date.now();
        renderAll();
    }, 1000);
    renderAll();
}

function stopSimulator() {
    clearInterval(state.simulatorTimer);
    state.simulatorTimer = null;
}

function applySimulatorCommand(command, payload) {
    if (command === "set_filter") {
        if (state.telemetry.waterLow && payload.value) {
            addEvent("SAFETY", "critical", "Filtration cannot start while water is low.");
        } else {
            state.telemetry.filterOn = Boolean(payload.value);
            addEvent("FILTER", "normal", `Filtration relay ${state.telemetry.filterOn ? "enabled" : "disabled"}.`);
        }
    } else if (command === "set_uv_mode") {
        state.telemetry.uvMode = payload.value;
        state.telemetry.uvOn = payload.value === "on" || (payload.value === "auto" && isNightTime());
        addEvent("UV", "normal", `UV mode set to ${String(payload.value).toUpperCase()}.`);
    } else if (command === "feed_now") {
        state.telemetry.nextFeedSeconds = 21600;
        addEvent("FEEDER", "normal", "Manual feed cycle completed.");
    } else if (command === "clean_now") {
        state.telemetry.cleaning = true;
        addEvent("CLEANER", "warning", "Simulated glass cleaning cycle started.");
        window.setTimeout(() => {
            state.telemetry.cleaning = false;
            addEvent("CLEANER", "normal", "Simulated glass cleaning cycle completed.");
            renderAll();
        }, 5000);
    }
    state.lastTelemetryAt = Date.now();
    renderAll();
}

function addEvent(category, level, message) {
    const card = document.createElement("article");
    card.className = "event-card";
    card.dataset.level = normalizeLevel(level);

    const head = document.createElement("div");
    head.className = "event-card-head";
    const categoryElement = document.createElement("span");
    categoryElement.className = "event-category";
    categoryElement.textContent = String(category).toUpperCase();
    const timeElement = document.createElement("time");
    timeElement.className = "event-time";
    timeElement.textContent = new Date().toLocaleTimeString([], { hour12: false });
    head.append(categoryElement, timeElement);

    const messageElement = document.createElement("p");
    messageElement.className = "event-message";
    messageElement.textContent = message;
    card.append(head, messageElement);
    elements["event-list"].prepend(card);

    while (elements["event-list"].children.length > MAX_EVENTS) {
        elements["event-list"].lastElementChild.remove();
    }
    elements["event-empty"].hidden = true;
}

function clearEvents() {
    elements["event-list"].replaceChildren();
    elements["event-empty"].hidden = false;
}

function acknowledgeAlert() {
    state.alertAcknowledged = true;
    elements["acknowledge-alert"].hidden = true;
    addEvent("OPERATOR", "info", "Current dashboard alert acknowledged.");
}

async function requestNotifications() {
    if (!("Notification" in window)) {
        addEvent("NOTIFICATIONS", "warning", "This browser does not support desktop notifications.");
        return;
    }
    const permission = await Notification.requestPermission();
    updateNotificationButton();
    addEvent("NOTIFICATIONS", permission === "granted" ? "normal" : "warning", permission === "granted" ? "Browser safety alerts enabled." : "Browser notification permission was not granted.");
}

function notifyUser(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, tag: "aqua-sentinel-alert" });
    }
}

function updateNotificationButton() {
    if (!("Notification" in window)) {
        elements["enable-notifications"].textContent = "ALERTS UNSUPPORTED";
        elements["enable-notifications"].disabled = true;
        return;
    }
    elements["enable-notifications"].textContent = Notification.permission === "granted" ? "ALERTS ENABLED" : "ENABLE ALERTS";
}

function updateClock() {
    elements["local-clock"].textContent = new Date().toLocaleTimeString([], { hour12: false });
}

function updateTelemetryAge() {
    if (!state.lastTelemetryAt) {
        setText("telemetry-age", "No telemetry");
        return;
    }
    const ageSeconds = Math.max(0, Math.floor((Date.now() - state.lastTelemetryAt) / 1000));
    setText("telemetry-age", ageSeconds < 2 ? "Telemetry now" : `Telemetry ${ageSeconds}s ago`);
    if (state.mode === "live" && ageSeconds > 10) {
        setConnectionState("offline", "Telemetry stale");
        renderSafety();
    }
}

function setMeter(id, value, tone) {
    const element = elements[id];
    element.style.width = `${clamp(value, 0, 100)}%`;
    element.style.background = tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--accent)";
}

function setText(id, value) {
    elements[id].textContent = String(value);
}

function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function normalizeLevel(level) {
    return ["normal", "info", "warning", "critical"].includes(level) ? level : "info";
}

function safeHost(value) {
    try { return new URL(value).host; } catch { return "controller"; }
}

function isNightTime() {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
}

function closeSocket() {
    if (state.socket) {
        const socket = state.socket;
        state.socket = null;
        socket.close();
    }
}

function closeConnections() {
    clearTimeout(state.reconnectTimer);
    stopSimulator();
    closeSocket();
}
