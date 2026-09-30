import './butter.css';

// Decorations for the butter stage. Rendered inside .toy-scene[data-scene=butter],
// which only shows while the butter squishy is picked. Purely visual.
// A sunny breakfast nook: striped butter wallpaper, a gingham-curtained window
// with the morning sun, a little shelf (milk bottle, jam jar, egg cup), and on a
// blue gingham tablecloth a smiling toast on a plate plus a steaming mug and a daisy.

// Pixel helpers: rects as [x, y, w, h] on an integer grid.
const px = (fill, rects) => `<path fill="${fill}" d="${rects.map(([x, y, w = 1, h = 1]) => `M${x} ${y}h${w}v${h}h-${w}Z`).join('')}"/>`;
const svg = (cls, vb, body) => `<svg class="${cls}" viewBox="${vb}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;

// Yellow gingham used for curtains and the jam lid.
const gingham = `<pattern id="butter-ging" width="4" height="4" patternUnits="userSpaceOnUse">${px('#fff7e2', [[0, 0, 4, 4]])}${px('#f7e0a0', [[0, 0, 2, 4], [0, 0, 4, 2]])}${px('#efcb6c', [[0, 0, 2, 2]])}</pattern>`;

const window_ = svg('butter-window', '0 0 36 44',
  `<defs>${gingham}<linearGradient id="butter-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9eaf0"/><stop offset=".62" stop-color="#fdf1cf"/><stop offset="1" stop-color="#ffe7ad"/></linearGradient></defs>`
  // frame, glass, sky
  + px('#e0c79c', [[4, 4, 28, 30]]) + px('#fffaf1', [[5, 5, 26, 28]])
  + `<rect x="7" y="7" width="22" height="24" fill="url(#butter-sky)"/>`
  // sun with soft halo + cloud + hills
  + `<g class="butter-sun">${px('#fff0bd', [[22, 8, 4, 1], [21, 9, 6, 1], [20, 10, 8, 4], [21, 14, 6, 1], [22, 15, 4, 1]])}`
  + px('#ffd66b', [[22, 9, 4, 1], [21, 10, 6, 4], [22, 14, 4, 1]]) + px('#fff3c4', [[22, 10, 2, 1], [22, 11]]) + '</g>'
  + px('#ffffff', [[10, 13, 3, 1], [9, 14, 7, 1], [8, 15, 10, 1]])
  + px('#cfdcae', [[7, 25, 5, 6], [12, 24, 5, 7], [17, 25, 4, 6], [21, 26, 8, 5]])
  + px('#b6ca95', [[7, 28, 7, 3], [14, 27, 6, 4], [20, 28, 9, 3]])
  // muntins
  + px('#fffaf1', [[17, 7, 2, 24], [7, 18, 22, 2]])
  // sill + tiny sprout pot
  + px('#f6e6c6', [[2, 33, 32, 3]]) + px('#dcc198', [[2, 36, 32, 1]])
  + px('#86a870', [[14, 26, 1, 3], [12, 27, 2, 1], [15, 26, 2, 1], [13, 26], [16, 25]])
  + px('#e5a58e', [[12, 29, 6, 4]]) + px('#d38f78', [[12, 29, 6, 1]])
  // rod
  + px('#c9a36a', [[0, 2, 36, 1]]) + px('#b88f58', [[0, 1, 2, 3], [34, 1, 2, 3]])
  // tied-back gingham curtains (sway)
  + `<g class="butter-curtain butter-curtain-l"><path fill="url(#butter-ging)" d="M1 3h8v4h-1v4h-1v4h-1v4h-1v3h1v4h1v5h1v2H1Z"/>${px('#e5a58e', [[1, 20, 5, 2]])}</g>`
  + `<g class="butter-curtain butter-curtain-r"><path fill="url(#butter-ging)" d="M35 3h-8v4h1v4h1v4h1v4h1v3h-1v4h-1v5h-1v2h8Z"/>${px('#e5a58e', [[30, 20, 5, 2]])}</g>`
  + px('#f3d98a', [[1, 3, 34, 1]]));

const shelf = svg('butter-shelf', '0 0 44 32',
  // milk bottle
  px('#e5a58e', [[6, 8, 4, 2]]) + px('#e8eff0', [[6, 10, 4, 3], [5, 13, 6, 1], [4, 14, 8, 3]])
  + px('#fffdf6', [[4, 17, 8, 7]]) + px('#e6ddcc', [[11, 14, 1, 10]]) + px('#ffffff', [[5, 14, 1, 3]])
  + px('#f0d77e', [[5, 19, 6, 3]]) + px('#fff6d8', [[7, 20, 2, 1]])
  // jam jar with gingham lid
  + `<path fill="url(#butter-ging)" d="M16 13h9v2h1v1H15v-1h1Z"/>`
  + px('#e79a9a', [[16, 16, 9, 1], [15, 17, 11, 7]]) + px('#d98585', [[25, 17, 1, 7], [15, 23, 11, 1]])
  + px('#f7c8c4', [[16, 18, 1, 3]]) + px('#fff7e6', [[17, 19, 7, 3]]) + px('#e79a9a', [[20, 20]])
  // egg cup
  + px('#fbf1dc', [[31, 12, 3, 1], [30, 13, 5, 2], [29, 15, 7, 4]]) + px('#ffffff', [[31, 13], [30, 15]])
  + px('#adc3a1', [[29, 19, 8, 1], [30, 20, 6, 1], [31, 21, 4, 1], [32, 22, 2, 1], [30, 23, 6, 1]]) + px('#95ad89', [[35, 19, 2, 1], [34, 20, 2, 1]])
  // plank + brackets
  + px('#e9c896', [[0, 24, 44, 1]]) + px('#d8b07a', [[0, 25, 44, 2]]) + px('#bf925e', [[0, 27, 44, 1], [6, 28, 2, 3], [8, 28], [36, 28, 2, 3], [35, 28]]));

// Toast slice with a butter pat and a tiny happy face, leaning on a plate with a knife.
const toast = svg('butter-toast', '0 0 52 26',
  px('#decfb8', [[5, 21, 42, 1], [8, 22, 36, 1]]) + px('#fffaf2', [[8, 16, 36, 1], [5, 17, 42, 4], [3, 18, 46, 2]])
  + px('#eee3d3', [[10, 18, 32, 1]])
  + px('#d39a5c', [[14, 2, 12, 1], [12, 3, 16, 1], [11, 4, 18, 2], [10, 6, 20, 4], [11, 10, 19, 8]])
  + px('#f5d596', [[15, 3, 10, 1], [13, 4, 14, 2], [12, 6, 16, 4], [12, 10, 17, 7]])
  + px('#eadcc7', [[11, 18, 19, 1]])
  + px('#fff2bd', [[16, 6, 8, 4], [18, 10, 2, 2]]) + px('#f0d77e', [[16, 9, 8, 1], [20, 10, 4, 1]]) + px('#fffbe6', [[17, 6, 3, 1]])
  + px('#7a5634', [[16, 13, 1, 2], [23, 13, 1, 2], [19, 15, 2, 1]])
  + `<g class="butter-blush">${px('#eea68c', [[14, 15, 2, 1], [24, 15, 2, 1]])}</g>`
  + px('#d9b07e', [[30, 19, 8, 2]]) + px('#ebe7e2', [[38, 19, 9, 2], [47, 20]]) + px('#ffffff', [[38, 19, 8, 1]]) + px('#f7e3a0', [[42, 20, 3, 1]]));

const wisp = (x, n) => `<g transform="translate(${x} 6)"><g class="butter-steam butter-steam-${n}">${px('#e9ddcb', [[1, 0], [2, 1, 1, 2], [1, 3], [0, 4, 1, 2], [1, 6], [2, 7, 1, 2], [1, 9]])}</g></g>`;

const breakfast = svg('butter-mug', '0 0 44 40',
  // bud vase + daisy (daisy sways and leans when squeezed)
  `<g class="butter-daisy">${px('#8fae7c', [[7, 12, 1, 15]]) + px('#a9c393', [[8, 19, 2, 1], [9, 18, 2, 1], [5, 22, 2, 1], [4, 21, 2, 1]])}`
  + px('#fffdf6', [[6, 5, 3, 3], [6, 11, 3, 3], [3, 8, 3, 3], [9, 8, 3, 3], [4, 6, 2, 2], [9, 6, 2, 2], [4, 11, 2, 2], [9, 11, 2, 2]])
  + px('#ebe0cf', [[6, 13, 3, 1], [3, 10, 3, 1], [9, 10, 3, 1]]) + px('#f3c24f', [[6, 8, 3, 3]]) + px('#ffe08a', [[6, 8]]) + '</g>'
  + px('#d6e6ec', [[6, 26, 3, 2], [5, 28, 5, 1], [4, 29, 7, 8]]) + px('#bcd3de', [[10, 29, 1, 8], [4, 36, 7, 1]]) + px('#f4f9fa', [[5, 30, 1, 4]])
  // steam
  + wisp(22, 1) + wisp(26, 2) + wisp(30, 3)
  // mug + saucer
  + px('#efe3cf', [[19, 19, 16, 2]]) + px('#c8946a', [[20, 19, 14, 1]])
  + px('#fffaf0', [[19, 21, 16, 14], [20, 35, 14, 1], [21, 36, 12, 1], [35, 23, 3, 1], [38, 24, 1, 6], [35, 30, 3, 1], [35, 24, 1, 6]])
  + px('#e8dcc8', [[34, 21, 1, 14], [33, 35, 1, 1]])
  + px('#e5a58e', [[24, 25, 2, 1], [27, 25, 2, 1], [23, 26, 7, 2], [24, 28, 5, 1], [25, 29, 3, 1], [26, 30]])
  + px('#f0d77e', [[19, 32, 15, 1]])
  + px('#f6e9d2', [[16, 36, 24, 1], [15, 37, 26, 1]]) + px('#e2d2bb', [[16, 38, 24, 1]]));

export default {
  id: 'butter',
  html: `<div class="butter-sunbeam"><i></i></div>${window_}${shelf}${toast}${breakfast}`,
};
