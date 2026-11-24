import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from '../components/button';
import { showToast, Toaster } from '../components/sonner';

const meta = {
  title: 'Feedback/Toast',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <>
        <Toaster />
        <Story />
      </>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  render: () => (
    <Button onClick={() => showToast({ type: 'success', title: 'Changes saved', description: 'Your changes have been saved successfully.' })}>
      Show success toast
    </Button>
  ),
};

export const Warning: Story = {
  render: () => (
    <Button onClick={() => showToast({ type: 'warning', title: 'Session expiring', description: 'Your session will expire in 5 minutes.' })}>
      Show warning toast
    </Button>
  ),
};

export const Error: Story = {
  render: () => (
    <Button onClick={() => showToast({ type: 'error', title: 'Save failed', description: 'An error occurred. Please try again.' })}>
      Show error toast
    </Button>
  ),
};

export const WithLink: Story = {
  render: () => (
    <Button
      onClick={() =>
        showToast({
          type: 'success',
          title: 'Artists merged successfully',
          description: (
            <span>
              Click to view <a href="/catalogue/artist/123" style={{ textDecoration: 'underline' }}>The Beatles</a>.
            </span>
          ),
        })
      }
    >
      Show toast with link
    </Button>
  ),
};

export const WithList: Story = {
  render: () => (
    <Button
      onClick={() =>
        showToast({
          type: 'error',
          title: 'Validation failed',
          description: (
            <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
              <li>Title is required</li>
              <li>Release date must be in the past</li>
              <li>At least one artist must be assigned</li>
            </ul>
          ),
        })
      }
    >
      Show toast with list
    </Button>
  ),
};

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button onClick={() => showToast({ type: 'success', title: 'Success', description: 'Operation completed.' })}>
        Success
      </Button>
      <Button onClick={() => showToast({ type: 'warning', title: 'Warning', description: 'Proceed with caution.' })}>
        Warning
      </Button>
      <Button onClick={() => showToast({ type: 'error', title: 'Error', description: 'Something went wrong.' })}>
        Error
      </Button>
    </div>
  ),
};
