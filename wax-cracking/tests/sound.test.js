import test from 'node:test';
import assert from 'node:assert/strict';
import { synthCrack, TOY_SOUNDS } from '../src/sound.js';
import { SQUISHY_TYPES } from '../src/squishy-models.js';

function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

test('crack samples are short, normalised, DC-free and end in silence', () => {
  for (const options of [{}, { snap: true }, { pitch: .8 }, { snap: true, pitch: 1.15 }]) {
    const data = synthCrack(48000, seeded(7), options);
    assert.ok(data.length > 1000 && data.length < 48000 * .1);
    let peak = 0, sum = 0;
    for (const value of data) { assert.ok(Number.isFinite(value)); peak = Math.max(peak, Math.abs(value)); sum += value; }
    assert.ok(Math.abs(peak - 1) < 1e-6, 'peak is normalised');
    assert.ok(Math.abs(sum / data.length) < .02, 'no DC offset');
    assert.equal(Math.abs(data[data.length - 1]), 0);
    // Energy is front-loaded: a crack, not a hiss.
    const quarter = Math.floor(data.length / 4);
    const energy = (from, to) => data.slice(from, to).reduce((total, value) => total + value * value, 0);
    assert.ok(energy(0, quarter) > 4 * energy(quarter * 3, data.length));
  }
});

test('every squishy has a sound voice', () => {
  for (const toy of SQUISHY_TYPES) assert.ok(TOY_SOUNDS[toy.id] || toy.sound, `${toy.id} has a voice`);
});
