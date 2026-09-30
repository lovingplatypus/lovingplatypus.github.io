import * as THREE from 'three';

/**
 * A very chubby, cream-white plush teddy that sits with its stubby legs out.
 * The wax-coated shell is the round belly/body; the head, ears, arms, legs,
 * foot pads and tail are soft accessories that share one fine fur bump map.
 * See src/squishies/README.md for the plug-in contract.
 */

const PLUSH = '#f4f0ea';        // warm off-white that survives the tone mapping
const INNER = '#ead3c3';        // inner ears and foot pads, a touch warmer
const MUZZLE = '#f6efe5';
const THREAD = '#4a3129';       // embroidered nose / stitch
const BODY = [1.0, 0.86, 1.0];  // x == z so the bear can face any way
// The face turns toward the camera a little (+z rotated toward +x).
const FACE = THREE.MathUtils.degToRad(40);
const FUR_REPEAT = 2;           // fur tiles per shell face (~2 world units)

const smoothstep = THREE.MathUtils.smoothstep;
const Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0);

function randomGenerator(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ fur -- */

/**
 * Tileable plush height map: a soft low-frequency pile plus thousands of tiny
 * combed strokes (luminance only). Used as a bump map on shell and accessories.
 */
function makeFur() {
  if (typeof document === 'undefined') return null;
  const S = 512, random = randomGenerator(24071);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  // Tileable value noise for the uneven pile.
  const image = ctx.createImageData(S, S), data = image.data;
  const octaves = [[16, .5], [32, .3], [64, .2]].map(([n, amp]) => {
    const grid = Array.from({ length: n * n }, random);
    return { n, amp, at: (i, j) => grid[((j % n + n) % n) * n + ((i % n + n) % n)] };
  });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    for (const o of octaves) {
      const fx = x / S * o.n, fy = y / S * o.n, ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = smoothstep(fx - ix, 0, 1), ty = smoothstep(fy - iy, 0, 1);
      const a = o.at(ix, iy) + (o.at(ix + 1, iy) - o.at(ix, iy)) * tx;
      const b = o.at(ix, iy + 1) + (o.at(ix + 1, iy + 1) - o.at(ix, iy + 1)) * tx;
      v += (a + (b - a) * ty) * o.amp;
    }
    const g = Math.round(96 + v * 64), k = (y * S + x) * 4;
    data[k] = data[k + 1] = data[k + 2] = g; data[k + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  // Fine combed fibres, drawn with wrap-around so the tile stays seamless.
  ctx.lineCap = 'round';
  for (let i = 0; i < 14000; i++) {
    const x = random() * S, y = random() * S;
    const angle = -1.2 + Math.sin(x / S * Math.PI * 4) * .5 + (random() - .5) * 1.4;
    const length = 2.5 + random() * 5, light = random() < .55;
    ctx.strokeStyle = light ? `rgba(255,255,255,${.18 + random() * .3})` : `rgba(0,0,0,${.14 + random() * .26})`;
    ctx.lineWidth = .7 + random() * .7;
    const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const px = x + ox, py = y + oy;
      if (px < -10 || px > S + 10 || py < -10 || py > S + 10) continue;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx, py + dy); ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(FUR_REPEAT, FUR_REPEAT);
  texture.anisotropy = 4;
  return texture;
}

// The scene calls textures() just before accessories() and disposes whatever
// textures() returned on the next switch; accessories reuse the same map so
// nothing they reference is left undisposed.
let currentFur = null;

/**
 * Rescales a sphere's UVs so fur density matches the shell (one UV unit is
 * about two world units there), with an integer wrap to hide the seam.
 */
function furUV(geometry, radius) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  const around = Math.max(1, Math.round(Math.PI * radius * FUR_REPEAT)) / FUR_REPEAT;
  const along = Math.PI * radius / 2;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * around, uv.getY(i) * along);
  return geometry;
}

