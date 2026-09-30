import test from 'node:test';
import assert from 'node:assert/strict';
import {createPressureState, stepPressure, deformPoint, advanceFracture, SQUISH_PROFILES} from '../src/wax-physics.js';

test('spring stays finite and bounded through long frames and invalid pressure', () => {
  const state = createPressureState();
  for (const target of [1, 0, 1, NaN, Infinity, -4, 20]) {
    for (let i = 0; i < 120; i++) {
      stepPressure(state, target, i % 7 ? 1 / 60 : 2);
      assert.ok(Number.isFinite(state.pressure) && state.pressure >= 0 && state.pressure <= 1);
      assert.ok(Number.isFinite(state.velocity));
    }
  }
});

test('squish settles and has a slower physical release', () => {
  const state = createPressureState();
  for (let i = 0; i < 120; i++) stepPressure(state, 1, 1 / 60);
  assert.ok(state.pressure > 0.999);
  stepPressure(state, 0, 1 / 60);
  assert.ok(state.pressure > 0.95, 'release must not snap immediately');
  for (let i = 0; i < 180; i++) stepPressure(state, 0, 1 / 60);
  assert.equal(state.pressure, 0);
  assert.ok(state.restTime > 1);
});

test('deformation is continuous, identity at rest and preserves local volume', () => {
  for (const [type, halfX] of [['butter',2.22], ['platypus',1.32], ['lychee',1.12], ['mangosteen',1.22]]) {
    const profile = SQUISH_PROFILES[type];
    assert.deepEqual(deformPoint(.3, .4, .5, 0, halfX, profile), [.3, .4, .5]);
    for (const p of [.3, .7, 1]) {
      const v = [.4, .5, .6], eps = 1e-5;
      const base = deformPoint(...v, p, halfX, profile);
      const cols = v.map((_, j) => {const q = [...v]; q[j] += eps; return deformPoint(...q, p, halfX, profile).map((n, k) => (n - base[k]) / eps);});
      const [a,b,c] = cols;
      const determinant = a[0]*(b[1]*c[2]-b[2]*c[1])-b[0]*(a[1]*c[2]-a[2]*c[1])+c[0]*(a[1]*b[2]-a[2]*b[1]);
      assert.ok(Math.abs(determinant - 1) < 1e-6);
      assert.ok(base[1] < v[1] && base[2] > v[2]);
    }
  }
});

test('shape-specific deformation differs even with equal dimensions and pressure', () => {
  const outputs = Object.values(SQUISH_PROFILES).map(profile => deformPoint(.35, .6, .6, .7, 1, profile));
  assert.equal(new Set(outputs.map(point => point.map(n => n.toFixed(4)).join(','))).size, 4);
  const lychee = deformPoint(.5, .5, .5, .8, 1, SQUISH_PROFILES.lychee);
  assert.ok(Math.abs(lychee[0] - lychee[2]) < 1e-10, 'round fruit bulges equally in both lateral axes');
  const mangosteen = deformPoint(.5, .5, .5, .8, 1, SQUISH_PROFILES.mangosteen);
  assert.ok(mangosteen[1] > lychee[1], 'thicker fruit remains firmer at the same pressure');
  const belly = deformPoint(-.18, .6, .2, .8, 1, SQUISH_PROFILES.platypus);
  const head = deformPoint(.8, .6, .2, .8, 1, SQUISH_PROFILES.platypus);
  assert.ok(belly[1] < head[1], 'platypus head remains supported as its belly squashes');
});

test('shape profiles have different recovery rates and all settle without drift', () => {
  const residual = {};
  for (const [type, profile] of Object.entries(SQUISH_PROFILES)) {
    const state = createPressureState();
    for (let i=0;i<180;i++) stepPressure(state,1,1/60,profile);
    for (let i=0;i<12;i++) stepPressure(state,0,1/60,profile);
    residual[type] = state.pressure;
    for (let i=0;i<240;i++) stepPressure(state,0,1/60,profile);
    assert.equal(state.pressure,0);
  }
  assert.ok(residual.lychee < residual.mangosteen);
  assert.ok(residual.platypus < residual.butter);
  assert.equal(new Set(Object.values(residual).map(n=>n.toFixed(4))).size,4);
});

test('fractures persist during release, open gradually and heal at rest', () => {
  const cell = {threshold: .25, damage: 0, opening: 0};
  assert.equal(advanceFracture(cell, .2, .3, false, 1/60), false);
  assert.equal(cell.opening, 0);
  assert.equal(advanceFracture(cell, .4, .5, false, 1/60), true);
  const damage = cell.damage;
  assert.ok(cell.opening > 0 && cell.opening < .02);
  advanceFracture(cell, .1, .1, false, 1/60);
  assert.equal(cell.damage, damage);
  for(let i=0;i<180;i++) advanceFracture(cell, 0, 0, true, 1/60);
  assert.equal(cell.damage, 0);
  assert.ok(cell.opening < 1e-6);
});

test('squeezing never overshoots or bounces for any toy', async () => {
  const { SQUISHY_TYPES } = await import('../src/squishy-models.js');
  for (const toy of SQUISHY_TYPES) {
    const profile = toy.profile || SQUISH_PROFILES[toy.id];
    assert.ok(profile, `${toy.id} has a squish profile`);
    for (const goal of [.35, .7, 1]) {
      // A steady hold, then a slow hand-style ramp that eases back a little.
      const state = createPressureState();
      let previous = 0;
      for (let i = 0; i < 240; i++) {
        stepPressure(state, goal, 1/60, profile);
        assert.ok(state.pressure <= goal + 1e-6, `${toy.id} overshoots ${goal}`);
        assert.ok(state.pressure >= previous - 1e-9, `${toy.id} dips while squeezing to ${goal}`);
        previous = state.pressure;
      }
      for (let i = 0; i < 120; i++) {
        const before = state.pressure;
        stepPressure(state, goal * .8, 1/60, profile);
        assert.ok(state.pressure >= goal * .8 - 1e-6 && state.pressure <= before + 1e-9, `${toy.id} bounces while easing off`);
      }
    }
  }
});
