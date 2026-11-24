import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { NoResultsState } from '../custom-components/NoResultsState';

const meta = {
  title: 'Data Display/NoResultsState',
  component: NoResultsState,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[600px] border rounded-md"><Story /></div>],
} satisfies Meta<typeof NoResultsState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithClearSearch: Story = {
  args: {
    message: 'No works match your search.',
    onClearSearch: () => {},
  },
};

export const WithClearFilters: Story = {
  args: {
    message: 'No works match your filters.',
    onClearFilters: () => {},
  },
};

export const WithBoth: Story = {
  args: {
    message: 'No works match your search.',
    onClearSearch: () => {},
    onClearFilters: () => {},
  },
};

export const CustomMessage: Story = {
  args: {
    message: 'No contracts match your current filters.',
    onClearFilters: () => {},
  },
};
