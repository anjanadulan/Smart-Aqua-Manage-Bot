# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: single-page, event-driven browser simulation with shared mutable state.
- Why this classification: `3D/app.js` initializes one global `state` object, attaches DOM listeners, runs timer/render loops, and directly updates both Three.js objects and DOM elements.
- Primary constraints: no build/module system; runtime libraries are globals from CDNs; no implemented device transport or firmware; all simulation logic is in one 652-line JavaScript file.

The intended deployed architecture is different: the documentation describes a distributed local system with NodeMCU firmware serving HTTP/WebSockets and an ESP32-CAM serving MJPEG. That architecture is conceptual because corresponding firmware and transport code are absent.

### 2) System Flow

Current implemented flow:

```text
index.html -> DOMContentLoaded -> global simulation state -> timers/user events -> DOM + Three.js render output
```

1. `3D/index.html` creates the dashboard controls and loads Three.js, OrbitControls, and `app.js`.
2. `DOMContentLoaded` calls scene initialization, event setup, simulator setup, and telemetry timers (`3D/app.js:49-60`).
3. Controls and simulator inputs mutate the shared `state` object (`3D/app.js:340-388`, `614-651`).
4. Timer callbacks simulate feeding, algae accumulation, and TDS changes (`3D/app.js:394-467`).
5. `requestAnimationFrame` reads state and updates the water mesh, UV light, bubbles, glass opacity, and cleaner position (`3D/app.js:241-324`).
6. DOM helpers update gauges, countdowns, status text, and timeline cards (`3D/app.js:485-608`).

Intended, unimplemented flow from `SYSTEM_GUIDE.md`:

```text
sensors/dashboard command -> NodeMCU firmware -> safety/schedule logic -> actuators + WebSocket telemetry -> dashboard
ESP32-CAM -> HTTP MJPEG stream -> dashboard
```

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| HTML shell | UI structure and control identifiers | Hardware state transitions | `3D/index.html` |
| CSS presentation | Three-panel layout, controls, alerts, responsive rules | Domain/safety decisions | `3D/styles.css` |
| Simulation state/controller | Current browser-only state, input handlers, timers, UI updates | Claims of physical actuation | `3D/app.js` |
| Three.js renderer | Aquarium visualization and animation | Authoritative sensor values | `3D/app.js:66-334` |
| NodeMCU controller | `[TODO]` Intended sensor polling, safety, schedules, HTTP/WebSocket, and actuator control | `[TODO]` | `SYSTEM_GUIDE.md:38-115` (design only) |
| ESP32-CAM | `[TODO]` Intended MJPEG capture/server | `[TODO]` | `README.md:66-67`, `SYSTEM_GUIDE.md:39` (design only) |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Shared state object | `3D/app.js:13-25` | Provides one source for simulated UI/scene state |
| Observer/event callbacks | `3D/app.js:49`, `340-388`, `614-651` | Responds to browser lifecycle and user inputs |
| Game/render loop | `3D/app.js:241-324` | Continuously animates Three.js objects |
| Cooperative timer callbacks | `3D/app.js:394-467` | Simulates scheduler behavior without blocking the browser |
| Guarded singleton alert card | `3D/app.js:550-573`, `577-607` | Prevents duplicate active cleaning/water alerts |

### 5) Known Architectural Risks

- The dashboard has no `WebSocket`, `fetch`, or other implemented NodeMCU connection, so control actions only mutate browser state while the UI labels the local loop active.
- No firmware source exists, so safety, scheduling, sensor calibration, relay defaults, persistence, and restart behavior cannot be verified.
- `3D/app.js` combines scene construction, animation, simulation, domain rules, alerts, and DOM manipulation, increasing change coupling.
- Browser state is ephemeral; feed/algae timers reset on refresh and cannot be authoritative for maintenance scheduling.

### 6) Evidence

- `3D/index.html`
- `3D/app.js`
- `SYSTEM_GUIDE.md`
- `README.md`
