import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MessageDisplay } from '../custom-components/MessageDisplay';
import { Button } from '../components/button';

const meta = {
  title: 'Feedback/MessageDisplay',
  component: MessageDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['error', 'success', 'info', 'loading'],
      description: 'The visual style variant of the message',
    },
    message: {
      control: 'text',
      description: 'The message text to display',
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show an icon',
    },
  },
} satisfies Meta<typeof MessageDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    variant: 'error',
    message: 'An error occurred while processing your request.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    message: 'Your changes have been saved successfully.',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    message: 'Please review the information before proceeding.',
  },
};

export const Loading: Story = {
  args: {
    variant: 'loading',
    message: 'Loading...',
  },
};

export const WithIcons: Story = {
  args: {
    variant: 'error',
    message: 'Error message with icon',
    showIcon: true,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <MessageDisplay variant="error" message="Error message with icon" showIcon />
      <MessageDisplay variant="success" message="Success message with icon" showIcon />
      <MessageDisplay variant="info" message="Info message with icon" showIcon />
      <MessageDisplay variant="loading" message="Loading message with icon" showIcon />
    </div>
  ),
};

export const WithChildren: Story = {
  args: {
    variant: 'success',
    message: 'Your account has been successfully confirmed. You can now log in.',
    showIcon: true,
  },
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <MessageDisplay
        variant="success"
        message="Your account has been successfully confirmed. You can now log in."
        showIcon
      >
        <Button variant="outline" onClick={() => {}}>
          Go to Login
        </Button>
      </MessageDisplay>
      <MessageDisplay variant="error" message="Something went wrong. Please try again." showIcon>
        <Button variant="outline" onClick={() => {}}>
          Retry
        </Button>
      </MessageDisplay>
    </div>
  ),
};

export const AllVariants: Story = {
  args: {
    variant: 'error',
    message: 'This is an error message',
  },
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <MessageDisplay variant="error" message="This is an error message" />
      <MessageDisplay variant="success" message="This is a success message" />
      <MessageDisplay variant="info" message="This is an info message" />
      <MessageDisplay variant="loading" message="This is a loading message" />
    </div>
  ),
};
