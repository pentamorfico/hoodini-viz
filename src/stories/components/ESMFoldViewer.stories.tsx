import type { Meta, StoryObj } from '@storybook/react';
import ESMFoldViewer from '@/components/ESMFoldViewer';

/**
 * ESMFoldViewer renders 3D protein structures predicted by ESMFold.
 */
const meta = {
  title: 'Examples/Components/ESMFoldViewer',
  component: ESMFoldViewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    sequence: {
      control: 'text',
      description: 'Protein amino acid sequence',
    },
    uniprotId: {
      control: 'text',
      description: 'UniProt identifier for the protein',
    },
  },
} satisfies Meta<typeof ESMFoldViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Example protein structure viewer with a sample sequence
 */
export const WithSequence: Story = {
  args: {
    sequence: 'MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQTLGQHDFSAGEGLYTHMKALRPDEDRLSPLHSVYVDQWDWERVMGDGERQFSTLKSTVEAIWAGIKATEAAVSEEFGLAPFLPDQIHFVHSQELLSRYPDLDAKGRERAIAKDLGAVFLVGIGGKLSDGHRHDVRAPDYDDWSTPSELGHAGLNGDILVWNPVLEDAFELSSMGIRVDADTLKHQLALTGDEDRLELEWHQALLRGEMPQTIGGGIGQSRLTMLLLQLPHIGQVQAGVWPAAVRESVPSLL',
    uniprotId: 'P12345',
  },
};

/**
 * Viewer without a sequence (shows placeholder or loading state)
 */
export const Empty: Story = {
  args: {
    sequence: undefined,
    uniprotId: undefined,
  },
};
