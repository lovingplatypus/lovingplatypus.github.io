// Procedural squishy foley. Fracture impulses come from the shell simulation;
// the squish follows how fast the toy is being pressed or released.

// Per-toy voice: `pitch` scales the crack resonances, `crunch` the crack level,
// `snap` how often a crack has a low woody body, `squish` the soft squeeze
// level, and `tone` the squish's brightness in Hz. A spec's `sound` overrides it.
export const TOY_SOUNDS = Object.freeze({
  default: { pitch: 1, crunch: 1, snap: .25, squish: .6, tone: 700 },
  butter: { pitch: 1, crunch: 1, snap: .25, squish: .45, tone: 650 },
  platypus: { pitch: .9, crunch: .9, snap: .2, squish: .75, tone: 560 },
  lychee: { pitch: 1.15, crunch: 1, snap: .15, squish: .9, tone: 950 },
  mangosteen: { pitch: .85, crunch: .95, snap: .35, squish: .6, tone: 600 },
  chocolate: { pitch: .8, crunch: 1.2, snap: .55, squish: .25, tone: 520 },
  snail: { pitch: 1.05, crunch: .9, snap: .15, squish: 1, tone: 820 },
  teddy: { pitch: .9, crunch: .8, snap: .2, squish: .7, tone: 380 },
});

/**
 * One short crack sample: a sharp noise tick exciting a few decaying modes of a
 * thin shell, plus (for snaps) a quick low body. Pure, so it can be tested.
 */
