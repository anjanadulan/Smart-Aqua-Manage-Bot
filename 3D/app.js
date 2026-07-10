// ==========================================
// SMART AQUA MANAGE BOT (v2.0) - APP JS
// Core UI Logic, Three.js Engine & Simulation
// ==========================================

// Global state variables
let scene, camera, renderer, controls;
let waterMesh, tankFrame, glassPane, scraperBlock;
let bubbleParticles = [];
let uvLight;

// State properties
const state = {
    filterActive: true,
    uvActive: false,
    waterLevel: 95,          // percentage (0-100)
    tdsValue: 150,           // total dissolved solids (ppm, 0-1000)
    irObstacle: false,       // leftover food detected
    algaeClock: 0,           // hours (0 - 168)
    nextFeedSeconds: 21599,  // 6 hours in seconds (5h 59m 59s)
    cleaningInProgress: false,
    cleanerProgress: 0,
    cleanerDirection: 1,
    cleanerCycles: 0
};

// DOM Elements
const filterSwitch = document.getElementById('filter-switch');
const uvSwitch = document.getElementById('uv-switch');
const feedOverrideBtn = document.getElementById('feed-override-btn');
const cleanNowBtn = document.getElementById('clean-now-btn');
const resetScraperBtn = document.getElementById('reset-scraper-btn');
const clearLogsBtn = document.getElementById('clear-logs-btn');
const logRegistry = document.getElementById('log-registry');
const countdownTimer = document.getElementById('countdown-timer');
const tdsValDisplay = document.getElementById('tds-val');
const tdsGaugeFill = document.getElementById('tds-gauge-fill');
const scraperStatusText = document.getElementById('scraper-status');
const resetCamBtn = document.getElementById('reset-cam-btn');

// Simulator inputs
const simWaterLevel = document.getElementById('sim-water-level');
const simWaterVal = document.getElementById('sim-water-val');
const simTdsLevel = document.getElementById('sim-tds-level');
const simTdsVal = document.getElementById('sim-tds-val');
const simIrObstacle = document.getElementById('sim-ir-obstacle');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    setupEventListeners();
    setupSimulator();
    startTelemetryLoops();
    
    // Add initial startup logs
    addLog('system', 'cyan', 'Smart Aqua Manage Bot startup complete.');
    addLog('system', 'cyan', 'Filter pump loop active on local relay channel 1.');
    addLog('scheduler', 'cyan', '6-Hour feeding countdown initialized.');
    updateTDSDisplay();
});

// ==========================================
// 1. THREE.JS ENGINE SETUP
// ==========================================

function initThreeJS() {
    const container = document.getElementById('viewport-container');
    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    // Create Scene & Camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d1a);
    scene.fog = new THREE.FogExp2(0x0a0d1a, 0.04);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(12, 8, 14);

    // Create Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Setup Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go under floor
    controls.minDistance = 5;
    controls.maxDistance = 25;

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
    mainLight.position.set(10, 20, 10);
    scene.add(mainLight);

    // Add Dedicated UV Light (Violet)
    uvLight = new THREE.PointLight(0xa855f7, 0, 15);
    uvLight.position.set(0, 4, 0);
    scene.add(uvLight);

    // Build the Aquarium Model
    buildAquarium();

    // Resize Handler
    window.addEventListener('resize', onWindowResize);

    // Start Render Loop
    animate();
}

