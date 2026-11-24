import { cn } from '@curveroyaltysystems/react-ui-library';
import type { ReactNode } from 'react';

type Cols = 2 | 3 | 4;

interface FormGridProps {
  cols?: Cols;
  children: ReactNode;
  className?: string;
}

const colsClass: Record<Cols, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-4',
};

/**
 * Column layout for form fields inside a FormSection.
 * Stacks to a single column on small screens.
 *
 * @example
 * <FormGrid cols={2}>
 *   <FormField label="Title"><Input /></FormField>
 *   <FormField label="Foreign ID"><Input /></FormField>
 * </FormGrid>
 */
export function FormGrid({ cols = 2, children, className }: FormGridProps) {
  return <div className={cn('grid gap-5', colsClass[cols], className)}>{children}</div>;
}
