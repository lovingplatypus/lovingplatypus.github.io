import './chocolate.css';

// Decorations for the chocolate stage. Rendered inside .toy-scene[data-scene=chocolate],
// which only shows while the chocolate squishy is picked. Purely visual.
// A tiny chocolatier: striped awning, candy jars, a cake stand, cocoa with steam,
// and a pink paper doily on a marble counter.

// Pixel sprites: each string is a row, each char a palette key ('.' = empty).
const px = (rows, pal, cls) => {
  const runs = {};
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      let e = x + 1;
      while (row[e] === c) e++;
      if (c !== '.') (runs[c] ||= []).push(`M${x} ${y}h${e - x}v1h-${e - x}Z`);
      x = e;
    }
  });
  const paths = Object.entries(runs).map(([c, d]) => `<path fill="${pal[c]}" d="${d.join('')}"/>`).join('');
  return `<svg class="${cls}" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${paths}</svg>`;
};

const glass = { o: '#c9a89e', g: '#f1f8f4', h: '#ffffff' };

const candyJar = px([
  '...oooooooo...',
  '..oLLLLLLLLo..',
  '..ollllllllo..',
  '...oooooooo...',
  '..oggggggggo..',
  '.oggggggggggo.',
  'oghggggggggggo',
  'ohgggggggggggo',
  'ohgggggggggggo',
  'ohggggpggggggo',
  'ohmmgppyygccgo',
  'ohmmgppyygccgo',
  'ohgccyymmppgmo',
  'oggccyymmppgmo',
  'oppgmmccppyygo',
  'oppgmmccppyygo',
  'oyccppgmmyycco',
  'oyccppgmmyycco',
  '.oppmmccyyppo.',
  '..oooooooooo..',
], { ...glass, L: '#f4b3c0', l: '#e79aac', p: '#f19db0', m: '#8fd3bb', c: '#8a5236', y: '#e8a043' }, 'chocolate-jar chocolate-jar-candy');

const truffleJar = px([
  '....oooooo....',
  '...oLLLLLLo...',
  '...ollllllo...',
  '..oooooooooo..',
  '.oggggggggggo.',
  'oghggggggggggo',
  'ohgggggggggggo',
  'ohgggggggggggo',
  'ohkccFffkccggo',
  'ohcccfffcccggo',
  'ogcgFffgcgkcco',
  'okccfffkccccco',
  'occcgfgcccgcgo',
  'ogcgkccgcgFffo',
  '.occcccgcfffo.',
  '..oooooooooo..',
], { ...glass, L: '#a9dcc8', l: '#8ccab3', c: '#8a5236', k: '#b98060', f: '#e5bb55', F: '#f8e3a0' }, 'chocolate-jar chocolate-jar-truffle');

const cakeStand = px([
  '...........t..........',
  '..........t...........',
  '........orRro.........',
  '........orrro.........',
  '....ooooowwwwooooo....',
  '....oPPPPPPPPPPPPo....',
  '....oPPPPPPPPPPPPo....',
  '....ocPccPcPccPcco....',
  '....occcccccccccco....',
  '....oyyyyyyyyyyyyo....',
  '....occcccccccccco....',
  '....occcccccccccco....',
  '..oooooooooooooooooo..',
  '.osssssssssssssssssso.',
  '..oSSSSSSSSSSSSSSSSo..',
  '...oooooooooooooooo...',
  '.........osso.........',
  '.........oSSo.........',
  '.........osso.........',
  '.......oosssSoo.......',
  '......osssssSSso......',
  '......oooooooooo......',
], { o: '#c49a8f', t: '#7f9d69', r: '#e0606f', R: '#ffa3ae', w: '#fffaf4', P: '#f7bccb', c: '#9a5f40', y: '#e8a043', s: '#fffaf4', S: '#efdcd2' }, 'chocolate-cake');

const mug = px([
  '........oooo..........',
  '.......owwwwo.........',
  '..oooooowwwsoooooo....',
  '..occccwwwwsscccco....',
  '..oMMMMMMMMMMMMMMo....',
  '..oMMMMMMMMMMMMSSoooo.',
  '..oMMMMppMppMMMSSo..oo',
  '..oMMMMpppppMMMSSo..oo',
  '..oMMMMMpppMMMMSSo..oo',
  '..oMMMMMMpMMMMMSSoooo.',
  '..oMMMMMMMMMMMMSSo....',
  '...oMMMMMMMMMMMSo.....',
  '....oooooooooooo......',
  'oddddddddddddddddddo..',
  '.oooooooooooooooooo...',
], { o: '#9b6a5c', w: '#fffaf4', s: '#ecdcd3', c: '#7c4a31', M: '#bfe5d5', S: '#a3d3bf', p: '#f29fb3', d: '#fbe1e7' }, 'chocolate-mug-cup');

