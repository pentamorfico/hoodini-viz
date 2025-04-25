export default function parseProteinMetadata(str) {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return {};
  const header = lines[0].split(/\t/);
  const data = {};
  for (let i = 1; i < lines.length; ++i) {
    const cols = lines[i].split(/\t/);
    const entry = {};
    header.forEach((h, idx) => { entry[h] = cols[idx]; });
    if (entry.gene_id) data[entry.gene_id] = entry;
  }
  return data;
}