import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import chocolate from './squishies/chocolate.js';
import snail from './squishies/snail.js';
import teddy from './squishies/teddy.js';

/**
 * Dimensions are half extents. Every accessory is in the shell's local space.
 * Optional `wax` / `core` hold MeshPhysicalMaterial parameters for the shared
 * shell and filling materials (colors as hex strings).
 */
export const SQUISHY_TYPES = [
  { id: 'butter', name: 'Butter', color: '#f0d77e', coreColor: '#fff2bd',
    size: [2.22, 0.75, 0.68], shape: 'roundedBox', roundness: 0.29,
    surface: 'smooth', stamp: true, description: 'A gentle middle pinch. A slow return.',
    wax: { roughness: 0.6, clearcoat: 0.14, clearcoatRoughness: 0.55,
      sheen: 0.35, sheenColor: '#fff4cc', sheenRoughness: 0.7 },
    core: { roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3,
      sheen: 0.25, sheenColor: '#fffbe3', sheenRoughness: 0.5 } },
  { id: 'platypus', name: 'Platypus', color: '#8f6650', coreColor: '#f3cfa6',
    size: [1.32, 0.87, 0.94], shape: 'ellipsoid', roundness: 0.3,
    surface: 'smooth', stamp: false, description: 'A soft belly. A bouncy little friend.',
    wax: { roughness: 0.5, clearcoat: 0.24, clearcoatRoughness: 0.42,
      sheen: 0.55, sheenColor: '#f0d2bd', sheenRoughness: 0.55 },
    core: { roughness: 0.44, clearcoat: 0.32, clearcoatRoughness: 0.35,
      sheen: 0.4, sheenColor: '#fff0dc', sheenRoughness: 0.5 } },
  { id: 'lychee', name: 'Lychee', color: '#f296a4', coreColor: '#fff8ee',
    size: [1.12, 1.22, 1.12], shape: 'ellipsoid', roundness: 0.3,
    surface: 'lychee', stamp: false, description: 'Round, juicy, and quick to spring back.',
    wax: { roughness: 0.56, clearcoat: 0.32, clearcoatRoughness: 0.38,
      sheen: 0.4, sheenColor: '#ffd6da', sheenRoughness: 0.5 },
    core: { roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.08,
      sheen: 0.2, sheenColor: '#ffffff', sheenRoughness: 0.4, specularIntensity: 1 } },
  { id: 'mangosteen', name: 'Mangosteen', color: '#733f71', coreColor: '#fff6ee',
    size: [1.22, 1.07, 1.22], shape: 'ellipsoid', roundness: 0.3,
    surface: 'smooth', stamp: false, description: 'A firmer squeeze. A mellow rebound.',
    wax: { roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.14,
      sheen: 0.35, sheenColor: '#dcb6e6', sheenRoughness: 0.45, specularIntensity: 1 },
    core: { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2,
      sheen: 0.2, sheenColor: '#ffffff', sheenRoughness: 0.4 } },
  // Plug-in squishies: see src/squishies/README.md.
  chocolate, snail, teddy,
];

export function getSquishySpec(type = 'butter') {
  const spec = SQUISHY_TYPES.find(item => item.id === type) || SQUISHY_TYPES[0];
  const copy = { ...spec, size: [...spec.size] };
  if (spec.wax) copy.wax = { ...spec.wax };
  if (spec.core) copy.core = { ...spec.core };
  if (spec.profile) copy.profile = { ...spec.profile };
  if (spec.wobble) copy.wobble = { ...spec.wobble };
  return copy;
}

const WHITE = new THREE.Color('#ffffff');
const UP = new THREE.Vector3(0, 1, 0);
const smoothstep = THREE.MathUtils.smoothstep;

function material(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.48, metalness: 0,
    clearcoat: 0.16, clearcoatRoughness: 0.5, ...options });
}

/** Velvety silicone: soft sheen at grazing angles with a thin satin coat. */
function soft(color, options = {}) {
  return material(color, { roughness: 0.56, clearcoat: 0.22, clearcoatRoughness: 0.42,
    sheen: 0.6, sheenRoughness: 0.5,
    sheenColor: new THREE.Color(color).lerp(WHITE, 0.55), ...options });
}

