import type { Meta, StoryObj } from '@storybook/react';
import { HoodiniDashboard } from '@/HoodiniDashboard';

/**
 * HoodiniDashboard is the all-in-one component for genomic visualization.
 * It automatically loads data from Parquet or TSV files and provides
 * a complete UI with sidebar controls, visualization canvas, and data grid.
 * 
 * This is the recommended component for most use cases.
 */
const meta = {
  title: 'Examples/HoodiniDashboard',
  component: HoodiniDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 700,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showSidebar: {
      control: 'boolean',
      description: 'Show/hide the sidebar with controls',
    },
    showToolbar: {
      control: 'boolean',
      description: 'Show/hide the toolbar (export, theme toggle, etc)',
    },
    preferParquet: {
      control: 'boolean',
      description: 'Prefer Parquet files over TSV when loading data',
    },
    disableThemeProvider: {
      control: 'boolean',
      description: 'Disable internal ThemeProvider (use if parent provides one)',
    },
  },
} satisfies Meta<typeof HoodiniDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Full dashboard with automatic data loading, sidebar controls, and data grid.
 * Uses small sample dataset for fast loading.
 */
export const Default: Story = {
  args: {
    showSidebar: true,
    showToolbar: true,
    dataPaths: {
      gffParquet: '/data/small/parquet/gff.parquet',
      hoodsParquet: '/data/small/parquet/hoods.parquet',
      newick: '/data/small/tree.nwk',
      proteinLinksParquet: '/data/small/parquet/protein_links.parquet',
      nucleotideLinksParquet: '/data/small/parquet/nucleotide_links.parquet',
      domainsParquet: '/data/small/parquet/domains.parquet',
      domainsMetadataParquet: '/data/small/parquet/domains_metadata.parquet',
      proteinMetadataParquet: '/data/small/parquet/protein_metadata.parquet',
      treeMetadataParquet: '/data/small/parquet/tree_metadata.parquet',
      ncRNAMetadataParquet: '/data/small/parquet/ncrna_metadata.parquet',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '700px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};
