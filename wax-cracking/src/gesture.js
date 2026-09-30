const FINGERS = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const clamp = (value) => Math.max(0, Math.min(1, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

/**
 * Estimate fist closure, not physical force. Prefer MediaPipe world landmarks:
 * chord / bone-chain length is independent of camera distance and 3D rotation.
 * The thumb is omitted so either a tucked or wrapped thumb can form a fist.
 */
export function estimateGripPressure(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length !== 21 || landmarks.some((point) =>
    !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z ?? 0))) return 0;

  let closure = 0;
  for (const [base, joint, knuckle, tip] of FINGERS) {
    const length = distance(landmarks[base], landmarks[joint])
      + distance(landmarks[joint], landmarks[knuckle])
      + distance(landmarks[knuckle], landmarks[tip]);
    if (length < 1e-8) return 0;
    const extension = distance(landmarks[base], landmarks[tip]) / length;
    closure += clamp((0.91 - extension) / (0.91 - 0.38));
  }
  return clamp(closure / FINGERS.length);
}

/** Frame-rate independent smoothing, with a quicker release than squeeze. */
export function smoothPressure(current, target, elapsedMs) {
  const safeTarget = Number.isFinite(target) ? clamp(target) : 0;
  const safeCurrent = Number.isFinite(current) ? clamp(current) : 0;
  const milliseconds = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const timeConstant = safeTarget < safeCurrent ? 60 : 90;
  return safeCurrent + (safeTarget - safeCurrent) * (1 - Math.exp(-milliseconds / timeConstant));
}
