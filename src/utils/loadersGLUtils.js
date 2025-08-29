// loadersGLUtils.js - High-performance data loading with loaders.gl
import { parse } from '@loaders.gl/core';
import { CSVLoader } from '@loaders.gl/csv';

// =============================================================================
// FILES WITH HEADERS (TSV format)
// =============================================================================

// Optimized CSV/TSV parsing for protein metadata (554KB)
export async function parseProteinMetadataOptimized(csvText) {
  try {
    const result = await parse(csvText, CSVLoader, {
      csv: {
        delimitersToGuess: ['\t'], // Force tab delimiter detection
        skipEmptyLines: true,
        header: true, // First row is header
        dynamicTyping: false, // Keep as strings for consistency
      }
    });
    
    // Convert to the expected format: { gene_id: { ...row } }
    const data = {};
    if (result && result.data && Array.isArray(result.data)) {
      for (const row of result.data) {
        if (row.gene_id) {
          data[row.gene_id] = row;
        }
      }
    }
    
    return data;
  } catch (error) {
    console.warn('loaders.gl parsing failed, falling back to manual parsing:', error);
    return parseProteinMetadataFallback(csvText);
  }
}

// Optimized tree metadata parsing (TSV with headers)
export async function parseTreeMetadataOptimized(csvText) {
  try {
    const result = await parse(csvText, CSVLoader, {
      csv: {
        delimitersToGuess: ['\t'], // Force tab delimiter detection
        skipEmptyLines: true,
        header: true,
        dynamicTyping: false,
      }
    });
    
    // Convert to the expected format: { leaf_id: { ...row } }
    const data = {};
    if (result && result.data && Array.isArray(result.data)) {
      for (const row of result.data) {
        if (row.leaf_id) {
          data[row.leaf_id] = row;
        }
      }
    }
    
    return data;
  } catch (error) {
    console.warn('loaders.gl tree metadata parsing failed, falling back:', error);
    return parseTreeMetadataFallback(csvText);
  }
}

// Optimized baselines parsing (TSV with headers)
export async function parseBaselinesOptimized(csvText) {
  try {
    const result = await parse(csvText, CSVLoader, {
      csv: {
        delimitersToGuess: ['\t'], // Force tab delimiter detection
        skipEmptyLines: true,
        header: true,
        dynamicTyping: false,
      }
    });
    
    // Convert to expected format (array of objects)
    const data = (result && result.data) || [];
    return data;
  } catch (error) {
    console.warn('loaders.gl baselines parsing failed, falling back:', error);
    return parseBaselinesFallback(csvText);
  }
}

// =============================================================================
// FILES WITHOUT HEADERS
// =============================================================================

