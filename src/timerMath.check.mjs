import { elapsedSince, tickRemaining } from './timerMath.mjs';

console.assert(elapsedSince(null) === 1, 'FAIL: first tick with no prior timestamp should assume 1s');
console.assert(elapsedSince(Date.now() - 5000) === 5, 'FAIL: should measure real elapsed seconds since last tick');
console.assert(tickRemaining(10, 3) === 7, 'FAIL: should subtract elapsed from remaining');
console.assert(tickRemaining(2, 30) === 0, 'FAIL: should clamp at zero, never go negative');
console.log('timerMath self-check passed');
