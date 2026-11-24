import React from 'react';
import { Button } from '../../components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/dialog';
import { Spinner } from '../../components/spinner';
import { ConfirmationInput } from './ConfirmationInput';
import { useDialogState } from './useDialogState';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms. Return a Promise to show a loading state; throw to show an error. */
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
}

type VariantProps =
  | { variant?: 'standard' }
  | {
      variant: 'confirmation';
      /** The exact string the user must type before the confirm button is enabled. */
      confirmationText: string;
      /** Label above the input. Defaults to `Type "{confirmationText}" to confirm`. */
      confirmationLabel?: string;
    };

export type ConfirmDialogProps = BaseProps & VariantProps;

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    onClose,
    onConfirm,
    title,
    description,
    cancelLabel = 'Cancel',
    confirmLabel = 'Confirm',
  } = props;

  const isConfirmation = props.variant === 'confirmation';
  const confirmationText = isConfirmation ? props.confirmationText : undefined;
  const confirmationLabel = isConfirmation ? props.confirmationLabel : undefined;

  const {
    isLoading,
    error,
    inputValue,
    setInputValue,
    inputRef,
    canConfirm,
    handleClose,
    handleConfirm,
  } = useDialogState({ open, onClose, onConfirm, confirmationText });

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {isConfirmation && confirmationText && (
          <ConfirmationInput
            id="confirm-input"
            confirmationText={confirmationText}
            confirmationLabel={confirmationLabel}
            value={inputValue}
            onChange={value => setInputValue(value)}
            onEnter={handleConfirm}
            isLoading={isLoading}
            canConfirm={canConfirm}
            inputRef={inputRef}
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="relative"
          >
            <span className={isLoading ? 'invisible' : undefined}>{confirmLabel}</span>
            {isLoading && <Spinner className="absolute inset-0 m-auto" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
