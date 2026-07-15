# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary automated test framework: none committed yet.
- Current checks: Node.js syntax check and Playwright/Chrome smoke checks run during implementation.
- Commands:

```powershell
node --check web/app.js
cd firmware/esp32-controller
pio run
```

### 2) Test Layout

- No committed test directory exists.
- Browser validation currently executes externally against a local static server.
- Firmware bench procedures are described in the controller README and prototype safety gates.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Static JavaScript | Yes | `web/app.js` parse | Passed with Node.js |
| Browser smoke | Partial | Simulator, feed confirmation, low-water lockout, mobile overflow | Passed in headless Chrome at 390 px; desktop visually inspected |
| Firmware compile | No | ESP32 PlatformIO project | PlatformIO is not installed in the current workspace runtime |
| Hardware-in-loop | No | Sensors, relay polarity, servo, Wi-Fi recovery | Required before connecting mains loads |
| Remote camera | No | MJPEG/Tailscale/MediaMTX latency | Requires deployed camera and gateway hardware |

### 4) Mocking and Isolation Strategy

- The Web UI simulator implements the same command entry point used by the WebSocket connection.
- `applyTelemetry` accepts complete or partial telemetry payloads for state testing.
- Browser event cards use `textContent`, allowing safe synthetic network messages.
- Hardware tests must begin with relay loads disconnected and measured at logic level.

### 5) Coverage and Quality Signals

- Coverage tool + threshold: `[TODO]`.
- Current reported coverage: `[TODO]`.
- Verified signals: no JavaScript syntax error; no page error in the smoke flow; no mobile horizontal overflow; low-water controls lock correctly.
- Highest-priority gaps: firmware compilation, relay polarity, sensor disconnection, power-cycle timing, WebSocket authentication, and camera latency.

### 6) Evidence

- `web/app.js`
- `web/index.html`
- `firmware/esp32-controller/src/main.cpp`
- Implementation terminal output from Node.js and Playwright checks
