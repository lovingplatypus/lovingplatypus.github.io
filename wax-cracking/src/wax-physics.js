// Shape-specific, volume-preserving toy approximations. These describe a soft
// filling and a brittle coating, rather than a full finite-element simulation.
export const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export const SQUISH_PROFILES = Object.freeze({
  butter: Object.freeze({mode:'pinch', stretch:.09, compression:.12, pinch:.39, focus:3.0, center:0, bend:.035, exponent:1,
    pressSpeed:18, releaseSpeed:10, damping:1.95}),
  platypus: Object.freeze({mode:'pinch', stretch:.055, compression:.10, pinch:.39, focus:1.4, center:-.12, bend:.025, exponent:.92,
    pressSpeed:20, releaseSpeed:12, damping:1.55}),
  lychee: Object.freeze({mode:'radial', compression:.47, exponent:.86,
    pressSpeed:23, releaseSpeed:18, damping:1.85}),
  mangosteen: Object.freeze({mode:'radial', compression:.32, exponent:1.28,
    pressSpeed:14, releaseSpeed:9, damping:2.05}),
});
export const getSquishProfile = type => SQUISH_PROFILES[type] || SQUISH_PROFILES.butter;

export function createPressureState() {
  return {pressure:0, velocity:0, target:0, restTime:0};
}

export function stepPressure(state, target, delta, profile = SQUISH_PROFILES.butter) {
  state.target = clamp01(target);
  const elapsed = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  let remaining = Math.min(.1, elapsed);
  while (remaining > 1e-8) {
    const dt = Math.min(remaining, 1 / 180);
    const omega = state.target < state.pressure ? profile.releaseSpeed : profile.pressSpeed;
    // While a squeeze is held the spring is at least critically damped, so the
    // squish never overshoots; each toy's own bounce only plays once let go.
    const released = state.target < .05 && state.target < state.pressure;
    const damping = released ? profile.damping : Math.max(2, profile.damping);
    state.velocity += (omega * omega * (state.target - state.pressure) - damping * omega * state.velocity) * dt;
    state.pressure = clamp01(state.pressure + state.velocity * dt);
    if ((state.pressure === 0 && state.velocity < 0) || (state.pressure === 1 && state.velocity > 0)) state.velocity = 0;
    remaining -= dt;
  }
  if (Math.abs(state.pressure - state.target) < .00003 && Math.abs(state.velocity) < .001) {
    state.pressure = state.target; state.velocity = 0;
  }
  state.restTime = state.target < .025 && state.pressure < .045 ? state.restTime + elapsed : 0;
  return state;
}

// Triangular Jacobian with determinant one. Radial fruits spread evenly into x
// and z; the long toys pinch around their own centre/belly and bend at the ends.
export function deformationFrame(x, pressure, halfX, profile = SQUISH_PROFILES.butter) {
  const p = Math.pow(clamp01(pressure), profile.exponent);
  if (profile.mode === 'radial') {
    const sy = 1 - p * profile.compression;
    const sx = 1 / Math.sqrt(sy);
    return {sx, sy, sz:sx, dsy:0, bend:0, bendSlope:0};
  }
  const u = x / halfX - profile.center;
  const middle = Math.exp(-profile.focus * u * u);
  const sx = 1 + p * profile.stretch;
  const sy = 1 - p * (profile.compression + profile.pinch * middle);
  const sz = 1 / (sx * sy);
  const dsy = p * profile.pinch * middle * 2 * profile.focus * u / halfX;
  return {sx, sy, sz, dsy, bend:p * profile.bend * (x / halfX) ** 2,
    bendSlope:p * 2 * profile.bend * x / (halfX * halfX)};
}

export function deformPoint(x, y, z, pressure, halfX = 2.22, profile = SQUISH_PROFILES.butter) {
  const {sx, sy, sz, bend} = deformationFrame(x, pressure, halfX, profile);
  return [x * sx, y * sy + bend, z * sz];
}

export function localStress(x, y, z, size, pressure) {
  const middle = Math.exp(-2 * (x / size[0]) ** 2);
  const surface = .72 + .28 * Math.min(1, Math.abs(y) / size[1]);
  return clamp01(pressure) * (.66 + .34 * middle) * surface;
}

export function advanceFracture(cell, stress, pressure, resting, delta) {
  const wasCracked = cell.damage > 0;
  if (resting) cell.damage = Math.max(0, cell.damage - delta * 2.2);
  else if (stress > cell.threshold) cell.damage = Math.max(cell.damage, Math.min(1, .26 + (stress - cell.threshold) * 3.1));
  // A light squeeze now reveals the first fissures; later compression curls lips.
  const desired = cell.damage * (.008 + Math.max(0, pressure - .07) * .075);
  cell.opening += (desired - cell.opening) * (1 - Math.exp(-Math.max(0, delta) * 18));
  return !wasCracked && cell.damage > 0;
}
