# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `web/` | Source Web UI shared by local preview and ESP32 LittleFS | `index.html`, `styles.css`, `app.js` |
| `firmware/esp32-controller/` | ESP32 DevKit controller project | `platformio.ini`, `src/main.cpp` |
| `firmware/esp32-cam/` | Camera flashing and remote-access guide | `README.md` |
| `docs/codebase/` | Maintainer-oriented architecture and risk documentation | Files in this directory |
| `PROTOTYPE.md` | Approved prototype decisions and operating constraints | `PROTOTYPE.md` |
| `README.md` | Product overview | `README.md` |
| `SYSTEM_GUIDE.md`, `PARTS.md` | Earlier conceptual design, marked legacy where it conflicts | Warning blocks in both files |
| `esp32Cam/` | Untracked camera research notes | `git status --short` |

### 2) Entry Points

- Firmware runtime: `firmware/esp32-controller/src/main.cpp` through Arduino `setup()` and `loop()`.
- Web UI runtime: `web/index.html` and its `DOMContentLoaded` listener in `web/app.js`.
- Camera runtime: Espressif CameraWebServer example configured outside this repository; steps in `firmware/esp32-cam/README.md`.
- PlatformIO selects the `esp32dev` environment and copies `web/` assets into generated LittleFS data before building.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| ESP32 controller | Authoritative safety, schedules, sensors, relay/servo outputs, protocol | Browser-only authority for automatic behavior |
| Web UI | Operator controls, telemetry rendering, notifications, simulator | Direct assumptions that a command succeeded before acknowledgement |
| Hardware config | Pins, polarity, timings, calibration thresholds | Credentials |
| Secrets | Local Wi-Fi/AP credentials | Tracked source control |
| ESP32-CAM | Video capture/streaming | Main safety and scheduling logic |

### 4) Naming and Organization Rules

- Firmware files and directories use lowercase or snake_case; C++ constants use uppercase snake case.
- Web JavaScript uses camelCase; DOM IDs and CSS classes use kebab-case.
- Generated `firmware/esp32-controller/data/` and `.pio/` are ignored.
- Local Web UI assets remain in `web/` as the single editable source.

### 5) Evidence

- `firmware/esp32-controller/platformio.ini`
- `firmware/esp32-controller/scripts/sync_webui.py`
- `firmware/esp32-controller/.gitignore`
- `web/index.html`
- `PROTOTYPE.md`
