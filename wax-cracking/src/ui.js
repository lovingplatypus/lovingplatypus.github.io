import { SQUISHY_TYPES } from './squishy-models.js';

const pixelHeart = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h4v2h4V3h4v2h2v5h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V5h2Z" fill="currentColor"/></svg>';
const pixelSpark = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 0h4v4h2v2h4v4h-4v2h-2v4H6v-4H4v-2H0V6h4V4h2Z" fill="currentColor"/></svg>';
const toyIcons = {
  butter: '<path fill="#f5d477" d="M5 5h14v2h2v14H3V7h2Z"/><path fill="#ffeaa4" d="M5 7h14v3H5Z"/><path fill="#9b7749" d="M7 13h2v2H7Zm8 0h2v2h-2Zm-5 4h4v1h-4Z"/>',
  platypus: '<path fill="#b7967b" d="M5 5h14v2h2v12H3V7h2Z"/><path fill="#e7b079" d="M8 13h8v2h3v4H5v-4h3Z"/><path fill="#5b4843" d="M6 10h2v2H6Zm10 0h2v2h-2Z"/><path fill="#bd8b61" d="M3 20h5v2H3Zm13 0h5v2h-5Z"/>',
  lychee: '<path fill="#9aa76e" d="M11 2h2v5h-2Zm2 1h6v2h-6Z"/><path fill="#e8a4a3" d="M7 5h10v2h3v3h2v9h-3v3H5v-3H2v-9h2V7h3Z"/><path fill="#f7c5b8" d="M7 8h2v2H7Zm7 0h2v2h-2ZM4 13h2v2H4Zm7-1h2v2h-2Zm7 1h2v2h-2ZM7 18h2v2H7Zm8 0h2v2h-2Z"/>',
  mangosteen: '<path fill="#9777a8" d="M6 7h12v2h3v10h-3v3H6v-3H3V9h3Z"/><path fill="#b799c4" d="M6 11h3v7H6Z"/><path fill="#96a773" d="M10 1h4v4h5v4h-5v2h-4V9H5V5h5Z"/><path fill="#74875a" d="M11 4h2v4h-2Z"/>',
};
// Per-toy accent colours for the shelf buttons: body, soft tint, and pixel edge.
const toyChoices = [
  ['butter', 'Butter', 'the original', '--toy:#f5d477;--toy-soft:#fdf0c8;--toy-edge:#d9b25a;--toy-ink:#8a6a2c'],
  ['platypus', 'Platypus', 'little paddle pal', '--toy:#c8a58a;--toy-soft:#f4e6d9;--toy-edge:#b58f72;--toy-ink:#7a5a45'],
  ['lychee', 'Lychee', 'sweet & bumpy', '--toy:#eaa6a5;--toy-soft:#fce3df;--toy-edge:#d68d8c;--toy-ink:#98585a'],
  ['mangosteen', 'Mangosteen', 'a purple treasure', '--toy:#a585b6;--toy-soft:#efe4f5;--toy-edge:#9d80b0;--toy-ink:#6c5280'],
];
// Plug-in squishies (src/squishies) carry their own shelf details.
for (const toy of SQUISHY_TYPES) if (toy.ui) {
  toyIcons[toy.id] = toy.ui.icon;
  toyChoices.push([toy.id, toy.name, toy.ui.detail, toy.ui.colors]);
}
// 8x8 pixel bubble: tinted ring, translucent body, one bright highlight pixel.
const pixelBubble = '<svg viewBox="0 0 8 8" aria-hidden="true" shape-rendering="crispEdges"><path fill="#fffdf8" fill-opacity=".45" d="M2 1h4v1h1v4H6v1H2V6H1V2h1Z"/><path fill="currentColor" d="M2 0h4v1H2Zm4 1h1v1H6Zm1 1h1v4H7ZM6 6h1v1H6ZM2 7h4v1H2ZM1 6h1v1H1ZM0 2h1v4H0Zm1-1h1v1H1Z"/><path fill="#fff" d="M2 2h1v1H2Z"/></svg>';
// Decorative stage behind the transparent WebGL canvas. Purely visual.
const stageBackdrop = `<div class="stage-backdrop" aria-hidden="true">
            <div class="stage-wall"></div><div class="stage-floor"></div><div class="stage-beam"></div>
            <div class="stage-glow"></div><div class="stage-pool"></div><div class="stage-vignette"></div>
            <span class="stage-spark stage-spark-one">${pixelSpark}</span><span class="stage-spark stage-spark-two">${pixelSpark}</span><span class="stage-spark stage-spark-three">${pixelSpark}</span>
            <span class="stage-bubble stage-bubble-one">${pixelBubble}</span><span class="stage-bubble stage-bubble-two">${pixelBubble}</span><span class="stage-bubble stage-bubble-three">${pixelBubble}</span><span class="stage-bubble stage-bubble-four">${pixelBubble}</span>
          </div>`;
const toyIcon = (name) => `<svg class="toy-icon" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges">${toyIcons[name]}</svg>`;