function buildAquarium() {
    // 1. Tank Glass Frame (Outer box wireframe/transparent)
    const frameGeo = new THREE.BoxGeometry(8, 5, 4);
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    tankFrame = new THREE.Mesh(frameGeo, frameMat);
    scene.add(tankFrame);

    // Glass panel edges (aesthetic corners)
    const edgeGeo = new THREE.BoxGeometry(8.1, 5.1, 4.1);
    const edgeMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.1,
        metalness: 0.8
    });
    const tankEdges = new THREE.BoxGeometry(8.05, 5.05, 4.05);
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    // Position slightly elevated so base is on y=0 plane
    tankFrame.position.y = 2.5;
    
    // 2. Water Body Mesh
    const waterGeo = new THREE.BoxGeometry(7.9, 4.8, 3.9);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.45,
        roughness: 0,
        metalness: 0.1
    });
    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 2.4; // Initial water height
    scene.add(waterMesh);

    // 3. Filter Pump Inlet (Cylinder in the back corner)
    const filterGeo = new THREE.CylinderGeometry(0.2, 0.2, 4.5, 16);
    const filterMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.7,
        metalness: 0.9
    });
    const filterInlet = new THREE.Mesh(filterGeo, filterMat);
    filterInlet.position.set(-3.5, 2.25, -1.5);
    scene.add(filterInlet);

    // 4. Dirty Glass Algae Layer (Front Glass Panel)
    const glassGeo = new THREE.PlaneGeometry(7.85, 4.8);
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x15803d, // Algae green
        transparent: true,
        opacity: 0, // Starts completely clean
        side: THREE.DoubleSide,
        roughness: 0.9
    });
    glassPane = new THREE.Mesh(glassGeo, glassMat);
    glassPane.position.set(0, 2.5, 1.96); // Exactly on the front pane surface
    scene.add(glassPane);

    // 5. Motorized Glass Scraper Block (Carriage)
    const scraperGeo = new THREE.BoxGeometry(0.6, 0.8, 0.2);
    const scraperMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.2,
        metalness: 0.9
    });
    scraperBlock = new THREE.Mesh(scraperGeo, scraperMat);
    scraperBlock.position.set(-3.4, 2.5, 2.05); // Placed outside front pane
    scene.add(scraperBlock);

    // Add a simple grid/floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x334155, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Set initial camera target to center of aquarium
    controls.target.set(0, 2.5, 0);
    controls.update();
}

