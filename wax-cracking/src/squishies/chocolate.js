import * as THREE from 'three';

/**
 * Chocolate squishy: a chunky milk-chocolate bar moulded into 3 x 6 pillowed
 * squares, with a caramel heart that glows through the cracks. The far end is
 * still tucked into its crinkled gold foil and a blush paper sleeve.
 * See src/squishies/README.md for the plug-in contract.
 */
const SIZE = [1.9, 0.34, 1.02];
const ROUNDNESS = 0.2;
const COLS = 6, ROWS = 3;
// Moulding in world units: groove half width, bevel run, square corner radius.
const GROOVE = 0.024, BEVEL = 0.1, CORNER = 0.075;

const clamp01 = t => Math.min(1, Math.max(0, t));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function randomGenerator(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Smooth tileable value noise in 0..1. */
function valueNoise(seed, cells) {
  const random = randomGenerator(seed), grid = Float32Array.from({ length: cells * cells }, random);
  const at = (i, j) => grid[((j % cells) + cells) % cells * cells + ((i % cells) + cells) % cells];
  return (u, v) => {
    const x = u * cells, y = v * cells, i = Math.floor(x), j = Math.floor(y);
    const fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

/**
 * The mould at a top-face point (x, z): height 0 in a groove to ~1 on a
 * square's pillowed top, plus an ambient-occlusion shade for the colour map.
 * Only interior grooves are drawn; the rounded shell edge is the outer bevel.
 */
function moulding(x, z) {
  const [sx, , sz] = SIZE, w = 2 * sx / COLS, d = 2 * sz / ROWS;
  const i = Math.min(COLS - 1, Math.max(0, Math.floor((x + sx) / w)));
  const j = Math.min(ROWS - 1, Math.max(0, Math.floor((z + sz) / d)));
  const lx = x - (-sx + (i + 0.5) * w), lz = z - (-sz + (j + 0.5) * d);
  const inner = (l, index, count) => (l < 0 ? index > 0 : index < count - 1);
  const ex = inner(lx, i, COLS) ? w / 2 - Math.abs(lx) : 9;
  const ez = inner(lz, j, ROWS) ? d / 2 - Math.abs(lz) : 9;
  // Signed distance into the square's rounded-rectangle top (negative in the groove).
  const qa = CORNER - (ex - GROOVE), qb = CORNER - (ez - GROOVE);
  const t = -(Math.hypot(Math.max(qa, 0), Math.max(qb, 0)) + Math.min(Math.max(qa, qb), 0) - CORNER);
  const s = clamp01(t / BEVEL), shoulder = 1 - (1 - s) ** 2.4;
  const dome = Math.max(0, 1 - (lx / (w / 2)) ** 2) * Math.max(0, 1 - (lz / (d / 2)) ** 2);
  // A faint raised plaque in each square, like a real chocolate mould.
  const plaque = smooth(0.02, 0.05, t - BEVEL - 0.05);
  let height = 0.78 * shoulder + 0.14 * dome * shoulder + 0.06 * plaque;
  if (t < 0) height = 0.06 * (1 + t / GROOVE) ** 2;
  const shade = 0.6 + 0.4 * smooth(-GROOVE, BEVEL * 0.75, t) - 0.03 * (1 - plaque) * shoulder;
  return { height, shade };
}

let gridCache = null;
/** Mould colour (AO) and height canvases for the top face; built once, then cached. */
function gridCanvases() {
  if (gridCache) return gridCache;
  const W = 2048, H = 2 * Math.round(W * SIZE[2] / SIZE[0] / 2), hw = W / 2, hh = H / 2;
  const color = document.createElement('canvas'), bump = document.createElement('canvas');
  color.width = bump.width = W; color.height = bump.height = H;
  const cctx = color.getContext('2d'), bctx = bump.getContext('2d');
  const cimg = cctx.createImageData(W, H), bimg = bctx.createImageData(W, H);
  const c = cimg.data, b = bimg.data;
  const write = (k, tone, h) => {
    const i = k * 4;
    c[i] = tone; c[i + 1] = tone * 0.985; c[i + 2] = tone * 0.965; c[i + 3] = 255;
    b[i] = b[i + 1] = b[i + 2] = h; b[i + 3] = 255;
  };
  // The mould is mirror-symmetric in x and z: evaluate one quadrant, write four.
  for (let py = 0; py < hh; py++) {
    const z = SIZE[2] * (2 * (py + 0.5) / H - 1);
    for (let px = 0; px < hw; px++) {
      const { height, shade } = moulding(SIZE[0] * (2 * (px + 0.5) / W - 1), z);
      const tone = 255 * Math.min(1, shade), h = 255 * Math.min(1, height / 1.02);
      const r0 = py * W, r1 = (H - 1 - py) * W;
      write(r0 + px, tone, h); write(r0 + W - 1 - px, tone, h); write(r1 + px, tone, h); write(r1 + W - 1 - px, tone, h);
    }
  }
  cctx.putImageData(cimg, 0, 0); bctx.putImageData(bimg, 0, 0);
  // Soft tempering mottle, multiplied in from a tiny smoothed noise canvas.
  const noise = document.createElement('canvas'), mottle = randomGenerator(417);
  noise.width = 40; noise.height = 22;
  const nctx = noise.getContext('2d'), nimg = nctx.createImageData(40, 22);
  for (let i = 0; i < nimg.data.length; i += 4) {
    nimg.data[i] = nimg.data[i + 1] = nimg.data[i + 2] = 255 * (0.955 + 0.045 * mottle()); nimg.data[i + 3] = 255;
  }
  nctx.putImageData(nimg, 0, 0);
  cctx.globalCompositeOperation = 'multiply'; cctx.imageSmoothingEnabled = true; cctx.imageSmoothingQuality = 'high';
  cctx.drawImage(noise, 0, 0, W, H); cctx.globalCompositeOperation = 'source-over';
  gridCache = { color, bump };
  return gridCache;
}

/** Sides and base: an almost plain moulded surface with the faintest satin mottling. */
let sideCache = null;
function sideCanvases() {
  if (sideCache) return sideCache;
  const S = 256, color = document.createElement('canvas'), bump = document.createElement('canvas');
  color.width = color.height = bump.width = bump.height = S;
  const cctx = color.getContext('2d'), bctx = bump.getContext('2d');
  const cimg = cctx.createImageData(S, S), bimg = bctx.createImageData(S, S);
  const mottle = valueNoise(733, 9), fine = valueNoise(58, 64);
  for (let i = 0; i < S * S; i++) {
    const u = (i % S) / S, v = Math.floor(i / S) / S, k = i * 4;
    const tone = 0.955 + 0.04 * mottle(u, v);
    cimg.data[k] = 255 * tone; cimg.data[k + 1] = 250 * tone; cimg.data[k + 2] = 244 * tone; cimg.data[k + 3] = 255;
    bimg.data[k] = bimg.data[k + 1] = bimg.data[k + 2] = 128 + 60 * (fine(u, v) - 0.5); bimg.data[k + 3] = 255;
  }
  cctx.putImageData(cimg, 0, 0); bctx.putImageData(bimg, 0, 0);
  sideCache = { color, bump };
  return sideCache;
}

function canvasTexture(canvas, srgb) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/* ---------------------------------------------------------------- wrapper */

/**
 * Perimeter of a rounded rectangle in the (y, z) plane as fixed samples, so
 * rings with different corner radii (down to 0) share vertex order.
 * A point is (y, z) = (fy * b + rho * ny, fz * c + rho * nz).
 */
function perimeter(corner = 8, alongZ = 26, alongY = 3) {
  const list = [];
  for (let q = 0; q < 4; q++) {
    const mid = (q + 0.5) * Math.PI / 2, fz = Math.sign(Math.cos(mid)), fy = Math.sign(Math.sin(mid));
    for (let k = 0; k <= corner; k++) {
      const a = (q + k / corner) * Math.PI / 2;
      list.push({ fy, fz, ny: Math.sin(a), nz: Math.cos(a) });
    }
    // The straight side after this corner, to the start of the next one.
    const a = (q + 1) * Math.PI / 2, next = (q + 1.5) * Math.PI / 2;
    const toZ = Math.sign(Math.cos(next)), toY = Math.sign(Math.sin(next));
    const n = q % 2 ? alongY : alongZ;
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      list.push({ fy: fy + (toY - fy) * t, fz: fz + (toZ - fz) * t, ny: Math.sin(a), nz: Math.cos(a) });
    }
  }
  return list;
}

/** Joins rings of equal length into a surface; outward-facing at `probe` ring. */
function ringSurface(rings, { closed = false, colors = null, probe = 0, outward }) {
  const n = rings[0].length, positions = [], colorOut = [], indices = [];
  rings.forEach((ring, r) => ring.forEach(p => {
    positions.push(p[0], p[1], p[2]);
    if (colors) colorOut.push(...colors[r]);
  }));
  const count = closed ? rings.length : rings.length - 1;
  for (let r = 0; r < count; r++) {
    const r2 = (r + 1) % rings.length;
    for (let k = 0; k < n; k++) {
      const a = r * n + k, b = r * n + (k + 1) % n, c = r2 * n + k, d = r2 * n + (k + 1) % n;
      indices.push(a, c, b, b, c, d);
    }
  }
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorOut, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Flip the winding if the probe vertex faces inward.
  const normal = geometry.attributes.normal, i = probe * n + Math.floor(n / 8);
  const dir = outward(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
  if (normal.getX(i) * dir[0] + normal.getY(i) * dir[1] + normal.getZ(i) * dir[2] < 0) {
    for (let k = 0; k < indices.length; k += 3) [indices[k + 1], indices[k + 2]] = [indices[k + 2], indices[k + 1]];
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
  }
  return geometry;
}

/**
 * Crinkled gold foil hugging the far (-x) end: flat end cap, rounded end and a
 * short tube that stops in a torn, slightly peeled-back edge.
 */
function foilGeometry(size) {
  const r = ROUNDNESS, gap = 0.034, a = size[0] - r, b = size[1] - r, c = size[2] - r, R = r + gap;
  const edge = perimeter(8, 34, 4), n = edge.length, random = randomGenerator(2024);
  const tear = edge.map((_, k) => -0.8 + 0.07 * Math.sin(k / n * Math.PI * 6 + 0.7)
    + 0.04 * Math.sin(k / n * Math.PI * 22) + (k % 2 ? 0.028 : -0.028) * (0.6 + random() * 0.8));
  const ring = (x, rho, lambda = 1, lift = 0) => edge.map((e, k) => [
    typeof x === 'function' ? x(k) : x,
    e.fy * b * lambda + (rho + lift) * e.ny,
    e.fz * c * lambda + (rho + lift) * e.nz]);
  const rings = [];
  for (const lambda of [0, 0.34, 0.68]) rings.push(ring(-a - R, 0, lambda));
  for (let s = 0; s <= 10; s++) {
    const angle = s / 10 * Math.PI / 2;
    rings.push(ring(-a - R * Math.cos(angle), R * Math.sin(angle)));
  }
  const steps = 18;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    rings.push(ring(k => -a + (tear[k] + a) * t, R, 1, 0.045 * smooth(0.72, 1, t) ** 1.5));
  }
  // Crinkles: small random pushes along the local normal, read through flat shading.
  const noise = randomGenerator(77);
  rings.forEach((points, index) => points.forEach((p, k) => {
    if (index < 1) return;
    const e = edge[k], cap = index < 3 ? 1 : 0, jitter = (noise() - 0.5) * 0.016;
    p[0] += cap ? -jitter * 0.4 : (noise() - 0.5) * 0.012;
    p[1] += cap ? 0 : e.ny * jitter; p[2] += cap ? 0 : e.nz * jitter;
  }));
  return ringSurface(rings, { probe: 12, outward: (x, y, z) => [0, y, z] });
}

/**
 * A blush paper sleeve, pushed down to the far end, with cream pinstripes.
 * Built as a thin closed band (outer face, rolled lips, inner face).
 */
function sleeveGeometry(size) {
  const r = ROUNDNESS, gap = 0.064, b = size[1] - r, c = size[2] - r, R = r + gap, t = 0.012;
  const x0 = -size[0] + 0.02, x1 = -0.98, edge = perimeter(8, 34, 4);
  const rose = new THREE.Color('#e79ea2'), cream = new THREE.Color('#fbeee2'), deep = new THREE.Color('#d6838a');
  const colorAt = x => {
    const d = Math.min(x - x0, x1 - x);
    if (d < 0.022) return deep;
    if ((d > 0.055 && d < 0.085) || (d > 0.108 && d < 0.12)) return cream;
    return rose;
  };
  // Ring positions with doubled stops for crisp stripe edges.
  const stops = new Set([0, 0.022, 0.055, 0.085, 0.108, 0.12]);
  const xs = [];
  for (const d of stops) { xs.push(x0 + d, x1 - d); if (d) xs.push(x0 + d - 0.002, x1 - d + 0.002); }
  for (let k = 1; k < 8; k++) xs.push(x0 + (x1 - x0) * k / 8);
  xs.sort((p, q) => p - q);
  const ring = (x, rho) => edge.map(e => [x, e.fy * b + rho * e.ny, e.fz * c + rho * e.nz]);
  const rings = [], colors = [];
  const add = (x, rho, color) => { rings.push(ring(x, rho)); colors.push([color.r, color.g, color.b]); };
  for (const x of xs) add(x, R + t, colorAt(x));
  add(x1 + 0.004, R + t * 0.5, deep);
  for (const x of [...xs].reverse()) add(x, R, colorAt(x).clone().multiplyScalar(0.82));
  add(x0 - 0.004, R + t * 0.5, deep);
  return ringSurface(rings, { closed: true, colors, probe: 3, outward: (x, y, z) => [0, y, z] });
}

function addMesh(root, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

export default {
  id: 'chocolate', name: 'Chocolate', color: '#673a25', coreColor: '#e8a043',
  size: [...SIZE], shape: 'roundedBox', roundness: ROUNDNESS,
  surface: 'smooth', stamp: true, description: 'A firm little snap. A caramel heart.',
  // Tempered milk chocolate: a glossy but soft clearcoat over a warm satin body.
  wax: { roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.25,
    sheenColor: '#d9a987', sheenRoughness: 0.45, specularIntensity: 0.8 },
  // Runny caramel: bright, wet and glossy.
  core: { roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.08, sheen: 0.3,
    sheenColor: '#ffe0a8', sheenRoughness: 0.4, specularIntensity: 0.9 },
  // A firm bar: little give until pressed, then a focused middle pinch and a brisk,
  // slightly springy return.
  profile: { mode: 'pinch', stretch: 0.06, compression: 0.1, pinch: 0.36, focus: 3.4, center: 0,
    bend: 0.04, exponent: 1.18, pressSpeed: 22, releaseSpeed: 13, damping: 1.7 },
  wobble: { omega: 17, zeta: 0.19, gain: 0.32 },
  ui: {
    detail: 'snap & caramel',
    colors: '--toy:#8a5a3e;--toy-soft:#f4e4d8;--toy-edge:#a3714f;--toy-ink:#5e3624',
    icon: '<path fill="#5e3624" d="M6 2h12v1h1v12H5V3h1Z"/>'
      + '<path fill="#8a5a3e" d="M6 3h5v5H6Zm7 0h5v5h-5ZM6 10h5v5H6Zm7 0h5v5h-5Z"/>'
      + '<path fill="#ad7856" d="M6 3h5v1H6Zm0 1h1v4H6Zm7-1h5v1h-5Zm0 1h1v4h-1ZM6 10h5v1H6Zm0 1h1v4H6Zm7-1h5v1h-5Zm0 1h1v4h-1Z"/>'
      + '<path fill="#dcaa84" d="M7 4h2v1H7Zm7 0h2v1h-2ZM7 11h2v1H7Zm7 0h2v1h-2Z"/>'
      + '<path fill="#e3b75c" d="M4 14h2v-1h2v1h2v-1h2v1h2v-1h2v1h2v-1h2v3H4Z"/>'
      + '<path fill="#f7dc94" d="M6 13h1v1H6Zm6 0h1v1h-1Zm-5 1h2v1H7Zm8 0h2v1h-2Z"/>'
      + '<path fill="#e8979b" d="M4 16h16v6H4Z"/><path fill="#fcefe2" d="M4 18h16v2H4Z"/>'
      + '<path fill="#c9737a" d="M4 21h16v1H4Zm15-5h1v5h-1Z"/>',
    glow: '#f8e6d8', glowTint: '#d3a482',
  },
  textures() {
    const grid = gridCanvases(), side = sideCanvases();
    const topMap = canvasTexture(grid.color, true), topBump = canvasTexture(grid.bump, false);
    return {
      map: canvasTexture(side.color, true), bumpMap: canvasTexture(side.bump, false), bumpScale: 0.25,
      top: { map: topMap, bumpMap: topBump, bumpScale: 5 },
      core: { map: topMap, bumpMap: topBump, bumpScale: 5, topOnly: true },
    };
  },
  accessories(root, size) {
    const foil = new THREE.MeshPhysicalMaterial({ color: '#e0b765', metalness: 1, roughness: 0.3,
      flatShading: true, side: THREE.DoubleSide, envMapIntensity: 1.25 });
    const paper = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.78,
      metalness: 0, sheen: 0.4, sheenRoughness: 0.6, sheenColor: '#fff1ee', side: THREE.DoubleSide });
    addMesh(root, foilGeometry(size), foil);
    addMesh(root, sleeveGeometry(size), paper);
  },
};
