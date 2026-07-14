# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|---------------------------|---------|------------|-------------|----------|
| cdnjs | CDN script | Loads Three.js r128 | None | High for current page startup | `3D/index.html:176` |
| jsDelivr | CDN script | Loads OrbitControls 0.128.0 | None | High for current page startup | `3D/index.html:177` |
| Google Fonts | CDN stylesheet/font assets | Loads UI fonts | None | Low | `3D/styles.css:1` |
| Unsplash | Remote image | Camera-preview placeholder | Query-string URL, no repository credential | Low | `3D/index.html:50-51` |
| NodeMCU WebSocket/HTTP | Intended local device API | Telemetry, commands, and dashboard hosting | `[TODO]` | High | `SYSTEM_GUIDE.md:38-40` (design only); absent from `3D/app.js` |
| ESP32-CAM MJPEG | Intended local video stream | Live aquarium preview | `[TODO]` | Medium | `SYSTEM_GUIDE.md:39`; current placeholder in `3D/index.html:51` |
| Tailscale/Husarnet/MediaMTX/go2rtc | Researched remote-access options, not selected or implemented | Potential remote camera access | `[TODO]` | `[TODO]` | `esp32Cam/esp32_cam_anywhere_streaming.md` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| Browser memory | Holds simulation, schedule, and alarm state | Global `state` object | All values reset on reload; not authoritative | `3D/app.js:13-25` |
| Persistent store | `[TODO]` None implemented | None | Maintenance/feed history cannot survive restart | No storage API or firmware source in repository |

### 3) Secrets and Credentials Handling

- Credential sources: none in the runnable dashboard.
- Hardcoding checks: public CDN/image URLs and conceptual local IPs/ports are hardcoded; no passwords, tokens, or API keys were found.
- Rotation or lifecycle notes: not applicable to the current page; `[TODO]` for future device/VPN/relay authentication.

### 4) Reliability and Failure Behavior

- Retry/backoff behavior: none for external assets; device integration is not implemented.
- Timeout policy: only simulation delays and periodic timers exist; no network timeout is configured.
- Circuit-breaker or fallback behavior: the camera has alt text but no programmatic fallback. If either Three.js CDN fails, `initThreeJS` will fail because `THREE` is assumed globally available.

### 5) Observability for Integrations

- Logging around external calls: no external calls are made by application JavaScript; asset load failures are not logged.
- Metrics/tracing coverage: none.
- Missing visibility gaps: no connectivity indicator tied to an actual device, no last-telemetry timestamp, no reconnect counter, no camera health state, and no command acknowledgement.

### 6) Evidence

- `3D/index.html`
- `3D/styles.css`
- `3D/app.js`
- `SYSTEM_GUIDE.md`
- `esp32Cam/esp32_cam_anywhere_streaming.md`
