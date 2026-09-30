import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateGripPressure, smoothPressure } from '../src/gesture.js';

function hand(curl = 0) {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (let finger = 0; finger < 4; finger++) {
    const base = 5 + finger * 4;
    let y = 0.04;
    let z = 0;
    points[base] = { x: finger * 0.02, y, z };
    for (let bone = 1; bone <= 3; bone++) {
      const angle = curl * (bone - 1) * Math.PI * 0.6;
      y += Math.cos(angle) * 0.025;
      z += Math.sin(angle) * 0.025;
      points[base + bone] = { x: finger * 0.02, y, z };
    }
  }
  return points;
}

test('open fingers release and a curled fist applies full pressure', () => {
  assert.equal(estimateGripPressure(hand(0)), 0);
  assert.equal(estimateGripPressure(hand(1)), 1);
});

test('pressure increases continuously as fingers curl', () => {
  const values = [0, 0.25, 0.5, 0.75, 1].map((curl) => estimateGripPressure(hand(curl)));
  values.slice(1).forEach((value, i) => assert.ok(value >= values[i]));
  assert.ok(values[2] > 0 && values[2] < 1);
});

test('3D rotation, translation, mirroring and scale do not change pressure', () => {
  const original = hand(0.6);
  const transformed = original.map(({ x, y, z }) => ({
    x: 100 - y * 3,
    y: 20 + z * 3,
    z: 2 + x * 3,
  }));
  assert.ok(Math.abs(estimateGripPressure(original) - estimateGripPressure(transformed)) < 1e-10);
});

test('thumb position cannot prevent a fist and partial fists stay proportional', () => {
  const fist = hand(1);
  fist[4] = { x: 20, y: 20, z: 20 };
  assert.equal(estimateGripPressure(fist), 1);
  fist.splice(5, 4, ...hand(0).slice(5, 9));
  assert.equal(estimateGripPressure(fist), 0.75);
});

test('missing, non-finite, or collapsed tracking data releases pressure', () => {
  for (const value of [null, [], hand().slice(1), Array(21).fill({ x: 0, y: 0, z: 0 })]) {
    assert.equal(estimateGripPressure(value), 0);
  }
  const corrupt = hand(1);
  corrupt[8].z = NaN;
  assert.equal(estimateGripPressure(corrupt), 0);
});

test('smoothing is frame-rate independent and converges without overshoot', () => {
  const whole = smoothPressure(0, 1, 100);
  const halves = smoothPressure(smoothPressure(0, 1, 50), 1, 50);
  assert.ok(Math.abs(whole - halves) < 1e-12);
  assert.ok(whole > 0 && whole < 1);
  assert.ok(smoothPressure(1, 0, 100) < 1 - whole);
  assert.equal(smoothPressure(0.5, NaN, -10), 0.5);
});
