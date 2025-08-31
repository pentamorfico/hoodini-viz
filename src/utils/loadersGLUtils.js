
// =============================================================================
// FILES WITH HEADERS (TSV format)
// =============================================================================

// Optimized CSV/TSV parsing for protein metadata (554KB)
export async function parseProteinMetadataOptimized(csvText) {
  return parseProteinMetadataFallback(csvText);
}

// Optimized tree metadata parsing (TSV with headers)
export async function parseTreeMetadataOptimized(csvText) {
  return parseTreeMetadataFallback(csvText);
}

// Optimized baselines parsing (TSV with headers)
export async function parseBaselinesOptimized(csvText) {
  return parseBaselinesFallback(csvText);
}

// =============================================================================
// FILES WITHOUT HEADERS
// =============================================================================

// Optimized GFF parsing (764KB) - tab-separated, no headers
export async function parseGFFOptimized(gffText, config = null) {
  const { parseGFF } = await import('./parseGFF');
  return parseGFF(gffText, config);
}

// Helper function to parse GFF attributes
function parseAttributes(attributesStr) {
  const attributes = {};
  if (!attributesStr || attributesStr === '.') {
    return attributes;
  }
  
  // Handle both semicolon-separated and single attribute formats
  const pairs = attributesStr.includes(';') ? attributesStr.split(';') : [attributesStr];
  
  pairs.forEach(pair => {
    const trimmedPair = pair.trim();
    if (!trimmedPair) return;
    
    if (trimmedPair.includes('=')) {
      // Key=Value format
      const [key, ...valueParts] = trimmedPair.split('=');
      const value = valueParts.join('=').trim();
      attributes[key.trim()] = value;
    } else {
      // Assume it's an ID if no equals sign
      attributes.ID = trimmedPair;
    }
  });
  
  return attributes;
}

// Optimized protein links parsing (TSV / tab-separated, no headers)
export async function parseProteinLinksOptimized(linksText) {
  return parseProteinLinksFallback(linksText);
}

// Optimized nucleotide links parsing (TSV / tab-separated, no headers)
export async function parseNucleotideLinksOptimized(linksText) {
  return parseNucleotideLinksFallback(linksText);
}

// Optimized domains parsing (space-separated, no headers)
export async function parseDomainsOptimized(domainsText) {
  return parseDomainsFallback(domainsText);
}

// Optimized non-coding metadata parsing (tab-separated, no headers)
export async function parseNonCodingMetadataOptimized(metadataText) {
  return parseNonCodingMetadataFallback(metadataText);
}

// =============================================================================
// FALLBACK FUNCTIONS (original implementations)
// =============================================================================

function parseProteinMetadataFallback(str) {
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

function parseTreeMetadataFallback(str) {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return {};
  const header = lines[0].split(/\t/);
  const data = {};
  for (let i = 1; i < lines.length; ++i) {
    const cols = lines[i].split(/\t/);
    const entry = {};
    header.forEach((h, idx) => { entry[h] = cols[idx]; });
    const keyValue = cols[0];
    if (keyValue) data[keyValue] = entry;
  }
  return data;
}

function parseBaselinesFallback(str) {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];
  const header = lines[0].split(/\t/);
  const data = [];
  for (let i = 1; i < lines.length; ++i) {
    const cols = lines[i].split(/\t/);
    const entry = {};
    header.forEach((h, idx) => { entry[h] = cols[idx]; });
    data.push(entry);
  }
  return data;
}

function parseProteinLinksFallback(str) {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  return lines.map(line => {
    const parts = line.split(/\s+/);
    return {
      geneA: parts[0],
      geneB: parts[1],
      score: parseFloat(parts[2]) || 0
    };
  });
}

function parseNucleotideLinksFallback(str) {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  return lines.map(line => {
    const parts = line.split(/\s+/);
    return {
      seqidA: parts[0],
      startA: parseInt(parts[1], 10),
      endA: parseInt(parts[2], 10),
      seqidB: parts[3],
      startB: parseInt(parts[4], 10),
      endB: parseInt(parts[5], 10),
      similarity: parseFloat(parts[6]) || 0
    };
  });
}

function parseDomainsFallback(str) {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const data = {};
  lines.forEach(line => {
    const parts = line.split(/\s+/);
    const geneId = parts[0];
    const domain = {
      domainName: parts[1],
      start: parseInt(parts[2], 10),
      end: parseInt(parts[3], 10),
      evalue: parseFloat(parts[4]) || 0
    };
    
    if (!data[geneId]) {
      data[geneId] = [];
    }
    data[geneId].push(domain);
  });
  return data;
}

function parseNonCodingMetadataFallback(str) {
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  const data = {};
  lines.forEach(line => {
    const parts = line.split(/\t/);
    if (parts.length >= 3) {
      data[parts[0]] = {
        type: parts[1],
        description: parts[2]
      };
    }
  });
  return data;
}
