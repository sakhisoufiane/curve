import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PillTag } from '../custom-components/PillTag';

const meta = {
  title: 'Data Display/PillTag',
  component: PillTag,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Text displayed inside the tag',
    },
  },
} satisfies Meta<typeof PillTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Mechanical',
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['Profit Share', 'Mechanical', 'Sync', 'Neighbouring Rights', 'Print', 'Main', 'Contributor'].map((label) => (
        <PillTag key={label} label={label} />
      ))}
    </div>
  ),
};
