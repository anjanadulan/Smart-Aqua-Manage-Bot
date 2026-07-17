Exit code: 0
Wall time: 0.5 seconds
Output:
#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <sys/time.h>
#include <time.h>

#include "hardware_config.h"
#include "secrets.h"

namespace {

WebServer httpServer(80);
WebSocketsServer webSocket(82);
Preferences preferences;
Servo feederServo;

bool desiredFilterOn = false;
bool filterOn = false;
bool uvOn = false;
bool waterLow = false;
bool waterDirty = false;
bool previousWaterLow = false;
bool previousWaterDirty = false;
bool irObstacle = false;
uint8_t waterLevelPercent = 95;
uint8_t waterClarityPercent = 88;
String uvMode = "auto";

uint32_t nextFeedAtMs = 0;
uint32_t lastSensorPollMs = 0;
uint32_t lastTelemetryMs = 0;
uint32_t lastFirebasePollMs = 0;
uint32_t lastFirebaseStatusMs = 0;
uint32_t firebaseTokenExpiresAtMs = 0;
String firebaseIdToken;
bool firebaseReady = false;
bool firebaseRelayControlActive = false;

void setFilterOutput(bool enabled);
void setUvOutput(bool enabled);

bool firebaseConfigured() {
    return String(FIREBASE_API_KEY) != "YOUR_FIREBASE_WEB_API_KEY" &&
           String(FIREBASE_DEVICE_EMAIL) != "YOUR_DEVICE_FIREBASE_EMAIL" &&
           String(FIREBASE_DEVICE_PASSWORD) != "YOUR_DEVICE_FIREBASE_PASSWORD";
}

String firebaseUrl(const char *path) {
    return String(FIREBASE_DATABASE_URL) + path + ".json?auth=" + firebaseIdToken;
}

bool firebaseSignIn() {
    if (!firebaseConfigured() || WiFi.status() != WL_CONNECTED) return false;

    WiFiClientSecure client;
    client.setInsecure();  // Prototype only. Pin the Firebase CA certificate before deployment.
    HTTPClient http;
    const String url = String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=") + FIREBASE_API_KEY;
    if (!http.begin(client, url)) return false;
    http.addHeader("Content-Type", "application/json");

    JsonDocument request;
    request["email"] = FIREBASE_DEVICE_EMAIL;
    request["password"] = FIREBASE_DEVICE_PASSWORD;
    request["returnSecureToken"] = true;
    String body;
    serializeJson(request, body);

    const int code = http.POST(body);
    const String response = http.getString();
    http.end();
    if (code != HTTP_CODE_OK) {
        Serial.printf("Firebase sign-in failed: HTTP %d\n", code);
        firebaseReady = false;
        return false;
    }

    JsonDocument result;
    if (deserializeJson(result, response)) {
        firebaseReady = false;
        return false;
    }
    firebaseIdToken = result["idToken"].as<String>();
    const uint32_t expiresIn = result["expiresIn"] | 3600UL;
    firebaseTokenExpiresAtMs = millis() + (expiresIn > 300 ? expiresIn - 300 : expiresIn) * 1000UL;
    firebaseReady = !firebaseIdToken.isEmpty();
    if (firebaseReady) Serial.println("Firebase device authentication ready.");
    return firebaseReady;
}

bool firebaseEnsureAuth() {
    if (!firebaseConfigured() || WiFi.status() != WL_CONNECTED) return false;
    if (firebaseReady && static_cast<int32_t>(millis() - firebaseTokenExpiresAtMs) < 0) return true;
    return firebaseSignIn();
}

bool firebaseGetBool(const char *path, bool &value) {
    if (!firebaseEnsureAuth()) return false;
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    if (!http.begin(client, firebaseUrl(path))) return false;
    const int code = http.GET();
    const String response = http.getString();
    http.end();
    if (code == HTTP_CODE_UNAUTHORIZED) {
        firebaseReady = false;
        return false;
    }
    if (code != HTTP_CODE_OK || response == "null") return false;
    JsonDocument result;
    if (deserializeJson(result, response) || result.isNull()) return false;
    value = result.as<bool>();
    return true;
}

bool firebasePutBool(const char *path, bool value) {
    if (!firebaseEnsureAuth()) return false;
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    if (!http.begin(client, firebaseUrl(path))) return false;
    http.addHeader("Content-Type", "application/json");
    const int code = http.PUT(String(value ? "true" : "false"));
    http.end();
    if (code == HTTP_CODE_UNAUTHORIZED) firebaseReady = false;
    return code >= 200 && code < 300;
}

void firebasePatchStatus() {
    if (!firebaseEnsureAuth()) return;
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    if (!http.begin(client, firebaseUrl("/devices/aqua-main/status"))) return;
    http.addHeader("Content-Type", "application/json");

    JsonDocument status;
    status["online"] = true;
    status["waterLevel"] = waterLow ? "LOW" : "BEST";
    status["filtrationRelay"] = filterOn;
    status["uvRelay"] = uvOn;
    String body;
    serializeJson(status, body);
    const int code = http.sendRequest("PATCH", body);
    http.end();
    if (code == HTTP_CODE_UNAUTHORIZED) firebaseReady = false;
}

void firebasePollRelayControls() {
    bool requestedFilter = false;
    bool requestedUv = false;
    if (!firebaseGetBool("/devices/aqua-main/status/filtrationRelay", requestedFilter)) return;
    if (!firebaseGetBool("/devices/aqua-main/status/uvRelay", requestedUv)) return;

    firebaseRelayControlActive = true;
    desiredFilterOn = requestedFilter;
    setFilterOutput(requestedFilter);
    setUvOutput(requestedUv);

    // If local low-water safety overrides the requested filter state, publish the safe state.
    if (requestedFilter != filterOn) firebasePutBool("/devices/aqua-main/status/filtrationRelay", filterOn);
}

void firebaseLoop() {
    if (!firebaseConfigured() || WiFi.status() != WL_CONNECTED) return;
    const uint32_t now = millis();
    if (!firebaseEnsureAuth()) return;
    if (now - lastFirebasePollMs >= 1000) {
        lastFirebasePollMs = now;
        firebasePollRelayControls();
    }
    if (now - lastFirebaseStatusMs >= 5000) {
        lastFirebaseStatusMs = now;
        firebasePatchStatus();
    }
}

bool clockIsValid() {
    return time(nullptr) > 1700000000;
}

void writeRelay(uint8_t pin, bool enabled) {
    digitalWrite(pin, enabled ? Hardware::RELAY_ON : Hardware::RELAY_OFF);
}

void setFilterOutput(bool enabled) {
    filterOn = enabled && !waterLow;
    writeRelay(Hardware::FILTER_RELAY_PIN, filterOn);
}

void setUvOutput(bool enabled) {
    uvOn = enabled;
    writeRelay(Hardware::UV_RELAY_PIN, uvOn);
}

bool isUvScheduleActive() {
    if (!clockIsValid()) return false;
    const time_t localEpoch = time(nullptr) + Hardware::LOCAL_UTC_OFFSET_SECONDS;
    tm localTime{};
    gmtime_r(&localEpoch, &localTime);
    return localTime.tm_hour >= Hardware::UV_START_HOUR || localTime.tm_hour < Hardware::UV_STOP_HOUR;
}

void updateUvOutput() {
    if (uvMode == "on") {
        setUvOutput(true);
    } else if (uvMode == "off") {
        setUvOutput(false);
    } else {
        setUvOutput(isUvScheduleActive());
    }
}

uint32_t nextFeedSeconds() {
    const int32_t remainingMs = static_cast<int32_t>(nextFeedAtMs - millis());
    return remainingMs <= 0 ? 0 : static_cast<uint32_t>(remainingMs) / 1000;
}

void resetFeedTimer() {
    nextFeedAtMs = millis() + Hardware::FEED_INTERVAL_SECONDS * 1000UL;
    if (clockIsValid()) {
        preferences.putULong64("lastFeed", static_cast<uint64_t>(time(nullptr)));
    }
}

void sendJson(const JsonDocument &document, int client = -1) {
    String payload;
    serializeJson(document, payload);
    if (client >= 0) {
        webSocket.sendTXT(static_cast<uint8_t>(client), payload);
    } else {
        webSocket.broadcastTXT(payload);
    }
}

void sendEvent(const char *category, const char *level, const String &message) {
    JsonDocument document;
    document["type"] = "event";
    document["category"] = category;
    document["level"] = level;
    document["message"] = message;
    sendJson(document);
    Serial.printf("[%s] %s\n", category, message.c_str());
}

void sendAck(uint8_t client, const String &command, bool ok, const String &message, const String &requestId = "") {
    JsonDocument document;
    document["type"] = "ack";
    document["command"] = command;
    document["ok"] = ok;
    document["message"] = message;
    if (!requestId.isEmpty()) document["requestId"] = requestId;
    sendJson(document, client);
}

void sendTelemetry(int client = -1) {
    JsonDocument document;
    document["type"] = "telemetry";
    document["waterLevelPercent"] = waterLevelPercent;
    document["waterClarityPercent"] = waterClarityPercent;
    document["waterLow"] = waterLow;
    document["waterDirty"] = waterDirty;
    document["filterOn"] = filterOn;
    document["uvOn"] = uvOn;
    document["uvMode"] = uvMode;
    document["nextFeedSeconds"] = nextFeedSeconds();
    document["uvWindow"] = "18:00-06:00";
    document["irObstacle"] = irObstacle;
    document["cleaning"] = false;
    document["cleaningSupported"] = Hardware::CLEANING_SUPPORTED;
    document["clockValid"] = clockIsValid();
    document["uptimeSeconds"] = millis() / 1000UL;
    sendJson(document, client);
}

void sampleSensors() {
    waterLow = digitalRead(Hardware::WATER_LEVEL_PIN) == Hardware::WATER_LOW_SIGNAL;
    irObstacle = digitalRead(Hardware::IR_FOOD_SENSOR_PIN) == Hardware::IR_OBSTACLE_SIGNAL;

    const uint16_t turbidityRaw = analogRead(Hardware::TURBIDITY_ADC_PIN);
    const long clarity = map(
        constrain(turbidityRaw, Hardware::TURBIDITY_DIRTY_RAW, Hardware::TURBIDITY_CLEAR_RAW),
        Hardware::TURBIDITY_DIRTY_RAW,
        Hardware::TURBIDITY_CLEAR_RAW,
        0,
        100
    );
    waterClarityPercent = static_cast<uint8_t>(constrain(clarity, 0L, 100L));
    waterDirty = waterClarityPercent < Hardware::DIRTY_WATER_THRESHOLD_PERCENT;

    // A threshold sensor cannot measure exact depth. Report a clear operational state.
    waterLevelPercent = waterLow ? 20 : 95;

    if (waterLow && !previousWaterLow) {
        desiredFilterOn = false;
        setFilterOutput(false);
        sendEvent("SAFETY", "critical", "Low water detected. Filtration relay forced off.");
    } else if (!waterLow && previousWaterLow) {
        sendEvent("SAFETY", "normal", "Water level restored. Filtration remains off until manually enabled.");
    }

    if (waterDirty && !previousWaterDirty) {
        sendEvent("WATER QUALITY", "warning", "Water clarity is below the configured clean threshold.");
    } else if (!waterDirty && previousWaterDirty) {
        sendEvent("WATER QUALITY", "normal", "Water clarity returned above the clean threshold.");
    }

    previousWaterLow = waterLow;
    previousWaterDirty = waterDirty;
    setFilterOutput(desiredFilterOn);
}

void operateFeeder(bool bypassIrCheck) {
    if (irObstacle && !bypassIrCheck) {
        sendEvent("FEEDER", "warning", "Scheduled feed skipped because the IR sensor detected remaining food.");
        resetFeedTimer();
        return;
    }

    feederServo.write(Hardware::FEEDER_OPEN_DEGREES);
    delay(650);
    feederServo.write(Hardware::FEEDER_CLOSED_DEGREES);
    delay(350);
    resetFeedTimer();
    sendEvent("FEEDER", "normal", bypassIrCheck ? "Manual feed completed." : "Scheduled feed completed.");
}

void syncClock(uint64_t epoch) {
    timeval value{};
    value.tv_sec = static_cast<time_t>(epoch);
    settimeofday(&value, nullptr);
    if (!firebaseRelayControlActive) updateUvOutput();
}

void handleCommand(uint8_t client, JsonDocument &document) {
    const String command = document["command"] | "";
    const String requestId = document["requestId"] | "";

    if (command == "set_filter") {
        const bool requested = document["value"] | false;
        if (requested && waterLow) {
            sendAck(client, command, false, "Filtration is locked off while water is low.", requestId);
            return;
        }
        desiredFilterOn = requested;
        setFilterOutput(requested);
        sendAck(client, command, true, filterOn ? "Filtration relay enabled." : "Filtration relay disabled.", requestId);
    } else if (command == "set_uv_mode") {
        const String requestedMode = document["value"] | "auto";
        if (requestedMode != "auto" && requestedMode != "on" && requestedMode != "off") {
            sendAck(client, command, false, "Invalid UV mode.", requestId);
            return;
        }
        uvMode = requestedMode;
        preferences.putString("uvMode", uvMode);
        updateUvOutput();
        sendAck(client, command, true, "UV mode updated.", requestId);
    } else if (command == "feed_now") {
        operateFeeder(true);
        sendAck(client, command, true, "Manual feed cycle completed.", requestId);
    } else if (command == "clean_now") {
        sendAck(client, command, false, "Glass cleaner is disabled until limit switches and motor pins are configured.", requestId);
    } else {
        sendAck(client, command, false, "Unknown command.", requestId);
    }

    sendTelemetry(client);
}

void handleWebSocketEvent(uint8_t client, WStype_t type, uint8_t *payload, size_t length) {
    if (type == WStype_CONNECTED) {
        JsonDocument hello;
        hello["type"] = "hello";
        hello["device"] = "ESP32 DevKit";
        hello["protocolVersion"] = 1;
        sendJson(hello, client);
        sendTelemetry(client);
        return;
    }
    if (type != WStype_TEXT) return;

    JsonDocument document;
    const DeserializationError error = deserializeJson(document, payload, length);
    if (error) {
        sendAck(client, "parse", false, "Invalid JSON payload.");
        return;
    }

    const String messageType = document["type"] | "";
    if (messageType == "command") {
        handleCommand(client, document);
    } else if (messageType == "sync_clock") {
        const uint64_t epoch = document["epoch"] | 0;
        if (epoch > 1700000000) syncClock(epoch);
        sendTelemetry(client);
    } else if (messageType == "get_state") {
        sendTelemetry(client);
    }
}

void startNetwork() {
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_SSID, AP_PASSWORD);
    Serial.printf("Fallback AP: %s at %s\n", AP_SSID, WiFi.softAPIP().toString().c_str());

