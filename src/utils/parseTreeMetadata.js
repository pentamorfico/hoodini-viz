// Parse tab-delimited tree metadata file into an object keyed by leaf_id
export default function parseTreeMetadata(str) {
  const lines = str.trim().split(/\r?\n/);
  if (lines.length < 2) return {};
  const header = lines[0].split(/\t/);
  const out = {};
  for (let i = 1; i < lines.length; ++i) {
    const row = lines[i].split(/\t/);
    const entry = {};
    for (let j = 0; j < header.length; ++j) {
      entry[header[j]] = row[j];
    }
    if (entry.leaf_id) out[entry.leaf_id] = entry;
  }
  return out;
}