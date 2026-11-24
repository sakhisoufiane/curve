/* Hallmark · component: FormField · genre: modern-minimal
 * states: default · error · hint · required
 * contrast: pass
 */
import { cn, Label } from '@curveroyaltysystems/react-ui-library';
import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  /** Marks the field as required — shows a red asterisk after the label. */
  required?: boolean;
  /** Helper text shown below the input when there is no error. */
  hint?: string;
  /** Validation error message. Replaces hint when present. */
  error?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Standard form field layout: label above, input slot, then hint or error below.
 * Use for every input/select/textarea — never write the label + spacing manually.
 *
 * For checkbox fields (label beside the input) use CheckboxField instead.
 *
 * @example
 * <FormField label="Title" required error={errors.title?.message}>
 *   <Input {...register('title')} placeholder="Work title" />
 * </FormField>
 */
export function FormField({ label, required, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
