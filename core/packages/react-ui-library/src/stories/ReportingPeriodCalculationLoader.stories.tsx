import type { Meta, StoryObj } from '@storybook/react';
import { ReportingPeriodCalculationLoader } from '../custom-components/ReportingPeriodCalculationLoader';

// The consumer owns the stage lists — these are example fixtures for the stories.
// In a real app these come from the backend / feature config.
const CALCULATION_STAGES = [
  'Clearing Previous Data',
  'Updating Catalogue Data',
  'Calculating Costs',
  'Calculating Sales',
  'Flushing Catalogue Data to Output',
  'Getting Period Data',
  'Creating Period Files',
  'Creating Statements',
  'Setting Statement Data',
  'Creating Statement Files',
  'Creating Zip of All Statements',
  'Creating Payee Balances',
] as const;

const CALCULATION_ERROR_STAGES = [
  'Errored in Clearing Previous Data',
  'Errored in Updating Catalogue Data',
  'Costs Calculation Errored',
  'Sales Calculation Errored',
  'Flushing Catalogue Data to Output Errored',
  'Errored In Getting Period Data',
  'Errored In Creating Period Files',
  'Errored in Creating Statements',
  'Errored in Getting Statement Data',
  'Creating Statement Files Errored',
  'Errored Creating Zip of All Statements',
  'Errored in Creating Payee Balances',
] as const;

const meta = {
  title: 'Data Display/ReportingPeriodCalculationLoader',
  component: ReportingPeriodCalculationLoader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    stages: CALCULATION_STAGES,
    title: 'Calculating period',
  },
  argTypes: {
    stages: {
      control: false,
      description:
        'Ordered stage labels to render. Required — the consumer owns this list and slices or extends it per feature flags.',
    },
    title: {
      control: 'text',
      description: 'Heading above the stepper, e.g. "Calculating period" or "Generating statement".',
    },
    calculationStatus: {
      control: 'select',
      options: [undefined, ...CALCULATION_STAGES],
      description:
        'Current status from the backend. Matched against `stages` (active step) and `errorStages` (failed step).',
    },
    errorStages: {
      control: false,
      description:
        'Optional error labels parallel to `stages`. When `calculationStatus` matches one, that stage renders as failed.',
    },
    processStartTime: {
      control: 'text',
      description: 'ISO datetime when the process started.',
    },
    completedCatalogueItems: {
      control: { type: 'number', min: 0 },
      description: 'Items processed so far.',
    },
    totalContractsForCalculation: {
      control: { type: 'number', min: 0 },
      description: 'Total items in this run. Progress bar hidden when 0.',
    },
    progressLabel: {
      control: 'text',
      description: 'Label above the progress bar. Defaults to "Processed".',
    },
  },
} satisfies Meta<typeof ReportingPeriodCalculationLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helpers — computed at render time so the elapsed counter starts at a
// realistic value and ticks up naturally while the story is open.
const secondsAgo = (n: number) => new Date(Date.now() - n * 1000).toISOString();
const minutesAgo = (n: number) => secondsAgo(n * 60);

// ── Period stories ──────────────────────────────────────────────────────────

/** Calculation has just been kicked off — all stages pending, no progress data yet. */
export const JustStarted: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES}
      title="Calculating period"
      processStartTime={secondsAgo(8)}
    />
  ),
};

/** Mid-way through — "Calculating Sales" is active, ~4.5 minutes in. */
export const InProgress: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES}
      title="Calculating period"
      calculationStatus="Calculating Sales"
      processStartTime={minutesAgo(4.5)}
      completedCatalogueItems={4820}
      totalContractsForCalculation={10000}
      progressLabel="Contracts processed"
    />
  ),
};

/** Near the end — generating output files, ~12 minutes in. */
export const NearlyDone: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES}
      title="Calculating period"
      calculationStatus="Creating Statement Files"
      processStartTime={minutesAgo(12)}
      completedCatalogueItems={9750}
      totalContractsForCalculation={10000}
      progressLabel="Contracts processed"
    />
  ),
};

/** Final stage running, ~18 minutes in. */
export const FinalStage: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES}
      title="Calculating period"
      calculationStatus="Creating Payee Balances"
      processStartTime={minutesAgo(18)}
      completedCatalogueItems={10000}
      totalContractsForCalculation={10000}
      progressLabel="Contracts processed"
    />
  ),
};

/** Long-running job, over an hour elapsed — verifies the Xh Ym Zs format. */
export const LongRunning: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES}
      title="Calculating period"
      calculationStatus="Creating Statements"
      processStartTime={minutesAgo(83)}
      completedCatalogueItems={7200}
      totalContractsForCalculation={12000}
      progressLabel="Contracts processed"
    />
  ),
};

/** A client without the payeeBalances feature — the final stage is sliced off the list. */
export const WithoutPayeeBalances: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES.slice(0, -1)}
      title="Calculating period"
      calculationStatus="Creating Zip of All Statements"
      processStartTime={minutesAgo(15)}
      completedCatalogueItems={10000}
      totalContractsForCalculation={10000}
      progressLabel="Contracts processed"
    />
  ),
};

// ── Statement stories ─────────────────────────────────────────────────────────

/** Same stepper reused for a single statement — different title, no progress bar. */
export const Statement: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES}
      title="Generating statement"
      calculationStatus="Creating Statements"
      processStartTime={minutesAgo(1.5)}
    />
  ),
};

// ── Error stories ─────────────────────────────────────────────────────────────

/** A stage failed — `calculationStatus` matched an `errorStages` label, so that
 *  step shows a red cross and the header switches to a failed state. */
export const Errored: Story = {
  render: () => (
    <ReportingPeriodCalculationLoader
      stages={CALCULATION_STAGES}
      errorStages={CALCULATION_ERROR_STAGES}
      title="Calculating period"
      calculationStatus="Sales Calculation Errored"
      processStartTime={minutesAgo(3)}
      completedCatalogueItems={2100}
      totalContractsForCalculation={10000}
      progressLabel="Contracts processed"
    />
  ),
};

// ── Playground ──────────────────────────────────────────────────────────────

/** Interactive playground — use the controls panel to explore all props.
 *  Note: processStartTime in the controls panel accepts an ISO string. */
export const Playground: Story = {
  args: {
    stages: CALCULATION_STAGES,
    title: 'Calculating period',
    calculationStatus: 'Creating Statements',
    processStartTime: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    completedCatalogueItems: 7200,
    totalContractsForCalculation: 12000,
    progressLabel: 'Contracts processed',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use the Controls panel below to try different stages and progress values. Set processStartTime to an ISO string to control the elapsed display.',
      },
    },
  },
};
