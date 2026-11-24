import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { FileDrop } from '../custom-components/FileDrop';

const meta = {
  title: 'Forms/FileDrop',
  component: FileDrop,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [(Story) => <div className="w-[480px]"><Story /></div>],
} satisfies Meta<typeof FileDrop>;

export default meta;
type Story = StoryObj<typeof meta>;

const DefaultStory = () => {
  const [file, setFile] = useState<File | null>(null);
  return <FileDrop value={file} onChange={setFile} accept=".csv" />;
};

export const Default: Story = {
  render: () => <DefaultStory />,
};

const MultipleFormatsStory = () => {
  const [file, setFile] = useState<File | null>(null);
  return <FileDrop value={file} onChange={setFile} accept=".csv,.xlsx,.xls" />;
};

export const MultipleFormats: Story = {
  render: () => <MultipleFormatsStory />,
};

const WithFileStory = () => {
  const [file, setFile] = useState<File | null>(
    new File(['content'], 'Work Import Template.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  );
  return <FileDrop value={file} onChange={setFile} accept=".xlsx" />;
};

export const WithFile: Story = {
  render: () => <WithFileStory />,
};

const LongFilenameStory = () => {
  const [file, setFile] = useState<File | null>(
    new File(['content'], '(QA Test - Release)_ Publisher Work Export 20260521101033059.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  );
  return <FileDrop value={file} onChange={setFile} accept=".xlsx" />;
};

export const LongFilename: Story = {
  render: () => <LongFilenameStory />,
};