    if (strlen(WIFI_SSID) == 0 || String(WIFI_SSID) == "YOUR_WIFI_NAME") return;
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.printf("Connecting to Wi-Fi: %s", WIFI_SSID);
    const uint32_t startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000) {
        delay(250);
        Serial.print('.');
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
        WiFi.setSleep(false);
        Serial.printf("Controller IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("Station connection unavailable. Access-point mode remains active.");
    }
}

void startServers() {
    if (!LittleFS.begin(true)) {
        Serial.println("LittleFS mount failed. Upload the filesystem image before use.");
    }
    httpServer.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
    httpServer.onNotFound([]() { httpServer.send(404, "text/plain", "Not found"); });
    httpServer.begin();

    webSocket.begin();
    webSocket.onEvent(handleWebSocketEvent);
    Serial.println("HTTP server on port 80, WebSocket server on port 82.");
}

}  // namespace

void setup() {
    Serial.begin(115200);

    pinMode(Hardware::FILTER_RELAY_PIN, OUTPUT);
    pinMode(Hardware::UV_RELAY_PIN, OUTPUT);
    writeRelay(Hardware::FILTER_RELAY_PIN, false);
    writeRelay(Hardware::UV_RELAY_PIN, false);
    pinMode(Hardware::WATER_LEVEL_PIN, INPUT_PULLUP);
    pinMode(Hardware::IR_FOOD_SENSOR_PIN, INPUT_PULLUP);
    pinMode(Hardware::TURBIDITY_ADC_PIN, INPUT);

    feederServo.setPeriodHertz(50);
    feederServo.attach(Hardware::FEEDER_SERVO_PIN, 500, 2400);
    feederServo.write(Hardware::FEEDER_CLOSED_DEGREES);

    preferences.begin("aqua", false);
    uvMode = preferences.getString("uvMode", "auto");
    resetFeedTimer();
    sampleSensors();
    if (!firebaseRelayControlActive) updateUvOutput();

    startNetwork();
    startServers();
    sendEvent("SYSTEM", "normal", "ESP32 controller started with relay outputs in a safe state.");
}

void loop() {
    httpServer.handleClient();
    webSocket.loop();
    firebaseLoop();

    const uint32_t nowMs = millis();
    if (nowMs - lastSensorPollMs >= 250) {
        lastSensorPollMs = nowMs;
        sampleSensors();
        if (!firebaseRelayControlActive) updateUvOutput();
    }

    if (static_cast<int32_t>(nowMs - nextFeedAtMs) >= 0) {
        operateFeeder(false);
    }

    if (nowMs - lastTelemetryMs >= 1000) {
        lastTelemetryMs = nowMs;
        sendTelemetry();
    }
}


