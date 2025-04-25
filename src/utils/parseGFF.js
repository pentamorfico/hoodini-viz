// parseGFF.js
import GFFFeature from '../models/GFFFeature';

export function parseGFF(gff) {
  const lines = gff.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  return lines.map(line => {
    const parts = line.split('\t');
    return new GFFFeature(parts[0], parseInt(parts[3], 10), parseInt(parts[4], 10), parts[6], parts[2], parts[8] || "");
  });
}
