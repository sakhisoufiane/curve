import { render, screen } from '@testing-library/react';
import { ReportingPeriodStatusBadge } from './index';

describe('ReportingPeriodStatusBadge', () => {
  it('renders the default label for each status', () => {
    const { rerender } = render(<ReportingPeriodStatusBadge status="Setup" />);
    expect(screen.getByText('Setup')).toBeInTheDocument();

    rerender(<ReportingPeriodStatusBadge status="Processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();

    rerender(<ReportingPeriodStatusBadge status="Complete" />);
    expect(screen.getByText('Complete')).toBeInTheDocument();

    rerender(<ReportingPeriodStatusBadge status="Errored" />);
    expect(screen.getByText('Errored')).toBeInTheDocument();

    rerender(<ReportingPeriodStatusBadge status="Deleting" />);
    expect(screen.getByText('Deleting')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<ReportingPeriodStatusBadge status="Processing" label="Crunching numbers" />);
    expect(screen.getByText('Crunching numbers')).toBeInTheDocument();
    expect(screen.queryByText('Processing')).not.toBeInTheDocument();
  });

  it('hides the label text when iconOnly is set', () => {
    render(<ReportingPeriodStatusBadge status="Complete" iconOnly />);
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
  });

  it('ignores a custom label when iconOnly is set', () => {
    render(<ReportingPeriodStatusBadge status="Complete" iconOnly label="Done" />);
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('applies a forwarded className to the root element', () => {
    render(<ReportingPeriodStatusBadge status="Setup" className="custom-class" />);
    expect(screen.getByText('Setup')).toHaveClass('custom-class');
  });
});