export function renderUI(icon) {
  return `
  <header class="site-header">
    <a class="brand" href="./" aria-label="Wax Room home"><span class="brand-mark">${pixelHeart}</span>wax room<span class="brand-spark">✦</span></a>
    <div class="wip-note">
      <button class="sound-button" id="sound-toggle" aria-pressed="true" aria-label="Sound on; click to mute" aria-describedby="sound-wip">${icon('sound')}<span>Sound on</span></button>
      <svg class="wip-circle" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true"><path d="M104 7C58 4 13 14 9 38c-4 25 43 37 95 36 52-1 90-13 88-36C190 15 150 5 96 9 80 10 66 13 57 17"/></svg>
      <span class="wip-label" id="sound-wip"><svg class="wip-arrow" viewBox="0 0 80 40" aria-hidden="true"><path d="M4 32C24 34 46 28 64 12M52 10l13 1-3 13"/></svg>work in progress</span>
    </div>
  </header>
  <main>
    <div class="intro"><div><p class="eyebrow"><span class="pixel-spark">${pixelSpark}</span> ANNA'S SQUISHIES</p><h1>A little squish.<br class="mobile-break"> <em>A softer day.</em></h1></div></div>
    <div class="workspace">
      <div class="toy-room">
        <section class="play-area" data-toy="butter" aria-label="Interactive wax squishy">
          ${stageBackdrop}
          <div class="stage-top"><button id="wax-toggle" class="wax-toggle" role="switch" aria-checked="true" aria-label="Wax shell"><span class="wax-switch-track" aria-hidden="true"><span></span></span><span id="wax-label">Wax on</span></button><button id="reset" class="text-button">${icon('reset')} Start fresh</button></div>
          <div id="scene" role="button" tabindex="0" aria-label="Wax squishy. Hold mouse, touch, or Space to squeeze; release to relax."></div>
          <div class="scene-error" id="scene-error" hidden><h2>3D needs a little help</h2><p>Your browser couldn’t start WebGL. Try an up-to-date browser with hardware acceleration enabled.</p></div>
          <div class="stage-bottom"><div class="material-label"><span class="material-number" id="squishy-number">01</span><div><strong id="material-name">Butter yellow</strong></div></div><div class="stage-hint" id="stage-hint">${icon('pointer')} Hold to squeeze <span class="hint-rest"><span>·</span> Release to relax</span></div><div class="swatches" role="group" aria-label="Wax color"><button class="swatch active" data-color="#f0d77e" data-name="Butter yellow" style="--swatch:#ead17c" aria-label="Butter yellow" aria-pressed="true">${icon('check')}</button><button class="swatch" data-color="#adc3a1" data-name="Garden sage" style="--swatch:#a5bd99" aria-label="Garden sage" aria-pressed="false">${icon('check')}</button><button class="swatch" data-color="#c0afdc" data-name="Soft lavender" style="--swatch:#bbaad0" aria-label="Soft lavender" aria-pressed="false">${icon('check')}</button><button class="swatch" data-color="#e5a58e" data-name="Peach sorbet" style="--swatch:#dfa18c" aria-label="Peach sorbet" aria-pressed="false">${icon('check')}</button></div><span class="studio-label">FRESHLY SQUISHED, WITH LOVE <span class="mini-heart">${pixelHeart}</span></span></div>
        </section>
        <section class="squishy-shelf" aria-label="Choose your squishy">
          <div class="shelf-heading"><span class="eyebrow">THE LITTLE COLLECTION</span><span>pick your squishy ↓</span></div>
          <div class="squishy-choices" role="group" aria-label="Squishy shape">${toyChoices.map(([id, name, detail, colors]) => `<button class="squishy-choice${id === 'butter' ? ' active' : ''}" data-squishy="${id}" aria-pressed="${id === 'butter'}" style="${colors}"><span class="toy-tile">${toyIcon(id)}</span><span class="choice-text"><strong>${name}</strong><small>${detail}</small></span><span class="choice-check">${icon('check')}</span></button>`).join('')}</div>
        </section>
      </div>
      <aside class="controls" aria-label="Experience controls">
        <div class="control-heading"><span class="eyebrow">LET’S GET COMFY</span><h2>A little hands-on.</h2><p>Close your hand to crack the wax.<br>Open it and let your squishy bounce back.</p></div>
        <div class="mode-switch" role="group" aria-label="Control mode"><button id="mode-hand" aria-pressed="true">${icon('hand')} Hand tracking</button><button id="mode-manual" aria-pressed="false">${icon('pointer')} Manual</button></div>
        <div id="camera-panel">
          <div class="camera-preview" id="camera-preview"><video id="camera-video" autoplay playsinline muted></video><canvas id="hand-overlay" aria-hidden="true"></canvas><div class="camera-placeholder" id="camera-placeholder"><span class="hand-orbit">${icon('hand')}</span><strong>Your hand is the controller</strong><span>A little light. An open palm. You’re ready.</span></div><span class="camera-badge" id="camera-badge" hidden><span class="live-dot"></span> CAMERA ON</span></div>
          <button class="primary-button" id="camera-toggle">${icon('camera')}<span>Enable camera</span>${icon('arrow')}</button>
          <p class="privacy-note">${icon('lock')} Your camera stays on your device.</p>
        </div>
        <div id="manual-panel" hidden><div class="manual-illustration">${icon('pointer')}<strong>A satisfying press & hold.</strong><span>Hold your squishy or the button below.<br>Your space bar works, too.</span></div><button class="primary-button" id="hold-button">Press & hold to squeeze ${icon('arrow')}</button><p class="privacy-note">Mouse, touch, and keyboard friendly.</p></div>
        <p id="tracking-status" class="tracking-status" role="status" aria-live="polite">No camera needed to try it. Hold the squishy.</p>
        <div class="pressure-section"><div class="pressure-label"><label for="pressure">Squeeze-o-meter</label><span><output id="pressure-value" for="pressure">0</output><small>%</small></span></div><input id="pressure" type="range" min="0" max="100" value="0" step="1" aria-label="Squeeze pressure"/><div class="pressure-endpoints"><span>gentle squish</span><span>big crunch!</span></div></div>
      </aside>
    </div>
  </main>
  <footer><span class="footer-center">a soft place to land</span><a href="./THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener">Open-source credits ↗</a></footer>
`;
}
