import './teddy.css';

// Decorations for the teddy stage. Rendered inside .toy-scene[data-scene=teddy],
// which only shows while the teddy squishy is picked. Purely visual.
// A pastel nursery at bedtime: a dusk window with a crescent moon, bunting,
// a turning star mobile, alphabet blocks, a heart pillow and a night-light.

// Tiny pixel-sprite helper: rows of characters -> one crisp <path> per colour.
const sprite = (rows, pal, ox = 0, oy = 0) => {
  const d = {};
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length;) {
      const c = r[x];
      if (!pal[c]) { x++; continue; }
      let n = 1;
      while (r[x + n] === c) n++;
      (d[c] ||= []).push(`M${ox + x} ${oy + y}h${n}v1h-${n}z`);
      x += n;
    }
  });
  return Object.entries(d).map(([c, p]) => `<path fill="${pal[c]}" d="${p.join('')}"/>`).join('');
};
const svg = (cls, vb, body) => `<svg class="${cls}" viewBox="${vb}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;

const HEART = ['.hh.hh.', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...'];
const STAR = ['....s....', '....s....', '...sss...', 'sssssssss', '.sssssss.', '..sssss..', '..ss.ss..', '.ss...ss.', '.s.....s.'];
const CLOUD = ['...www.....', '..wwwww.ww.', '.wwwwwwwwww', 'wwwwwwwwwww', 'bbbbbbbbbbb'];
const MOON = ['..mmmm.', '.mmm...', 'mmm....', 'mmm....', 'mmm....', '.mmm...', '..mmmm.'];

// Window: arched frame, dusk sky, crescent moon, twinkling stars, blush curtains.
const archOuter = 'M9 0h22v1h3v1h2v2h1v2h1v2h1v2h1v40H0V10h1V8h1V6h1V4h1V2h2V1h3Z';
const archGlass = 'M10 3h20v1h2v1h2v2h1v2h1v2h1v36H3V11h1V9h1V7h1V5h2V4h2Z';
const moonDisc = 'M10 9h4v1h2v2h1v4h-1v2h-2v1h-4v-1H8v-2H7v-4h1v-2h2Z';
const plus = (x, y) => `M${x} ${y - 1}h1v1h1v1h-1v1h-1v-1h-1v-1h1Z`;
const twinkles = [[26, 10, 0], [32, 18, 1], [24, 34, 2], [33, 37, 3], [12, 32, 4]]
  .map(([x, y, i]) => `<path class="teddy-tw teddy-tw-${i}" fill="#fff6d6" d="${plus(x, y)}"/>`).join('');
const curtain = 'M-4 -2h10v10h-1v8h-1v8h-1v6h-2v4h1v5h1v5h1v4h1v3h-9Z';
const windowSvg = svg('teddy-window', '-4 -3 48 58', `
  <defs><linearGradient id="teddy-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e9cd4"/><stop offset=".55" stop-color="#b3acdf"/><stop offset="1" stop-color="#e6c6dc"/></linearGradient>
  <mask id="teddy-moon-cut"><path fill="#fff" d="${moonDisc}"/><path fill="#000" transform="translate(3 -2)" d="${moonDisc}"/></mask></defs>
  <path fill="#d9c9e0" transform="translate(1 1)" d="${archOuter}"/>
  <path fill="#fdf7f0" d="${archOuter}"/>
  <path fill="url(#teddy-sky)" d="${archGlass}"/>
  <path fill="#fff6d6" mask="url(#teddy-moon-cut)" d="${moonDisc}"/>
  <path fill="#fff" d="M8 12h1v2H8Z" opacity=".6"/>
  <g class="teddy-stars">${twinkles}</g>
  <path fill="#f6e3ea" d="M8 22h1v1H8Zm22-9h1v1h-1Zm-14 21h1v1h-1Z"/>
  <path fill="#a9a2d6" d="M3 43h5v-2h4v1h5v-3h5v2h5v-1h4v2h6v6H3Z"/>
  <path fill="#fff1cf" d="M13 43h1v1h-1Zm13-1h1v1h-1Zm4 1h1v1h-1Z"/>
  <path fill="#fdf7f0" d="M19 3h2v44h-2ZM3 25h34v2H3Z"/>
  <path fill="#fdf7f0" d="M-3 47h46v3H-3Z"/><path fill="#d9c9e0" d="M-3 50h46v1H-3Z"/>
  <path fill="#d8bba5" d="M-4 -3h48v2h-48Z"/>
  <g><path fill="#f3c7d3" d="${curtain}"/><path fill="#e8b0c1" d="M-2 -2h1v36h-1Zm3 0h1v26H1Zm2 0h1v18H3Z"/><path fill="#f7dc9c" d="M-4 29h6v2h-6Z"/></g>
  <g transform="translate(40 0) scale(-1 1)"><path fill="#f3c7d3" d="${curtain}"/><path fill="#e8b0c1" d="M-2 -2h1v36h-1Zm3 0h1v26H1Zm2 0h1v18H3Z"/><path fill="#f7dc9c" d="M-4 29h6v2h-6Z"/></g>`);

// Bunting: a pixel string sagging across the top, with little pennants.
const buntingSvg = (() => {
  const W = 120, sag = (x) => 1 + Math.round(7 * Math.sin((Math.PI * x) / (W - 1)));
  let str = '';
  for (let x = 0; x < W; x++) str += `M${x} ${sag(x)}h1v1h-1z`;
  const cols = ['#f4c0cd', '#c3cdf0', '#f6dea4', '#dccbef', '#cfe4d6'];
  let flags = '';
  for (let i = 0, x = 4; x + 7 <= W; i++, x += 12) {
    const y = sag(x + 3) + 1;
    flags += sprite(['fffffff', 'fffffff', '.fffff.', '.fffff.', '..fff..', '..fff..', '...f...'], { f: cols[i % cols.length] }, x, y);
    flags += `<path fill="#fff" fill-opacity=".55" d="M${x + 1} ${y}h2v1h-2Z"/>`;
  }
  return svg('teddy-bunting', `0 0 ${W} 18`, `<path fill="#c7b3cc" d="${str}"/>${flags}`);
})();

// Mobile: a little wooden bar with a moon, clouds, a star and a heart.
const mobileSvg = (() => {
  const hang = [[6, 22, MOON, { m: '#f6d98e' }, 7], [19, 36, CLOUD, { w: '#fbfcff', b: '#cfd6f2' }, 11], [32, 48, STAR, { s: '#f7d48a' }, 9],
    [45, 32, HEART, { h: '#f2aabd' }, 7], [58, 20, CLOUD, { w: '#fbfcff', b: '#cfd6f2' }, 11]];
  const strings = `<path fill="#bcaecb" d="M32 0h1v10h-1Z${hang.map(([x, y]) => `M${x} 12h1v${y - 12}h-1Z`).join('')}"/>`;
  const charms = hang.map(([x, y, rows, pal, w]) => `<g class="teddy-charm">${sprite(rows, pal, x - (w >> 1), y)}</g>`).join('');
  return svg('teddy-mobile', '-2 0 68 60', `<g class="teddy-mobile-spin">${strings}<path fill="#dcc0a8" d="M4 10h56v2H4Z"/><path fill="#c4a48d" d="M4 12h56v1H4Z"/><path fill="#f7dc9c" d="M31 9h3v4h-3Z"/>${charms}</g>`);
})();

// Alphabet blocks, stacked A on B C.
const GLYPH = {
  A: ['.ggg.', 'g...g', 'ggggg', 'g...g', 'g...g'],
  B: ['gggg.', 'g...g', 'gggg.', 'g...g', 'gggg.'],
  C: ['.gggg', 'g....', 'g....', 'g....', '.gggg'],
};
const block = (L, pal, ox, oy) => {
  const rows = [];
  for (let y = 0; y < 13; y++) {
    let r = '';
    for (let x = 0; x < 13; x++) {
      const edge = x === 0 || x === 12 || y === 0 || y === 12;
      const g = GLYPH[L][y - 5]?.[x - 4];
      r += edge ? 'o' : y < 3 ? 'l' : g === 'g' ? 'g' : x === 11 || y === 11 ? 'd' : 'f';
    }
    rows.push(r);
  }
  return sprite(rows, pal, ox, oy);
};
const blocksSvg = svg('teddy-blocks', '0 0 28 27',
  block('B', { o: '#8f9bd0', l: '#dfe4f8', f: '#c3cdf0', d: '#adb8e6', g: '#fdfbff' }, 0, 13)
  + block('C', { o: '#cf8fa2', l: '#fde2e9', f: '#f5c3d0', d: '#eaa9ba', g: '#fffafb' }, 14, 14)
  + block('A', { o: '#cfa865', l: '#fdf0cc', f: '#f6dea4', d: '#ecc987', g: '#fffdf5' }, 6, 0)
  + '<path fill="#b9a6c4" fill-opacity=".35" d="M1 26h26v1H1Z"/>');

// Heart pillow with a little stitch.
const pillowSvg = svg('teddy-pillow', '0 0 13 11', sprite(
  ['..ooo...ooo..', '.ohhpo.opppo.', 'ohhpppopppppo', 'ohpppppppppdo', 'oppppppppppdo', 'opppppppppddo',
    '.oppppppppdo.', '..opppppddo..', '...opppddo...', '....opddo....', '.....ooo.....'],
  { o: '#cf8ea1', p: '#f5c0ce', h: '#fde4eb', d: '#eaa6b8' }));

// A little mushroom night-light glowing on the quilt.
const nightLightSvg = svg('teddy-nightlight', '0 0 11 11', sprite(
  ['...ccccc...', '.ccwwcccc..', 'cccwwccwwcc', 'ccccccccwwc', 'cwwcccccccc', 'ddddddddddd', '...shhss...', '...shhss...', '...sssss...', '..ttttttt..'],
  { c: '#f5bfcf', w: '#fffaf4', d: '#e3a2b5', s: '#fff0cf', h: '#fffbee', t: '#e6d2dc' }));

const zSvg = svg('teddy-z', '0 0 5 5', sprite(['zzzzz', '...z.', '..z..', '.z...', 'zzzzz'], { z: '#9ea8d9' }));
const heartSvg = (c) => svg('teddy-heart', '0 0 7 6', sprite(HEART, { h: c }) + '<path fill="#fff" fill-opacity=".7" d="M1 1h1v1H1Z"/>');

export default {
  id: 'teddy',
  html: `${windowSvg}${buntingSvg}${mobileSvg}
<div class="teddy-nl-glow"></div>${nightLightSvg}
${blocksSvg}${pillowSvg}
<div class="teddy-zzz"><span class="teddy-z-1">${zSvg}</span><span class="teddy-z-2">${zSvg}</span><span class="teddy-z-3">${zSvg}</span></div>
<div class="teddy-love"><span class="teddy-love-1">${heartSvg('#f0a0b5')}</span><span class="teddy-love-2">${heartSvg('#f5b9c7')}</span><span class="teddy-love-3">${heartSvg('#eb8fa8')}</span></div>`,
};
