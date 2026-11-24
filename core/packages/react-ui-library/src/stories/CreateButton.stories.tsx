import type { Meta, StoryObj } from '@storybook/react';
import { CreateButton } from '../custom-components/CreateButton/CreateButton';

const meta = {
  title: 'Actions/CreateButton',
  component: CreateButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    entityName: 'Work',
    onClick: () => {},
  },
} satisfies Meta<typeof CreateButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DifferentEntities: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <CreateButton entityName="Work" onClick={() => {}} />
      <CreateButton entityName="Contract" onClick={() => {}} />
      <CreateButton entityName="Company" onClick={() => {}} />
    </div>
  ),
};
