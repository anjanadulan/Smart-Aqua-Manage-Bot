# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|---------------------------|---------|------------|-------------|----------|
| ESP32 WebSocket :82 | Local device API | Telemetry, events, commands, clock sync | None yet; trusted LAN/private route | High | `src/main.cpp`, `web/app.js` |
| ESP32 HTTP :80 | Local HTTP | Hosts dependency-free Web UI from LittleFS | None yet | High | `src/main.cpp` |
| ESP32-CAM MJPEG | Local HTTP video | Prototype live video | None in base example | Medium | `firmware/esp32-cam/README.md` |
| Tailscale subnet router | Private network route | Anywhere access without port forwarding | Tailnet identity and ACLs | Medium | `PROTOTYPE.md` |
| MediaMTX | Optional WebRTC gateway | Public-browser low-latency playback | `[TODO]` HTTPS/auth deployment | Optional | `PROTOTYPE.md`, Web UI settings |
| Browser Notifications | Browser API | Visible safety notifications while UI is available | User permission | Medium | `web/app.js` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| ESP32 Preferences | Persists UV operating mode and last feed timestamp | Firmware | Does not provide wall-clock time after total power loss | `src/main.cpp` |
| Browser localStorage | Persists connection/camera settings | Web UI | Per-browser only | `web/app.js` |
| LittleFS | Stores Web UI assets | ESP32 HTTP server | Must upload filesystem after UI change | `platformio.ini`, `src/main.cpp` |

### 3) Secrets and Credentials Handling

- Wi-Fi and fallback-AP credentials live in ignored `include/secrets.h`.
- `secrets.example.h` contains placeholders only.
- No remote gateway, webhook, or camera credential is stored in firmware yet.
- Device command authentication and secret rotation are `[TODO]`.

### 4) Reliability and Failure Behavior

- Browser reconnects with exponential backoff capped at 15 seconds.
- Telemetry older than 10 seconds is marked stale.
- Local automation remains on the ESP32 when browser/network connectivity fails.
- Tailscale may use direct, peer-relay, or DERP paths; latency depends on the established path.
- Camera failure is shown independently and does not block controls.

### 5) Observability for Integrations

- Firmware serial logs and WebSocket events report system/safety/command transitions.
- UI exposes live/offline/simulator state and telemetry age.
- Missing: retained event history, device metrics, remote delivery acknowledgement, camera frame-rate/latency metrics.

### 6) Evidence

- `firmware/esp32-controller/src/main.cpp`
- `firmware/esp32-controller/include/secrets.example.h`
- `web/app.js`
- `PROTOTYPE.md`
