import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ListCard } from '../custom-components/ListCard/ListCard';

const meta = {
  title: 'Data Display/ListCard',
  component: ListCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Recent Items',
    items: [
      {
        label: 'Sample Item 1',
        value: '$1,000.00',
        href: '#',
      },
      {
        label: 'Sample Item 2',
        value: '$2,500.00',
        href: '#',
      },
    ],
  },
};

export const RecentContracts: Story = {
  args: {
    title: 'Recent Contracts',
    items: [
      {
        label: 'Hello',
        badge: 'Royalty',
        href: '#',
      },
      {
        label: 'Channel Specific Rates',
        badge: 'Royalty',
        href: '#',
      },
      {
        label: 'Royalty - Combo Contract #3',
        badge: 'Royalty',
        href: '#',
      },
    ],
  },
};

export const RecentSales: Story = {
  args: {
    title: 'Recent Sales',
    items: [
      {
        label: 'Standard Publishing Template (1)',
        value: '$6,000.00',
        href: '#',
      },
      {
        label: 'Premium Publishing Template (2)',
        value: '$8,500.00',
        href: '#',
      },
    ],
  },
};

export const MixedContent: Story = {
  args: {
    title: 'Mixed Content',
    items: [
      {
        label: 'Contract with Badge',
        badge: 'Active',
        href: '#',
      },
      {
        label: 'Sale with Value',
        value: '$3,200.00',
        href: '#',
      },
      {
        label: 'Simple Link',
        href: '#',
      },
    ],
  },
};

export const Loading: Story = {
  args: {
    title: 'Recent Items',
    items: [],
    isLoading: true,
  },
};

export const Error: Story = {
  args: {
    title: 'Recent Items',
    items: [],
    isError: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <ListCard
        title="Default"
        items={[
          { label: 'Sample Item 1', value: '$1,000.00', href: '#' },
          { label: 'Sample Item 2', value: '$2,500.00', href: '#' },
        ]}
      />
      <ListCard title="Loading" items={[]} isLoading />
      <ListCard title="Error" items={[]} isError />
    </div>
  ),
  args: { title: '', items: [] },
};
