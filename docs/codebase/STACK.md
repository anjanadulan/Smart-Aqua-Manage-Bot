# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | Browser JavaScript, HTML, and CSS | `3D/app.js`, `3D/index.html`, `3D/styles.css` |
| Runtime + version | Web browser with WebGL and modern DOM APIs; exact supported browser/version is `[TODO]` | `3D/app.js`, `3D/index.html` |
| Package manager | None configured | No repository manifest or lock file; repository scan and root file listing |
| Module/build system | None; classic scripts and a directly opened/served HTML page | `3D/index.html:174-178` |

The repository also contains C++-style firmware pseudocode, but no compilable microcontroller firmware or Arduino/PlatformIO manifest is present.

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| Three.js | r128 / 0.128.0 | WebGL aquarium scene and animation | `3D/index.html:176`, `3D/app.js:66-324` |
| Three.js OrbitControls | 0.128.0 | Interactive camera orbiting | `3D/index.html:177`, `3D/app.js:87-92` |
| Google Fonts | CDN-selected families; version not pinned | Inter, Outfit, and Share Tech Mono typography | `3D/styles.css:1` |
| Unsplash image endpoint | Unversioned remote asset | Placeholder in the ESP32-CAM preview | `3D/index.html:50-51` |

These are remote browser dependencies; none is vendored in the repository.

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| Git | Version history | `.git/` and `git log` terminal output |
| `[TODO]` | No formatter, linter, test runner, bundler, or firmware toolchain is configured | Root scan found no relevant manifests/configs |

### 4) Key Commands

There are no repository-defined install, build, test, or lint commands.

```powershell
# Optional local preview using any static HTTP server; no canonical command is defined.
# [TODO] Select and document the supported preview/deployment command.
```

### 5) Environment and Config

- Config sources: hardcoded JavaScript state in `3D/app.js`; hardcoded CDN/image URLs in `3D/index.html` and `3D/styles.css`.
- Required env vars: none read by the current implementation.
- Deployment/runtime constraints: JavaScript must run in a browser with WebGL; a fresh load currently requires internet access for Three.js, OrbitControls, fonts, and the preview image.
- Firmware runtime, exact ESP board target, board definitions, and library versions: `[TODO]` because firmware is not present.

### 6) Evidence

- `3D/index.html`
- `3D/app.js`
- `3D/styles.css`
- `SYSTEM_GUIDE.md`
- Root repository scan and file listing terminal output
