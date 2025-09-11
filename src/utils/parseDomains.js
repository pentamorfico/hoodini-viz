// parseDomains.js
export function parseDomains(str) {
  const lines = str.split('\n').map(l => l.trim()).filter(l => l);
  const domainsByGene = {};
  for (let line of lines) {
    const parts = line.split('\t'); // Use tab separation instead of whitespace
    if (parts.length < 7) continue;
    const geneId = parts[0];
    const domainName = parts[1];
    const start = parseInt(parts[2], 10);
    const end = parseInt(parts[3], 10);
    const source = parts[4];
    const evalue = parseFloat(parts[5]); // Parse scientific notation properly
    const coverage = parseFloat(parts[6]);
    
    if (!domainsByGene[geneId]) domainsByGene[geneId] = [];
    domainsByGene[geneId].push({ domainName, start, end, source, evalue, coverage });
  }
  return domainsByGene;
}
