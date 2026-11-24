import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { HelpTooltip } from '../custom-components/HelpTooltip';
import { Label } from '../components/label';
import { Checkbox } from '../components/checkbox';

const meta = {
  title: 'Feedback/HelpTooltip',
  component: HelpTooltip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    text: 'This is a helpful explanation of the field or option above.',
  },
} satisfies Meta<typeof HelpTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InlineWithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Label>Some setting</Label>
      <HelpTooltip text="This is a helpful explanation of the field or option above." />
    </div>
  ),
};

export const InlineWithCheckbox: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="example" />
      <Label htmlFor="example">Overwrite blank values</Label>
      <HelpTooltip text="Blank values in the template will overwrite and delete existing data when this box is checked." />
    </div>
  ),
};

export const LongText: Story = {
  args: {
    text: 'If the data in this import file contains changes to Title, Territory or IP Chain, this import will trigger re-delivery of those Works if you have active Delivery Schedules set up.',
  },
};