/* ------------------------------------------------------------- helpers -- */

function plush(color, options = {}) {
  const fur = currentFur;
  return new THREE.MeshPhysicalMaterial({
    color, roughness: .86, metalness: 0, clearcoat: 0, specularIntensity: .28,
    sheen: 1, sheenRoughness: .62, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .6),
    bumpMap: fur, bumpScale: fur ? .55 : 1, ...options,
  });
}

function addMesh(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], quaternion) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  if (quaternion) mesh.quaternion.copy(quaternion);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Unit sphere whose poles point along `pole` (hide them where they won't show). */
function sphere(segments, rings, pole = Y, radius = 1) {
  const geometry = furUV(new THREE.SphereGeometry(1, segments, rings), radius);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, pole.clone().normalize()));
  return geometry;
}

/** Recomputes normals and welds them across UV seams without losing the UVs. */
function weldNormals(geometry) {
  geometry.computeVertexNormals();
  const p = geometry.attributes.position, n = geometry.attributes.normal, sums = new Map();
  const key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i), s = sums.get(k) || [0, 0, 0];
    s[0] += n.getX(i); s[1] += n.getY(i); s[2] += n.getZ(i); sums.set(k, s);
  }
  for (let i = 0; i < p.count; i++) {
    const s = sums.get(key(i)), l = Math.hypot(...s) || 1;
    n.setXYZ(i, s[0] / l, s[1] / l, s[2] / l);
  }
  return geometry;
}

/** Point on an axis-aligned ellipsoid (centre c, radii r) along a direction, plus its normal. */
function onEllipsoid(c, r, dir, lift = 0) {
  const d = new THREE.Vector3(...dir).normalize();
  const t = 1 / Math.hypot(d.x / r[0], d.y / r[1], d.z / r[2]);
  const point = d.multiplyScalar(t);
  const normal = new THREE.Vector3(point.x / r[0] ** 2, point.y / r[1] ** 2, point.z / r[2] ** 2).normalize();
  point.add(new THREE.Vector3(...c)).addScaledVector(normal, lift);
  return { point, normal };
}

/** Orientation whose +z is `normal` and whose +y leans toward world up. */
function facing(normal, upHint = Y) {
  const up = upHint.clone().addScaledVector(normal, -upHint.dot(normal)).normalize();
  const right = new THREE.Vector3().crossVectors(up, normal);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal));
}

function tube(parent, material, points, radius, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, Math.max(6, points.length * 4), radius, radial, false);
  return addMesh(parent, geometry, material);
}

/* ---------------------------------------------------------------- bear -- */

const HEAD_C = [0, 1.2, .08], HEAD_R = [.8, .7, .74];

