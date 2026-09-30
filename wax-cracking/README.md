# Wax Room

GitHub Pages target: [lifedisparity.github.io](https://lifedisparity.github.io/)

A browser-based wax-cracking squishy inspired by the supplied Blender video. Close your hand on camera to compress a butter bar, platypus, lychee, mangosteen, chocolate bar, snail, or chubby teddy bear and crack its wax shell; open your hand to let it recover. The UI has a soft pixel-art style; the toys remain smooth 3D objects.

The simulation uses a damped pressure spring, volume-preserving deformation, earlier local fracture thresholds, and thin wax plates that remain close to the soft center. Butter uses a localized pinch and slow recovery; platypus has a softer asymmetric belly and bouncier response; lychee has a radial squash with quick recovery; mangosteen compresses less and returns more slowly; chocolate has a firm, springy snap; the snail and teddy squash deep and rise back slowly. New toys are self-contained plug-ins in `src/squishies/` (see its README).

Cracks persist during a squeeze and heal after release for repeatable play. This is a real-time visual approximation, not a finite-element material simulation or the original Blender model.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. To verify the production build:

```sh
npm test
npm run build
npm run preview
```

Do not open `index.html` directly through `file://`; use a server.

## Controls

- **Hand tracking:** click **Enable camera**, grant permission, and show a well-lit open palm. Slowly close four fingers into a fist. Open your hand to release. One hand is tracked at a time.
- **Mouse / touch:** press and hold the squishy or the manual squeeze button. Release to relax.
- **Keyboard:** focus the squishy and hold Space, or adjust the pressure slider with arrow keys.
- **Pressure slider:** set a steady squeeze amount. Active camera tracking resumes control when you finish adjusting it.
- **Wax switch:** turn the coating on or off from the top-left of the play area. Wax-off mode keeps the soft toy and its motion, without fractures or crackling. This choice stays in effect when switching toys.
- **Squishies:** choose Butter, Platypus, Lychee, or Mangosteen from the toy shelf. Switching toys releases the current squeeze.
- **Colors:** the butter bar also offers yellow, sage, lavender, and peach wax.
- **Sound:** synthetic snaps follow newly fractured wax cells, with a quieter rubbing texture as compressed wax moves. The first click, touch, or key interaction unlocks audio.
- **Start fresh:** release pressure and reform the bar. If camera tracking remains on, its next frame will resume control.

## Publish on GitHub Pages

The project is ready for repository Pages URLs such as `https://your-name.github.io/wax-room/`; Vite emits relative asset URLs.

1. Create or choose a GitHub repository and upload this project, including hidden `.github/workflows/deploy.yml`, `package.json`, and `package-lock.json`. Do not upload `node_modules` or the reference video.
2. Open the repository's **Settings → Pages** and select **GitHub Actions** as the build source.
3. Push to `main` or `master`, or run **Deploy Wax Room to GitHub Pages** from the Actions tab.
4. Open the URL shown by the successful deployment.

The workflow installs locked dependencies, runs the tests, builds `dist`, and publishes that folder. No backend, API key, database, or paid hosting is required. See [GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

If you prefer another static hosting service, publish the contents of `dist` after `npm run build`.

## Privacy and compatibility

Camera access occurs only after **Enable camera**. Frames and landmarks are processed in the browser, never recorded or uploaded by this app. Microphone access is never requested. Turning off the camera or choosing Manual stops the camera tracks. Camera permission requires HTTPS or localhost; GitHub Pages supplies HTTPS.

An internet connection is needed for Google Fonts and the first hand-tracking load: pinned MediaPipe WASM files are fetched from jsDelivr and the hand landmark model from Google Storage. These hosts receive ordinary asset requests, not camera frames. Manual play does not depend on the hand-tracking model. Fonts have local fallbacks. Modern WebGL-capable Chrome, Edge, Firefox, and Safari are intended targets; browser camera policies and hardware vary.

## Source and reuse

- [Three.js](https://github.com/mrdoob/three), MIT: installed renderer, math, materials, lighting, and geometry primitives.
- [MediaPipe](https://github.com/google-ai-edge/mediapipe), Apache-2.0: installed hand detection/inference implementation.
- [Official MediaPipe browser samples](https://github.com/google-ai-edge/mediapipe-samples-web), Apache-2.0: initialization and video inference pattern used as a reference.
- [Voronoi Fracture](https://github.com/nayrrod/voronoi-fracture), [Javascript-Voronoi](https://github.com/gorhill/Javascript-Voronoi), and [three-pinata](https://github.com/dgreenheck/three-pinata) were evaluated during GitHub research. Their code is **not** included; this app's small reversible shell generator is original and avoids the legacy APIs / heavier destructive physics of those examples.

See `public/THIRD_PARTY_NOTICES.txt` and `public/licenses/` for distributed licenses. The user's reference video is not copied into or distributed with the website.

## Project structure

```text
src/main.js            Interface, pressure state, and input controls
src/style.css          Responsive pastel / pixel UI
src/ui.js             Interface markup and pixel toy icons
src/squishy-models.js  Toy definitions and smooth 3D accessories
src/wax-physics.js     Pressure spring, deformation, and fracture state
src/wax-scene.js       Three.js wax plates, soft core, and lighting
src/hand-tracking.js   Camera lifecycle and MediaPipe inference
src/gesture.js         Scale/rotation-invariant grip estimation
src/sound.js           Original synthesized crackling
tests/                Gesture, camera lifecycle, and wax dynamics tests
.github/workflows/    GitHub Pages deployment
```

## Validation

`npm test` covers open/fist estimation, progressive grip, rotation/scale invariance, missing landmarks, smoothing, permission denial, cancelled camera requests, restart races, disposal, and disconnected cameras. Browser verification and its limits are recorded in `VALIDATION.md`.
