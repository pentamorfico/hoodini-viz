import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import parsing function manually since it's ES module
function parseDomainsMetadata(str) {
  const lines = str.split('\n').map(l => l.trim()).filter(l => l);
  console.log('Total lines:', lines.length);
  if (lines.length === 0) return {};
  
  const headers = lines[0].split('\t');
  console.log('Headers:', headers);
  const domainIdIndex = headers.findIndex(h => h.toLowerCase().includes('domain_id'));
  console.log('Domain ID index:', domainIdIndex);
  
  if (domainIdIndex === -1) {
    console.warn('parseDomainsMetadata: No domain_id column found');
    return {};
  }
  
  const metadata = {};
  let processedCount = 0;
  let skippedCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    
    // Skip lines that don't have enough columns to include the domain_id
    if (parts.length <= domainIdIndex) {
      skippedCount++;
      continue;
    }
    
    const domainId = parts[domainIdIndex];
    if (!domainId) {
      skippedCount++;
      continue;
    }
    
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
      processedCount++;
      
      if (processedCount <= 5) {
        console.log(`Added metadata for ${domainId}:`, entry);
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`Processed ${processedCount} entries, skipped ${skippedCount}`);
  return metadata;
}

// Read and parse domain metadata
const metadataPath = join(__dirname, 'src/data/defaultDomainsMetadata.txt');
const domainsPath = join(__dirname, 'src/data/defaultDomains.txt');

console.log('Reading metadata from:', metadataPath);
const metadataContent = readFileSync(metadataPath, 'utf-8');
const parsedMetadata = parseDomainsMetadata(metadataContent);

console.log('Parsed metadata keys:', Object.keys(parsedMetadata).slice(0, 10));
console.log('Total metadata entries:', Object.keys(parsedMetadata).length);

// Sample metadata entry
const sampleKey = Object.keys(parsedMetadata)[0];
console.log('Sample metadata entry:', sampleKey, '=', parsedMetadata[sampleKey]);

// Read and check domain file
console.log('\nReading domains from:', domainsPath);
const domainsContent = readFileSync(domainsPath, 'utf-8');
const domainLines = domainsContent.split('\n').slice(1, 11); // Skip header, get first 10

console.log('Sample domain entries:');
domainLines.forEach(line => {
  if (line.trim()) {
    const parts = line.split('\t');
    const geneId = parts[0];
    const domainName = parts[1];
    console.log(`  ${geneId} -> ${domainName} (metadata exists: ${!!parsedMetadata[domainName]})`);
  }
});
