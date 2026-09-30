import './mangosteen.css';

// Decorations for the mangosteen stage. Rendered inside .toy-scene[data-scene=mangosteen],
// which only shows while the mangosteen squishy is picked. Purely visual.
// Theme: a lantern-lit night-market stall at dusk for the queen of fruits.

// Pixel mangosteen (10×10 grid), reused in the basket.
const fruit = `<g id="mangosteen-px-fruit"><path fill="#733f71" d="M2 2h6v1h1v1h1v4H9v1H8v1H2V9H1V8H0V4h1V3h1Z"/><path fill="#5b2f5a" d="M1 8h1v1h6V8h1v1H8v1H2V9H1Z"/><path fill="#a4709f" d="M2 4h1v2H2Z"/><path fill="#9cbc78" d="M2 2h6v1H2Z"/><path fill="#7fa25d" d="M3 3h4v1H3Z"/><path fill="#7b8f55" d="M5 0h1v2H5Z"/></g>`;

const lantern = (body, rib, glow) => `<svg viewBox="0 0 14 20" shape-rendering="crispEdges"><path fill="#7d4f7a" d="M4 0h6v2H4Zm0 15h6v2H4Z"/><path fill="${body}" d="M3 2h8v1h2v1h1v9h-1v1h-2v1H3v-1H1v-1H0V4h1V3h2Z"/><path fill="${rib}" d="M4 3h1v11H4Zm5 0h1v11H9Z"/><path fill="${glow}" d="M5 5h4v6H5Z"/><path fill="#fff6dc" d="M2 5h1v4H2Z"/><path fill="#d9869a" d="M6 17h2v3H6Z"/></svg>`;

const bulb = (c) => `<svg viewBox="0 0 5 7" shape-rendering="crispEdges"><path fill="#8a6a86" d="M1 0h3v2H1Z"/><path fill="${c}" d="M0 2h5v4H4v1H1V6H0Z"/><path fill="#fff" d="M1 3h1v1H1Z"/></svg>`;

const star = `<svg viewBox="0 0 5 5" shape-rendering="crispEdges"><path fill="currentColor" d="M2 0h1v2h2v1H3v2H2V3H0V2h2Z"/></svg>`;

// Monstera leaf: soft silhouette with slits cut by a mask. Stem on the left, tip at the right.
const monstera = (id, fill, vein) => `<mask id="${id}"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/><g stroke="#000" stroke-width="4.5" stroke-linecap="round"><path d="M30 34 26 -4M47 32l1-36M64 34l8-36M80 40l18-26M30 66l-5 40M48 68l1 40M65 66l9 38M81 60l18 26"/></g><ellipse cx="38" cy="42" rx="3" ry="5" fill="#000"/><ellipse cx="56" cy="58" rx="3" ry="5" fill="#000"/><ellipse cx="72" cy="44" rx="2.5" ry="4" fill="#000"/></mask><path fill="none" stroke="${fill}" stroke-width="3.2" d="M8 51C-6 53-24 58-44 68"/><g mask="url(#${id})"><path fill="${fill}" d="M6 46C10 16 44 2 74 14c18 7 26 24 25 36 1 14-9 30-27 37C44 98 12 86 6 56c4-2 4-8 0-10Z"/><path fill="none" stroke="${vein}" stroke-width="1.6" d="M4 51C40 49 70 49 98 51"/></g>`;

// Banana leaf: long blade with little tears along the edges.
const banana = (id, fill, vein) => `<mask id="${id}"><rect x="-10" y="-10" width="220" height="80" fill="#fff"/><g stroke="#000" stroke-width="2.2"><path d="M40 6l6 14M76 0l5 16M112 2l5 14M148 8l4 11M58 52l5-14M96 46l4-13M134 38l3-9"/></g></mask><g mask="url(#${id})"><path fill="${fill}" d="M0 28C44-4 124-4 196 24C124 30 54 56 0 46Z"/><path fill="none" stroke="${vein}" stroke-width="1.4" d="M-4 37C60 22 130 18 196 24"/></g>`;

