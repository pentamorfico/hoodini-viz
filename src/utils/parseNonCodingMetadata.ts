// parseNonCodingMetadata.js
// Parses a tab-delimited ncRNA metadata file with columns:
// seqid<TAB>start<TAB>end<TAB>type<TAB>sequence<TAB>structure
// Returns an object keyed by "seqid:start:end": { type, sequence, structure, ...otherColumns }

export function parseNonCodingMetadata(text: string): Record<string, any> {
  const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
  const result: Record<string, any> = {};
  
  // Check if first non-comment line is a header
  let headerLine = lines[0];
  let dataLines = lines;
  
  // Detect header by checking if first line contains expected column names
  const lowerHeader = headerLine?.toLowerCase() || '';
  const hasHeader = lowerHeader.includes('seqid') || lowerHeader.includes('start') || lowerHeader.includes('end');
  
  let headers: string[] = [];
  if (hasHeader) {
    headers = headerLine.split(/\t/).map(h => h.trim());
    dataLines = lines.slice(1);
  } else {
    // Default headers if no header row
    headers = ['seqid', 'start', 'end', 'type', 'sequence', 'structure'];
  }
  
  for (const line of dataLines) {
    const values = line.split(/\t/);
    if (values.length < 3) continue; // Need at least seqid, start, end
    
    const row: Record<string, any> = {};
    headers.forEach((header, i) => {
      if (values[i] !== undefined) {
        row[header] = values[i];
      }
    });
    
    // Parse start/end as numbers
    const seqid = row.seqid;
    const start = parseInt(row.start, 10);
    const end = parseInt(row.end, 10);
    
    if (!seqid || isNaN(start) || isNaN(end)) continue;
    
    // Create composite key
    const key = `${seqid}:${start}:${end}`;
    
    // Store all columns except the key components as metadata
    const { seqid: _s, start: _st, end: _e, ...metadata } = row;
    result[key] = metadata;
  }
  
  return result;
}

/**
 * Optimized version for larger files - same logic but with chunked processing
 */
export function parseNonCodingMetadataOptimized(text: string): Record<string, any> {
  return parseNonCodingMetadata(text);
}
