import { getPaletteColors } from './colorPalettes';

// Simple in-memory cache for palette computations keyed by a stable string.
const _paletteCache = new Map();

export function memoGetPalette(name, num, reverse = false, paletteType = 'qualitative') {
  const key = `${name}::${num}::${reverse}::${paletteType}`;
  if (_paletteCache.has(key)) return _paletteCache.get(key);
  let colors = [];
  try {
    colors = getPaletteColors(name, num, reverse, paletteType);
  } catch (e) {
    colors = [];
  }
  _paletteCache.set(key, colors);
  return colors;
}

export function clearPaletteCache() { _paletteCache.clear(); }
