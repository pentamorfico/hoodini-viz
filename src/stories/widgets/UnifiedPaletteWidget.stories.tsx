import type { Meta, StoryObj } from '@storybook/react';
import UnifiedPaletteWidget from '@/widgets/UnifiedPaletteWidget';

const meta = {
  title: 'Examples/Widgets/UnifiedPaletteWidget',
  component: UnifiedPaletteWidget,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof UnifiedPaletteWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
