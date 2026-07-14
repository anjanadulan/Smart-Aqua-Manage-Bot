# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| High | Product documentation describes working device control, but only a browser simulation is implemented | No firmware files; no `WebSocket`/network client in `3D/app.js`; `SYSTEM_GUIDE.md:38-40` | Users may mistake simulated commands/alarms for physical device state | Choose the controller target, add firmware and a versioned command/telemetry protocol, then label simulation vs connected mode explicitly |
| High | Low-water alarm does not enforce the documented protective state in the dashboard | `3D/app.js:578-607` only styles/logs; filter/UV state remains unchanged | UI can continue showing filter/UV active during a critical alarm | Implement one authoritative safety transition, force relevant outputs off, disable unsafe controls, and require explicit recovery rules |
| High | Initial filter state conflicts with documented safe boot state | `3D/app.js:14`, `3D/index.html:85` start ON; `SYSTEM_GUIDE.md:168` says relay outputs default OFF | Connected implementation could normalize an unsafe startup expectation | Define the safe boot state in one protocol/spec and make UI, firmware, and docs agree |
| High | “Completely offline” claim conflicts with mandatory internet-hosted runtime assets | `README.md:5,14`; `3D/index.html:51,176-177`; `3D/styles.css:1` | Fresh offline startup loses Three.js/controls/fonts/image and may fail initialization | Vendor required assets and use a local camera/fallback asset |
| High | Hardware/controller selection and safety design are unresolved | `README.md:75` and `PARTS.md:127` say ESP32 or ESP8266; `PARTS.md:161-170` uses ESP8266-style D pins; no firmware | Pin capabilities, ADC range, memory, libraries, and wiring cannot be validated | Select an exact board/module revision and validate the pin/power map before assembly |
| Medium | Specifications retain contradictory components and behavior | pH remains in `README.md:34-36,145`; TDS is used elsewhere; heater shutdown appears in `SYSTEM_GUIDE.md:157,228` without a heater in the BOM; floating ring remains in `PARTS.md:144` | Build, calibration, and safety instructions are ambiguous | Reconcile README, system guide, parts list, UI, and schematic against one approved hardware baseline |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Monolithic browser controller | Prototype combines rendering, state, simulated domain rules, alerts, and DOM mutation | `3D/app.js` (652 lines) | Hardware integration will create tightly coupled, hard-to-test code | Split pure state transitions, device transport, view rendering, and Three.js scene code |
| Simulation constants embedded in code | No config/protocol layer exists | `3D/app.js:13-24`, `249-320`, `394-430`, `499-515` | Calibration and production timing changes require code edits | Centralize named simulation and device configuration with units |
| Misleading legacy names | pH UI was repurposed for TDS | `3D/index.html:57-64`, `3D/styles.css:236-281` | Future work may apply wrong domain assumptions | Rename `.ph-*` classes to `.tds-*` |
| Unused Three.js object | `edgeMesh` is constructed but never added to the scene | `3D/app.js:129-139` | Intended tank edges are absent and maintenance is confusing | Add it if needed or delete the dead construction |
| No persistence | Prototype stores schedules/logs only in memory | `3D/app.js:13-25` | Refresh/reboot resets operational history and timers | Define firmware-owned persistence and dashboard synchronization |
| Documentation encoding artifacts | Several rendered strings show mojibake in terminal/source | `README.md`, `SYSTEM_GUIDE.md`, `3D/app.js:563,593` | Alerts/docs can display corrupted symbols depending on encoding | Normalize repository text files to UTF-8 and verify rendering |

### 3) Security Concerns

