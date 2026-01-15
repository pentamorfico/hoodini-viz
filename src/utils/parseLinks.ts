// parseLinks.js
export function parseLinks(str) {
  const lines = str.split('\n').map(l => l.trim()).filter(l => l);
  const links = [];
  for (let line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const geneA = parts[0];
    const geneB = parts[1];
    // Third field is identity/similarity percentage (0-100)
    const similarity = parseFloat(parts[2]);
    // Legacy: if third field looks like RGB color (e.g., "255,0,0"), parse as color
    const colorParts = parts[2].split(',');
    let color = null;
    if (colorParts.length >= 3) {
      color = colorParts.map(c => parseInt(c, 10));
    }
    links.push({
      geneA,
      geneB,
      similarity: isNaN(similarity) ? 100 : similarity,
      color,
      // Keep array format for backwards compatibility
      0: geneA,
      1: geneB,
      2: color || [similarity]
    });
  }
  return links;
}
