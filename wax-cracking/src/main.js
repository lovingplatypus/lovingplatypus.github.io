import './style.css';
import { renderUI } from './ui.js';
import { createWaxScene } from './wax-scene.js';
import { createCrackle } from './sound.js';
import { SQUISHY_TYPES, getSquishySpec } from './squishy-models.js';

const icons = {
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  camera: '<rect x="3" y="6" width="13" height="13" rx="3"/><path d="m16 10 5-3v11l-5-3"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  hand: '<path d="M8 12V5a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10c0 5-3 7-7 7-3 0-5-2-7-5l-3-5a2 2 0 0 1 3-2l2 2Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/>',
  pointer: '<path d="m5 3 14 10-7 1-3 7-4-18Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

document.querySelector('#app').innerHTML = renderUI(icon);

const $ = (selector) => document.querySelector(selector);
const playArea = $('.play-area');
const pressureSection = $('.pressure-section');
const pressureInput = $('#pressure');
const pressureValue = $('#pressure-value');
const sound = createCrackle();
sound.setToy('butter');
let targetPressure = 0;
let currentPressure = 0;
let held = false;
let sliderActive = false;
let mode = 'hand';
let tracking;
let cameraActive = false;
let cameraRequest = 0;
let soundEnabled = true;
let activeSquishy = 'butter';
let waxEnabled = true;
let visual;
try {
  visual = createWaxScene($('#scene'), {
    onError: () => { $('#scene-error').hidden = false; },
    onCrack: (event) => sound.fracture(event),
  });
} catch (error) {
  $('#scene-error').hidden = false;
  console.error('3D initialization:', error);
}

function updateCameraButton() {
  $('#camera-toggle').innerHTML = `${icon('camera')}<span>${cameraActive ? 'Turn off camera' : 'Enable camera'}</span>${icon('arrow')}`;
  $('#camera-toggle').setAttribute('aria-pressed', String(cameraActive));
}
function stopCamera() {
  cameraRequest++;
  tracking?.stop();
  cameraActive = false;
  $('#tracking-status').textContent = 'Camera off. Use the squeeze control or enable your camera.';
  $('#camera-preview').classList.remove('is-live');
  $('#camera-badge').hidden = true;
  updateCameraButton();
  targetPressure = 0;
}

function setMode(nextMode) {
  if (nextMode === mode) return;
  mode = nextMode;
  $('#mode-hand').setAttribute('aria-pressed', String(mode === 'hand'));
  $('#mode-manual').setAttribute('aria-pressed', String(mode === 'manual'));
  $('#camera-panel').hidden = mode !== 'hand';
  $('#manual-panel').hidden = mode !== 'manual';
  if (mode === 'manual') {
    stopCamera();
    $('#tracking-status').textContent = 'Your pace. Hold to squeeze, release to relax.';
  } else {
    $('#tracking-status').textContent = 'No camera needed to try it. Hold the squishy.';
  }
}
$('#mode-hand').addEventListener('click', () => setMode('hand'));
$('#mode-manual').addEventListener('click', () => setMode('manual'));
$('#camera-toggle').addEventListener('click', async () => {
  sound.unlock();
  if (cameraActive) { stopCamera(); return; }
  cameraActive = true;
  updateCameraButton();
  const request = ++cameraRequest;
  $('#tracking-status').textContent = 'Loading hand tracking. This may take a moment…';
  try {
    const { createHandTracking } = await import('./hand-tracking.js');
    if (request !== cameraRequest) return;
    tracking ||= createHandTracking({
      video: $('#camera-video'), canvas: $('#hand-overlay'),
      onPressure: (value) => { if (!held && !sliderActive && cameraActive) targetPressure = value; },
      onStatus: ({ state, message }) => {
        $('#tracking-status').textContent = message;
        const live = state === 'tracking' || state === 'no-hand';
        $('#camera-preview').classList.toggle('is-live', live);
        $('#camera-badge').hidden = !live;
        if (state === 'error' || state === 'stopped') {
          cameraActive = false;
          targetPressure = 0;
          updateCameraButton();
        }
      },
    });
    await tracking.start();
    // stopCamera already cancelled the old session. Its eventual completion
    // must not stop a newer session that the user has started in the meantime.
  } catch (error) {
    if (request !== cameraRequest) return;
    stopCamera();
    $('#tracking-status').textContent = 'Camera tracking couldn’t load. Check your connection, or use Manual mode.';
    console.warn('Hand tracking:', error);
  }
});

function beginHold() { held = true; sound.unlock(); }
function endHold() { if (held) { held = false; targetPressure = 0; } }
for (const element of [$('#scene'), $('#hold-button')]) {
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    element.setPointerCapture(event.pointerId);
    beginHold();
  });
  element.addEventListener('pointerup', endHold);
  element.addEventListener('pointercancel', endHold);
  element.addEventListener('lostpointercapture', endHold);
  element.addEventListener('contextmenu', (event) => event.preventDefault());
}
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return;
  if (event.target.closest('input, select, textarea, a, button') && event.target !== $('#hold-button')) return;
  event.preventDefault();
  beginHold();
});
document.addEventListener('keyup', (event) => { if (event.code === 'Space') endHold(); });
window.addEventListener('blur', endHold);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { endHold(); targetPressure = 0; }
});
$('#pressure').addEventListener('pointerdown', () => { sliderActive = true; sound.unlock(); });
$('#pressure').addEventListener('input', (event) => { sound.unlock(); targetPressure = Number(event.target.value) / 100; });
$('#pressure').addEventListener('change', () => { sliderActive = false; });
$('#pressure').addEventListener('pointercancel', () => { sliderActive = false; });
$('#pressure').addEventListener('blur', () => { sliderActive = false; });
$('#reset').addEventListener('click', () => {
  held = false;
  targetPressure = 0;
  currentPressure = 0;
  visual?.reset();
  sound.reset();
});
$('#sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  sound.setEnabled(soundEnabled);
  $('#sound-toggle').innerHTML = `${icon(soundEnabled ? 'sound' : 'mute')}<span>Sound ${soundEnabled ? 'on' : 'off'}</span>`;
  $('#sound-toggle').setAttribute('aria-pressed', String(soundEnabled));
  $('#sound-toggle').setAttribute('aria-label', soundEnabled ? 'Sound on; click to mute' : 'Sound off; click to enable');
});
document.querySelectorAll('.swatch').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach((swatch) => {
      const active = swatch === button;
      swatch.classList.toggle('active', active);
      swatch.setAttribute('aria-pressed', String(active));
    });
    $('#material-name').textContent = button.dataset.name;
    visual?.setColor(button.dataset.color);
  });
});

