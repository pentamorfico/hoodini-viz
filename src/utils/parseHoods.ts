// parseHoods.js

export default function parseHoods(hoodsStr) {
  if (!hoodsStr) return [];
  const lines = hoodsStr.split('\n')
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
    
    return lines.slice(1).map((line, idx) => {
      const parts = line.split(/\t/);
      const start = Number(parts[startIndex]);
      const end = Number(parts[endIndex]);
      
      // Validate that start and end are valid numbers
      if (isNaN(start) || isNaN(end)) {
        console.warn(`[parseHoods] Skipping hood at line ${idx + 2}: invalid start=${parts[startIndex]} or end=${parts[endIndex]}`);
        return null;
      }
      
      const hood = {
        hood_id: parts[hoodIdIndex],
        seqid: parts[seqidIndex],
        start,
        end
      };
      
      // Add align_gene if column exists
      if (alignGeneIndex !== -1 && parts[alignGeneIndex]) {
        hood.align_gene = parts[alignGeneIndex];
      }
      
      return hood;
    }).filter(h => h !== null);
  } else {
    // Legacy format: seqid start end (backwards compatibility)
    return lines.map((line, idx) => {
      const [seqid, startStr, endStr] = line.split(/\s+/);
      const start = Number(startStr);
      const end = Number(endStr);
      
      if (isNaN(start) || isNaN(end)) {
        console.warn(`[parseHoods] Skipping hood at line ${idx + 1}: invalid start=${startStr} or end=${endStr}`);
        return null;
      }
      
      return { 
        hood_id: seqid, // Use seqid as hood_id for backwards compatibility
        seqid, 
        start,
        end 
      };
    }).filter(h => h !== null);
  }
}
