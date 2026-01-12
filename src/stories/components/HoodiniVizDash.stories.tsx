import type { Meta, StoryObj } from '@storybook/react';
import { HoodiniVizDash } from '@/HoodiniVizDash';

/**
 * HoodiniVizDash is the complete dashboard component with data loading, sidebar, and all controls.
 * This is the recommended component to use and showcases the full functionality with real embedded data.
 */
const meta = {
  title: 'Examples/HoodiniVizDash',
  component: HoodiniVizDash,
  decorators: [
    (Story) => (
      <div style={{ width: '100%', minWidth: '1000px', height: '700px', position: 'relative' }}>
        <Story />
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 700,
      },
      canvas: {
        sourceState: 'none',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HoodiniVizDash>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Complete dashboard with real embedded genomic data.
 * Shows phylogenetic tree, genomic neighborhoods, protein domains, and all interactive features.
 * 
 * **Note:** This loads ~3MB of embedded data - check browser console (F12) for loading progress.
 */
export const WithRealData: Story = {
  args: {},
  parameters: {
    layout: 'fullscreen',
  },
  play: async () => {
    console.log('[Storybook] HoodiniVizDash story loaded, data loading...');
  },
};

/**
 * Minimal version - useful for testing UI without heavy data loading
 */
export const Minimal: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Lightweight version for UI testing. Check browser console (F12) to see what\'s happening.',
      },
    },
  },
};
