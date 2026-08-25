export function splitParagraphs(text) {
  if (!text) return [];
  return text.split(/\n{2,}/);
}

export function formatClockTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
