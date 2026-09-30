# Validation

Checked September 29, 2026.

## Automated checks

- `npm test`: 17 tests passed. Covers pressure estimation, progressive closure, scale/rotation/mirroring invariance, malformed landmarks, smoothing, camera denial, cancellation, restart races, disposal, and disconnection. Additional tests verify stable pressure springs, shape-specific deformation/recovery, unit local volume Jacobians, fracture persistence, and healing.
- `npm run build`: passed. Produces a static `dist/` directory with relative URLs and all application JavaScript bundled locally. The Three.js vendor chunk is approximately 547 kB uncompressed / 136 kB gzip; Vite reports a non-blocking chunk-size advisory.
- Dependency installation audit reported zero known vulnerabilities at the time of installation.

## Browser verification

Used installed Google Chrome in headless mode through Playwright. No real camera was accessed.

- Desktop 1440 × 1000: scene renders; mouse hold reaches 100%; release returns to 0%.
- Mobile 390 × 844: layout stays within the viewport; squishy and controls remain visible and usable.
- Production build served under `/wax-room/` (matching a repository GitHub Pages subpath): page, CSS, JavaScript, favicon, and open-source credits resolve.
- Space key squeeze/release, pressure slider, palette changes, mute toggle, and reset all passed.
- No uncaught page errors during the above checks.
- Actual MediaPipe JavaScript, WASM, and hand model loaded successfully. A synthetic camera stream reached the real video inference loop and the “Show your hand to the camera” state.
- Switching to Manual stopped every camera track.
- Simulated browser permission denial displayed actionable fallback text and restored the Enable camera button.
- Desktop, compressed-object, and mobile screenshots were visually reviewed. Local screenshots are in ignored `test-results/`.

## Remaining real-device checks

Live fist/open-palm tracking accuracy, audible crackle quality, physical touchscreens, Safari/Firefox, and GPU performance across older devices have not been verified. Real hand-tracking quality depends on visibility, camera angle, and lighting. The unit tests use synthetic landmarks and the browser test uses a synthetic camera, so neither substitutes for a real-hand session.

The project was initially delivered locally. The user subsequently authorized replacing LifeDisparity/LifeDisparity.github.io and deploying this version through its GitHub Pages Actions workflow.

## Squishy and pixel UI update

- Added Butter, Platypus, Lychee, and Mangosteen selectors and individually modeled accessories.
- All four toys were checked at rest, light/mid pressure, full compression, and bare (wax-off) compression in Chrome.
- The scene engine was checked directly: all four types have fractured cells at 18% pressure; wax-off mode has zero fractured cells and emits no fracture callbacks; release heals the shell; switching toys retains the wax preference.
- Automated UI checks passed for each toy's selection, wax switch, pressure, and reset, plus keyboard controls, sound toggle, and 390px mobile layout without horizontal overflow.
- Source camera inference and grip estimation remain unchanged from the version the user tested successfully.
- The physical appearance remains a procedural toy approximation. Different geometries use different constitutive profiles; there is no collision solver or finite-element material model.
