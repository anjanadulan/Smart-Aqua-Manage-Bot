# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | Lowercase generic names for web assets; uppercase snake case for major guides; snake case in `esp32Cam/` | `app.js`, `SYSTEM_GUIDE.md`, `esp32_cam_anywhere_streaming.md` | Root and subdirectory listings |
| Functions/methods | camelCase, usually verb-first | `initThreeJS`, `triggerFeedCycle`, `updateTDSDisplay` | `3D/app.js` |
| Types/interfaces | No user-defined types or interfaces | `[TODO]` | `3D/app.js` |
| Constants/env vars | camelCase `const`; no environment variables; mutable system values live in `state` | `filterSwitch`, `circumference`, `state.nextFeedSeconds` | `3D/app.js:13-46`, `499-503` |
| DOM IDs/classes | kebab-case | `feed-override-btn`, `viewport-container` | `3D/index.html` |
| CSS custom properties | kebab-case with semantic color names | `--color-cyan`, `--text-secondary` | `3D/styles.css` |

### 2) Formatting and Linting

- Formatter: none configured.
- Linter: none configured.
- Most relevant enforced rules: none mechanically enforced. Observed JavaScript style is four-space indentation, semicolons, single-quoted strings, and brace-on-same-line functions.
- Run commands: `[TODO]` because there is no manifest or tooling configuration.

### 3) Import and Module Conventions

- Import grouping/order: not applicable; JavaScript uses browser globals loaded by script tags.
- Alias vs relative import policy: local CSS/JS references are relative; third-party libraries are absolute CDN URLs.
- Public exports/barrel policy: none; all application symbols share the page-global script scope.

### 4) Error and Logging Conventions

- Error strategy by layer: no explicit runtime error handling. DOM elements and global `THREE` APIs are assumed to exist; failures can stop initialization.
- Logging style and required context fields: in-page cards include category, severity-like CSS type, local timestamp, and message through `addLog` (`3D/app.js:526-547`). There is no persistent or console-based operational logging.
- Sensitive-data redaction rules: `[TODO]`; the current implementation has no credentials or device payloads.

### 5) Testing Conventions

- Test file naming/location rule: none established.
- Mocking strategy norm: none established; the Hardware Simulator UI manually changes state.
- Coverage expectation: `[TODO]`.

### 6) Evidence

- `3D/app.js`
- `3D/index.html`
- `3D/styles.css`
- Root repository scan terminal output (no lint/format config detected)
