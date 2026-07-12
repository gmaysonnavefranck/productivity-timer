export function elapsedSince(lastTickAt, now = Date.now()) {
  return lastTickAt ? Math.max(0, Math.round((now - lastTickAt) / 1000)) : 1;
}

export function tickRemaining(remainingSeconds, elapsedSeconds) {
  return Math.max(0, remainingSeconds - elapsedSeconds);
}
