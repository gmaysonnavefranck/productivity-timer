import assert from 'node:assert';
import { matchesRule } from './recurrence.js';

// Monthly, no weekend shift needed
assert.equal(matchesRule({ type: 'monthly', day: 15 }, '2026-07-15'), true);
assert.equal(matchesRule({ type: 'monthly', day: 15 }, '2026-07-14'), false);

// Monthly day 1: July 2026 -> Wed, no shift
assert.equal(matchesRule({ type: 'monthly', day: 1 }, '2026-07-01'), true);

// Monthly day 1: Aug 2026 -> Saturday, shifts to Friday Jul 31
assert.equal(matchesRule({ type: 'monthly', day: 1 }, '2026-08-01'), false);
assert.equal(matchesRule({ type: 'monthly', day: 1 }, '2026-07-31'), true);

// Yearly: March 20, 2027 is a Saturday -> shifts to Friday Mar 19
assert.equal(matchesRule({ type: 'yearly', month: 3, day: 20 }, '2027-03-20'), false);
assert.equal(matchesRule({ type: 'yearly', month: 3, day: 20 }, '2027-03-19'), true);
assert.equal(matchesRule({ type: 'yearly', month: 3, day: 20 }, '2026-03-20'), true); // 2026 = Friday, no shift
assert.equal(matchesRule({ type: 'yearly', month: 4, day: 20 }, '2027-03-19'), false); // wrong month

// Monthly day clamps to last day of short month (day 31 in Feb);
// Feb 28 2026 is a Saturday, so it shifts back to Friday Feb 27.
assert.equal(matchesRule({ type: 'monthly', day: 31 }, '2026-02-27'), true);
assert.equal(matchesRule({ type: 'monthly', day: 31 }, '2026-02-28'), false);

// shiftWeekends: false (legacy field) -> fires literally on the weekend date
assert.equal(matchesRule({ type: 'monthly', day: 1, shiftWeekends: false }, '2026-08-01'), true);
assert.equal(matchesRule({ type: 'monthly', day: 1, shiftWeekends: false }, '2026-07-31'), false);

// weekendShift: 'none' -> same as legacy shiftWeekends: false
assert.equal(matchesRule({ type: 'monthly', day: 1, weekendShift: 'none' }, '2026-08-01'), true);
assert.equal(matchesRule({ type: 'monthly', day: 1, weekendShift: 'none' }, '2026-07-31'), false);

// weekendShift: 'monday' -> Aug 1 2026 is a Saturday, shifts forward to Monday Aug 3
assert.equal(matchesRule({ type: 'monthly', day: 1, weekendShift: 'monday' }, '2026-08-01'), false);
assert.equal(matchesRule({ type: 'monthly', day: 1, weekendShift: 'monday' }, '2026-08-03'), true);

// weekendShift: 'monday' crossing a month boundary forward: Jan 31 2026 is a
// Saturday, clamped-day-31 rule shifts it forward into February (Mon Feb 2).
assert.equal(matchesRule({ type: 'monthly', day: 31, weekendShift: 'monday' }, '2026-01-31'), false);
assert.equal(matchesRule({ type: 'monthly', day: 31, weekendShift: 'monday' }, '2026-02-02'), true);
// Doesn't spuriously also match February's own clamped occurrence (Feb 28
// 2026 is also a Saturday, shifting forward to Mon Mar 2 — a different date).
assert.equal(matchesRule({ type: 'monthly', day: 31, weekendShift: 'monday' }, '2026-02-28'), false);

console.log('recurrence.selfcheck: all assertions passed');
