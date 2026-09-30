import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandTracking } from '../src/hand-tracking.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fixture(t, getUserMedia) {
  for (const [key, value] of Object.entries({
    isSecureContext: true,
    navigator: { mediaDevices: { getUserMedia } },
    cancelAnimationFrame: () => {},
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    });
  }
  const statuses = [];
  const pressures = [];
  const playback = deferred();
  const video = { style: {}, srcObject: null, play: () => playback.promise, pause() {} };
  const canvas = { style: {}, getContext: () => ({ clearRect() {} }) };
  const tracker = createHandTracking({ video, canvas, onStatus: (value) => statuses.push(value), onPressure: (value) => pressures.push(value) });
  t.after(() => tracker.dispose());
  return { tracker, video, statuses, pressures, playback };
}

function stream() {
  const track = { stopped: false, stop() { this.stopped = true; } };
  return { track, getTracks: () => [track], getVideoTracks: () => [track] };
}

test('camera permission failure resolves start and presents an actionable error', async (t) => {
  const { tracker, statuses } = fixture(t, async () => {
    throw Object.assign(new Error('Denied'), { name: 'NotAllowedError' });
  });
  await tracker.start();
  assert.equal(statuses.at(-1).state, 'error');
  assert.match(statuses.at(-1).message, /Allow camera access/);
});

test('stopping a pending camera request releases its eventual stream', async (t) => {
  const permission = deferred();
  const { tracker, video, statuses, pressures } = fixture(t, () => permission.promise);
  const starting = tracker.start();
  tracker.stop();
  const camera = stream();
  permission.resolve(camera);
  await starting;
  assert.equal(camera.track.stopped, true);
  assert.equal(video.srcObject, null);
  assert.equal(statuses.at(-1).state, 'stopped');
  assert.equal(pressures.at(-1), 0);
});

test('a cancelled start cannot detach a newer camera stream', async (t) => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const { tracker, video, playback } = fixture(t, () => (++calls === 1 ? first.promise : second.promise));
  const oldStart = tracker.start();
  tracker.stop();
  const newStart = tracker.start();
  const newCamera = stream();
  second.resolve(newCamera);
  await Promise.resolve();
  assert.equal(video.srcObject, newCamera);
  const oldCamera = stream();
  first.resolve(oldCamera);
  await oldStart;
  assert.equal(oldCamera.track.stopped, true);
  assert.equal(newCamera.track.stopped, false);
  assert.equal(video.srcObject, newCamera);
  tracker.stop();
  playback.resolve();
  await newStart;
  assert.equal(newCamera.track.stopped, true);
});

test('repeated start is idempotent and dispose prevents future camera requests', async (t) => {
  const permission = deferred();
  let calls = 0;
  const { tracker } = fixture(t, () => { calls++; return permission.promise; });
  const pending = tracker.start();
  await tracker.start();
  assert.equal(calls, 1);
  tracker.dispose();
  const camera = stream();
  permission.resolve(camera);
  await pending;
  await tracker.start();
  assert.equal(calls, 1);
  assert.equal(camera.track.stopped, true);
});

test('camera disconnected while starting releases tracks and reports failure', async (t) => {
  const camera = stream();
  const { tracker, playback, statuses, video } = fixture(t, async () => camera);
  const pending = tracker.start();
  await Promise.resolve();
  camera.track.onended();
  playback.reject(new Error('Playback interrupted'));
  await pending;
  assert.equal(camera.track.stopped, true);
  assert.equal(video.srcObject, null);
  assert.equal(statuses.at(-1).state, 'error');
});
