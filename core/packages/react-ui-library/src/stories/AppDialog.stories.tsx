import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { AppDialog } from '../custom-components/AppDialog';
import { Button } from '../components/button';

const meta = {
  title: 'Dialogs/AppDialog',
  component: AppDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    open: false,
    onClose: () => {},
    title: 'Dialog Title',
    children: null,
  },
} satisfies Meta<typeof AppDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const DefaultStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <AppDialog open={open} onClose={() => setOpen(false)} title="Dialog Title">
        <p className="text-sm">This is the dialog body. Put any content you need here.</p>
      </AppDialog>
    </>
  );
};

export const Default: Story = {
  render: () => <DefaultStory />,
};

const WithFooterStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      <AppDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm Action"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p className="text-sm">Are you sure you want to perform this action? This cannot be undone.</p>
      </AppDialog>
    </>
  );
};

export const WithFooter: Story = {
  render: () => <WithFooterStory />,
};

const WithListStory = () => {
  const [open, setOpen] = useState(false);
  const errors = [
    { message: 'Row 12: Invalid ISRC code' },
    { message: 'Row 34: Missing territory' },
    { message: 'Row 67: Unrecognised artist name' },
  ];
  return (
    <>
      <Button onClick={() => setOpen(true)}>View Errors</Button>
      <AppDialog open={open} onClose={() => setOpen(false)} title="Import Errors">
        <ul className="list-none p-0 m-0 space-y-1 max-h-64 overflow-y-auto">
          {errors.map((error, i) => (
            <li key={i} className="text-sm text-destructive">
              {error.message}
            </li>
          ))}
        </ul>
      </AppDialog>
    </>
  );
};

export const WithList: Story = {
  render: () => <WithListStory />,
};

const WithLinksStory = () => {
  const [open, setOpen] = useState(false);
  const urls = [
    { name: 'Download Report', url: '#' },
    { name: 'View Summary', url: '#' },
  ];
  return (
    <>
      <Button onClick={() => setOpen(true)}>View Downloads</Button>
      <AppDialog open={open} onClose={() => setOpen(false)} title="Export Ready">
        <p className="text-sm text-muted-foreground">Your export has completed. Use the links below to download.</p>
        <ul className="list-none p-0 m-0 space-y-1">
          {urls.map((url) => (
            <li key={url.url}>
              <a href={url.url} className="text-sm hover:underline">
                {url.name}
              </a>
            </li>
          ))}
        </ul>
      </AppDialog>
    </>
  );
};

export const WithLinks: Story = {
  render: () => <WithLinksStory />,
};

const WideStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Wide Dialog</Button>
      <AppDialog open={open} onClose={() => setOpen(false)} title="Wide Dialog" className="max-w-3xl!">
        <p className="text-sm">This dialog uses a wider max-width via the className prop.</p>
      </AppDialog>
    </>
  );
};

export const Wide: Story = {
  render: () => <WideStory />,
};
