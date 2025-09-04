// parser.worker.js - offload heavy text parsing to a worker
import {
  parseGFFOptimized,
  parseProteinLinksOptimized,
  parseNucleotideLinksOptimized,
  parseDomainsOptimized,
  parseBaselinesOptimized,
  parseProteinMetadataOptimized,
  parseTreeMetadataOptimized,
  parseNonCodingMetadataOptimized
} from '../utils/loadersGLUtils.js';

self.addEventListener('message', async (e) => {
  const { id, type, text, config } = e.data || {};
  try {
    let result = null;
    switch (type) {
      case 'gff':
        result = await parseGFFOptimized(text, config);
        break;
      case 'proteinLinks':
        result = await parseProteinLinksOptimized(text);
        break;
      case 'nucleotideLinks':
        result = await parseNucleotideLinksOptimized(text);
        break;
      case 'domains':
        result = await parseDomainsOptimized(text);
        break;
      case 'baselines':
        result = await parseBaselinesOptimized(text);
        break;
      case 'proteinMetadata':
        result = await parseProteinMetadataOptimized(text);
        break;
      case 'treeMetadata':
        result = await parseTreeMetadataOptimized(text);
        break;
      case 'nonCoding':
        result = await parseNonCodingMetadataOptimized(text);
        break;
      default:
        throw new Error('unknown parse type: ' + String(type));
    }
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: (err && err.message) ? err.message : String(err) });
  }
});