export default {
  id: 'mangosteen',
  html: `
  <div class="mangosteen-moon"><svg viewBox="0 0 11 11" shape-rendering="crispEdges"><path fill="#fff4d6" d="M3 0h5v1h1v1H6v1H5v1H4v3h1v1h1v1h3v1H8v1H3v-1H2V9H1V8H0V3h1V2h1V1h1Z"/><path fill="#f3dca4" d="M1 7h1v1h1v1h2v1H3V9H2V8H1Z"/></svg></div>
  <span class="mangosteen-star" style="left:5%;top:34%">${star}</span>
  <span class="mangosteen-star mangosteen-star-b" style="left:22%;top:27%">${star}</span>
  <span class="mangosteen-star" style="left:71%;top:31%">${star}</span>
  <span class="mangosteen-star mangosteen-star-b" style="left:94%;top:44%">${star}</span>
  <span class="mangosteen-star mangosteen-star-c" style="left:29%;top:43%">${star}</span>
  <svg class="mangosteen-leaves mangosteen-leaves-l" viewBox="0 0 120 200" preserveAspectRatio="xMinYMid meet">
    <g class="mangosteen-sway-a"><g transform="translate(14 204) rotate(-66) scale(.84)">${banana('mangosteen-mb1', '#dccbe3', '#eadff0')}</g></g>
    <g transform="translate(-18 18) rotate(-16) scale(.74)">${monstera('mangosteen-mm2', '#d6c6de', '#e6dcec')}</g>
    <g class="mangosteen-sway-b"><g transform="translate(-22 74) rotate(20) scale(1.08)">${monstera('mangosteen-mm1', '#b3c3a2', '#d3ddc3')}</g></g>
  </svg>
  <svg class="mangosteen-leaves mangosteen-leaves-r" viewBox="0 0 120 200" preserveAspectRatio="xMaxYMid meet">
    <g transform="translate(120 0) scale(-1 1)">
      <g class="mangosteen-sway-b"><g transform="translate(12 206) rotate(-64) scale(.8)">${banana('mangosteen-mb2', '#bccaab', '#d6e0c8')}</g></g>
      <g transform="translate(-16 40) rotate(-12) scale(.7)">${monstera('mangosteen-mm4', '#bfcdb0', '#d8e1cb')}</g>
      <g class="mangosteen-sway-a"><g transform="translate(-20 92) rotate(10) scale(1)">${monstera('mangosteen-mm3', '#d3c2dc', '#e5daea')}</g></g>
    </g>
  </svg>
  <svg class="mangosteen-wire" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M-2 2Q25 30 50 3Q75 30 102 2" fill="none" stroke="#a88aa6" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>
  ${[[17, 15.1, '#f6c96f'], [25, 16.5, '#f2a9bc'], [33, 15.1, '#cfb0ea'], [41, 11, '#f6c96f'], [59, 11, '#f2a9bc'], [67, 15.1, '#f6c96f'], [75, 16.5, '#cfb0ea'], [83, 15.1, '#f2a9bc']]
    .map(([x, y, c], i) => `<span class="mangosteen-bulb" style="left:${x}%;top:${y}%;--c:${c};animation-delay:${-i * 0.7}s">${bulb(c)}</span>`).join('')}
  <div class="mangosteen-crown"><i></i><svg viewBox="0 0 13 10" shape-rendering="crispEdges"><path fill="#ffe7a0" d="M0 2h1v1H0Zm6-2h1v1H6Zm6 2h1v1h-1Z"/><path fill="#f2c35b" d="M0 3h2v2h1V4h2V1h3v3h2v1h1V3h2v4H0Z"/><path fill="#e2a43e" d="M1 7h11v3H1Z"/><path fill="#fff1bd" d="M1 6h2v1H1Zm5-4h1v2H6Z"/><path fill="#b05fa8" d="M6 8h1v1H6Z"/><path fill="#f29bb4" d="M3 8h1v1H3Zm6 0h1v1H9Z"/></svg></div>
  <div class="mangosteen-lantern mangosteen-lantern-l"><i class="mangosteen-lglow"></i>${lantern('#f7c784', '#eba866', '#fff0c8')}</div>
  <div class="mangosteen-lantern mangosteen-lantern-r"><i class="mangosteen-lglow"></i>${lantern('#f3b3c6', '#e591ab', '#ffe6ee')}</div>
  <svg class="mangosteen-basket" viewBox="0 0 26 17" shape-rendering="crispEdges"><defs>${fruit}</defs>
    <use href="#mangosteen-px-fruit" x="2" y="1"/><use href="#mangosteen-px-fruit" x="14" y="2"/><use href="#mangosteen-px-fruit" x="8" y="0"/>
    <path fill="#c8935c" d="M1 8h24v2H1Z"/><path fill="#e7bf88" d="M1 8h24v1H1Z"/>
    <path fill="#dcad76" d="M2 10h22v4h-1v2H3v-2H2Z"/>
    <path fill="#c38d58" d="M3 11h2v1H3Zm4 0h2v1H7Zm4 0h2v1h-2Zm4 0h2v1h-2Zm4 0h2v1h-2Zm-14 2h2v1H5Zm4 0h2v1H9Zm4 0h2v1h-2Zm4 0h2v1h-2Zm4 0h1v1h-1ZM4 15h18v1H4Z"/></svg>
  <svg class="mangosteen-half" viewBox="0 0 24 12" shape-rendering="crispEdges"><use href="#mangosteen-px-fruit" x="13" y="2"/><path fill="#733f71" d="M4 0h4v1h2v1h1v1h1v6h-1v1h-1v1H8v1H4v-1H2v-1H1V9H0V3h1V2h1V1h2Z"/><path fill="#d9a7c8" d="M4 1h4v1h2v1h1v6h-1v1H8v1H4v-1H2V9H1V3h1V2h2Z"/><path fill="#fff6ee" d="M4 2h4v1h2v6H8v1H4V9H2V3h2Z"/><path fill="#e9d9d0" d="M3 5h2v1H3Zm4 1h2v1H7ZM5 3h1v2H5Zm1 4h1v2H6Z"/><path fill="#f6e9df" d="M5 5h2v2H5Z"/><path fill="#5b2f5a" d="M2 10h1v1H2Zm8 0h1v1h-1Z"/></svg>
  ${[[9, 46, -40, -22], [18, 62, -60, 14], [23, 36, -46, -38], [88, 50, 44, -26], [80, 64, 58, 16], [76, 38, 40, -42], [6, 70, -30, 10]]
    .map(([x, y, dx, dy], i) => `<span class="mangosteen-fly" style="left:${x}%;top:${y}%;--dx:${dx}px;--dy:${dy}px"><i style="animation-delay:${-i * 1.3}s,${-i * 0.9}s"></i></span>`).join('')}
  `,
};
