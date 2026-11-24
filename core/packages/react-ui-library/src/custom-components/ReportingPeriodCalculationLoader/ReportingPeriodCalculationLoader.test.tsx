import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportingPeriodCalculationLoader, type ReportingPeriodCalculationLoaderProps } from './index';

// The consumer owns the stage lists; these mirror the period calculation stages
// and their parallel error labels, used as fixtures across the tests.
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

// The component requires `stages` and `title`; supply sensible defaults so
// each test only states the props it actually cares about.
function renderLoader(props: Partial<ReportingPeriodCalculationLoaderProps> = {}) {
  return render(<ReportingPeriodCalculationLoader stages={CALCULATION_STAGES} title="Calculating period" {...props} />);
}

describe('ReportingPeriodCalculationLoader', () => {
  it('renders the title and all stages as pending when no status is given', () => {
    renderLoader();

    expect(screen.getByText('Calculating period')).toBeInTheDocument();
    for (const stage of CALCULATION_STAGES) {
      expect(screen.getByText(stage)).toBeInTheDocument();
    }
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(screen.queryByText(/steps complete/)).not.toBeInTheDocument();
  });

  it('renders the provided title', () => {
    renderLoader({ title: 'Generating statement' });
    expect(screen.getByText('Generating statement')).toBeInTheDocument();
  });

  it('only renders the stages it is given', () => {
    renderLoader({ stages: CALCULATION_STAGES.slice(0, -1) });
    expect(screen.queryByText('Creating Payee Balances')).not.toBeInTheDocument();
    expect(screen.getByText('Clearing Previous Data')).toBeInTheDocument();
  });

  it('marks the matching stage as active', () => {
    renderLoader({ calculationStatus: 'Calculating Sales' });

    expect(screen.getByText('Calculating Sales')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('matches the stage case-insensitively', () => {
    renderLoader({ calculationStatus: 'calculating sales' });
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('shows a single completed stage expanded when only one is complete', () => {
    // 'Updating Catalogue Data' is index 1, so one stage (index 0) is completed.
    renderLoader({ calculationStatus: 'Updating Catalogue Data' });

    expect(screen.getByText('Clearing Previous Data')).toBeInTheDocument();
    expect(screen.queryByText(/steps complete/)).not.toBeInTheDocument();
  });

  it('collapses completed stages into a summary once two or more are complete', async () => {
    // 'Calculating Costs' is index 2, so two stages (0 and 1) are completed.
    renderLoader({ calculationStatus: 'Calculating Costs' });

    expect(screen.getByText('2 steps complete')).toBeInTheDocument();
    expect(screen.queryByText('Clearing Previous Data')).not.toBeInTheDocument();
    expect(screen.queryByText('Updating Catalogue Data')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show/i }));

    expect(screen.getByText('Clearing Previous Data')).toBeInTheDocument();
    expect(screen.getByText('Updating Catalogue Data')).toBeInTheDocument();
    expect(screen.queryByText('2 steps complete')).not.toBeInTheDocument();
  });

  it('hides the expanded stages again when Hide is clicked', async () => {
    renderLoader({ calculationStatus: 'Calculating Costs' });

    await userEvent.click(screen.getByRole('button', { name: /show/i }));
    await userEvent.click(screen.getByRole('button', { name: /hide/i }));

    expect(screen.getByText('2 steps complete')).toBeInTheDocument();
  });

  describe('error state', () => {
    it('marks the failed stage as errored when the status matches an error label', () => {
      // 'Sales Calculation Errored' is the error label for index 3 ('Calculating Sales').
      renderLoader({
        calculationStatus: 'Sales Calculation Errored',
        errorStages: CALCULATION_ERROR_STAGES,
      });

      expect(screen.getByText('Calculating Sales')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      // The stages before the failure are treated as completed (and collapsed).
      expect(screen.getByText('3 steps complete')).toBeInTheDocument();
      // No stage is spinning once it has errored.
      expect(screen.queryByText('In progress')).not.toBeInTheDocument();
    });

    it('treats the status as active when errorStages is not provided', () => {
      renderLoader({ calculationStatus: 'Calculating Sales' });
      expect(screen.getByText('In progress')).toBeInTheDocument();
      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('is hidden when there is no total', () => {
      renderLoader({ completedCatalogueItems: 5 });
      expect(screen.queryByText('Processed')).not.toBeInTheDocument();
    });

    it('renders the counts and percentage when a total is given', () => {
      renderLoader({ completedCatalogueItems: 25, totalContractsForCalculation: 100 });

      expect(screen.getByText(/25 \/ 100/)).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('uses the default progress label', () => {
      renderLoader({ completedCatalogueItems: 25, totalContractsForCalculation: 100 });
      expect(screen.getByText('Processed')).toBeInTheDocument();
    });

    it('uses a custom progress label when provided', () => {
      renderLoader({
        completedCatalogueItems: 25,
        totalContractsForCalculation: 100,
        progressLabel: 'Contracts processed',
      });
      expect(screen.getByText('Contracts processed')).toBeInTheDocument();
    });

    it('caps the percentage at 100', () => {
      renderLoader({ completedCatalogueItems: 150, totalContractsForCalculation: 100 });
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('process start time', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-06-03T12:00:30Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders the started timestamp and elapsed time', () => {
      renderLoader({ processStartTime: '2026-06-03T12:00:00Z' });

      expect(screen.getByText(/^Started/)).toBeInTheDocument();
      expect(screen.getByText('30s')).toBeInTheDocument();
    });

    it('does not render a start time when none is provided', () => {
      renderLoader();
      expect(screen.queryByText(/^Started/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Elapsed:/)).not.toBeInTheDocument();
    });
  });
});
