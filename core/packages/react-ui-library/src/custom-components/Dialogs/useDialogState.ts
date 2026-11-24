import { useState, useEffect, useRef } from 'react';

interface UseDialogStateOptions {
  open: boolean;
  onClose: () => void;
  onConfirm: (bulkValue?: string) => Promise<void> | void;
  confirmationText?: string;
  isBulk?: boolean;
}

export function useDialogState({
  open,
  onClose,
  onConfirm,
  confirmationText,
  isBulk = false,
}: UseDialogStateOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLTextAreaElement>(null);

  const isConfirmation = !!confirmationText;

  useEffect(() => {
    if (!open) {
      setIsLoading(false);
      setError(null);
      setInputValue('');
      setBulkValue('');
    } else if (isConfirmation) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else if (isBulk) {
      const t = setTimeout(() => bulkRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open, isConfirmation, isBulk]);

  const canConfirm = !confirmationText || inputValue === confirmationText;

  function handleClose() {
    if (isLoading) return;
    onClose();
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(isBulk ? bulkValue : undefined);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    setError,
    inputValue,
    setInputValue,
    bulkValue,
    setBulkValue,
    inputRef,
    bulkRef,
    canConfirm,
    handleClose,
    handleConfirm,
  };
}
