// parseNucleotideLinks.js
export function parseNucleotideLinks(str) {
  const lines = str.split('\n').map(l => l.trim()).filter(l => l);
  const links = [];
  for (let line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 7) continue;
    const seqidA = parts[0];
    const startA = parseInt(parts[1], 10);
    const endA = parseInt(parts[2], 10);
    const seqidB = parts[3];
    const startB = parseInt(parts[4], 10);
    const endB = parseInt(parts[5], 10);
    const colorParts = parts[6].split(',');
    const color = colorParts.map(c => parseInt(c, 10));
    links.push({ seqidA, startA, endA, seqidB, startB, endB, color });
  }
  return links;
}
