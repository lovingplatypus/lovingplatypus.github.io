import './lychee.css';

// Decorations for the lychee stage. Rendered inside .toy-scene[data-scene=lychee],
// which only shows while the lychee squishy is picked. Purely visual.
// A blossom-time lychee orchard: leafy branches with hanging pixel lychees in the
// top corners, a paper lantern, drifting petals, and a little picnic on a mint
// gingham blanket (a peeled lychee on a porcelain plate, two loose ones).

// Pixel helpers: rects as [x, y, w, h] on an integer grid.
const px = (fill, rects) => `<path fill="${fill}" d="${rects.map(([x, y, w = 1, h = 1]) => `M${x} ${y}h${w}v${h}h-${w}Z`).join('')}"/>`;
const svg = (cls, vb, body) => `<svg class="${cls}" viewBox="${vb}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
const at = (x, y, body, flip = '') => `<g transform="translate(${x} ${y})${flip}">${body}</g>`;

// 9x9 lychee: rosy outline, knobbly pink shell with a checker of bumps, glossy highlight.
const berry = px('#c95f76', [[2, 0, 5], [1, 1, 7], [0, 2, 9, 5], [1, 7, 7], [2, 8, 5]])
  + px('#f296a4', [[2, 1, 5], [1, 2, 7, 5], [2, 7, 5]])
  + px('#df788c', [[5, 2], [4, 4], [6, 4], [3, 5], [5, 6], [7, 3], [2, 6]])
  + px('#d86d82', [[7, 5, 1, 2], [5, 7, 2]])
  + px('#ffd9dd', [[2, 2], [3, 2], [2, 3]]);
// 9x9 diagonal leaf (tip bottom-right) with a darker midrib.
const leafShape = [[0, 0, 3], [0, 1, 5], [1, 2, 5], [1, 3, 6], [2, 4, 6], [2, 5, 7], [3, 6, 6], [5, 7, 4], [7, 8, 2]];
const vein = [1, 2, 3, 4, 5, 6, 7].map((i) => [i, i]);
const leaf = (tone = '#8cc07c', dark = '#5f9a58') => px(tone, leafShape) + px(dark, vein) + px('#b4d9a0', [[2, 1], [3, 1], [4, 2]]);
// 3x3 blossom.
const bloom = px('#fff6f2', [[1, 0], [0, 1, 3], [1, 2]]) + px('#f7b9c2', [[1, 1]]);
const bark = '#9b7a5c';

const branchLeft = svg('lychee-branch lychee-branch-left', '0 0 64 34',
  // twig stems down to the cluster
  px('#8a6a4d', [[26, 6, 1, 4], [25, 10], [24, 11], [23, 12, 1, 2], [27, 10], [28, 11, 1, 2], [29, 13, 1, 3], [26, 10, 1, 7], [16, 3, 1, 5], [15, 8, 1, 3]])
  + px(bark, [[0, 1, 12, 2], [12, 2, 10, 2], [22, 3, 8, 2], [30, 4, 8, 2], [38, 5, 6, 2], [44, 6, 4, 1]])
  + px('#b8977a', [[0, 1, 12, 1], [12, 2, 10, 1], [22, 3, 8, 1], [30, 4, 8, 1]])
  + at(2, 3, leaf()) + at(33, 6, leaf('#9ccb88')) + at(12, -4, leaf('#7fb570', '#58904f'), ' scale(1 -1) translate(0 -9)')
  + at(40, -3, leaf(), ' scale(1 -1) translate(0 -9)') + at(10, 5, leaf('#a6d292'), ' scale(-1 1) translate(-9 0)')
  + at(18, 13, berry) + at(27, 12, berry) + at(22, 20, berry) + at(31, 19, berry) + at(10, 11, berry)
  + at(6, 0, bloom) + at(29, 1, bloom) + at(46, 3, bloom));

const branchRight = svg('lychee-branch lychee-branch-right', '0 0 56 30',
  px('#8a6a4d', [[30, 4, 1, 6], [29, 10, 1, 2], [31, 10, 1, 3], [20, 5, 1, 4]])
  + px(bark, [[42, 1, 14, 2], [32, 2, 10, 2], [22, 3, 10, 2], [14, 4, 8, 2], [4, 5, 10, 1]])
  + px('#b8977a', [[42, 1, 14, 1], [32, 2, 10, 1], [22, 3, 10, 1]])
  + at(45, 3, leaf(), ' scale(-1 1) translate(-9 0)') + at(12, 6, leaf('#9ccb88'), ' scale(-1 1) translate(-9 0)')
  + at(35, -3, leaf('#7fb570', '#58904f'), ' scale(-1 -1) translate(-9 -9)') + at(20, 6, leaf('#a6d292'))
  + at(25, 12, berry) + at(32, 13, berry) + at(16, 9, berry)
  + at(50, 0, bloom) + at(24, 0, bloom));

// Paper lantern on a string, hung from the right branch.
const lantern = svg('lychee-lantern', '0 0 11 30',
  px('#9b7f6a', [[5, 0, 1, 12]])
  + px('#a8795a', [[3, 12, 5, 1], [3, 24, 5, 1]])
  + px('#ffbf98', [[2, 13, 7, 1], [1, 14, 9, 9], [2, 23, 7, 1]])
  + px('#e3806f', [[3, 14, 1, 9], [7, 14, 1, 9], [1, 18, 9, 1]]) + px('#f0a07f', [[1, 14, 1, 9], [9, 14, 1, 9]])
  + px('#fff3e4', [[2, 15, 1, 2], [5, 15, 1, 2]])
  + px('#e8a36c', [[5, 25, 1, 3], [4, 28, 3, 2]]));

// Porcelain plate with a peeled lychee, an open shell and a leaf.
const plate = svg('lychee-plate', '0 0 32 16',
  px('#dccbb8', [[3, 13, 26, 2], [6, 15, 20, 1]])
  + px('#fffdf8', [[5, 9, 22, 1], [2, 10, 28, 1], [1, 11, 30, 1], [2, 12, 28, 1], [5, 13, 22, 1]])
  + px('#e9dccf', [[2, 12, 28, 1], [5, 13, 22, 1]])
  + px('#f4b8bf', [[4, 10], [8, 9], [13, 9], [18, 9], [23, 9], [27, 10], [6, 13], [12, 13], [19, 13], [25, 13]])
  + at(24, 3, leaf('#9ccb88'), ' scale(-1 1) translate(-9 0) scale(.78)')
  + px('#efe4d6', [[6, 3, 4], [5, 4, 6], [4, 5, 8, 4], [5, 9, 6], [6, 10, 4]])
  + px('#fff8ee', [[6, 3, 4], [5, 4, 6], [4, 5, 7, 3], [5, 8, 5]])
  + px('#ffffff', [[6, 4, 2], [5, 5, 1, 2]])
  + px('#dc7485', [[14, 7, 8], [15, 8, 7], [16, 9, 5], [17, 10, 3]])
  + px('#f296a4', [[14, 7, 7], [15, 8, 5], [16, 9, 3]])
  + px('#df788c', [[16, 8], [18, 8], [20, 8], [17, 9], [19, 9]]) + px('#fff8ee', [[15, 6, 6, 1]]) + px('#fbe6dc', [[14, 6], [21, 6]]));

// A little woven basket heaped with lychees.
const basket = svg('lychee-basket', '0 0 28 20',
  px('#dccbb8', [[2, 18, 24, 1], [5, 19, 18, 1]])
  + px('#b58a5f', [[4, 6, 1, 3], [5, 4, 1, 2], [6, 3], [7, 2, 2, 1], [9, 1, 10, 1], [19, 2, 2, 1], [21, 3], [22, 4, 1, 2], [23, 6, 1, 3]])
  + at(9, 0, berry) + at(3, 3, berry) + at(16, 2, berry) + at(12, 4, berry) + at(6, 5, berry)
  + at(19, 3, leaf('#8cc07c'), ' scale(.8)')
  + px('#d9b286', [[1, 10, 26, 2], [2, 12, 24, 3], [3, 15, 22, 2], [4, 17, 20, 1]])
  + px('#c49565', [[3, 12, 2, 1], [9, 12, 2, 1], [15, 12, 2, 1], [21, 12, 2, 1], [6, 14, 2, 1], [12, 14, 2, 1], [18, 14, 2, 1], [4, 16, 2, 1], [9, 16, 2, 1], [15, 16, 2, 1], [20, 16, 2, 1]])
  + px('#ecd2ac', [[1, 10, 26, 1]]) + px('#b58a5f', [[1, 11, 26, 1]]));

// Drifting petals and squeeze droplets.
const petal = (tone) => svg('', '0 0 4 3', px(tone, [[1, 0, 2], [0, 1, 4], [1, 2, 2]]) + px('#fff', [[1, 0]]));
const drop = svg('', '0 0 7 9', px('#eb9aa8', [[3, 0], [2, 1, 3, 1], [1, 2, 5, 2], [0, 4, 7, 3], [1, 7, 5], [2, 8, 3]]) + px('#fffaf3', [[3, 1], [2, 2, 3, 2], [1, 4, 5, 3], [2, 7, 3]]) + px('#fbd3da', [[4, 5, 1, 2], [3, 7]]) + px('#fff', [[2, 4]]));

export default {
  id: 'lychee',
  html: `<div class="lychee-sway lychee-sway-left">${branchLeft}</div>
    <div class="lychee-sway lychee-sway-right">${branchRight}<span class="lychee-lantern-wrap">${lantern}</span></div>
    ${plate}${basket}
    ${['pink', 'white', 'pink', 'white', 'pink'].map((t, i) => `<span class="lychee-petal lychee-petal-${i + 1}">${petal(t === 'pink' ? '#f9c3cb' : '#fff4ef')}</span>`).join('')}
    ${[1, 2, 3].map((i) => `<span class="lychee-drop lychee-drop-${i}">${drop}</span>`).join('')}`,
};
