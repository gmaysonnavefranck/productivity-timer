function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 'friday' shifts a weekend occurrence back to the preceding Friday (legacy
// default), 'monday' shifts it forward to the following Monday, 'none' fires
// literally on the weekend date. Falls back to the old boolean `shiftWeekends`
// field for rules saved before this option existed.
function weekendShiftMode(rule) {
  if (rule.weekendShift) return rule.weekendShift;
  return rule.shiftWeekends === false ? 'none' : 'friday';
}

function occurrenceInMonth(rule, year, month) {
  const norm = new Date(year, month, 1);
  const ny = norm.getFullYear();
  const nm = norm.getMonth();
  if (rule.type === 'yearly' && nm !== rule.month - 1) return null;

  const day = Math.min(rule.day, daysInMonth(ny, nm));
  const occ = new Date(ny, nm, day);
  const shift = weekendShiftMode(rule);
  const dow = occ.getDay();
  if (shift === 'friday') {
    if (dow === 6) occ.setDate(occ.getDate() - 1);
    else if (dow === 0) occ.setDate(occ.getDate() - 2);
  } else if (shift === 'monday') {
    if (dow === 6) occ.setDate(occ.getDate() + 2);
    else if (dow === 0) occ.setDate(occ.getDate() + 1);
  }
  return occ;
}

// Checks the previous, same, and next month, since a weekend shift can push
// an occurrence across a month boundary in either direction (e.g. Mar 1
// falling on Sunday shifts back into February; Jan 31 falling on Saturday
// can shift forward into February).
export function matchesRule(rule, dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  for (const offset of [-1, 0, 1]) {
    const occ = occurrenceInMonth(rule, y, m - 1 + offset);
    if (occ && toDateStr(occ) === dateStr) return true;
  }
  return false;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function describeRule(rule) {
  const base = rule.type === 'monthly'
    ? `Every month, day ${rule.day}`
    : `Every year, ${MONTHS[rule.month - 1]} ${rule.day}`;
  const shift = weekendShiftMode(rule);
  if (shift === 'friday') return `${base} (weekends → Friday)`;
  if (shift === 'monday') return `${base} (weekends → Monday)`;
  return base;
}