// Optimized GFF parsing (764KB) - tab-separated, no headers
export async function parseGFFOptimized(gffText, config = null) {
  try {
    const result = await parse(gffText, CSVLoader, {
      csv: {
        delimitersToGuess: ['\t'], // Force tab delimiter detection
        skipEmptyLines: true,
        header: false, // No headers
        dynamicTyping: false,
        shape: 'array-row-table', // Get arrays instead of objects
      }
    });
    
    // Convert to expected GFF format and create appropriate feature objects
    const data = [];
    if (result && result.data && Array.isArray(result.data)) {
      for (const row of result.data) {
        if (row.length >= 9) {
          const gffData = {
            seqid: row[0],
            source: row[1], 
            type: row[2],
            start: parseInt(row[3], 10),
            end: parseInt(row[4], 10),
            score: row[5],
            strand: row[6],
            phase: row[7],
            attributes: parseAttributes(row[8] || "")
          };
          
          // Create RegionFeature for region-type features, otherwise regular GFFFeature
          if (gffData.type === 'region') {
            // Import RegionFeature dynamically
            const { default: RegionFeature } = await import('../models/RegionFeature');
            data.push(new RegionFeature(gffData.seqid, gffData.start, gffData.end, gffData.strand, gffData.type, gffData.attributes, config));
          } else {
            // Import GFFFeature dynamically  
            const { default: GFFFeature } = await import('../models/GFFFeature');
            data.push(new GFFFeature(gffData.seqid, gffData.start, gffData.end, gffData.strand, gffData.type, gffData.attributes));
          }
        }
      }
    }
    
    return data;
  } catch (error) {
    console.warn('loaders.gl GFF parsing failed, falling back:', error);
    // Import the original function dynamically to avoid circular imports
    const { parseGFF } = await import('./parseGFF');
    return parseGFF(gffText, config);
  }
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

// Optimized protein links parsing (space-separated, no headers)
export async function parseProteinLinksOptimized(linksText) {
  try {
    const result = await parse(linksText, CSVLoader, {
      csv: {
        delimitersToGuess: [' '], // Force space delimiter detection
        skipEmptyLines: true,
        header: false,
        dynamicTyping: false,
        shape: 'array-row-table', // Get arrays instead of objects
      }
    });
    
    // Convert to expected format (array format for addProteinLinks)
    const data = [];
    if (result && result.data && Array.isArray(result.data)) {
      for (const row of result.data) {
        if (row.length >= 3) {
          data.push([
            row[0], // geneA
            row[1], // geneB
            parseFloat(row[2]) || 0 // score
          ]);
        }
      }
    }
    
    return data;
  } catch (error) {
    console.warn('loaders.gl protein links parsing failed, falling back:', error);
    return parseProteinLinksFallback(linksText);
  }
}

// Optimized nucleotide links parsing (space-separated, no headers)
export async function parseNucleotideLinksOptimized(linksText) {
  try {
    const result = await parse(linksText, CSVLoader, {
      csv: {
        delimitersToGuess: [' '], // Force space delimiter detection
        skipEmptyLines: true,
        header: false,
        dynamicTyping: false,
        shape: 'array-row-table', // Get arrays instead of objects
      }
    });
    
    // Convert to expected format (object format with seqid properties)
    const data = [];
    if (result && result.data && Array.isArray(result.data)) {
      for (const row of result.data) {
        if (row.length >= 7) {
          data.push({
            seqidA: row[0],
            startA: parseInt(row[1], 10),
            endA: parseInt(row[2], 10),
            seqidB: row[3],
            startB: parseInt(row[4], 10),
            endB: parseInt(row[5], 10),
            similarity: parseFloat(row[6]) || 0
          });
        }
      }
    }
    
    return data;
  } catch (error) {
    console.warn('loaders.gl nucleotide links parsing failed, falling back:', error);
    return parseNucleotideLinksFallback(linksText);
  }
}

// Optimized domains parsing (space-separated, no headers)
export async function parseDomainsOptimized(domainsText) {
  try {
    const result = await parse(domainsText, CSVLoader, {
      csv: {
        delimitersToGuess: [' '], // Force space delimiter detection
        skipEmptyLines: true,
        header: false,
        dynamicTyping: false,
        shape: 'array-row-table', // Get arrays instead of objects
      }
    });
    
    // Convert to expected format: { gene_id: [domains] }
    const data = {};
    if (result && result.data && Array.isArray(result.data)) {
      for (const row of result.data) {
        if (row.length >= 5) {
          const geneId = row[0];
          const domain = {
            domainName: row[1],
            start: parseInt(row[2], 10),
            end: parseInt(row[3], 10),
            evalue: parseFloat(row[4]) || 0
          };
          
          if (!data[geneId]) {
            data[geneId] = [];
          }
          data[geneId].push(domain);
        }
      }
    }
    
    return data;
  } catch (error) {
    console.warn('loaders.gl domains parsing failed, falling back:', error);
    return parseDomainsFallback(domainsText);
  }
}

// Optimized non-coding metadata parsing (tab-separated, no headers)
export async function parseNonCodingMetadataOptimized(metadataText) {
  try {
    const result = await parse(metadataText, CSVLoader, {
      csv: {
        delimitersToGuess: ['\t'], // Force tab delimiter detection
        skipEmptyLines: true,
        header: false,
        dynamicTyping: false,
        shape: 'array-row-table', // Get arrays instead of objects
      }
    });
    
    // Convert to expected format: { ncRNA_id: { type, description } }
    const data = {};
    if (result && result.data && Array.isArray(result.data)) {
      for (const row of result.data) {
        if (row.length >= 3) {
          data[row[0]] = {
            type: row[1],
            description: row[2]
          };
        }
      }
    }
    
    return data;
  } catch (error) {
    console.warn('loaders.gl non-coding metadata parsing failed, falling back:', error);
    return parseNonCodingMetadataFallback(metadataText);
  }
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
    return [
      parts[0], // geneA
      parts[1], // geneB
      parseFloat(parts[2]) || 0 // score
    ];
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
