import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ValidationItem } from '../custom-components/ValidationItem';

const meta = {
  title: 'Feedback/ValidationItem',
  component: ValidationItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isValid: {
      control: 'boolean',
      description: 'Whether the validation requirement is met',
    },
  },
} satisfies Meta<typeof ValidationItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Valid: Story = {
  args: {
    isValid: true,
    children: 'At least 12 characters',
  },
};

export const Invalid: Story = {
  args: {
    isValid: false,
    children: 'At least 12 characters',
  },
};

export const PasswordRequirements: Story = {
  args: {
    isValid: true,
    children: 'At least 12 characters',
  },
  render: () => (
    <div className="space-y-2 p-3 bg-muted/50 rounded-md w-72">
      <p className="text-sm font-medium text-muted-foreground mb-2">Password Requirements:</p>
      <ValidationItem isValid={true}>At least 12 characters</ValidationItem>
      <ValidationItem isValid={true}>Contains uppercase letter</ValidationItem>
      <ValidationItem isValid={false}>Contains a number</ValidationItem>
      <ValidationItem isValid={false}>Contains a special character</ValidationItem>
      <ValidationItem isValid={false}>Passwords match</ValidationItem>
    </div>
  ),
};
