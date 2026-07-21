function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function occurrenceInMonth(rule, year, month) {
  const norm = new Date(year, month, 1);
  const ny = norm.getFullYear();
  const nm = norm.getMonth();
  if (rule.type === 'yearly' && nm !== rule.month - 1) return null;

  const day = Math.min(rule.day, daysInMonth(ny, nm));
  const occ = new Date(ny, nm, day);
  if (rule.shiftWeekends !== false) {
    const dow = occ.getDay();
    if (dow === 6) occ.setDate(occ.getDate() - 1);
    else if (dow === 0) occ.setDate(occ.getDate() - 2);
  }
  return occ;
}

// Checks same month and next month, since a weekend shift can push an
// occurrence back across a month boundary (e.g. Mar 1 falling on Sunday).
export function matchesRule(rule, dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  for (const offset of [0, 1]) {
    const occ = occurrenceInMonth(rule, y, m - 1 + offset);
    if (occ && toDateStr(occ) === dateStr) return true;
  }
  return false;
}
