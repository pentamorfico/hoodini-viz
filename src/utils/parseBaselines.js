// parseBaselines.js

export default function parseBaselines(baselinesStr) {
  if (!baselinesStr) return [];
  return baselinesStr.split('\n')
    .map(l => l.trim())
    .filter(l => l)
    .map(line => {
      const [seqid, start, end] = line.split(/\s+/);
      return { seqid, start: Number(start), end: Number(end) };
    });
}
