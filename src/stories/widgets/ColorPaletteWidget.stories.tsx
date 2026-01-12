import type { Meta, StoryObj } from '@storybook/react';
import ColorPaletteWidget from '@/widgets/ColorPaletteWidget';

const meta = {
  title: 'Examples/Widgets/ColorPaletteWidget',
  component: ColorPaletteWidget,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ColorPaletteWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Color Palette',
    palette: {
      type: 'qualitative',
      name: 'Set1',
    },
    onChange: (newPalette) => console.log('Palette changed:', newPalette),
    showPreview: true,
    availableLayers: [],
  },
};
