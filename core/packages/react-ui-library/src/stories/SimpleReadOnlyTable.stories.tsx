import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SimpleReadOnlyTable } from '../custom-components/SimpleReadOnlyTable';
import { Button } from '../components/button';

type SampleRow = {
  id: string;
  name: string;
  status: string;
  amount: number;
};

const meta = {
  title: 'Data Display/SimpleReadOnlyTable',
  component: SimpleReadOnlyTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SimpleReadOnlyTable<SampleRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData: SampleRow[] = [
  { id: '1', name: 'Item One', status: 'Active', amount: 1000 },
  { id: '2', name: 'Item Two', status: 'Pending', amount: 2500 },
  { id: '3', name: 'Item Three', status: 'Active', amount: 500 },
];

export const Default: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    data: sampleData,
  },
};

export const WithCaption: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    data: sampleData,
    caption: 'Sample Data Table',
  },
};

export const Empty: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    data: [],
    emptyMessage: 'No items found',
  },
};

export const Loading: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    data: [],
    loading: true,
  },
};

export const Dense: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    data: sampleData,
    dense: true,
  },
};

export const WithFooter: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    data: sampleData,
    footerRow: [
      { content: 'Total', colSpan: 2, align: 'right' },
      { content: '$4,000.00', align: 'right' },
    ],
  },
};

export const WithTrailingAction: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    data: sampleData,
    trailingAction: <Button variant="outline">View All</Button>,
  },
};
