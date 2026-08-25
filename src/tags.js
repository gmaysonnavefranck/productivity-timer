const TAG_REGEX = /\*\*([^*\n]+?)\*\*/g;

export function normalizeTag(raw) {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function extractTags(text) {
  if (!text) return [];
  const out = [];
  TAG_REGEX.lastIndex = 0;
  let m;
  while ((m = TAG_REGEX.exec(text))) {
    const display = m[1].trim().replace(/\s+/g, ' ');
    if (!display) continue;
    out.push({ display, normalized: normalizeTag(display), index: m.index });
  }
  return out;
}

function excerptAround(text, index, matchLength) {
  const radius = 40;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + matchLength + radius);
  let excerpt = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) excerpt = '…' + excerpt;
  if (end < text.length) excerpt = excerpt + '…';
  return excerpt;
}

// Map<normalized, { name, count, dates: [{ date, excerpt }] }>
export function buildTagIndex(days) {
  const index = new Map();
  const dateList = Object.keys(days || {}).sort();
  for (const date of dateList) {
    const note = days[date]?.note;
    if (!note) continue;
    for (const tag of extractTags(note)) {
      let entry = index.get(tag.normalized);
      if (!entry) {
        entry = { name: tag.display, count: 0, dates: [] };
        index.set(tag.normalized, entry);
      }
      entry.count++;
      entry.dates.push({ date, excerpt: excerptAround(note, tag.index, tag.display.length + 4) });
    }
  }
  return index;
}
