import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ConfirmDialog } from '../custom-components/Dialogs';
import { Button } from '../components/button';

const meta = {
  title: 'Dialogs/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const StandardStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Confirm action</Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Are you sure?"
        description="This will apply the changes to all selected items."
        onConfirm={async () => new Promise(resolve => setTimeout(resolve, 1200))}
      />
    </>
  );
};

export const Standard: Story = {
  render: () => <StandardStory />,
};

const WithConfirmationStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Flush contracts to works</Button>
      <ConfirmDialog
        variant="confirmation"
        confirmationText="Flush Works"
        open={open}
        onClose={() => setOpen(false)}
        title="Flush Contracts to Works via IP Chains"
        description="This will (re)assign the Contracts and their Participation Rates on all filtered Works. Are you sure you want to continue? This cannot be undone."
        confirmLabel="Flush Works"
        onConfirm={async () => new Promise(resolve => setTimeout(resolve, 1200))}
      />
    </>
  );
};

export const WithConfirmation: Story = {
  render: () => <WithConfirmationStory />,
};

const WithErrorStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Confirm action</Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Re-process statements"
        description="This will re-process all statements for the selected period."
        onConfirm={async () => {
          await new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Processing failed. Please try again later.')), 1200)
          );
        }}
      />
    </>
  );
};

export const WithError: Story = {
  render: () => <WithErrorStory />,
};
