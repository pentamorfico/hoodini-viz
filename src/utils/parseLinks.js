// parseLinks.js
export function parseLinks(str) {
  const lines = str.split('\n').map(l => l.trim()).filter(l => l);
  const links = [];
  for (let line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    const geneA = parts[0];
    const geneB = parts[1];
    const colorParts = parts[2].split(',');
    const color = colorParts.map(c => parseInt(c, 10));
    links.push([geneA, geneB, color]);
  }
  return links;
}