export function synthCrack(sampleRate, random = Math.random, { snap = false, pitch = 1 } = {}) {
  const length = Math.ceil(sampleRate * (snap ? .075 : .05));
  const data = new Float32Array(length);
  const modes = Array.from({ length: snap ? 4 : 5 }, () => ({
    freq: (snap ? 700 + random() * 2600 : 1600 + random() * 5200) * pitch,
    decay: (snap ? .006 + random() * .014 : .0025 + random() * .009) * sampleRate,
    amp: .35 + random() * .65, phase: random() * Math.PI * 2,
  }));
  const bodyFreq = (150 + random() * 170) * pitch, bodyDecay = .011 * sampleRate;
  const tickDecay = (.0006 + random() * .0008) * sampleRate;
  for (let i = 0; i < length; i++) {
    let value = (random() * 2 - 1) * Math.exp(-i / tickDecay) * 1.4;
    for (const mode of modes) {
      value += mode.amp * Math.exp(-i / mode.decay) * Math.sin(mode.phase + 2 * Math.PI * mode.freq * i / sampleRate);
    }
    if (snap) value += 1.3 * Math.exp(-i / bodyDecay) * Math.sin(2 * Math.PI * bodyFreq * i / sampleRate);
    data[i] = value;
  }
  // Remove rumble/DC, fade the tail to silence, and normalise the peak.
  let previousIn = 0, previousOut = 0, peak = 0;
  const hp = Math.exp(-2 * Math.PI * 90 / sampleRate), fade = Math.floor(length * .3);
  for (let i = 0; i < length; i++) {
    const out = hp * (previousOut + data[i] - previousIn);
    previousIn = data[i]; previousOut = out;
    data[i] = out * (i > length - 1 - fade ? (length - 1 - i) / fade : 1);
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;
  return data;
}

function makeBuffer(context, samples, channels = 1) {
  const buffer = context.createBuffer(channels, samples[0].length, context.sampleRate);
  samples.forEach((data, channel) => buffer.copyToChannel(data, channel));
  return buffer;
}

export function createCrackle() {
  const MASTER = .8;
  let context, output, bus, squishGain, squishFilter, squishSource, ticks = [], snaps = [];
  let enabled = true, voice = TOY_SOUNDS.default;
  let lastPressure = 0, lastFracture = -1, speed = 0;

  function build() {
    const rate = context.sampleRate;
    // Master: gentle top-end taming, soft compression, then a small warm room.
    output = context.createGain();
    output.gain.value = enabled ? MASTER : 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 3;
    compressor.attack.value = .002; compressor.release.value = .12;
    const shelf = context.createBiquadFilter();
    shelf.type = 'highshelf'; shelf.frequency.value = 6500; shelf.gain.value = -5;
    bus = context.createGain();
    bus.connect(shelf).connect(compressor).connect(output).connect(context.destination);
    const room = context.createConvolver(), wet = context.createGain();
    const decay = Math.ceil(rate * .45), left = new Float32Array(decay), right = new Float32Array(decay);
    let smoothL = 0, smoothR = 0;
    for (let i = 0; i < decay; i++) {
      const envelope = Math.pow(1 - i / decay, 3.2);
      smoothL = smoothL * .55 + (Math.random() * 2 - 1) * .45; smoothR = smoothR * .55 + (Math.random() * 2 - 1) * .45;
      left[i] = smoothL * envelope; right[i] = smoothR * envelope;
    }
    room.buffer = makeBuffer(context, [left, right], 2);
    wet.gain.value = .16;
    bus.connect(room).connect(wet).connect(compressor);

    ticks = Array.from({ length: 10 }, () => makeBuffer(context, [synthCrack(rate)]));
    snaps = Array.from({ length: 4 }, () => makeBuffer(context, [synthCrack(rate, Math.random, { snap: true })]));

    // Squish: a looping soft noise bed opened by squeeze speed.
    const noise = new Float32Array(rate * 2);
    let brown = 0;
    for (let i = 0; i < noise.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * .06) * .995;
      noise[i] = brown * 3 + (Math.random() * 2 - 1) * .05;
    }
    squishSource = context.createBufferSource();
    squishSource.buffer = makeBuffer(context, [noise]); squishSource.loop = true;
    squishFilter = context.createBiquadFilter();
    squishFilter.type = 'lowpass'; squishFilter.Q.value = 1.6; squishFilter.frequency.value = voice.tone;
    squishGain = context.createGain(); squishGain.gain.value = 0;
    squishSource.connect(squishFilter).connect(squishGain).connect(bus);
    squishSource.start();
  }

  function unlock() {
    if (!enabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!context || context.state === 'closed') { context = new AudioContext(); build(); }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Sound is optional; manual and camera play remain available. */ }
  }

  const running = () => enabled && context?.state === 'running';

  function play(buffer, start, level, rate) {
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; source.playbackRate.value = rate;
    gain.gain.value = level;
    let node = source.connect(gain);
    let pan;
    if (context.createStereoPanner) {
      pan = context.createStereoPanner(); pan.pan.value = (Math.random() * 2 - 1) * .4;
      node = node.connect(pan);
    }
    node.connect(bus);
    source.start(start);
    source.onended = () => { source.disconnect(); gain.disconnect(); pan?.disconnect(); };
  }

  function fracture({ strength = .5, count = 1 } = {}) {
    if (!running()) return;
    const now = context.currentTime;
    if (now - lastFracture < .03) return;
    lastFracture = now;
    const amount = Math.max(0, Math.min(1, strength));
    // A crunch is a short, uneven flurry of ticks, loudest first.
    const clicks = Math.min(9, 2 + Math.round(Math.sqrt(count) * 1.6));
    let time = now;
    for (let i = 0; i < clicks; i++) {
      const level = (.22 + amount * .3) * voice.crunch * (.45 + Math.random() * .55) * Math.pow(.86, i);
      play(ticks[Math.floor(Math.random() * ticks.length)], time, level, voice.pitch * (.85 + Math.random() * .35));
      time += .004 + Math.random() * Math.random() * .03;
    }
    if (Math.random() < voice.snap + amount * .2) {
      play(snaps[Math.floor(Math.random() * snaps.length)], now + Math.random() * .01,
        (.28 + amount * .25) * voice.crunch, voice.pitch * (.9 + Math.random() * .2));
    }
  }

  return {
    unlock,
    fracture,
    setToy(id, override) { voice = { ...TOY_SOUNDS.default, ...TOY_SOUNDS[id], ...override }; },
    setEnabled(value) {
      enabled = value;
      if (enabled) unlock();
      if (output && context?.state !== 'closed') output.gain.setTargetAtTime(enabled ? MASTER : 0, context.currentTime, .015);
    },
    update(pressure, dt = 1 / 60) {
      // Squish level follows smoothed squeeze speed; releases are a little softer.
      const delta = pressure - lastPressure;
      lastPressure = pressure;
      if (!squishGain || !running()) return;
      const rate = Math.min(4, Math.abs(delta) / Math.max(dt, 1e-3)) * (delta < 0 ? .6 : 1);
      speed += (rate - speed) * Math.min(1, dt * 14);
      const now = context.currentTime;
      squishGain.gain.setTargetAtTime(Math.min(.16, speed * .09) * voice.squish, now, .03);
      squishFilter.frequency.setTargetAtTime(voice.tone * (.7 + pressure * .6 + Math.min(1, speed) * .5), now, .05);
    },
    reset() {
      lastPressure = 0; lastFracture = -1; speed = 0;
      if (squishGain) squishGain.gain.setTargetAtTime(0, context.currentTime, .02);
    },
    dispose() { context?.close().catch(() => {}); },
  };
}
