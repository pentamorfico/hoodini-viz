// parseBaselines.js

export default function parseBaselines(baselinesStr) {
  if (!baselinesStr) return [];
  const lines = baselinesStr.split('\n')
    .map(l => l.trim())
    .filter(l => l);
  
  if (lines.length === 0) return [];
  
  // Check if this is the new format with headers
  const firstLine = lines[0];
  if (firstLine.includes('hood_id') && firstLine.includes('seqid')) {
    // New format with headers: hood_id, seqid, start, end, align_gene (optional)
    const header = firstLine.split(/\t/);
    const hoodIdIndex = header.indexOf('hood_id');
    const seqidIndex = header.indexOf('seqid');
    const startIndex = header.indexOf('start');
    const endIndex = header.indexOf('end');
    const alignGeneIndex = header.indexOf('align_gene');
    
    return lines.slice(1).map(line => {
      const parts = line.split(/\t/);
      const baseline = {
        hood_id: parts[hoodIdIndex],
        seqid: parts[seqidIndex],
        start: Number(parts[startIndex]),
        end: Number(parts[endIndex])
      };
      
      // Add align_gene if column exists
      if (alignGeneIndex !== -1 && parts[alignGeneIndex]) {
        baseline.align_gene = parts[alignGeneIndex];
      }
      
      return baseline;
    });
  } else {
    // Legacy format: seqid start end (backwards compatibility)
    return lines.map(line => {
      const [seqid, start, end] = line.split(/\s+/);
      return { 
        hood_id: seqid, // Use seqid as hood_id for backwards compatibility
        seqid, 
        start: Number(start), 
        end: Number(end) 
      };
    });
  }
}
