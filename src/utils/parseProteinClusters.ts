// parseProteinClusters.js
export function parseProteinClusters(tsv) {
  const lines = tsv.split('\n').map(l => l.trim()).filter(Boolean);
  const mapping = {};
  for (const line of lines) {
    const [proteinId, cluster] = line.split(/\s+/);
    if (proteinId && cluster) mapping[proteinId] = cluster;
  }
  return mapping;
}
