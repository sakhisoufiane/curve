import type { Meta, StoryObj } from '@storybook/react';
import { DownloadButton } from '../custom-components/DownloadButton';

const meta = {
  title: 'Actions/DownloadButton',
  component: DownloadButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
      description: 'Visual style of the trigger button.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button and all options.',
    },
  },
} satisfies Meta<typeof DownloadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

// ── Stories ───────────────────────────────────────────────────────────────────

/** Standard usage — multiple download format options. */
export const Default: Story = {
  render: () => (
    <DownloadButton
      options={[
        { label: 'Download as CSV', onClick: noop },
        { label: 'Download as XLSX', onClick: noop },
        { label: 'Download as PDF', onClick: noop },
      ]}
    />
  ),
};

/** Outline variant — used in secondary action contexts. */
export const Outline: Story = {
  render: () => (
    <DownloadButton
      variant="outline"
      options={[
        { label: 'Download as CSV', onClick: noop },
        { label: 'Download as XLSX', onClick: noop },
      ]}
    />
  ),
};

/** Single option — still renders as a dropdown for consistency. */
export const SingleOption: Story = {
  render: () => (
    <DownloadButton
      options={[{ label: 'Download as CSV', onClick: noop }]}
    />
  ),
};

/** One option is unavailable — e.g. PDF generation not yet complete. */
export const WithDisabledOption: Story = {
  render: () => (
    <DownloadButton
      options={[
        { label: 'Download as CSV', onClick: noop },
        { label: 'Download as XLSX', onClick: noop },
        { label: 'Download as PDF', onClick: noop, disabled: true },
      ]}
    />
  ),
};

/** Whole button disabled — e.g. no data available to export. */
export const Disabled: Story = {
  render: () => (
    <DownloadButton
      disabled
      options={[
        { label: 'Download as CSV', onClick: noop },
        { label: 'Download as XLSX', onClick: noop },
      ]}
    />
  ),
};

/** Empty options array — button renders as disabled automatically. */
export const NoOptions: Story = {
  render: () => <DownloadButton options={[]} />,
};

/** In context — alongside other page-level actions. */
export const InContext: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm">
        + New Period
      </button>
      <DownloadButton
        variant="outline"
        options={[
          { label: 'Download as CSV', onClick: noop },
          { label: 'Download as XLSX', onClick: noop },
        ]}
      />
    </div>
  ),
};
