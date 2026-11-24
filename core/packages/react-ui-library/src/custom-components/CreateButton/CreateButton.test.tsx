import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateButton } from './CreateButton';

describe('CreateButton', () => {
  it('renders with the correct label', () => {
    render(<CreateButton entityName="Artist" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /new artist/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<CreateButton entityName="Artist" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
