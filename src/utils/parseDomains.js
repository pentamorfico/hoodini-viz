// parseDomains.js
export function parseDomains(str) {
  const lines = str.split('\n').map(l => l.trim()).filter(l => l);
  const domainsByGene = {};
  for (let line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    const geneId = parts[0];
    const domainName = parts[1];
    const start = parseInt(parts[2], 10);
    const end = parseInt(parts[3], 10);
    const evalue = parts[4];
    if (!domainsByGene[geneId]) domainsByGene[geneId] = [];
    domainsByGene[geneId].push({ domainName, start, end, evalue });
  }
  return domainsByGene;
}
