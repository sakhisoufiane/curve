import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ImportDialog } from '../custom-components/ImportDialog';
import { ImportButton } from '../custom-components/ImportButton';
import { Checkbox } from '../components/checkbox';
import { Label } from '../components/label';
import { HelpTooltip } from '../custom-components/HelpTooltip';

const meta = {
  title: 'Dialogs/ImportDialog',
  component: ImportDialog,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ImportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const DefaultStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ImportButton onClick={() => setOpen(true)} />
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        entityName="Works"
        accept=".csv,.xlsx"
        onImport={async () => new Promise((resolve) => setTimeout(resolve, 1500))}
      />
    </>
  );
};

export const Default: Story = {
  render: () => <DefaultStory />,
};

const WithDescriptionStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ImportButton onClick={() => setOpen(true)} />
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        entityName="Works"
        accept=".csv,.xlsx"
        description="If the data in this import file contains changes to Title, Territory or IP Chain, this import will trigger re-delivery of those Works if you have active Delivery Schedules set up."
        onImport={async () => new Promise((resolve) => setTimeout(resolve, 1500))}
      />
    </>
  );
};

export const WithDescription: Story = {
  render: () => <WithDescriptionStory />,
};

const WithDownloadTemplateStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ImportButton onClick={() => setOpen(true)} />
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        entityName="Works"
        accept=".xlsx"
        templateName="Work Import Template.xlsx"
        onImport={async () => new Promise((resolve) => setTimeout(resolve, 1500))}
        onDownloadTemplate={async () => new Blob(['col1,col2'], { type: 'text/csv' })}
      />
    </>
  );
};

export const WithDownloadTemplate: Story = {
  render: () => <WithDownloadTemplateStory />,
};

const WithOptionsStory = () => {
  const [open, setOpen] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  return (
    <>
      <ImportButton onClick={() => setOpen(true)} />
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        entityName="Works"
        accept=".csv,.xlsx"
        description="If the data in this import file contains changes to Title, Territory or IP Chain, this import will trigger re-delivery of those Works if you have active Delivery Schedules set up."
        templateName="Work Import Template.xlsx"
        onImport={async () => new Promise((resolve) => setTimeout(resolve, 1500))}
        onDownloadTemplate={async () => new Blob(['col1,col2'], { type: 'text/csv' })}
      >
        <div className="flex items-center gap-2">
          <Checkbox
            id="overwrite"
            checked={overwrite}
            onCheckedChange={(v) => setOverwrite(v === true)}
          />
          <Label htmlFor="overwrite">Overwrite blank values</Label>
          <HelpTooltip text="Blank values in the template will overwrite and delete existing data when this box is checked." />
        </div>
      </ImportDialog>
    </>
  );
};

export const WithOptions: Story = {
  render: () => <WithOptionsStory />,
};

const WithErrorStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ImportButton onClick={() => setOpen(true)} />
      <ImportDialog
        open={open}
        onClose={() => setOpen(false)}
        entityName="Works"
        accept=".csv"
        onImport={async () => {
          await new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Row 12: Invalid ISRC format. Row 34: Missing territory.')), 1500)
          );
        }}
      />
    </>
  );
};

export const WithError: Story = {
  render: () => <WithErrorStory />,
};
