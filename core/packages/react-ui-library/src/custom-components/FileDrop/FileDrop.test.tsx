import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDrop } from './FileDrop';

const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });

function getDropZone(container: HTMLElement) {
  return container.querySelector('input[type="file"] + div') as HTMLElement;
}

describe('FileDrop', () => {
  describe('empty state', () => {
    it('shows the upload prompt', () => {
      render(<FileDrop value={null} onChange={() => {}} accept=".csv" />);
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
    });

    it('renders a badge for each accepted file type', () => {
      render(<FileDrop value={null} onChange={() => {}} accept=".csv,.xlsx,.xls" />);
      expect(screen.getByText('.csv')).toBeInTheDocument();
      expect(screen.getByText('.xlsx')).toBeInTheDocument();
      expect(screen.getByText('.xls')).toBeInTheDocument();
    });
  });

  describe('file selected state', () => {
    it('shows the filename', () => {
      render(<FileDrop value={mockFile} onChange={() => {}} accept=".csv" />);
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });

    it('hides the upload prompt', () => {
      render(<FileDrop value={mockFile} onChange={() => {}} accept=".csv" />);
      expect(screen.queryByText(/click to upload/i)).not.toBeInTheDocument();
    });

    it('calls onChange with null when the remove button is clicked', async () => {
      const onChange = jest.fn();
      render(<FileDrop value={mockFile} onChange={onChange} accept=".csv" />);
      await userEvent.click(screen.getByRole('button', { name: /remove file/i }));
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('file input', () => {
    it('calls onChange with the selected file', () => {
      const onChange = jest.fn();
      const { container } = render(<FileDrop value={null} onChange={onChange} accept=".csv" />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [mockFile] } });
      expect(onChange).toHaveBeenCalledWith(mockFile);
    });

    it('calls onChange with null when selection is cleared', () => {
      const onChange = jest.fn();
      const { container } = render(<FileDrop value={null} onChange={onChange} accept=".csv" />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [] } });
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('drag and drop', () => {
    it('calls onChange with the dropped file', () => {
      const onChange = jest.fn();
      const { container } = render(<FileDrop value={null} onChange={onChange} accept=".csv" />);
      fireEvent.drop(getDropZone(container), {
        dataTransfer: { files: [mockFile] },
      });
      expect(onChange).toHaveBeenCalledWith(mockFile);
    });

    it('does not call onChange when dropped with no files', () => {
      const onChange = jest.fn();
      const { container } = render(<FileDrop value={null} onChange={onChange} accept=".csv" />);
      fireEvent.drop(getDropZone(container), {
        dataTransfer: { files: [] },
      });
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
