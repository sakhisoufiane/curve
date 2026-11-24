import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Input } from '../components/input';

const meta = {
  title: 'Primitives/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: 'The input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Email address',
  },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Password',
  },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <label htmlFor="email-error" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="email-error"
        type="email"
        placeholder="you@example.com"
        aria-invalid="true"
        defaultValue="invalid-email"
      />
      <p className="text-sm text-destructive">Please enter a valid email address.</p>
    </div>
  ),
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};
