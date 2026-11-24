import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { DeleteDialog } from '../custom-components/Dialogs';
import { Button } from '../components/button';

const meta = {
  title: 'Dialogs/DeleteDialog',
  component: DeleteDialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof DeleteDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const StandardStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Delete work</Button>
      <DeleteDialog
        open={open}
        onClose={() => setOpen(false)}
        entityName="work"
        description="This action cannot be undone."
        onConfirm={async () => new Promise(resolve => setTimeout(resolve, 1200))}
      />
    </>
  );
};

export const Standard: Story = {
  render: () => <StandardStory />,
};

const WithCountStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Delete selected</Button>
      <DeleteDialog
        variant="count"
        count={12}
        open={open}
        onClose={() => setOpen(false)}
        entityName="work"
        description="This will permanently remove 12 works and all associated data."
        onConfirm={async () => new Promise(resolve => setTimeout(resolve, 1200))}
      />
    </>
  );
};

export const WithCount: Story = {
  render: () => <WithCountStory />,
};

const WithConfirmationStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Delete contract</Button>
      <DeleteDialog
        variant="confirmation"
        confirmationText="delete contract"
        open={open}
        onClose={() => setOpen(false)}
        entityName="contract"
        description="This will permanently delete the contract and all royalty splits associated with it."
        onConfirm={async () => new Promise(resolve => setTimeout(resolve, 1200))}
      />
    </>
  );
};

export const WithConfirmation: Story = {
  render: () => <WithConfirmationStory />,
};

const BulkInputStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Bulk delete works</Button>
      <DeleteDialog
        variant="bulk"
        open={open}
        onClose={() => setOpen(false)}
        title="Bulk delete works"
        description="Paste the IDs of the works you want to permanently delete. This action cannot be undone."
        bulkInputLabel="Work IDs to delete"
        onConfirm={async ids => {
          console.log('Deleting IDs:', ids);
          await new Promise(resolve => setTimeout(resolve, 1200));
        }}
      />
    </>
  );
};

export const BulkInput: Story = {
  render: () => <BulkInputStory />,
};

const WithErrorStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Delete work</Button>
      <DeleteDialog
        open={open}
        onClose={() => setOpen(false)}
        entityName="work"
        description="This action cannot be undone."
        onConfirm={async () => {
          await new Promise((_, reject) =>
            setTimeout(() => reject(new Error('This work is linked to active delivery schedules and cannot be deleted.')), 1200)
          );
        }}
      />
    </>
  );
};

export const WithError: Story = {
  render: () => <WithErrorStory />,
};
