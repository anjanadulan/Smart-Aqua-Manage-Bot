# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| High | Firmware has not been compiled or exercised on the exact ESP32/sensor modules | PlatformIO unavailable; calibration values marked prototype | Wiring/API mistakes could damage equipment or defeat safety behavior | Install PlatformIO, compile, then bench-test at logic voltage before mains connection |
| High | Relay and sensor polarity are assumptions until measured | `hardware_config.h` | Reversed polarity can energize a relay at the wrong time | Verify each module with a meter and update config |
| High | WebSocket/HTTP control has no device authentication | `src/main.cpp`, `web/app.js` | Any client on the reachable network can issue commands | Keep access inside LAN/Tailscale ACLs; add authenticated commands before public exposure |
| High | Night UV schedule loses wall-clock knowledge after fully offline power loss | `PROTOTYPE.md`; browser clock-sync implementation | UV auto mode remains off until time sync | Add and integrate a battery-backed DS3231 RTC |
| High | Browser notification is not guaranteed background remote delivery | `web/app.js` | Critical alerts can be missed when no page is open | Select a push/webhook service and add delivery acknowledgement |
| Medium | Legacy guides still contain obsolete NodeMCU/TDS wiring below warning blocks | `SYSTEM_GUIDE.md`, `PARTS.md` | A builder could follow the wrong pin table | Replace legacy sections after the physical baseline is bench-approved |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Unpinned firmware libraries | Prototype prioritizes setup speed | `platformio.ini` | Future dependency updates can break builds | Pin versions after first successful hardware build |
| Blocking servo delays | Simple prototype actuation | `operateFeeder` | WebSocket handling pauses for about one second | Convert feeder to a non-blocking state machine |
| Single-file firmware | Initial cohesive prototype | `src/main.cpp` | More subsystems will increase coupling | Split protocol, sensors, schedules, and outputs after bench validation |
| Single-file Web UI controller | No frontend build step by design | `web/app.js` | Maintenance becomes harder as features grow | Split into classic local scripts or introduce a build only if ESP32 resource budget permits |
| No retained event log | Events exist only in connected UI/serial | Firmware and Web UI | Restart removes incident history | Add bounded Preferences/flash event records with wear limits |

### 3) Security Concerns

| Risk | OWASP category (if applicable) | Evidence | Current mitigation | Gap |
|------|--------------------------------|----------|--------------------|-----|
| Unauthenticated hardware commands | A01/A07 | WebSocket command handler | Private LAN/Tailscale recommendation | Per-device authentication and authorization |
| Base ESP32-CAM example has no hardened public boundary | A05 | Camera setup guide | Direct port forwarding prohibited | Gateway authentication/TLS if public access is later required |
| AP credential strength depends on local secrets | A07 | `secrets.example.h` | Real secret file is ignored | Enforce stronger setup/rotation process |
| Physical mains and UV exposure | N/A | `README.md`, `PROTOTYPE.md` | Enclosure/GFCI/shielding guidance | Qualified electrical review and hardware interlocks |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| ESP32-CAM MJPEG bandwidth | Camera architecture | Not yet benchmarked | Remote relay paths may add lag or reduce FPS | Start at VGA, verify direct Tailscale path, then benchmark MediaMTX if needed |
| One-second blocking manual feed | `operateFeeder` | Short protocol pause during actuation | Multiple clients may see stale updates | Non-blocking servo state machine |
| Telemetry broadcast every second | `loop()` | Appropriate for prototype | More clients consume heap/network | Cap clients and measure heap before expansion |
| Web UI event list is in-memory only | `web/app.js` | Limited to 30 DOM events | No long-term diagnosis | Move retention to controller or external service |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `hardware_config.h` | Pin/polarity/calibration changes affect physical safety | New prototype boundary | Require measured evidence and a second review |
| `src/main.cpp` | Owns all current automation | New central controller | Compile and bench-test every output change |
| `web/app.js` | Protocol and UI state must match firmware | Major rewrite in current change | Maintain protocol fixtures and browser smoke tests |
| `README.md`, `PARTS.md`, `SYSTEM_GUIDE.md` | Multiple generations of design | Historically high churn | Treat `PROTOTYPE.md` and firmware config as current source of truth |

### 6) `[ASK USER]` Questions

1. [ASK USER] Can you add a DS3231 RTC module so the 18:00-06:00 UV schedule survives a fully offline power loss?
2. [ASK USER] Which background notification destination should receive critical alerts when no dashboard is open?
3. [ASK USER] What exact ESP32 DevKit revision, relay-board model, low-water sensor, and turbidity module are you using?
4. [ASK USER] Which always-on device can act as the Tailscale subnet router: Raspberry Pi, PC, server, or supported router?

### 7) Intent vs. Reality Divergences

| Stated intent | Current reality | Evidence |
|---------------|-----------------|----------|
| Connected prototype | Firmware and protocol exist, but hardware compilation/bench testing remains | `firmware/esp32-controller/`, testing output |
| Correct offline night schedule | Auto mode needs a valid clock; full power loss removes wall time | `PROTOTYPE.md`, `src/main.cpp` |
| Anywhere alerts | Connected browser notifications exist; background push provider is undecided | `web/app.js` |
| Automated CNC cleaner | UI/protocol surface exists, but firmware safely rejects it until homing/limits are specified | `src/main.cpp`, `hardware_config.h` |

### 8) Evidence

- `PROTOTYPE.md`
- `firmware/esp32-controller/src/main.cpp`
- `firmware/esp32-controller/include/hardware_config.h`
- `firmware/esp32-controller/platformio.ini`
- `web/app.js`
- `firmware/esp32-cam/README.md`