function addHead(bear, mats) {
  const front = new THREE.Vector3(0, -.3, 1).normalize();
  // Chubby-cheeked head: fuller low at the sides, a little flatter on the crown.
  const geometry = sphere(64, 44, front, .74);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const cheek = 1 + .08 * Math.exp(-(((y + .25) / .45) ** 2)) * (1 - .5 * Math.max(0, -z));
    pos.setXYZ(i, x * cheek, y * (y > 0 ? .96 : 1), z * (1 + .03 * Math.max(0, -y)));
  }
  addMesh(bear, weldNormals(geometry), mats.fur, HEAD_C, HEAD_R);

  // Ears: round and a bit cupped toward the front, set well apart.
  for (const side of [-1, 1]) {
    const { point, normal } = onEllipsoid(HEAD_C, HEAD_R, [side * .78, .7, -.08], -.08);
    const ear = new THREE.Group();
    ear.position.copy(point);
    // Face mostly forward, tipped outward a little.
    ear.quaternion.copy(facing(new THREE.Vector3(side * .28, .12, 1).normalize(), normal));
    bear.add(ear);
    const cup = sphere(40, 26, Z, .26);
    const p = cup.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r2 = x * x + y * y;
      // Front face dished in toward the centre.
      p.setZ(i, z > 0 ? z - .5 * Math.max(0, 1 - r2 * 1.4) * z : z);
    }
    addMesh(ear, weldNormals(cup), mats.fur, [0, 0, 0], [.27, .25, .15]);
    addMesh(ear, sphere(28, 18, Z, .16), mats.inner, [0, -.012, .062], [.16, .145, .04]);
  }

  // Muzzle: a softly raised oval on the lower front.
  const muzzle = onEllipsoid(HEAD_C, HEAD_R, [0, -.36, 1], -.075);
  const mq = facing(muzzle.normal);
  const MZ = [.31, .23, .22];
  addMesh(bear, sphere(40, 26, Z, .3), mats.muzzle, muzzle.point.toArray(), MZ, mq);
  const muzzleFront = muzzle.point.clone().addScaledVector(muzzle.normal, MZ[2]);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(mq);

  // Embroidered nose: satin stitches laid across a rounded triangle over a dark base.
  const noseCentre = muzzleFront.clone().addScaledVector(up, .045).addScaledVector(muzzle.normal, -.024);
  const nose = new THREE.Group();
  nose.position.copy(noseCentre); nose.quaternion.copy(mq); bear.add(nose);
  const NW = .112, NH = .076;
  const halfWidth = t => NW * Math.pow(Math.max(0, (t + 1) / 2), .6) * (1 - .25 * Math.max(0, t) ** 2);
  const baseShape = sphere(32, 18, Z, .08);
  const bp = baseShape.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
    const t = y, w = halfWidth(t) / NW;
    bp.setXYZ(i, x * NW * (.25 + .75 * w), y * NH, z * .03 + .004);
  }
  addMesh(nose, weldNormals(baseShape), mats.threadBase);
  const rows = 11;
  for (let r = 0; r < rows; r++) {
    const t = -.92 + r / (rows - 1) * 1.84, y = t * NH * .97, w = Math.max(.012, halfWidth(t) * .9);
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const s = k / 8 * 2 - 1, x = s * w;
      const dome = .03 * Math.sqrt(Math.max(0, 1 - s * s * .9 - t * t * .6)) + .01;
      pts.push(new THREE.Vector3(x, y, dome));
    }
    tube(nose, mats.thread, pts, .0074, 5);
  }
  // A single short stitch dropping from the nose (no smile), lying on the muzzle.
  const stitchPts = [0, .5, 1].map(k => {
    const u = .045 - NH * .8 - .055 * k, depth = MZ[2] * Math.sqrt(Math.max(0, 1 - (u / MZ[1]) ** 2));
    return muzzle.point.clone().addScaledVector(up, u).addScaledVector(muzzle.normal, depth + .002);
  });
  tube(bear, mats.thread, stitchPts, .0065, 5);

  // Small glossy button eyes, set just above the muzzle and fairly wide.
  for (const side of [-1, 1]) {
    const { point, normal } = onEllipsoid(HEAD_C, HEAD_R, [side * .36, .06, 1], -.012);
    addEye(bear, point, normal, .058, mats, side);
  }
}

/** A glossy bead with one soft glint; both parts blink about the eye's centre. */
function addEye(bear, point, normal, radius, mats, mirror) {
  const group = new THREE.Group();
  group.position.copy(point); group.quaternion.copy(facing(normal)); bear.add(group);
  // Pivot in shell space is filled in after the bear is rotated (see accessories()).
  const eye = addMesh(group, new THREE.SphereGeometry(1, 28, 20), mats.eye, [0, 0, 0], [radius, radius * 1.05, radius * .62]);
  eye.userData.role = 'eye';
  const gx = -.34 * mirror, gy = .38, rz = radius * .62;
  const z = rz * Math.sqrt(Math.max(0, 1 - gx * gx - gy * gy));
  const glint = addMesh(group, new THREE.SphereGeometry(1, 12, 8), mats.glint,
    [gx * radius, gy * radius, z], [radius * .2, radius * .2, radius * .06]);
  glint.quaternion.setFromUnitVectors(Z, new THREE.Vector3(gx / radius, gy / radius, z / (rz * rz)).normalize());
  glint.userData.role = 'eye';
  group.userData.eyeGroup = true;
}

