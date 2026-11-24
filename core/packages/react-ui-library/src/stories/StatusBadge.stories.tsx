import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from '../custom-components/StatusBadge';

const meta = {
  title: 'Data Display/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['valid', 'incomplete', 'inactive', 'approved', 'approvedOnHold', 'readyForApproval', 'invalid'],
      description: 'The contract status to display',
    },
    label: {
      control: 'text',
      description: 'Override the default label for this status',
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: 'valid',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div>
      <div className="flex flex-wrap gap-3">
        <span className="text-xs">Contract Status:</span>
        <StatusBadge status="valid" />
        <StatusBadge status="incomplete" />
        <StatusBadge status="inactive" />
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        <span className="text-xs">Delivery Status:</span>
        <StatusBadge status="approved" />
        <StatusBadge status="approvedOnHold" />
        <StatusBadge status="readyForApproval" />
        <StatusBadge status="invalid" />
      </div>
    </div>
  ),
};