function addMesh(parent, geometry, mat, position = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function oval(parent, mat, position, scale, segments = 32, rings = Math.round(segments * 0.65)) {
  return addMesh(parent, new THREE.SphereGeometry(1, segments, rings), mat, position, scale);
}

function line(parent, mat, points, radius = 0.012, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const tubular = Math.min(48, Math.max(12, points.length * 2));
  return addMesh(parent, new THREE.TubeGeometry(curve, tubular, radius, radial, false), mat);
}

/** Welds seams/poles so computed normals stay continuous on deformed spheres. */
function smoothNormals(geometry) {
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const merged = mergeVertices(geometry, 1e-5);
  geometry.dispose();
  merged.computeVertexNormals();
  return merged;
}

/** A unit sphere reshaped by `shape(x, y, z) -> [x, y, z]`. */
function sculptedSphere(shape, segments = 48, rings = 28) {
  const geometry = new THREE.SphereGeometry(1, segments, rings);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(i, ...shape(position.getX(i), position.getY(i), position.getZ(i)));
  }
  return smoothNormals(geometry);
}

function tag(mesh, role, pivot) {
  mesh.userData.role = role;
  if (pivot) mesh.userData.pivot = [...pivot];
  return mesh;
}

/** Where a ray from the centre meets the ellipsoid, with an upright tangent frame. */
function surfaceFrame(size, dir, lift = 0) {
  const point = new THREE.Vector3(...dir).normalize();
  point.multiplyScalar(1 / Math.hypot(point.x / size[0], point.y / size[1], point.z / size[2]));
  const normal = new THREE.Vector3(point.x / size[0] ** 2, point.y / size[1] ** 2,
    point.z / size[2] ** 2).normalize();
  point.addScaledVector(normal, lift);
  const up = UP.clone().addScaledVector(normal, -normal.y).normalize();
  const right = new THREE.Vector3().crossVectors(up, normal);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, normal));
  return { position: point, normal, quaternion };
}

function anchor(parent, frame) {
  const group = new THREE.Group();
  group.position.copy(frame.position);
  group.quaternion.copy(frame.quaternion);
  parent.add(group);
  return group;
}

/**
 * A small glossy safety-bead eye, set slightly into the plush, with one soft
 * reflected highlight. Both parts blink about the eye's centre.
 */
function addEye(root, frame, radius, mats, { depth = 0.6, mirror = 1 } = {}) {
  const group = anchor(root, frame);
  const pivot = frame.position.toArray();
  const rz = radius * depth;
  tag(oval(group, mats.eye, [0, 0, 0], [radius, radius * 1.06, rz], 32, 22), 'eye', pivot);
  const gx = -0.32 * mirror, gy = 0.36, s = 0.2;
  const z = rz * Math.sqrt(Math.max(0, 1 - gx * gx - gy * gy));
  const glint = oval(group, mats.glint, [gx * radius, gy * radius, z],
    [s * radius, s * radius, s * radius * 0.3], 12, 8);
  glint.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(gx / radius, gy / radius, z / (rz * rz)).normalize());
  tag(glint, 'eye', pivot);
  return group;
}

/**
 * Thin, closed leaf blade along +x: tapered to a point, cupped, arched and
 * drooping at the tip, with a creased midrib painted a lighter green.
 */
