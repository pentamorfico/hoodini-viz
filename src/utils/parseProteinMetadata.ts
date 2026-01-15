export default function parseProteinMetadata(str: string): Record<string, Record<string, string>> {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return {};
  const header = lines[0].split(/\t/);
  const data: Record<string, Record<string, string>> = {};
  for (let i = 1; i < lines.length; ++i) {
    const cols = lines[i].split(/\t/);
    const entry: Record<string, string> = {};
    header.forEach((h, idx) => { entry[h] = cols[idx]; });
    // Prefer 'id' as canonical key, fall back to 'gene_id' for legacy files
    const key = entry.id || entry.gene_id || entry.geneId;
    if (key) data[key] = entry;
  }
  return data;
}