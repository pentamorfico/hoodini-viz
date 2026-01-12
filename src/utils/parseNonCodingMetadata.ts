// parseNonCodingMetadata.js
// Parses a tab-delimited ncRNA metadata file: ID<TAB>type<TAB>description<TAB>color
// Returns an object: { [id]: { type, description, color } }

export function parseNonCodingMetadata(text) {
  const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
  const result = {};
  for (const line of lines) {
    const [id, type, description, colorStr] = line.split(/\t/);
    let color = undefined;
    try {
      if (colorStr && colorStr.startsWith('[')) {
        color = JSON.parse(colorStr);
      }
    } catch {}
    result[id] = { type, description, color };
  }
  return result;
}
