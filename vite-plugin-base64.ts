/**
 * Vite plugin to import files as base64 data URLs
 * Usage: import file from './file.ext?base64'
 */
import { readFileSync, existsSync } from 'fs';
import { Plugin } from 'vite';

export default function base64Plugin(): Plugin {
  return {
    name: 'vite-plugin-base64',
    enforce: 'pre',
    
    resolveId(source, importer) {
      // Let Vite handle the resolution, we just mark it for our load hook
      if (source.includes('?base64')) {
        return null; // Let default resolver handle it
      }
      return null;
    },
    
    load(id) {
      // Handle ?base64 suffix (works in both dev and build)
      if (id.includes('?base64') || id.includes('?import&base64')) {
        const filePath = id.split('?')[0];
        
        // Check if file exists
        if (!existsSync(filePath)) {
          console.warn(`[base64-plugin] File not found: ${filePath}, returning null`);
          return `export default null`;
        }
        
        try {
          const content = readFileSync(filePath);
          const base64 = content.toString('base64');
          
          // Determine MIME type
          let mimeType = 'application/octet-stream';
          if (filePath.endsWith('.parquet')) {
            mimeType = 'application/octet-stream';
          } else if (filePath.endsWith('.nwk') || filePath.endsWith('.txt')) {
            mimeType = 'text/plain';
          } else if (filePath.endsWith('.gff')) {
            mimeType = 'text/plain';
          }
          
          const dataUrl = `data:${mimeType};base64,${base64}`;
          
          // Return as ES module default export
          return `export default ${JSON.stringify(dataUrl)}`;
        } catch (error) {
          console.warn(`[base64-plugin] Failed to load ${filePath}:`, error);
          return `export default null`;
        }
      }
      
      return null;
    }
  };
}
