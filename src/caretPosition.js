// Mirrors a textarea's text-affecting styles onto a hidden div to measure
// where the caret would visually land, since the DOM gives no direct API for this.
const MIRRORED_PROPERTIES = [
  'direction', 'boxSizing', 'width', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontFamily',
  'lineHeight', 'textAlign', 'textTransform', 'textIndent', 'textDecoration',
  'letterSpacing', 'wordSpacing', 'tabSize', 'whiteSpace', 'wordWrap',
];

export function getCaretCoordinates(textarea, position) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(textarea);

  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.overflow = 'hidden';
  style.height = 'auto';

  MIRRORED_PROPERTIES.forEach((prop) => {
    style[prop] = computed[prop];
  });

  div.textContent = textarea.value.substring(0, position);

  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth, 10) - textarea.scrollTop,
    left: span.offsetLeft + parseInt(computed.borderLeftWidth, 10) - textarea.scrollLeft,
    lineHeight: parseInt(computed.lineHeight, 10) || Math.round(parseFloat(computed.fontSize) * 1.2),
  };

  document.body.removeChild(div);

  return coordinates;
}
