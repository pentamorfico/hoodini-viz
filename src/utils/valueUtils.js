// Utility helpers for value normalization
export function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return true;
    const low = s.toLowerCase();
    if (low === 'null' || low === 'none') return true;
    return false;
  }
  return false;
}

export function normalizeKey(v) {
  if (isEmptyValue(v)) return undefined;
  if (typeof v === 'string') return v.trim();
  return v;
}

export default { isEmptyValue, normalizeKey };
