import React from 'react';
import { ClipboardPaste } from 'lucide-react';
import { Button } from '../../components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/dialog';
import { Label } from '../../components/label';
import { Spinner } from '../../components/spinner';
import { Textarea } from '../../components/textarea';
import { ConfirmationInput } from './ConfirmationInput';
import { useDialogState } from './useDialogState';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms. Return a Promise to show a loading state; throw to show an error.
   *  In the bulk variant, receives the textarea value as the first argument. */
  onConfirm: (bulkValue?: string) => Promise<void> | void;

  /** Dialog title. Auto-generated from entityName / count if omitted. */
  title?: string;
  /** Optional body text shown below the title. */
  description?: string;
  /** Singular entity name used in auto-generated title/button text, e.g. "work", "contract". */
  entityName?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Delete button label. Defaults to "Delete" or "Delete {count}". */
  deleteLabel?: string;
}

type VariantProps =
  | { variant?: 'standard' }
  | {
      variant: 'count';
      /** Number of items being deleted — shown in the title and delete button. */
      count: number;
    }
  | {
      variant: 'confirmation';
      /** The exact string the user must type before the delete button is enabled. */
      confirmationText: string;
      /** Label above the input. Defaults to `Type "{confirmationText}" to confirm`. */
      confirmationLabel?: string;
    }
  | {
      variant: 'bulk';
      /** Placeholder text inside the textarea. */
      bulkInputPlaceholder?: string;
      /** Label above the textarea. Defaults to "Paste IDs to delete, one per line". */
      bulkInputLabel?: string;
    };

export type DeleteDialogProps = BaseProps & VariantProps;

export function DeleteDialog(props: DeleteDialogProps) {
  const {
    open,
    onClose,
    onConfirm,
    title,
    description,
    entityName,
    cancelLabel = 'Cancel',
    deleteLabel,
  } = props;

  const isBulk = props.variant === 'bulk';
  const isConfirmation = props.variant === 'confirmation';
  const isCount = props.variant === 'count';

  const confirmationText = isConfirmation ? props.confirmationText : undefined;
  const confirmationLabel = isConfirmation ? props.confirmationLabel : undefined;
  const count = isCount ? props.count : undefined;
  const bulkInputPlaceholder = isBulk ? (props.bulkInputPlaceholder ?? 'WRK-001\nWRK-002\n...') : undefined;
  const bulkInputLabel = isBulk ? props.bulkInputLabel : undefined;

  const {
    isLoading,
    error,
    inputValue,
    setInputValue,
    bulkValue,
    setBulkValue,
    inputRef,
    bulkRef,
    canConfirm,
    handleClose,
    handleConfirm,
    setError,
  } = useDialogState({ open, onClose, onConfirm, confirmationText, isBulk });

  const resolvedTitle =
    title ??
    (count !== undefined && entityName
      ? `Delete ${count} ${entityName}`
      : entityName
        ? `Delete ${entityName}`
        : 'Are you sure?');

  const resolvedDeleteLabel = deleteLabel ?? (count !== undefined ? `Delete ${count}` : 'Delete');

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setBulkValue(text);
      setError(null);
    } catch {
      // Permission denied or not supported — user can paste manually
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <DialogContent className={isBulk ? 'sm:max-w-lg' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {isConfirmation && confirmationText && (
          <ConfirmationInput
            id="delete-confirm-input"
            confirmationText={confirmationText}
            confirmationLabel={confirmationLabel}
            value={inputValue}
            onChange={value => {
              setInputValue(value);
              setError(null);
            }}
            onEnter={handleConfirm}
            isLoading={isLoading}
            canConfirm={canConfirm}
            inputRef={inputRef}
          />
        )}

        {isBulk && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="bulk-delete-input" className="font-normal text-muted-foreground">
                {bulkInputLabel ?? 'Paste IDs to delete, one per line'}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handlePasteFromClipboard}
                tabIndex={-1}
              >
                <ClipboardPaste className="size-3.5" />
                Paste
              </Button>
            </div>
            <Textarea
              ref={bulkRef}
              id="bulk-delete-input"
              value={bulkValue}
              onChange={e => {
                setBulkValue(e.target.value);
                setError(null);
              }}
              placeholder={bulkInputPlaceholder}
              rows={6}
              className="font-mono text-sm resize-none"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="relative"
          >
            <span className={isLoading ? 'invisible' : undefined}>{resolvedDeleteLabel}</span>
            {isLoading && <Spinner className="absolute inset-0 m-auto" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
