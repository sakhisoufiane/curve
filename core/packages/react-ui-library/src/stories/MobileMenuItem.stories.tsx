import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Search, LogOut, MessageCircle, Settings } from 'lucide-react';
import { MobileMenuItem } from '../custom-components/MobileMenuItem';

const meta = {
  title: 'Custom Components/MobileMenuItem',
  component: MobileMenuItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    destructive: { control: 'boolean' },
  },
} satisfies Meta<typeof MobileMenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <Search className="h-4 w-4 shrink-0" />,
    label: 'Search',
  },
};

export const Destructive: Story = {
  args: {
    icon: <LogOut className="h-4 w-4 shrink-0" />,
    label: 'Sign out',
    destructive: true,
  },
};

export const MenuPanel: Story = {
  args: {
    icon: <Search className="h-4 w-4 shrink-0" />,
    label: 'Search',
  },
  render: () => (
    <div className="w-72 rounded-md border bg-popover p-1 shadow-md">
      <MobileMenuItem icon={<Search className="h-4 w-4 shrink-0" />} label="Search" />
      <MobileMenuItem icon={<MessageCircle className="h-4 w-4 shrink-0" />} label="Launch Tour" />
      <MobileMenuItem icon={<Settings className="h-4 w-4 shrink-0" />} label="Settings" />
      <div className="-mx-1 my-1 h-px bg-border" />
      <MobileMenuItem icon={<LogOut className="h-4 w-4 shrink-0" />} label="Sign out" destructive />
    </div>
  ),
};
