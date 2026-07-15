# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | lowercase generic web files; snake_case C++ config names | `app.js`, `hardware_config.h` | `web/`, `firmware/` |
| JavaScript functions | camelCase, verb-first | `connectController`, `applyTelemetry` | `web/app.js` |
| C++ functions/variables | camelCase | `sampleSensors`, `waterLow` | `src/main.cpp` |
| C++ constants | uppercase snake case inside namespace | `FILTER_RELAY_PIN` | `hardware_config.h` |
| DOM IDs/classes | kebab-case | `filter-switch`, `event-card` | `web/` |

### 2) Formatting and Linting

- Formatter: none configured.
- Linter: none configured.
- Observed style: four-space indentation, braces on the same line, explicit semicolons, short focused helpers.
- Run commands: `node --check web/app.js`; PlatformIO compile is the firmware syntax/build check.

### 3) Import and Module Conventions

- C++ standard/framework headers precede local quoted headers.
- Web UI intentionally uses no third-party imports so it can run from LittleFS offline.
- JavaScript uses one strict classic script; no barrel or alias convention exists.

### 4) Error and Logging Conventions

- Firmware rejects malformed/unknown commands with negative acknowledgements and emits typed controller events.
- Web UI parses network JSON defensively, reports protocol/network failures, and uses DOM `textContent` for untrusted messages.
- Serial logs use bracketed categories; UI events contain category, level, time, and message.
- Credentials remain in ignored `secrets.h`; do not log them.

### 5) Testing Conventions

- Browser checks cover simulator mode, manual confirmation, safety lockout, and mobile overflow.
- Firmware changes should pass `pio run` before flashing and receive bench tests with mains loads disconnected.
- Hardware calibration values must not be copied between sensor modules without measurement.
- Coverage threshold: `[TODO]`.

### 6) Evidence

- `web/app.js`
- `web/styles.css`
- `firmware/esp32-controller/src/main.cpp`
- `firmware/esp32-controller/include/hardware_config.h`
- `firmware/esp32-controller/.gitignore`