/**
 * Stubby limb: a fat, tube-like ellipsoid along `axis`. `flat` squares off the
 * +axis end into a sole; returns the distance from the centre to that end.
 */
function limb(parent, material, centre, axis, radius, halfLength, flat = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(Z, axis.clone().normalize());
  const geometry = sphere(40, 28, Z, (radius + halfLength) / 2);
  const p = geometry.attributes.position, f = 1 - flat;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // Squarer ends than an ellipse: plush limbs are sewn tubes with round caps.
    const k = 1 + .14 * (1 - z * z);
    p.setXYZ(i, x * k, y * k, flat && z > f ? f + (z - f) * .3 : z);
  }
  addMesh(parent, weldNormals(geometry), material, centre.toArray(), [radius, radius, halfLength], q);
  return (flat ? f + flat * .3 : 1) * halfLength;
}

function addBody(bear, mats) {
  const origin = [0, 0, 0];
  // Arms: from the shoulders, reaching forward and down so the paws rest on the belly.
  for (const side of [-1, 1]) {
    const shoulder = onEllipsoid(origin, BODY, [side * .92, .42, .12], -.1).point;
    const paw = onEllipsoid(origin, BODY, [side * .56, -.12, .82], .09).point;
    const axis = paw.clone().sub(shoulder);
    const half = axis.length() / 2 + .1;
    const centre = shoulder.clone().add(paw).multiplyScalar(.5);
    limb(bear, mats.fur, centre, axis.normalize(), .205, half);
  }
  // Legs stick out in a sitting pose; the soles face forward and a little up.
  for (const side of [-1, 1]) {
    const yaw = side * .34;
    const axis = new THREE.Vector3(Math.sin(yaw), .2, Math.cos(yaw)).normalize();
    const centre = new THREE.Vector3(side * .44, -BODY[1] + .28, .6);
    const end = limb(bear, mats.fur, centre, axis, .28, .44, .4);
    const foot = new THREE.Group();
    foot.position.copy(centre.clone().addScaledVector(axis, end - .012));
    foot.quaternion.copy(facing(axis)); bear.add(foot);
    addMesh(foot, sphere(32, 20, Z, .18), mats.inner, [0, .005, 0], [.19, .2, .035]);
  }
  // A small round tail, low at the back.
  const tail = onEllipsoid(origin, BODY, [0, -.35, -1], -.02);
  addMesh(bear, sphere(24, 16, tail.normal, .14), mats.fur, tail.point.toArray(), [.15, .14, .15]);
}

function makeTeddy(root) {
  currentFur ??= makeFur();
  const mats = {
    fur: plush(PLUSH),
    muzzle: plush(MUZZLE, { bumpScale: currentFur ? .35 : 1 }),
    inner: plush(INNER, { roughness: .8, sheen: .7, bumpScale: currentFur ? .25 : 1 }),
    eye: new THREE.MeshPhysicalMaterial({ color: '#17100d', roughness: .1, clearcoat: 1,
      clearcoatRoughness: .04, specularIntensity: 1 }),
    glint: new THREE.MeshBasicMaterial({ color: '#f5efe8', transparent: true, opacity: .75 }),
    thread: new THREE.MeshPhysicalMaterial({ color: THREAD, roughness: .55, sheen: .6,
      sheenColor: '#9a7a6c', sheenRoughness: .4, specularIntensity: .5 }),
    threadBase: new THREE.MeshPhysicalMaterial({ color: '#2f1f1a', roughness: .8 }),
  };
  const bear = new THREE.Group();
  bear.rotation.y = FACE;
  root.add(bear);
  addBody(bear, mats);
  addHead(bear, mats);
  // Eye pivots must be in shell space (after the bear's own rotation).
  root.updateMatrixWorld(true);
  bear.traverse(obj => {
    if (!obj.userData.eyeGroup) return;
    const pivot = obj.getWorldPosition(new THREE.Vector3()).toArray();
    obj.traverse(child => { if (child.isMesh) child.userData.pivot = pivot; });
  });
}

