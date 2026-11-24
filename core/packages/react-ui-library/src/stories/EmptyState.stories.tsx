import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Icon } from '../icons';
import { EmptyState } from '../custom-components/EmptyState';
import { Button } from '../components/button';

const meta = {
  title: 'Data Display/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[500px] border rounded-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Icon.ScrollText,
    title: 'No contracts yet',
    description: 'Get started by importing existing contracts or creating a new one.',
    helpLink: 'https://help.curveroyaltysystems.com/article/17-how-to-create-contracts',
    helpLinkText: 'How to create contracts',
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="outline">Import</Button>
      <Button>
        <Icon.Plus className="size-3.5" />
        New Contract
      </Button>
    </EmptyState>
  ),
};

export const WithoutHelpLink: Story = {
  args: {
    icon: Icon.FileText,
    title: 'No statements yet',
    description: 'Statements will appear here once they have been generated.',
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button size="sm">Generate Statement</Button>
    </EmptyState>
  ),
};

export const Minimal: Story = {
  args: {
    icon: Icon.BarChart2,
    title: 'No data available',
    description: 'There is nothing to display for the selected period.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 h-[500px] divide-x border rounded-md overflow-hidden">
      <EmptyState
        icon={Icon.ScrollText}
        title="No contracts yet"
        description="Get started by importing existing contracts or creating a new one."
        helpLink="https://help.curveroyaltysystems.com"
        helpLinkText="How to create contracts"
      >
        <Button variant="outline" size="sm">
          Import
        </Button>
        <Button size="sm">New Contract</Button>
      </EmptyState>
      <EmptyState icon={Icon.Users} title="No companies found" description="Add a company to get started.">
        <Button size="sm">Add Company</Button>
      </EmptyState>
      <EmptyState
        icon={Icon.BarChart2}
        title="No data available"
        description="There is nothing to display for the selected period."
      />
    </div>
  ),
};