const steam = px(['..w..', '.w...', '.w...', '..w..', '...w.', '...w.', '..w..', '.w...', '.w...', '..w..'], { w: '#d2b0a7' }, '');

const bean = px(['.oooo.', 'oobbbo', 'oooooo', '.oooo.'], { o: '#8a5236', b: '#b98060' }, 'chocolate-bean');
const foil = px([
  'f..ffff..f',
  'ff.fFFf.ff',
  'ffffFfffff',
  'ff.ffff.ff',
  'f..ffff..f',
], { f: '#e5bb55', F: '#fbeab0' }, 'chocolate-foil');
const square = px(['kkkk', 'kccd', 'kccd', 'kddd'], { k: '#a8704f', c: '#8a5236', d: '#6f4029' }, 'chocolate-square');

const heart = px(['.oo.oo.', 'oyyoyyo', 'oyYyyyo', 'oyyyyyo', '.oyyyo.', '..oyo..', '...o...'], { o: '#9b6a5c', y: '#e8a043', Y: '#fbd28e' }, '');

// Pink paper doily: scalloped rim + a ring of punched holes, squashed into perspective.
const doily = (() => {
  let s = '';
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    s += `<circle cx="${(100 + 90 * Math.cos(a)).toFixed(1)}" cy="${(100 + 90 * Math.sin(a)).toFixed(1)}" r="9"/>`;
  }
  let h = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    h += `<circle cx="${(100 + 78 * Math.cos(a)).toFixed(1)}" cy="${(100 + 78 * Math.sin(a)).toFixed(1)}" r="3.2"/>`;
  }
  return `<svg class="chocolate-doily" viewBox="0 0 200 200" preserveAspectRatio="none"><g fill="#f8d3db">${s}<circle cx="100" cy="100" r="90"/></g><g fill="#fdf2ee">${h}</g><circle cx="100" cy="100" r="66" fill="none" stroke="#fdeef0" stroke-width="2.5" stroke-dasharray="4 5"/><circle cx="100" cy="100" r="58" fill="#fbe4e8"/></svg>`;
})();

export default {
  id: 'chocolate',
  html: `<svg class="chocolate-awning" width="100%" height="33"><defs><pattern id="chocolate-awning-stripes" width="32" height="26" patternUnits="userSpaceOnUse" patternTransform="scale(1.25)"><path fill="#f5b7c4" d="M0 0h16v18H0Zm0 18h16v2H0Zm2 2h12v2H2Zm2 2h8v2H4Z"/><path fill="#fff6ef" d="M16 0h16v18H16Zm0 18h16v2H16Zm2 2h12v2H18Zm2 2h8v2H20Z"/><path fill="#e9a0b2" d="M0 14h16v4H0Zm4 10h8v2H4Z"/><path fill="#f0e0d6" d="M16 14h16v4H16Zm4 10h8v2H20Z"/></pattern></defs><rect width="100%" height="33" fill="url(#chocolate-awning-stripes)" shape-rendering="crispEdges"/><rect width="100%" height="3" fill="#d7a597"/></svg>
    <div class="chocolate-sign"><i></i><i></i>${heart}</div>
    <div class="chocolate-shelf chocolate-shelf-left">${candyJar}${truffleJar}<span class="chocolate-glint"><svg viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M6 0h4v4h2v2h4v4h-4v2h-2v4H6v-4H4v-2H0V6h4V4h2Z" fill="#fff"/></svg></span><b class="chocolate-plank"></b></div>
    <div class="chocolate-shelf chocolate-shelf-right">${cakeStand}<b class="chocolate-plank"></b></div>
    ${doily}
    <div class="chocolate-mug"><span class="chocolate-steam">${steam}${steam}${steam}</span>${mug}</div>
    <div class="chocolate-treats">${bean}${bean}${foil}${square}${bean}</div>`,
};
