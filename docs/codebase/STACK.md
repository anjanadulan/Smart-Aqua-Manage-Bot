# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary languages | Arduino C++, browser JavaScript, HTML, CSS | `firmware/esp32-controller/src/main.cpp`, `web/` |
| Runtime + target | ESP32 DevKit using Arduino framework; modern browser | `firmware/esp32-controller/platformio.ini`, `web/app.js` |
| Package manager | PlatformIO Library Registry for firmware; no Web UI packages | `firmware/esp32-controller/platformio.ini` |
| Build system | PlatformIO with LittleFS Web UI image | `firmware/esp32-controller/platformio.ini`, `scripts/sync_webui.py` |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| Arduino-ESP32 | Platform-selected | ESP32 runtime, Wi-Fi, HTTP, LittleFS, Preferences | `platformio.ini`, `src/main.cpp` |
| links2004/WebSockets | Platform-selected | WebSocket telemetry and commands on port 82 | `platformio.ini`, `src/main.cpp` |
| ArduinoJson | Platform-selected | JSON protocol serialization | `platformio.ini`, `src/main.cpp` |
| ESP32Servo | Platform-selected | Feeder servo control | `platformio.ini`, `src/main.cpp` |
| Browser DOM/CSS APIs | Browser-provided | Dependency-free operational dashboard | `web/index.html`, `web/app.js`, `web/styles.css` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| PlatformIO | Firmware dependency resolution, compile, upload, LittleFS upload | `firmware/esp32-controller/platformio.ini` |
| Git | Version control | `.git/` |
| Node.js syntax check | Static JavaScript parse verification | Analysis terminal output |
| Playwright with local Chrome | Browser interaction and responsive smoke checks | Analysis terminal output |

### 4) Key Commands

```powershell
cd firmware/esp32-controller
pio run
pio run -t upload
pio run -t uploadfs
pio device monitor
node --check ../../web/app.js
```

### 5) Environment and Config

- Wi-Fi/AP secrets: local ignored `firmware/esp32-controller/include/secrets.h`, copied from `secrets.example.h`.
- Hardware calibration and polarity: `include/hardware_config.h`.
- Web UI connection/camera settings: browser `localStorage` through the Settings dialog.
- The Web UI has no internet-hosted runtime dependency and is suitable for LittleFS hosting.
- Exact library versions are not pinned yet: `[TODO]` before a reproducible release.

### 6) Evidence

- `firmware/esp32-controller/platformio.ini`
- `firmware/esp32-controller/src/main.cpp`
- `firmware/esp32-controller/include/hardware_config.h`
- `web/index.html`
- `web/app.js`
- `web/styles.css`
