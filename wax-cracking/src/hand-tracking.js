import { estimateGripPressure, smoothPressure } from './gesture.js';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

function friendlyError(error, stage) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Camera access was blocked. Allow camera access in your browser, or use the squeeze control.';
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No camera found. Connect a camera, or use the squeeze control.';
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'Your camera is busy. Close other camera apps and try again.';
  }
  if (stage === 'model') return 'Hand tracking could not load. Check your connection and try again, or use the squeeze control.';
  return 'Camera tracking stopped. Try starting it again, or use the squeeze control.';
}

/**
 * Browser-only camera controller. Call start() from an explicit user action.
 * Inference follows Google's MediaPipe Hand Landmarker Web API guide:
 * https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
 * Initialization/inference pattern also referenced from the Apache-2.0 sample:
 * https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/workers/hand-landmarker.worker.ts
 * Adaptations here add explicit consent, cancellable camera sessions, and grip estimation.
 */
export function createHandTracking({ video, canvas, onPressure = () => {}, onStatus = () => {} }) {
  let session = null;
  let landmarker = null;
  let modelPromise = null;
  let disposed = false;
  let previousStatus = '';
  const context = canvas.getContext('2d');

  video.muted = true;
  video.playsInline = true;
  video.style.transform = 'scaleX(-1)';
  canvas.style.transform = 'scaleX(-1)';

  function status(state, message) {
    const key = `${state}:${message}`;
    if (key === previousStatus) return;
    previousStatus = key;
    onStatus({ state, message });
  }

  function clearOverlay() {
    context?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function release(current) {
    if (!current) return;
    cancelAnimationFrame(current.frame);
    current.stream?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    if (video.srcObject === current.stream) {
      video.pause();
      video.srcObject = null;
    }
  }

  async function loadModel() {
    if (landmarker) return landmarker;
    if (!modelPromise) {
      modelPromise = (async () => {
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const options = {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO', numHands: 1,
          minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.55,
        };
        let model;
        try {
          model = await HandLandmarker.createFromOptions(vision, options);
        } catch (error) {
          if (disposed) throw error;
          // Software inference supports browsers without a working WebGL GPU.
          model = await HandLandmarker.createFromOptions(vision, {
            ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          });
        }
        if (disposed) {
          model.close();
          throw new Error('Hand tracking was disposed.');
        }
        landmarker = model;
        return model;
      })().finally(() => { modelPromise = null; });
    }
    return modelPromise;
  }

  function draw(landmarks) {
    if (!context) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    clearOverlay();
    if (!landmarks) return;
    const { width, height } = canvas;
    context.strokeStyle = 'rgba(190, 240, 178, .8)';
    context.lineWidth = Math.max(1.5, width / 260);
    context.lineCap = 'round';
    context.beginPath();
    for (const [from, to] of CONNECTIONS) {
      context.moveTo(landmarks[from].x * width, landmarks[from].y * height);
      context.lineTo(landmarks[to].x * width, landmarks[to].y * height);
    }
    context.stroke();
    context.fillStyle = '#eefed8';
    for (const point of landmarks) {
      context.beginPath();
      context.arc(point.x * width, point.y * height, Math.max(2, width / 155), 0, Math.PI * 2);
      context.fill();
    }
  }

  function fail(current, error, stage) {
    if (session !== current) return;
    session = null;
    release(current);
    clearOverlay();
    onPressure(0);
    status('error', friendlyError(error, stage));
  }

  function tick(current, now) {
    if (session !== current || disposed) return;
    try {
      if (video.readyState >= 2 && video.currentTime !== current.videoTime && now - current.inferenceTime >= 33) {
        current.videoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, now);
        const points = result.landmarks[0];
        const worldPoints = result.worldLandmarks?.[0];
        // Normalized image Y uses a different unit from X and Z; correct it if
        // world landmarks are unavailable, preserving distance proportions.
        const metricPoints = worldPoints || points?.map((point) => ({
          ...point, y: point.y * video.videoHeight / video.videoWidth,
        }));
        const target = points ? estimateGripPressure(metricPoints) : 0;
        current.pressure = smoothPressure(current.pressure, target, current.inferenceTime ? now - current.inferenceTime : 33);
        current.inferenceTime = now;
        onPressure(current.pressure);
        draw(points);
        if (points) status('tracking', 'Hand found. Close your hand to squeeze.');
        else status('no-hand', 'Show your hand to the camera.');
      }
      current.frame = requestAnimationFrame((time) => tick(current, time));
    } catch (error) { fail(current, error, 'tracking'); }
  }

  async function start() {
    if (disposed || session) return;
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      status('error', 'Camera access needs HTTPS or localhost. You can still use the squeeze control.');
      return;
    }
    const current = { stream: null, frame: 0, videoTime: -1, inferenceTime: 0, pressure: 0 };
    session = current;
    let stage = 'camera';
    status('loading', 'Waiting for camera permission…');
    try {
      current.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false,
      });
      if (session !== current || disposed) { release(current); return; }
      for (const track of current.stream.getVideoTracks()) {
        track.onended = () => fail(current, new Error('Camera disconnected'), 'camera');
      }
      video.srcObject = current.stream;
      await video.play();
      if (session !== current || disposed) { release(current); return; }
      stage = 'model';
      status('loading', 'Loading hand tracking. Your camera stays on this device…');
      await loadModel();
      if (session !== current || disposed) { release(current); return; }
      status('no-hand', 'Show your hand to the camera.');
      current.frame = requestAnimationFrame((time) => tick(current, time));
    } catch (error) {
      if (session === current) fail(current, error, stage);
      else release(current);
    }
  }

  function stop() {
    const current = session;
    session = null;
    release(current);
    clearOverlay();
    onPressure(0);
    status('stopped', 'Camera off. Use the squeeze control or enable your camera.');
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    landmarker?.close();
    landmarker = null;
  }

  return { start, stop, dispose };
}
