/**
 * Generate dist/template.html from dist/index.html by replacing inlined parquet
 * data URLs with placeholder tokens suitable for Jinja substitution.
 */
import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const inputFile = path.join(distDir, 'index.html');
const outputFile = path.join(distDir, 'template.html');

const replacements = {
  defaultGFFParquetUrl: '%%PARQUET_GFF_B64%%',
  defaultProteinLinksParquetUrl: '%%PARQUET_PROT_LINKS_B64%%',
  defaultNucleotideLinksParquetUrl: '%%PARQUET_NUC_LINKS_B64%%',
  defaultDomainsParquetUrl: '%%PARQUET_DOMAINS_B64%%',
  defaultBaselinesParquetUrl: '%%PARQUET_BASELINES_B64%%',
  defaultProteinMetadataParquetUrl: '%%PARQUET_PROT_META_B64%%',
  defaultDomainsMetadataParquetUrl: '%%PARQUET_DOM_META_B64%%',
  defaultTreeMetadataParquetUrl: '%%PARQUET_TREE_META_B64%%',
};

const NEWICK_TOKEN = '%%DEFAULT_NEWICK_B64%%';
const newickPattern = /const\s+defaultNewick=\`[\s\S]*?\`/;

function main() {
  if (!fs.existsSync(inputFile)) {
    console.error(`Missing build file: ${inputFile}. Run npm run build first.`);
    process.exit(1);
  }
  let html = fs.readFileSync(inputFile, 'utf8');
  let replacedAny = false;
  for (const [key, token] of Object.entries(replacements)) {
    const pattern = new RegExp(`(${key}\\s*=\\s*\\\")(data:application\\/octet-stream;base64,)[^\\\"]+(\\\"\\s*)`);
    const next = html.replace(pattern, `$1$2${token}$3`);
    if (next !== html) {
      replacedAny = true;
      html = next;
    } else {
      console.warn(`Warning: no match for ${key}`);
    }
  }

  // Replace the inlined Newick string with a Jinja placeholder.
  if (newickPattern.test(html)) {
    // Keep declaration chaining: the original bundle already has the comma after this const.
    html = html.replace(newickPattern, `const defaultNewick=atob('${NEWICK_TOKEN}')`);
    replacedAny = true;
  } else {
    console.warn('Warning: could not find defaultNewick string to replace');
  }
  fs.writeFileSync(outputFile, html, 'utf8');
  console.log(`Wrote ${outputFile} with placeholders`);
  if (!replacedAny) {
    console.warn('No placeholders were replaced. Check patterns and input.');
  }
}

main();
