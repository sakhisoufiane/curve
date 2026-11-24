import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ImportButton } from '../custom-components/ImportButton';

const meta = {
  title: 'Actions/ImportButton',
  component: ImportButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    onClick: () => {},
  },
} satisfies Meta<typeof ImportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Icon: Story = {
  args: { variant: 'icon' },
};

export const BothVariants: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ImportButton variant="icon" onClick={() => {}} />
      <ImportButton variant="default" onClick={() => {}} />
    </div>
  ),
};
