import type { Meta, StoryObj } from '@storybook/react';
import DataGridView from '@/components/DataGridView';

/**
 * DataGridView displays tabular data for proteins, domains, and other genomic features.
 */
const meta = {
  title: 'Examples/Components/DataGridView',
  component: DataGridView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataGridView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Example with sample data
 */
export const WithData: Story = {
  args: {
    datasets: {
      genes: {
        label: 'Genes',
        rows: [
          { id: 'gene1', name: 'Gene 1', strand: '+', start: 100, end: 500 },
          { id: 'gene2', name: 'Gene 2', strand: '-', start: 600, end: 900 },
        ],
      },
    },
    initialKey: 'genes',
    height: 400,
  },
};

/**
 * Empty grid
 */
export const Empty: Story = {
  args: {
    datasets: {},
    height: 300,
  },
};
