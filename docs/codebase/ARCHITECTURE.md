# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: local-first embedded controller with an event-driven browser client.
- Why this classification: the ESP32 owns sensor polling, fail-safe output state, feeding, UV scheduling, HTTP hosting, and WebSocket telemetry; the browser renders state and sends acknowledged commands.
- Primary constraints: unreliable internet must not stop local automation; relays must boot safe; ESP32 resources are limited; wall-clock UV scheduling requires valid time.

### 2) System Flow

```text
sensors -> ESP32 safety/schedule loop -> relays/servo -> JSON telemetry/events -> Web UI -> acknowledged operator commands
ESP32-CAM -> MJPEG or gateway WebRTC -> Web UI
```

1. The ESP32 boots both relays off, initializes sensors and feeder state, and starts AP/station networking.
2. A 250 ms loop samples water-level, IR, and turbidity inputs and immediately forces filtration off on low water.
3. Feeding uses a six-hour controller timer; scheduled feeds consult IR while manual feeds bypass it.
4. UV auto mode evaluates the 18:00-06:00 local window only when clock state is valid.
5. Telemetry is broadcast every second; state changes also produce typed events.
6. The Web UI reconnects with backoff, synchronizes clock time, renders telemetry, and sends versioned JSON-shaped commands.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Sensor/safety loop | Sampling, low-water lockout, clarity transition events | Visual presentation | `src/main.cpp` |
| Output/schedule logic | Relay state, feeder, UV window | Remote camera transport | `src/main.cpp` |
| WebSocket protocol | Telemetry, events, acknowledgements, clock sync | Secrets | `src/main.cpp`, `web/app.js` |
| Web UI | Connection state, controls, notifications, camera embedding, simulator | Authoritative safety state | `web/app.js` |
| ESP32-CAM | Camera capture and MJPEG | Aquarium automation | `firmware/esp32-cam/README.md` |
| Tailscale/MediaMTX gateway | Optional remote routing or WebRTC playback | Physical actuation rules | `PROTOTYPE.md` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Safe default | Relay setup writes OFF before networking | Avoids startup actuation |
| Safety interlock | `setFilterOutput` and `sampleSensors` | Prevents filtering under low water |
| Event transition detection | Previous/current sensor flags | Avoids repeated alert flooding |
| Command acknowledgement | `sendAck` and `requestId` | Distinguishes requested from applied state |
| Exponential reconnect | `scheduleReconnect` | Recovers browser connection without tight retry loops |
| Simulator adapter | `applySimulatorCommand` | Supports UI demonstration without hardware |

### 5) Known Architectural Risks

- Browser clock sync cannot restore correct night time after a fully offline power loss; add a DS3231 RTC for that requirement.
- WebSocket commands are unauthenticated on the local network; remote access must remain inside an authenticated private route until device authentication exists.
- The feeder uses short blocking servo delays; acceptable for the prototype, but a non-blocking actuator state machine is preferable.
- CNC cleaning remains disabled because motor pins, homing, limit switches, and emergency-stop behavior are unresolved.
- Browser notifications only work while a connected browser context is available; background push delivery requires a selected notification service.

### 6) Evidence

- `firmware/esp32-controller/src/main.cpp`
- `firmware/esp32-controller/include/hardware_config.h`
- `web/app.js`
- `PROTOTYPE.md`