// Particle System for Filtration Pump Bubbles
function createBubble() {
    const bubbleGeo = new THREE.SphereGeometry(Math.random() * 0.08 + 0.02, 8, 8);
    const bubbleMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
    });
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    
    // Position bubble near filter inlet base
    bubble.position.set(
        -3.5 + (Math.random() - 0.5) * 0.3,
        0.3,
        -1.5 + (Math.random() - 0.5) * 0.3
    );
    
    scene.add(bubble);
    bubbleParticles.push(bubble);
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update Controls
    controls.update();

    // 1. Water Level Update (Animate smooth scale change)
    const targetScaleY = state.waterLevel / 100;
    waterMesh.scale.y = THREE.MathUtils.lerp(waterMesh.scale.y, targetScaleY, 0.05);
    waterMesh.position.y = (targetScaleY * 4.8) / 2 + 0.1;

    // 2. UV Lighting Active Glow Fade
    const targetUVIntensity = state.uvActive ? 6.0 : 0.0;
    uvLight.intensity = THREE.MathUtils.lerp(uvLight.intensity, targetUVIntensity, 0.05);
    
    if (state.uvActive) {
        // Fluctuating violet glow effect
        uvLight.intensity += (Math.random() - 0.5) * 0.3;
        waterMesh.material.color.setHex(0x5b21b6); // violet tint
    } else {
        waterMesh.material.color.setHex(0x0ea5e9); // cyan blue tint
    }

    // 3. Filtration Bubbles Animation
    if (state.filterActive && Math.random() < 0.25) {
        createBubble();
    }

    for (let i = bubbleParticles.length - 1; i >= 0; i--) {
        const bubble = bubbleParticles[i];
        bubble.position.y += 0.04; // Rise speed
        // Sway drift
        bubble.position.x += Math.sin(bubble.position.y * 3 + i) * 0.005;

        // Remove if bubble reaches water surface or stays too high
        const surfaceY = (state.waterLevel / 100) * 4.8;
        if (bubble.position.y >= surfaceY + 0.1) {
            scene.remove(bubble);
            bubbleParticles.splice(i, 1);
        }
    }

    // 4. Dirty Glass Algae Accumulation Rendering
    const algaeFactor = state.algaeClock / 168; // 0 to 1
    glassPane.material.opacity = THREE.MathUtils.lerp(glassPane.material.opacity, algaeFactor * 0.7, 0.05);

    // 5. Motorized Glass Scraper Carriage Animation
    if (state.cleaningInProgress) {
        // Move scraper carriage horizontally (-3.4 to 3.4)
        const speed = 0.05;
        state.cleanerProgress += speed * state.cleanerDirection;
        scraperBlock.position.x = state.cleanerProgress;

        if (state.cleanerProgress >= 3.4) {
            state.cleanerDirection = -1;
        } else if (state.cleanerProgress <= -3.4) {
            state.cleanerDirection = 1;
            state.cleanerCycles++;
            if (state.cleanerCycles >= 2) {
                // Done 2 complete sweeps, finish cleaning
                state.cleaningInProgress = false;
                addLog('cleaner', 'cyan', 'Automated glass cleaning cycle completed successfully.');
                state.algaeClock = 0; // Reset algae run-time clock
                updateScraperStatus();
                // Remove warning block
                removeActiveCleaningAlert();
            }
        }
        
        // Clean glass dynamically in front of the moving scraper
        if (state.cleanerDirection === 1) {
            // Clearing glass behind the right-moving scraper
            // (Simply done visually as a smooth reset back to clear pane)
            glassPane.material.opacity = Math.max(0, glassPane.material.opacity - 0.01);
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('viewport-container');
    const width = container.clientWidth;
    const height = container.clientHeight || 450;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// ==========================================
// 2. HARDWARE COMMAND INTERFACES (EVENTS)
// ==========================================

function setupEventListeners() {
    // 1. Filter Pump Switch
    filterSwitch.addEventListener('change', (e) => {
        state.filterActive = e.target.checked;
        const msg = state.filterActive 
            ? 'Water filtration pump relay activated.' 
            : 'Water filtration pump relay deactivated (OFF).';
        addLog('filter', 'cyan', msg);
    });

    // 2. UV Sterilizer Switch
    uvSwitch.addEventListener('change', (e) => {
        state.uvActive = e.target.checked;
        const msg = state.uvActive 
            ? 'UV sterilizer bulb relay engaged. Violet emission active.' 
            : 'UV sterilizer bulb relay cut-off.';
        addLog('uv-light', 'cyan', msg);
    });

    // 3. Manual Feed Override (Instant Feed)
    feedOverrideBtn.addEventListener('click', () => {
        triggerFeedCycle(true); // true = force bypass IR sensor
    });

    // 4. Force Glass Cleaning
    cleanNowBtn.addEventListener('click', () => {
        triggerGlassCleaning();
    });

    // 5. Reset Scraper Log/Clock
    resetScraperBtn.addEventListener('click', () => {
        state.algaeClock = 0;
        updateScraperStatus();
        addLog('cleaner', 'cyan', 'Algae runtime clock manually reset to 0 hours.');
    });

    // 6. Clear Logs
    clearLogsBtn.addEventListener('click', () => {
        logRegistry.innerHTML = '';
        addLog('system', 'cyan', 'Dashboard event registry cleared.');
    });

    // 7. Reset Camera Position
    resetCamBtn.addEventListener('click', () => {
        camera.position.set(12, 8, 14);
        controls.target.set(0, 2.5, 0);
        controls.update();
    });
}

// ==========================================
// 3. CORE LOG LOOP / TELEMETRY SPECIFICATIONS
// ==========================================

function startTelemetryLoops() {
    // 1. Countdown timer update loop (every 1 second)
    setInterval(() => {
        if (state.nextFeedSeconds > 0) {
            state.nextFeedSeconds--;
        } else {
            // Trigger automatic feed cycle
            triggerFeedCycle(false); // false = regular schedule, checks IR sensor
        }
        updateCountdownTimer();

        // 2. Simulate Algae Growth Tracker (Accumulated Light runtime)
        // If UV active or ambient lights active, increment algae tracker
        // Real-world: hours. Simulation: 1.5 seconds = 1 hour of light
        if (state.uvActive || state.filterActive) {
            if (state.algaeClock < 168 && !state.cleaningInProgress) {
                state.algaeClock += 0.5;
                updateScraperStatus();
                
                // If it hits 168, auto-trigger cleaning
                if (state.algaeClock >= 168) {
                    addLog('cleaner', 'amber', 'Runtime tracker reached 168 hrs. Glass pane flagged as dirty.');
                    triggerGlassCleaning();
                }
            }
        }
    }, 1000);

    // 3. Periodic TDS accumulation fluctuation (every 3 seconds)
    setInterval(() => {
        if (!state.cleaningInProgress) {
            // Slowly increase TDS to simulate dissolved solids accumulating
            const tdsDelta = Math.random() * 2;
            state.tdsValue = Math.min(1000, state.tdsValue + tdsDelta);
            updateTDSDisplay();
        }
    }, 3000);
}

// Trigger Feeding Logic (Physical specification matrix 1)
function triggerFeedCycle(bypassIR) {
    if (state.cleaningInProgress) {
        addLog('scheduler', 'amber', 'Feeding aborted: Scraper drive active in tank front zone.');
        state.nextFeedSeconds = 21599; // reset countdown
        return;
    }

    addLog('sensor-loop', 'cyan', 'Initiating local surface barrier scan...');
    
    // Simulate mechanical delay of sensor read
    setTimeout(() => {
        // If food leftovers detected and NOT overridden by manual button
        if (state.irObstacle && !bypassIR) {
            addLog('scheduler', 'amber', 'Intelligent Skip Override: Leftover food detected in ring. Feeding cycle aborted.');
            state.nextFeedSeconds = 21599; // Reset clock for another 6 hours
        } else {
            // Execute feed
            const logMsg = bypassIR 
                ? 'Manual Feed Override: SG90 Micro-Servo triggered. Food dispensed.'
                : 'Local Scan Clear: SG90 Micro-Servo triggered. Food portion dropped.';
            addLog('actuator', 'cyan', logMsg);
            
            // Visual trigger effect (flash the camera preview overlay or simulate servo)
            const feedBtn = document.getElementById('feed-override-btn');
            feedBtn.style.backgroundColor = 'var(--color-cyan)';
            feedBtn.style.color = '#000';
            setTimeout(() => {
                feedBtn.style.backgroundColor = '';
                feedBtn.style.color = '';
            }, 1000);

            state.nextFeedSeconds = 21599; // Reset countdown
        }
    }, 1000);
}

// Trigger Stepper Cleaning (Physical specification matrix 4)
function triggerGlassCleaning() {
    if (state.cleaningInProgress) return;

    state.cleaningInProgress = true;
    state.cleanerProgress = -3.4;
    state.cleanerDirection = 1;
    state.cleanerCycles = 0;

    addLog('cleaner', 'amber', 'Automated Glass Cleaning in Progress (High-Torque Stepper Active).');
    
    // Add Warning card block to registry
    addActiveCleaningAlert();
}

// Updates UI Elements
function updateCountdownTimer() {
    const hours = Math.floor(state.nextFeedSeconds / 3600);
    const minutes = Math.floor((state.nextFeedSeconds % 3600) / 60);
    const seconds = state.nextFeedSeconds % 60;
    
    const pad = (num) => String(num).padStart(2, '0');
    countdownTimer.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function updateTDSDisplay() {
    const tds = Math.round(state.tdsValue);
    tdsValDisplay.textContent = tds;

    // Map TDS (0-1000) to stroke-dashoffset (251.2 = empty, 0 = full)
    const circumference = 251.2;
    const progress = state.tdsValue / 1000;
    const offset = circumference - (progress * circumference);
    tdsGaugeFill.style.strokeDashoffset = offset;

    // Dynamic color shifting for TDS (cyan for pure ideal < 200, green for average 200-500, amber for high > 500)
    if (state.tdsValue < 200) {
        tdsGaugeFill.style.stroke = 'var(--color-cyan)';
        tdsValDisplay.style.color = 'var(--color-cyan)';
    } else if (state.tdsValue <= 500) {
        tdsGaugeFill.style.stroke = 'var(--color-green)';
        tdsValDisplay.style.color = 'var(--color-green)';
    } else {
        tdsGaugeFill.style.stroke = 'var(--color-amber)';
        tdsValDisplay.style.color = 'var(--color-amber)';
    }
}

function updateScraperStatus() {
    scraperStatusText.textContent = `Tracker: ${state.algaeClock.toFixed(1)} hrs / 168 hrs`;
}

// ==========================================
// 4. TIMELINE REGISTRY LOGGING SYSTEM
// ==========================================

function addLog(category, type, message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    const logCard = document.createElement('div');
    logCard.className = `log-card ${type}`;
    
    logCard.innerHTML = `
        <div class="log-meta">
            <span class="log-category">${category}</span>
            <span class="log-time">${timestamp}</span>
        </div>
        <div class="log-content">${message}</div>
    `;
    
    // Add to top of log registry
    logRegistry.insertBefore(logCard, logRegistry.firstChild);
    
    // Limit to 20 logs to avoid DOM overload
    while (logRegistry.children.length > 20) {
        logRegistry.removeChild(logRegistry.lastChild);
    }
}

// Pushes alert card to timeline (Amber alerts)
let activeCleaningCard = null;
function addActiveCleaningAlert() {
    if (activeCleaningCard) return;

    activeCleaningCard = document.createElement('div');
    activeCleaningCard.className = 'log-card amber';
    activeCleaningCard.id = 'active-cleaning-alert';
    
    activeCleaningCard.innerHTML = `
        <div class="log-meta">
            <span class="log-category">CLEANER ALERT</span>
            <span class="log-time" style="color: var(--color-amber);">ACTIVE</span>
        </div>
        <div class="log-content" style="font-weight: 600;">⚠️ Automated Glass Cleaning in Progress. Front pane scraper moving.</div>
    `;
    logRegistry.insertBefore(activeCleaningCard, logRegistry.firstChild);
}

function removeActiveCleaningAlert() {
    const alert = document.getElementById('active-cleaning-alert');
    if (alert) {
        logRegistry.removeChild(alert);
        activeCleaningCard = null;
    }
}

// Direct Emergency Routing (Red alerts)
let activeWaterAlarmCard = null;
function triggerWaterAlarm(alarmState) {
    const viewport = document.getElementById('viewport-container');
    if (alarmState) {
        // Red flashing background on viewport and red logs
        viewport.style.boxShadow = 'inset 0 0 40px rgba(239, 68, 68, 0.4)';
        
        if (!activeWaterAlarmCard) {
            activeWaterAlarmCard = document.createElement('div');
            activeWaterAlarmCard.className = 'log-card red';
            activeWaterAlarmCard.id = 'critical-water-alarm';
            activeWaterAlarmCard.innerHTML = `
                <div class="log-meta">
                    <span class="log-category">CRITICAL FAULT</span>
                    <span class="log-time" style="color: var(--color-red);">EMERGENCY</span>
                </div>
                <div class="log-content" style="font-weight: 700;">🚨 WATER LEVEL DROP DETECTED. Capacitive sensor reporting volume below safe threshold. Check filtration lines immediately!</div>
            `;
            logRegistry.insertBefore(activeWaterAlarmCard, logRegistry.firstChild);
            addLog('safety', 'red', 'Emergency: direct routing active. Heaters and pumps switched to protective safety state.');
        }
    } else {
        // Remove alarm
        viewport.style.boxShadow = 'none';
        const alarm = document.getElementById('critical-water-alarm');
        if (alarm) {
            logRegistry.removeChild(alarm);
            activeWaterAlarmCard = null;
            addLog('safety', 'cyan', 'Critical Alert Cleared: Water level returned to normal threshold.');
        }
    }
}

// ==========================================
// 5. INTERACTIVE HARDWARE SIMULATOR
// ==========================================

function setupSimulator() {
    // 1. Water Level Slider
    simWaterLevel.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.waterLevel = val;

        if (val < 30) {
            simWaterVal.textContent = 'CRITICAL LOW';
            simWaterVal.style.color = 'var(--color-red)';
            triggerWaterAlarm(true);
        } else if (val < 60) {
            simWaterVal.textContent = 'Low';
            simWaterVal.style.color = 'var(--color-amber)';
            triggerWaterAlarm(false);
        } else {
            simWaterVal.textContent = 'Normal';
            simWaterVal.style.color = 'var(--color-green)';
            triggerWaterAlarm(false);
        }
    });

    // 2. TDS Level Slider
    simTdsLevel.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.tdsValue = val;
        simTdsVal.textContent = val + ' ppm';
        updateTDSDisplay();
    });

    // 3. IR Sensor Obstacle
    simIrObstacle.addEventListener('change', (e) => {
        state.irObstacle = e.target.checked;
        if (state.irObstacle) {
            addLog('sensor', 'amber', 'IR Surface Scan: Floating leftover food detected inside ring.');
        } else {
            addLog('sensor', 'cyan', 'IR Surface Scan: Feeding ring cleared.');
        }
    });
}
