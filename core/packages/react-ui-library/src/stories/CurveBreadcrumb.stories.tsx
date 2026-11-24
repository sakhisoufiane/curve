import type { Meta, StoryObj } from '@storybook/react';
import { CurveBreadcrumb } from '../custom-components/CurveBreadcrumb';

const meta = {
  title: 'Navigation/CurveBreadcrumb',
  component: CurveBreadcrumb,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CurveBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { label: 'CLIENTS', href: '/clients' },
      { label: 'CREATE', isActive: true },
    ],
  },
};

export const SingleItem: Story = {
  args: {
    items: [{ label: 'DASHBOARD', isActive: true }],
  },
};

export const MultipleItems: Story = {
  args: {
    items: [
      { label: 'CLIENTS', href: '/clients' },
      { label: 'ACME CORP', href: '/clients/acme-corp' },
      { label: 'PROFILE', isActive: true },
    ],
  },
};
