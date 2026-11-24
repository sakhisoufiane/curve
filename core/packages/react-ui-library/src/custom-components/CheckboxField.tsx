import type { ReactNode } from 'react';
import { Checkbox } from '../components/checkbox';
import { cn } from '../lib/utils';

export interface CheckboxFieldProps {
  id: string;
  label: ReactNode;
  /** Optional supporting text rendered below the label. */
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A checkbox with a label beside it (and optional description below the label).
 * Presentational and controlled — wire it to your form state via
 * `checked` / `onCheckedChange`.
 *
 * @example
 * <CheckboxField
 *   id="priority"
 *   label="Priority"
 *   description="Flag this work as high priority."
 *   checked={priority}
 *   onCheckedChange={(v) => setValue('priority', v)}
 * />
 */
export function CheckboxField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: CheckboxFieldProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
