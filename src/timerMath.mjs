import { fileURLToPath } from 'node:url';

export function elapsedSince(lastTickAt, now = Date.now()) {
  return lastTickAt ? Math.max(0, Math.round((now - lastTickAt) / 1000)) : 1;
}

export function tickRemaining(remainingSeconds, elapsedSeconds) {
  return Math.max(0, remainingSeconds - elapsedSeconds);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  console.assert(elapsedSince(null) === 1, 'FAIL: first tick with no prior timestamp should assume 1s');
  console.assert(elapsedSince(Date.now() - 5000) === 5, 'FAIL: should measure real elapsed seconds since last tick');
  console.assert(tickRemaining(10, 3) === 7, 'FAIL: should subtract elapsed from remaining');
  console.assert(tickRemaining(2, 30) === 0, 'FAIL: should clamp at zero, never go negative');
  console.log('timerMath self-check passed');
}
