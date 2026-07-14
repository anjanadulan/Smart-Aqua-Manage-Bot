# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `3D/` | Runnable static dashboard simulation | `3D/index.html`, `3D/app.js`, `3D/styles.css` |
| `esp32Cam/` | Untracked design notes for remote camera-streaming options; no implementation | `esp32Cam/esp32_cam_anywhere_streaming.md`, `esp32Cam/conversation_history.md`, `git status --short` output |
| `docs/codebase/` | Repository analysis produced from verified source/config/history evidence | The seven files in this directory |
| `README.md` | Product vision, functional specification, UI description, and safety disclaimers | `README.md` |
| `SYSTEM_GUIDE.md` | Conceptual network, firmware scheduler, data-flow, and physical-layout guide | `SYSTEM_GUIDE.md` |
| `PARTS.md` | Bill of materials, power diagram, wiring diagram, and proposed pin map | `PARTS.md` |
| `Concept.png` | System concept illustration referenced by the README | `README.md:8`, `Concept.png` |

### 2) Entry Points

- Main runtime entry: `3D/index.html`.
- JavaScript entry: the `DOMContentLoaded` callback in `3D/app.js:49-60`.
- Secondary entry points: none implemented. The NodeMCU and ESP32-CAM entry points described in the documentation are `[TODO]` because no firmware source exists.
- How entry is selected: `3D/index.html:176-178` loads two CDN scripts and then `app.js` as classic scripts.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `3D/index.html` | Dashboard semantics, controls, telemetry containers, script/style references | Device-control algorithms or secrets |
| `3D/styles.css` | Responsive layout and visual presentation | Runtime state or hardware behavior |
| `3D/app.js` | Simulation state, Three.js scene, DOM events, timers, alerts | Actual firmware behavior unless a network adapter is explicitly added |
| Root Markdown files | Product intent, wiring, and conceptual operating behavior | Claims that behavior is implemented unless corresponding source exists |
| `esp32Cam/` | Camera connectivity research | Production camera credentials or undocumented deployment state |

### 4) Naming and Organization Rules

- File naming pattern: mixed conventions: uppercase descriptive Markdown names (`SYSTEM_GUIDE.md`, `PARTS.md`), lowercase web entry files (`index.html`, `app.js`, `styles.css`), and snake_case camera notes.
- Directory organization pattern: artifact-based rather than layered; the only runnable application is grouped under `3D/`.
- Import aliasing or path conventions: no module imports or aliases. CSS and application script use relative paths; runtime libraries use absolute CDN URLs.

### 5) Evidence

- Root file listing and repository scan terminal output
- `3D/index.html`
- `3D/app.js`
- `README.md`
- `SYSTEM_GUIDE.md`
- `PARTS.md`
