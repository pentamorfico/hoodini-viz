import type { Meta, StoryObj } from '@storybook/react';
import LegendWidget from '@/widgets/LegendWidget';

const meta = {
  title: 'Examples/Widgets/LegendWidget',
  component: LegendWidget,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LegendWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
