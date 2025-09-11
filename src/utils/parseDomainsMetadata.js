// parseDomainsMetadata.js
export function parseDomainsMetadata(str) {
  const lines = str.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length === 0) return {};
  
  const headers = lines[0].split('\t');
  const domainIdIndex = headers.findIndex(h => h.toLowerCase().includes('domain_id'));
  
  if (domainIdIndex === -1) {
    console.warn('parseDomainsMetadata: No domain_id column found');
    return {};
  }
  
  const metadata = {};
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    
    // Skip lines that don't have enough columns to include the domain_id
    if (parts.length <= domainIdIndex) continue;
    
    const domainId = parts[domainIdIndex];
    if (!domainId) continue;
    
    const entry = {};
    // Handle missing columns gracefully by only processing columns that exist
    for (let j = 0; j < Math.min(parts.length, headers.length); j++) {
      if (j !== domainIdIndex && parts[j] && parts[j].trim()) {
        entry[headers[j]] = parts[j].trim();
      }
    }
    
    // Only add the entry if it has at least one non-domain_id field
    if (Object.keys(entry).length > 0) {
      metadata[domainId] = entry;
    }
  }
  
  return metadata;
}
