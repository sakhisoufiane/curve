import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SummaryCard } from '../custom-components/SummaryCard';
import { SUMMARY_CARD_COLORS } from '../lib/curve-color-types';

const meta = {
  title: 'Data Display/SummaryCard',
  component: SummaryCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Summary Card',
    value: '100',
    color: SUMMARY_CARD_COLORS.COMPLETE,
  },
};

export const TotalRevenue: Story = {
  args: {
    title: 'Total Revenue',
    value: '11,790.00',
    color: SUMMARY_CARD_COLORS.COMPLETE,
  },
};

export const TotalCosts: Story = {
  args: {
    title: 'Total Costs',
    value: '100.00',
    color: SUMMARY_CARD_COLORS.SUCCESS,
  },
};

export const IncompleteLines: Story = {
  args: {
    title: 'Incomplete Lines',
    value: '1351',
    color: SUMMARY_CARD_COLORS.PRIMARY,
  },
};

export const AllCards: Story = {
  args: {
    title: 'All Cards',
    value: 'Example',
  },
  render: () => (
    <div className="flex gap-4 flex-wrap max-w-4xl">
      <SummaryCard
        title="Total Revenue"
        value="11,790.00"
        color={SUMMARY_CARD_COLORS.COMPLETE}
        className="flex-1 min-w-[250px]"
      />
      <SummaryCard
        title="Total Costs"
        value="100.00"
        color={SUMMARY_CARD_COLORS.SUCCESS}
        className="flex-1 min-w-[250px]"
      />
      <SummaryCard
        title="Incomplete Lines"
        value="1351"
        color={SUMMARY_CARD_COLORS.PRIMARY}
        className="flex-1 min-w-[250px]"
      />
    </div>
  ),
};

export const Loading: Story = {
  args: {
    title: 'Total Revenue',
    value: '',
    color: SUMMARY_CARD_COLORS.COMPLETE,
    isLoading: true,
  },
};

export const Error: Story = {
  args: {
    title: 'Total Revenue',
    value: '',
    color: SUMMARY_CARD_COLORS.COMPLETE,
    isError: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <SummaryCard title="Default" value="11,790.00" color={SUMMARY_CARD_COLORS.COMPLETE} className="min-w-[220px]" />
      <SummaryCard title="Loading" value="" color={SUMMARY_CARD_COLORS.INFO} isLoading className="min-w-[220px]" />
      <SummaryCard title="Error" value="" color={SUMMARY_CARD_COLORS.PRIMARY} isError className="min-w-[220px]" />
    </div>
  ),
  args: { title: '', value: '' },
};