| Risk | OWASP category (if applicable) | Evidence | Current mitigation | Gap |
|------|--------------------------------|----------|--------------------|-----|
| Device commands have no defined authentication/authorization model | A01 Broken Access Control / A07 Identification and Authentication Failures | `SYSTEM_GUIDE.md:38-40`; no implementation/config | Local-network-only intent narrows exposure | A local attacker or exposed remote bridge could control relays/actuators; define authenticated sessions and command authorization |
| Remote camera options are documented but no deployment boundary is selected | A05 Security Misconfiguration | `esp32Cam/esp32_cam_anywhere_streaming.md` | Guide warns against direct port forwarding | `[ASK USER]` Select the approved remote-access topology and threat model before implementation |
| HTML construction could become an injection sink when telemetry is connected | A03 Injection | `3D/app.js:526-538` interpolates `category` and `message` into `innerHTML` | Current callers use fixed/local strings | Use `textContent`/DOM nodes before accepting device or network-provided log text |
| Third-party runtime delivery lacks local pinning/control | A08 Software and Data Integrity Failures | CDN scripts in `3D/index.html:176-177`; remote CSS import in `3D/styles.css:1` | Explicit library versions are present for Three.js | No SRI hashes, CSP, vendoring, or offline copy |
| Physical mains/UV safety depends on prose rather than verifiable implementation | N/A | `README.md:133-145`; no firmware/test evidence | README calls for IP65 enclosure, GFCI, and UV shielding | Electrical interlocks, normally-safe relay behavior, fault detection, and HIL verification are `[TODO]` |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| A new mesh geometry/material is allocated for every bubble | `3D/app.js:221-239`, called probabilistically each animation frame | Frequent allocation and garbage collection on long-running dashboards | Lower-power phones/tablets may stutter | Use a bounded object pool or `InstancedMesh` and dispose removed resources |
| Renderer uses unrestricted device pixel ratio | `3D/app.js:82` | High-DPI screens render at full pixel density | GPU cost and battery use rise sharply | Cap pixel ratio and adapt quality to device performance |
| MJPEG remote streaming is bandwidth-heavy | Intended stream in `SYSTEM_GUIDE.md:39`; tradeoffs in `esp32Cam/esp32_cam_anywhere_streaming.md` | Not measurable because stream is not implemented | 720p/remote usage may have low FPS or high bandwidth | Benchmark the selected camera/gateway topology with target devices and network conditions |
| Main-thread monolith runs render and simulation loops together | `3D/app.js:241-324`, `394-430` | No current benchmark | Device messages and richer scenes can cause UI jitter | Separate transport/state updates and profile before adding complexity |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `README.md` | Central specification currently contradicts other files | 10 changes in last 90 days, highest in repository | Treat an approved hardware/protocol spec as source of truth and verify cross-file references |
| `PARTS.md` | Wiring and BOM changes can create physical damage | 6 changes in last 90 days | Review against exact board datasheets and peer-check power/pin changes before assembly |
| `3D/app.js` and `3D/index.html` | Global IDs/state make UI changes tightly coupled | 3 changes each in last 90 days | Add automated smoke tests and refactor behind stable state/view boundaries |
| `Concept.png` | Diagram may drift from text and cannot be diff-reviewed easily | 4 changes in last 90 days | Keep a text/source diagram alongside the exported image |

### 6) `[ASK USER]` Questions

1. [ASK USER] Is the next milestone a browser-only demonstration or a physically connected prototype?
2. [ASK USER] Which exact main controller board and revision is approved: ESP8266 NodeMCU, ESP32 development board, or another board?
3. [ASK USER] Which low-water outputs must turn off: filter pump, UV lamp, a heater not currently in the BOM, or a different set?
4. [ASK USER] Must the deployed dashboard work with zero internet access from a cold start?
5. [ASK USER] Is remote camera access in scope, and if so which topology is approved: private VPN/subnet routing, a gateway using WebRTC, or a cloud relay?
6. [ASK USER] Is the water-quality sensor definitively TDS, with all remaining pH references to be removed?
7. [ASK USER] Should feed/algae schedules survive controller restarts and power loss; if yes, what persistence/time source is available?

### 7) Intent vs. Reality Divergences

| Stated intent | Current reality | Evidence |
|---------------|-----------------|----------|
| Standalone, decentralized, fully offline controller | Static browser simulation loads critical libraries/assets from the public internet | `README.md:5,14`; `3D/index.html:51,176-177`; `3D/styles.css:1` |
| NodeMCU serves HTTP/WebSocket telemetry and commands | No firmware and no dashboard network client are present | `SYSTEM_GUIDE.md:38-40`; `3D/app.js` |
| ESP32-CAM supplies a live MJPEG stream | UI displays a remote Unsplash still image | `README.md:67`; `3D/index.html:50-51` |
| Critical water alarm cuts equipment power | Browser code only adds styles/logs and does not alter relay-like state | `SYSTEM_GUIDE.md:225-230`; `3D/app.js:578-607` |
| Seven-day accumulated light runtime triggers cleaning | Simulation adds 0.5 hours every second when UV **or filter** is active; filter starts active | `README.md:59-61`; `3D/app.js:14,405-420` |
| pH was replaced by TDS | README diagram/calibration and CSS names still reference pH | `README.md:34-36,145`; `3D/styles.css:236-281` |

### 8) Evidence

- `README.md`
- `SYSTEM_GUIDE.md`
- `PARTS.md`
- `3D/index.html`
- `3D/app.js`
- `3D/styles.css`
- `esp32Cam/esp32_cam_anywhere_streaming.md`
- `git log --since='90 days ago' --name-only` and repository scan terminal output