function leafGeometry(length, width, { thickness = 0.034, cup = 0.3, arch = 0.09, droop = 0.2,
  bend = 0.06, colors = ['#5f8c43', '#8fb862', '#c9dd9a', '#a8c586'] } = {}) {
  const [baseColor, tipColor, veinColor, underColor] = colors.map(c => new THREE.Color(c));
  const rows = 26, cols = 15, positions = [], colorsOut = [], indices = [];
  const color = new THREE.Color();
  for (const side of [1, -1]) {
    const offset = positions.length / 3;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      const shape = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.9);
      const w = width * 0.5 * shape;
      const mid = arch * Math.sin(Math.PI * Math.min(1, t * 1.15)) - droop * t * t;
      for (let j = 0; j < cols; j++) {
        const s = j / (cols - 1) * 2 - 1;
        const half = thickness * 0.5 * Math.sqrt(Math.max(0, 1 - s * s)) * Math.sqrt(shape);
        const crease = side > 0 ? 0.012 * Math.exp(-((s * 7) ** 2)) * shape : 0;
        positions.push(t * length, mid + cup * w * s * s + side * half - crease, s * w + bend * t * t);
        const vein = Math.exp(-((s * 6) ** 2)) * (0.85 - 0.45 * t);
        color.copy(baseColor).lerp(tipColor, smoothstep(t, 0.05, 0.95)).lerp(veinColor, vein);
        if (side < 0) color.lerp(underColor, 0.55);
        colorsOut.push(color.r, color.g, color.b);
      }
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols - 1; j++) {
      const a = offset + i * cols + j, b = a + cols;
      if (side > 0) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsOut, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addLeaf(parent, mat, position, length, width, rotation = [0, 0, 0], options) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.set(...rotation);
  parent.add(group);
  addMesh(group, leafGeometry(length, width, options), mat);
  return group;
}

