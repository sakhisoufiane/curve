import type { Meta, StoryObj } from '@storybook/react';
import { ReportingPeriodStatusBadge } from '../custom-components/ReportingPeriodStatusBadge';

const meta = {
  title: 'Data Display/ReportingPeriodStatusBadge',
  component: ReportingPeriodStatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['Setup', 'Processing', 'Complete', 'Errored', 'Deleting'],
      description: 'The reporting period status to display',
    },
    label: {
      control: 'text',
      description: 'Override the default label for this status',
    },
  },
} satisfies Meta<typeof ReportingPeriodStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: 'Complete',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ReportingPeriodStatusBadge status="Setup" />
        <ReportingPeriodStatusBadge status="Processing" />
        <ReportingPeriodStatusBadge status="Complete" />
        <ReportingPeriodStatusBadge status="Errored" />
        <ReportingPeriodStatusBadge status="Deleting" />
      </div>
    </div>
  ),
};

export const InContext: Story = {
  render: () => (
    <div className="w-80 rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reporting Periods</span>
      </div>
      <div className="divide-y divide-border">
        {[
          { period: 'Q1 2024', status: 'Complete' as const },
          { period: 'Q2 2024', status: 'Complete' as const },
          { period: 'Q3 2024', status: 'Processing' as const },
          { period: 'Q4 2024', status: 'Setup' as const },
          { period: 'Q1 2025', status: 'Errored' as const },
          { period: 'Q2 2025', status: 'Deleting' as const },
        ].map(({ period, status }) => (
          <div key={period} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm">{period}</span>
            <ReportingPeriodStatusBadge status={status} />
          </div>
        ))}
      </div>
    </div>
  ),
};
