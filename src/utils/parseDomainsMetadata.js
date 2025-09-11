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
    if (parts.length !== headers.length) continue;
    
    const domainId = parts[domainIdIndex];
    if (!domainId) continue;
    
    const entry = {};
    for (let j = 0; j < headers.length; j++) {
      if (j !== domainIdIndex && parts[j]) {
        entry[headers[j]] = parts[j];
      }
    }
    
    metadata[domainId] = entry;
  }
  
  return metadata;
}