/* ------------------------------------------------------------ pixel icon -- */

// 24x24 icon drawn as the left half and mirrored.
const ICON_HALF = [
  '............',
  '.oooo.......',
  'owwwwo.ooooo',
  'owppwoowwwww',
  'owppwwwwwwww',
  'owwwwwwwwwww',
  '.owwwwwwwwww',
  '.owwwwwwwwww',
  '.owwwwweewww',
  '.owwwwweewww',
  '.owwwwwwsmmm',
  '.owwwwwsmmnn',
  '..owwwwsmmmn',
  '..owwwwwwmmm',
  '...oowwwwwww',
  '..owssssswww',
  '.owwwwwswwww',
  '.owwwwwswwww',
  'owwwwwswwwww',
  'owwoooowwwww',
  'owoppppowwww',
  'owoppppowwww',
  '.ooooooooooo',
  '............',
];
const ICON_COLORS = { o: '#b9a591', w: '#f6f0e8', s: '#e2d6c8', p: '#e6c3ad', m: '#fffdf9', e: '#3a2822', n: '#5d3c31' };

function pixelIcon(half, colors) {
  const paths = {};
  half.forEach((row, y) => {
    const full = row + [...row].reverse().join('');
    for (let x = 0; x < full.length;) {
      const c = full[x];
      let end = x + 1;
      while (end < full.length && full[end] === c) end++;
      if (colors[c]) (paths[c] ||= []).push(`M${x} ${y}h${end - x}v1H${x}Z`);
      x = end;
    }
  });
  return Object.keys(colors).filter(c => paths[c])
    .map(c => `<path fill="${colors[c]}" d="${paths[c].join('')}"/>`).join('');
}

/* ------------------------------------------------------------------ spec -- */

export default {
  id: 'teddy', name: 'Teddy', color: PLUSH, coreColor: '#f0cf98',
  size: [...BODY], shape: 'ellipsoid', roundness: .3,
  surface: 'smooth', stamp: false, description: 'A chubby cuddle. A slow, marshmallow rise.',
  // Plush: matte, no clearcoat, lots of soft sheen at grazing angles.
  wax: { roughness: .84, clearcoat: 0, clearcoatRoughness: .6, specularIntensity: .28,
    sheen: 1, sheenColor: '#fbf7f1', sheenRoughness: .62 },
  core: { roughness: .8, clearcoat: 0, specularIntensity: .3,
    sheen: .9, sheenColor: '#fff8ee', sheenRoughness: .6 },
  // Deep, pillowy radial squash with a slow, gentle rise back.
  profile: { mode: 'radial', compression: .44, exponent: .82, pressSpeed: 13, releaseSpeed: 5.5, damping: 2.15 },
  wobble: { omega: 7.5, zeta: .24, gain: .3 },
  ui: {
    detail: 'a chubby cuddle',
    colors: '--toy:#efe6dc;--toy-soft:#fbf7f2;--toy-edge:#cdbba8;--toy-ink:#7a6353',
    icon: pixelIcon(ICON_HALF, ICON_COLORS),
    glow: '#fdf8f2', glowTint: '#e8dccd',
  },
  textures() {
    currentFur = makeFur();
    if (!currentFur) return null;
    return { map: null, bumpMap: currentFur, bumpScale: .55, core: { map: null, bumpMap: currentFur, bumpScale: .55 } };
  },
  accessories(root) { makeTeddy(root); },
};
