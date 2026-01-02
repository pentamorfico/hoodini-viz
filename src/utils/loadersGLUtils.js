
import { parseGFF } from './parseGFF';

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
  const data = {};
  if (!str) return data;
  const it = str.split(/\r?\n/);
  if (it.length < 2) return data;
  const header = it[0].split(/\t/);
  for (let i = 1; i < it.length; ++i) {
    const line = it[i].trim();
    if (!line) continue;
    const cols = line.split(/\t/);
    const entry = {};
    for (let j = 0; j < header.length; ++j) {
      entry[header[j]] = cols[j];
    }
  // Prefer 'id' as canonical key, fall back to 'gene_id' for legacy files
  const key = entry.id || entry.gene_id || entry.geneId;
  if (key) data[key] = entry;
  }
  return data;
}

function parseTreeMetadataFallback(str) {
  const data = {};
  if (!str) return data;
  const lines = str.split(/\r?\n/);
  if (lines.length < 2) return data;
  const header = lines[0].split(/\t/);
  for (let i = 1; i < lines.length; ++i) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(/\t/);
    const entry = {};
    for (let j = 0; j < header.length; ++j) entry[header[j]] = cols[j];
    const keyValue = cols[0];
    if (keyValue) data[keyValue] = entry;
  }
  return data;
}

function parseBaselinesFallback(str) {
  const out = [];
  if (!str) return out;
  const lines = str.split(/\r?\n/);
  if (lines.length < 2) return out;
  const header = lines[0].split(/\t/);
  for (let i = 1; i < lines.length; ++i) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(/\t/);
    const entry = {};
    for (let j = 0; j < header.length; ++j) entry[header[j]] = cols[j];
    out.push(entry);
  }
  return out;
}

function parseProteinLinksFallback(str) {
  const out = [];
  if (!str) return out;
  const lines = str.split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    out.push({ geneA: parts[0], geneB: parts[1], score: parseFloat(parts[2]) || 0 });
  }
  return out;
}

function parseNucleotideLinksFallback(str) {
  const out = [];
  if (!str) return out;
  const lines = str.split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    out.push({
      seqidA: parts[0],
      startA: parseInt(parts[1], 10),
      endA: parseInt(parts[2], 10),
      seqidB: parts[3],
      startB: parseInt(parts[4], 10),
      endB: parseInt(parts[5], 10),
      similarity: parseFloat(parts[6]) || 0
    });
  }
  return out;
}

function parseDomainsFallback(str) {
  const data = {};
  if (!str) return data;
  const lines = str.split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/\t/); // Use tab separation instead of whitespace
    
    if (parts.length < 7) {
      continue;
    }
    
    const geneId = parts[0];
    const domainName = parts[1];
    const start = parseInt(parts[2], 10);
    const end = parseInt(parts[3], 10);
    const source = parts[4];
    const evalue = parseFloat(parts[5]) || 0;
    const coverage = parseFloat(parts[6]);
    
    const domain = { domainName, start, end, source, evalue, coverage };
    if (!data[geneId]) data[geneId] = [];
    data[geneId].push(domain);
  }
  return data;
}

function parseNonCodingMetadataFallback(str) {
  const data = {};
  if (!str) return data;
  const lines = str.split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/\t/);
    if (parts.length >= 3) data[parts[0]] = { type: parts[1], description: parts[2] };
  }
  return data;
}
