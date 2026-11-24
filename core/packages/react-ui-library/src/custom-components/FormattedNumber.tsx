import { cn } from '@/lib/utils';

export interface FormattedNumberProps {
  /** The numeric value to display. Renders `fallback` when null or undefined. */
  value: number | null | undefined;
  /**
   * Fixed decimal places applied to both minimum and maximum fraction digits.
   * Defaults to `2`. Pass `0` for integers.
   */
  decimalPlaces?: number;
  /**
   * Rendered when `value` is null or undefined.
   * Defaults to `'—'`.
   */
  fallback?: string;
  /** Optional string appended after the formatted number, e.g. `'%'`. */
  suffix?: string;
  className?: string;
}

export function FormattedNumber({ value, decimalPlaces = 2, fallback = '—', suffix, className }: FormattedNumberProps) {
  if (value == null) {
    return <span className={cn('text-muted-foreground', className)}>{fallback}</span>;
  }

  const formatted = value.toLocaleString('en-GB', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <span className={cn('tabular-nums', className)}>
      {formatted}
      {suffix}
    </span>
  );
}