/** A swept stem whose radius tapers, flares at the base and closes in a rounded cut. */
function stemGeometry(points, r0, r1, { tubular = 30, radial = 14, flare = 0.4, cap = 0.12 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions = [], indices = [];
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular, t = 1 - Math.pow(1 - u, 1.5);
    const point = curve.getPointAt(t);
    const frame = Math.min(tubular, Math.round(t * tubular));
    let r = THREE.MathUtils.lerp(r0, r1, t) * (1 + flare * Math.exp(-t / 0.1));
    if (t > 1 - cap) r *= Math.sqrt(Math.max(0, 1 - ((t - 1 + cap) / cap) ** 2));
    for (let j = 0; j < radial; j++) {
      const v = j / radial * Math.PI * 2;
      const n = frames.normals[frame].clone().multiplyScalar(-Math.cos(v))
        .addScaledVector(frames.binormals[frame], Math.sin(v));
      positions.push(point.x + n.x * r, point.y + n.y * r, point.z + n.z * r);
    }
  }
  for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = (i + 1) * radial + j;
    const c = (i + 1) * radial + (j + 1) % radial, d = i * radial + (j + 1) % radial;
    indices.push(a, b, d, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return smoothNormals(geometry);
}

function makePlatypus(root, size) {
  const bill = soft('#e8b784', { roughness: 0.5, sheen: 0.45 });
  const seam = material('#c08560', { roughness: 0.55, clearcoat: 0.2 });
  const nostril = material('#6b4131', { roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const feet = soft('#d7a06d', { sheen: 0.5 });
  const tail = soft('#8e5c3e', { sheen: 0.5 });
  const hatch = material('#744a31', { roughness: 0.66, clearcoat: 0.08 });

  // A broad duck bill: flattened, widening into a spatula tip that turns up slightly.
  const billShape = (x, y, z) => {
    const widen = 1 + 0.14 * (x + 1) / 2;
    return [1.36 + 0.74 * x, -0.13 + (y > 0 ? 0.17 : 0.15) * y + 0.05 * Math.max(0, x) ** 2,
      0.52 * z * widen];
  };
  addMesh(root, sculptedSphere(billShape, 56, 28), bill);
  // A soft mouth seam around the front of the bill, just under its widest edge.
  const seamPoints = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24 - 0.5) * Math.PI * 1.1, ring = Math.sqrt(1 - 0.18 ** 2) + 0.012;
    const [x, y, z] = billShape(Math.cos(a) * ring, 0.18, Math.sin(a) * ring);
    const outward = new THREE.Vector2(x - 1.36, z).normalize();
    seamPoints.push([x + outward.x * 0.004, y, z + outward.y * 0.004]);
  }
  line(root, seam, seamPoints, 0.0085, 6);
  // Two little nostril dimples near the tip.
  for (const side of [-1, 1]) {
    const x = 1.8, z = side * 0.14;
    const u = (x - 1.36) / 0.74, w = z / (0.52 * (1 + 0.14 * (u + 1) / 2));
    const y = -0.13 + 0.17 * Math.sqrt(Math.max(0, 1 - u * u - w * w)) + 0.05 * u * u;
    const hole = oval(root, nostril, [x, y - 0.004, z], [0.034, 0.012, 0.02], 16, 10);
    hole.rotation.set(0, side * 0.35, -0.42);
  }

  const eyes = {
    eye: material('#1a1210', { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04,
      specularIntensity: 1 }),
    glint: new THREE.MeshBasicMaterial({ color: '#f4ece6', transparent: true, opacity: 0.7 }),
  };
  for (const side of [-1, 1]) {
    addEye(root, surfaceFrame(size, [0.9, 0.39, side * 0.57], -0.01), 0.066, eyes, { mirror: side });

    // Four webbed flippers with three rounded toes each.
    for (const x of [-0.73, 0.62]) {
      const foot = new THREE.Group();
      foot.position.set(x, -0.66, side * 0.73);
      // Local +x (the toes) points forward-out for front feet, back-out for hind feet.
      foot.rotation.y = x > 0 ? Math.atan2(-side * 0.45, 1) : Math.atan2(-side * 0.9, -0.45);
      root.add(foot);
      addMesh(foot, sculptedSphere((px, py, pz) => {
        const phi = Math.atan2(pz, px);
        const front = smoothstep(Math.cos(phi), 0.45, 0.85);
        const toes = 1 + front * (0.075 * Math.cos(phi * 9) - 0.015) + 0.1 * Math.max(0, px);
        return [px * 0.3 * toes, py * (py > 0 ? 0.13 : 0.07), pz * 0.33 * toes];
      }, 64, 20), feet);
    }
  }

  // A beaver-like paddle tail that widens away from the body.
  const tailGroup = new THREE.Group();
  tailGroup.position.set(-1.5, -0.25, 0);
  tailGroup.rotation.z = -0.1;
  root.add(tailGroup);
  const L = 0.84, W = 0.5, H = 0.16;
  const tailWidth = x => W * (1 - 0.16 * x / L);
  addMesh(tailGroup, sculptedSphere((x, y, z) => [x * L, y * H * (y > 0 ? 1 : 0.7),
    z * tailWidth(x * L)], 48, 24), tail);
  // Diamond scoring follows the domed upper surface.
  for (const sign of [-1, 1]) for (let offset = -0.6; offset <= 0.61; offset += 0.24) {
    const points = [];
    for (let i = 0; i <= 30; i++) {
      const x = -0.74 + i / 30 * 1.4;
      const z = sign * x * 0.55 + offset;
      const radial = (x / L) ** 2 + (z / tailWidth(x)) ** 2;
      if (radial < 0.74) points.push([x, H * Math.sqrt(1 - radial) + 0.002, z]);
    }
    if (points.length > 3) line(tailGroup, hatch, points, 0.0075, 5);
  }
}

function makeLychee(root) {
  const bark = soft('#8b6a47', { roughness: 0.72, clearcoat: 0.12, sheen: 0.35 });
  const leaf = soft('#ffffff', { vertexColors: true, roughness: 0.46, clearcoat: 0.35,
    clearcoatRoughness: 0.3, sheen: 0.35, sheenColor: '#e8f5cf' });
  addMesh(root, stemGeometry([[-0.04, 1.14, 0.01], [-0.03, 1.3, 0], [0.01, 1.43, -0.02],
    [0.08, 1.52, -0.05]], 0.052, 0.036, { flare: 0.55 }), bark);
  oval(root, bark, [-0.035, 1.215, 0.005], [0.11, 0.035, 0.105], 28, 14);
  addLeaf(root, leaf, [0.0, 1.3, -0.01], 0.92, 0.36, [0.25, 0.62, -0.1],
    { arch: 0.1, droop: 0.26, bend: -0.05 });
  addLeaf(root, leaf, [-0.05, 1.29, -0.02], 0.64, 0.25, [-0.15, -2.55, -0.08],
    { arch: 0.08, droop: 0.2, bend: 0.05, colors: ['#577f3c', '#7fa855', '#bdd38e', '#9fbd7c'] });
}

/** A rounded, fleshy calyx sepal that hugs the top of the fruit. */
function sepalGeometry(size, angle, { length = 0.62, width = 0.46, thickness = 0.085, gap = 0.006,
  curl = 0.12, cup = 0.22, colors = ['#58703a', '#91aa5c', '#b4c77c'] } = {}) {
  const [baseColor, tipColor, midColor] = colors.map(c => new THREE.Color(c));
  const along = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
  const across = new THREE.Vector2(-along.y, along.x);
  const rows = 20, cols = 13, positions = [], colorsOut = [], indices = [];
  const color = new THREE.Color();
  for (const side of [0, 1]) {
    const offset = positions.length / 3;
    for (let i = 0; i <= rows; i++) {
      const t = Math.sin(i / rows * Math.PI / 2);
      const tip = Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.4)));
      const w = width * 0.5 * Math.pow(Math.sin(Math.PI / 2 * Math.min(1, t / 0.42)), 0.65) * tip;
      for (let j = 0; j < cols; j++) {
        const s = j / (cols - 1) * 2 - 1;
        const r = 0.02 + t * length;
        const hx = along.x * r + across.x * s * w, hz = along.y * r + across.y * s * w;
        const surface = size[1] * Math.sqrt(Math.max(0, 1 - (hx / size[0]) ** 2 - (hz / size[2]) ** 2));
        const bottom = surface + gap + curl * t * t * t + cup * w * s * s;
        const thick = thickness * Math.sqrt(Math.max(0, 1 - s * s)) * Math.sqrt(tip) * (1 - 0.35 * t);
        positions.push(hx, bottom + side * thick, hz);
        color.copy(baseColor).lerp(tipColor, smoothstep(t, 0.1, 1))
          .lerp(midColor, Math.exp(-((s * 4) ** 2)) * 0.45 * t);
        colorsOut.push(color.r, color.g, color.b);
      }
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols - 1; j++) {
      const a = offset + i * cols + j, b = a + cols;
      if (side) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsOut, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeMangosteen(root, size) {
  const sepal = soft('#ffffff', { vertexColors: true, roughness: 0.5, clearcoat: 0.3,
    clearcoatRoughness: 0.32, sheen: 0.45, sheenColor: '#e3efc4' });
  const stem = soft('#5f6e36', { roughness: 0.6, sheen: 0.4 });
  const stemTop = soft('#9c9c68', { roughness: 0.7 });
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5 + 0.5;
    addMesh(root, sepalGeometry(size, angle, { gap: 0.006 + i * 0.004, length: 0.6 + (i % 2) * 0.05,
      colors: i % 2 ? ['#3a5224', '#5f7f36', '#89a257'] : ['#415a28', '#67873b', '#90a85c'] }), sepal);
  }
  addMesh(root, stemGeometry([[0, 1.02, 0], [0.005, 1.17, 0], [0.03, 1.3, 0.005], [0.075, 1.38, 0.01]],
    0.082, 0.07, { flare: 0.45, cap: 0.1 }), stem);
  const top = oval(root, stemTop, [0.075, 1.382, 0.01], [0.056, 0.012, 0.056], 20, 10);
  top.rotation.z = -0.55;

  // Small blossom scar, visible on the underside when the fruit compresses.
  const scar = new THREE.Group();
  scar.position.set(0, -size[1] + 0.028, 0);
  root.add(scar);
  const scarMaterial = soft('#9a6f78', { roughness: 0.76, clearcoat: 0 });
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const petal = oval(scar, scarMaterial,
      [Math.cos(angle) * 0.105, -0.001, Math.sin(angle) * 0.105], [0.1, 0.026, 0.044], 16);
    petal.rotation.y = -angle;
  }
  oval(scar, scarMaterial, [0, -0.015, 0], [0.045, 0.025, 0.045], 16);
}

/** All geometry/materials are owned by this group and may be disposed by traversal. */
export function createAccessories(type = 'butter') {
  const group = new THREE.Group();
  group.name = `${type}-accessories`;
  const { size } = getSquishySpec(type);
  if (type === 'platypus') makePlatypus(group, size);
  else if (type === 'lychee') makeLychee(group);
  else if (type === 'mangosteen') makeMangosteen(group, size);
  else SQUISHY_TYPES.find(item => item.id === type)?.accessories?.(group, [...size]);
  return group;
}
