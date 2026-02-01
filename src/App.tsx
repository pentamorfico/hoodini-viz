import { HoodiniDashboard } from './HoodiniDashboard';
import { ThemeProvider } from '@/contexts/ThemeContext';
import {
  gffParquetUrl,
  proteinLinksParquetUrl,
  nucleotideLinksParquetUrl,
  domainsParquetUrl,
  hoodsParquetUrl,
  proteinMetadataParquetUrl,
  domainsMetadataParquetUrl,
  treeMetadataParquetUrl,
  ncRNAMetadataParquetUrl,
  gffTextUrl,
  proteinLinksTextUrl,
  nucleotideLinksTextUrl,
  domainsTextUrl,
  hoodsTextUrl,
  proteinMetadataTextUrl,
  domainsMetadataTextUrl,
  treeMetadataTextUrl,
  ncRNAMetadataTextUrl,
  newickUrl,
} from './dataUrls';

function App() {
  return (
    <ThemeProvider respectHostTheme={false}>
      <HoodiniDashboard
        dataPaths={{
          gffParquet: gffParquetUrl,
          proteinLinksParquet: proteinLinksParquetUrl,
          nucleotideLinksParquet: nucleotideLinksParquetUrl,
          domainsParquet: domainsParquetUrl,
          hoodsParquet: hoodsParquetUrl,
          proteinMetadataParquet: proteinMetadataParquetUrl,
          domainsMetadataParquet: domainsMetadataParquetUrl,
          treeMetadataParquet: treeMetadataParquetUrl,
          ncRNAMetadataParquet: ncRNAMetadataParquetUrl,
          gffText: gffTextUrl,
          proteinLinksText: proteinLinksTextUrl,
          nucleotideLinksText: nucleotideLinksTextUrl,
          domainsText: domainsTextUrl,
          hoodsText: hoodsTextUrl,
          proteinMetadataText: proteinMetadataTextUrl,
          domainsMetadataText: domainsMetadataTextUrl,
          treeMetadataText: treeMetadataTextUrl,
          ncRNAMetadataText: ncRNAMetadataTextUrl,
          newick: newickUrl,
        }}
        showSidebar={true}
        showToolbar={true}
        style={{ width: '100vw', height: '100vh' }}
      />
    </ThemeProvider>
  );
}

export default App;
