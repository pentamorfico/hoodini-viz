// parseGFF.js
import GFFFeature from '../models/GFFFeature';
import RegionFeature from '../models/RegionFeature';

export function parseGFF(gff, config = null) {
  const lines = gff.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  
  return lines.map(line => {
    const parts = line.split('\t');
    const seqid = parts[0];
    const source = parts[1];
    const type = parts[2];
    const start = parseInt(parts[3], 10);
    const end = parseInt(parts[4], 10);
    const score = parts[5] === '.' ? null : parseFloat(parts[5]);
    const strand = parts[6] === '.' ? '+' : parts[6];
    const phase = parts[7] === '.' ? null : parts[7];
    const attributes = parseAttributes(parts[8] || "");
    // Normalize ncRNA type from attributes if present
    if (type === 'ncRNA' && attributes) {
      // attributes.ID may be like 'tracrRNA' or 'ID=tracrRNA' or 'tracrRNA;'
      let id = attributes.ID || attributes.id || null;
      if (typeof id === 'string') {
        id = id.replace(/^ID=/, '').replace(/;$/, '').trim();
        attributes.ID = id;
        attributes.ncrna_type = id;
      } else {
        attributes.ncrna_type = null;
      }
    }
    
    // Create RegionFeature for region-type features
    if (type === 'region') {
      return new RegionFeature(seqid, start, end, strand, type, attributes, config);
    }
    
    // Create regular GFFFeature for all other features
    return new GFFFeature(seqid, start, end, strand, type, attributes);
  });
}

/**
 * Parse GFF attributes string into an object
 */
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
