/*
Simple script to read files from public/data and output a JS module that exports
base64-encoded contents for selected files. This will be packaged into the app and
used when running the single-file build.

Usage:
  node scripts/embed_data.js public/data src/embeddedData.js
*/
import fs from 'fs';
import path from 'path';

const inDir = process.argv[2] || 'public/data';
const outFile = process.argv[3] || 'src/embeddedData.js';
const filesToEmbed = [
  'defaultTreeMetadata.parquet',
  'defaultBaselines.parquet',
  'defaultProteinLinks.parquet',
  'defaultNucleotideLinks.parquet'
];

const out = [];
out.push('// Auto-generated file: embedded data base64 strings');
out.push('const EMBEDDED = {};');

for (const fname of filesToEmbed) {
  const p = path.join(inDir, fname);
  if (!fs.existsSync(p)) continue;
  const buf = fs.readFileSync(p);
  const b64 = buf.toString('base64');
  out.push(`EMBEDDED['${fname}'] = '${b64}';`);
}

out.push('export default EMBEDDED;');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out.join('\n'));
console.log('Wrote', outFile);
