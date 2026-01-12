/**
 * Data URLs for embedded parquet files and Newick tree.
 * 
 * In template mode (VITE_TEMPLATE_MODE=true), exports placeholders for Jinja.
 * In normal mode, exports the actual base64 data URLs from files (if they exist).
 * 
 * All exports are URLs (or data URLs) - HoodiniDashboard handles fetching, decoding,
 * and missing files gracefully.
 */

const TEMPLATE_MODE = import.meta.env.VITE_TEMPLATE_MODE === 'true';

// Placeholders for Jinja templating (using ##HOODINI:VAR##! - ##! as end to avoid ambiguity)
const PLACEHOLDERS = {
  gffParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_GFF_B64##!',
  proteinLinksParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_PROT_LINKS_B64##!',
  nucleotideLinksParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_NUC_LINKS_B64##!',
  domainsParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_DOMAINS_B64##!',
  hoodsParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_HOODS_B64##!',
  proteinMetadataParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_PROT_META_B64##!',
  domainsMetadataParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_DOM_META_B64##!',
  treeMetadataParquetUrl: 'data:application/octet-stream;base64,##HOODINI:PARQUET_TREE_META_B64##!',
  newickUrl: 'data:text/plain;base64,##HOODINI:NEWICK_B64##!',
  gffTextUrl: 'data:text/plain;base64,##HOODINI:TSV_GFF_B64##!',
  proteinLinksTextUrl: 'data:text/plain;base64,##HOODINI:TSV_PROT_LINKS_B64##!',
  nucleotideLinksTextUrl: 'data:text/plain;base64,##HOODINI:TSV_NUC_LINKS_B64##!',
  domainsTextUrl: 'data:text/plain;base64,##HOODINI:TSV_DOMAINS_B64##!',
  hoodsTextUrl: 'data:text/plain;base64,##HOODINI:TSV_HOODS_B64##!',
  proteinMetadataTextUrl: 'data:text/plain;base64,##HOODINI:TSV_PROT_META_B64##!',
  domainsMetadataTextUrl: 'data:text/plain;base64,##HOODINI:TSV_DOM_META_B64##!',
  treeMetadataTextUrl: 'data:text/plain;base64,##HOODINI:TSV_TREE_META_B64##!',
};

// Helper to get first value from glob result or empty string
const getGlobValue = (glob: Record<string, unknown>): string => 
  (Object.values(glob)[0] as string) || '';

// Import real data using glob - allows build to succeed even if files don't exist
// Each file is optional - HoodiniDashboard handles missing data gracefully
const parquetGlob = import.meta.glob('./data/parquet/*.parquet', { query: '?base64', eager: true, import: 'default' }) as Record<string, string>;
const tsvGlob = import.meta.glob('./data/tsv/*', { query: '?base64', eager: true, import: 'default' }) as Record<string, string>;
const newickGlob = import.meta.glob('./data/tree.nwk', { query: '?base64', eager: true, import: 'default' }) as Record<string, string>;

const REAL_DATA = {
  gffParquetUrl: parquetGlob['./data/parquet/gff.parquet'] || '',
  proteinLinksParquetUrl: parquetGlob['./data/parquet/protein_links.parquet'] || '',
  nucleotideLinksParquetUrl: parquetGlob['./data/parquet/nucleotide_links.parquet'] || '',
  domainsParquetUrl: parquetGlob['./data/parquet/domains.parquet'] || '',
  hoodsParquetUrl: parquetGlob['./data/parquet/hoods.parquet'] || '',
  proteinMetadataParquetUrl: parquetGlob['./data/parquet/protein_metadata.parquet'] || '',
  domainsMetadataParquetUrl: parquetGlob['./data/parquet/domains_metadata.parquet'] || '',
  treeMetadataParquetUrl: parquetGlob['./data/parquet/tree_metadata.parquet'] || '',
  newickUrl: getGlobValue(newickGlob),
  gffTextUrl: tsvGlob['./data/tsv/gff.gff'] || '',
  proteinLinksTextUrl: tsvGlob['./data/tsv/protein_links.txt'] || '',
  nucleotideLinksTextUrl: tsvGlob['./data/tsv/nucleotide_links.txt'] || '',
  domainsTextUrl: tsvGlob['./data/tsv/domains.txt'] || '',
  hoodsTextUrl: tsvGlob['./data/tsv/hoods.txt'] || '',
  proteinMetadataTextUrl: tsvGlob['./data/tsv/protein_metadata.txt'] || '',
  domainsMetadataTextUrl: tsvGlob['./data/tsv/domains_metadata.txt'] || '',
  treeMetadataTextUrl: tsvGlob['./data/tsv/tree_metadata.txt'] || '',
};

// Export the appropriate URLs based on mode
const dataUrls = TEMPLATE_MODE ? PLACEHOLDERS : REAL_DATA;

// Parquet URLs
export const gffParquetUrl = dataUrls.gffParquetUrl;
export const proteinLinksParquetUrl = dataUrls.proteinLinksParquetUrl;
export const nucleotideLinksParquetUrl = dataUrls.nucleotideLinksParquetUrl;
export const domainsParquetUrl = dataUrls.domainsParquetUrl;
export const hoodsParquetUrl = dataUrls.hoodsParquetUrl;
export const proteinMetadataParquetUrl = dataUrls.proteinMetadataParquetUrl;
export const domainsMetadataParquetUrl = dataUrls.domainsMetadataParquetUrl;
export const treeMetadataParquetUrl = dataUrls.treeMetadataParquetUrl;

// Text/TSV URLs
export const gffTextUrl = dataUrls.gffTextUrl;
export const proteinLinksTextUrl = dataUrls.proteinLinksTextUrl;
export const nucleotideLinksTextUrl = dataUrls.nucleotideLinksTextUrl;
export const domainsTextUrl = dataUrls.domainsTextUrl;
export const hoodsTextUrl = dataUrls.hoodsTextUrl;
export const proteinMetadataTextUrl = dataUrls.proteinMetadataTextUrl;
export const domainsMetadataTextUrl = dataUrls.domainsMetadataTextUrl;
export const treeMetadataTextUrl = dataUrls.treeMetadataTextUrl;

// Newick URL (may be gzip-compressed - HoodiniDashboard handles decompression)
export const newickUrl = dataUrls.newickUrl;

// Utility export
export const isTemplateMode = TEMPLATE_MODE;