$('#wax-toggle').addEventListener('click', () => {
  waxEnabled = !waxEnabled;
  sound.unlock();
  sound.reset();
  visual?.setWaxEnabled(waxEnabled);
  $('#wax-toggle').setAttribute('aria-checked', String(waxEnabled));
  $('#wax-label').textContent = waxEnabled ? 'Wax on' : 'Wax off';
  lastPercent = -1;
});

document.querySelectorAll('.squishy-choice').forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.squishy;
    if (id === activeSquishy || !SQUISHY_TYPES.some((toy) => toy.id === id)) return;
    activeSquishy = id;
    held = false;
    sliderActive = false;
    currentPressure = 0;
    targetPressure = 0;
    sound.reset();
    visual?.setSquishy(id);
    // Restart the stage's little welcome glow and retint it for the new toy.
    playArea.dataset.toy = id;
    playArea.classList.remove('is-switching');
    void playArea.offsetWidth;
    playArea.classList.add('is-switching');
    const spec = getSquishySpec(id);
    sound.setToy(id, spec.sound);
    for (const [name, value] of [['--glow', spec.ui?.glow], ['--glow-tint', spec.ui?.glowTint]]) {
      if (value) playArea.style.setProperty(name, value); else playArea.style.removeProperty(name);
    }
    $('#material-name').textContent = spec.name;
    $('#squishy-number').textContent = String(SQUISHY_TYPES.findIndex((toy) => toy.id === id) + 1).padStart(2, '0');
    $('#scene').setAttribute('aria-label', `${spec.name} ${waxEnabled ? 'wax-coated' : 'soft'} squishy. Hold mouse, touch, or Space to squeeze; release to relax.`);
    document.querySelector('.swatches').hidden = id !== 'butter';
    document.querySelectorAll('.squishy-choice').forEach((choice) => {
      const active = choice === button;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
    // Each toy starts with its own material; the butter palette resets too.
    document.querySelectorAll('.swatch').forEach((swatch, index) => {
      swatch.classList.toggle('active', index === 0);
      swatch.setAttribute('aria-pressed', String(index === 0));
    });
  });
});

playArea.addEventListener('animationend', (event) => {
  if (event.animationName === 'stage-welcome') playArea.classList.remove('is-switching');
});

let previousTime = performance.now();
let lastPercent = -1;
function animate(now) {
  const dt = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  if (held) targetPressure = Math.min(1, targetPressure + dt * 0.85);
  currentPressure += (targetPressure - currentPressure) * (1 - Math.exp(-dt * 12));
  if (currentPressure < 0.001) currentPressure = 0;
  visual?.setPressure(currentPressure);
  sound.update(currentPressure, dt);
  const percent = Math.round(currentPressure * 100);
  if (percent !== lastPercent) {
    pressureValue.textContent = percent;
    if (!sliderActive) pressureInput.value = percent;
    pressureInput.style.setProperty('--progress', `${percent}%`);
    // The stage and meter react through one scoped CSS variable, written only when the rounded value changes.
    const squeeze = String(percent / 100);
    playArea.style.setProperty('--squeeze', squeeze);
    pressureSection.style.setProperty('--squeeze', squeeze);
    lastPercent = percent;
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.addEventListener('pagehide', () => { stopCamera(); sound.dispose(); });
