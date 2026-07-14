# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: none configured.
- Assertion/mocking tools: none configured.
- Commands:

```powershell
# No repository-defined all/unit/integration/e2e/coverage commands exist.
# JavaScript parse check used during analysis:
node --check 3D/app.js
```

The parse check passed, but it does not execute DOM, WebGL, timer, or hardware behavior.

### 2) Test Layout

- Test file placement pattern: no test files or directories found.
- Naming convention: none established.
- Setup files and where they run: none.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | No | Countdown formatting, TDS mapping, state transitions | Logic is embedded in DOM/global functions |
| Integration | No | DOM + Three.js, future WebSocket/device adapter | No automated browser or device test harness |
| E2E | No | Feed, low-water shutdown, cleaning, reconnect flows | Hardware simulator is manual, not an automated test |
| Hardware-in-loop | No | Relays, servo, sensors, steppers, camera | No firmware or HIL configuration exists |

### 4) Mocking and Isolation Strategy

- Main mocking approach: manual browser simulator controls for water level, TDS, and IR obstacle state (`3D/index.html:139-172`, `3D/app.js:614-651`).
- Isolation guarantees: none; timers and animation loops share the single global state object.
- Common failure mode in tests: `[TODO]` because there is no test history. Likely test seams first require separating pure state transitions from DOM and Three.js side effects.

### 5) Coverage and Quality Signals

- Coverage tool + threshold: `[TODO]` (none configured).
- Current reported coverage: `[TODO]` (no report).
- Known gaps: every application path lacks automated coverage; especially low-water safety behavior, feed/clean mutual exclusion, timer resets, CDN failure, responsive layout, and future WebSocket reconnect/acknowledgement behavior.
- Current static signal: `node --check 3D/app.js` completed successfully on 2026-07-14.

### 6) Evidence

- `3D/app.js`
- `3D/index.html`
- Repository scan and `rg --files -g '*test*' -g '*spec*'` terminal output
- Node syntax-check terminal output
