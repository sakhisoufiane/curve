import React from 'react';
import { Input } from '../../components/input';
import { Label } from '../../components/label';

interface ConfirmationInputProps {
  id: string;
  confirmationText: string;
  confirmationLabel?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  isLoading: boolean;
  canConfirm: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ConfirmationInput({
  id,
  confirmationText,
  confirmationLabel,
  value,
  onChange,
  onEnter,
  isLoading,
  canConfirm,
  inputRef,
}: ConfirmationInputProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor={id} className="font-normal text-muted-foreground">
        {confirmationLabel ?? (
          <>
            Type <span className="font-mono font-semibold text-foreground">{confirmationText}</span> to confirm
          </>
        )}
      </Label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={e => {
          onChange(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && canConfirm && !isLoading) onEnter();
        }}
        placeholder={confirmationText}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
