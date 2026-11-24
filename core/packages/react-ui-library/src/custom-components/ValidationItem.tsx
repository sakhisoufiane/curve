import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ValidationItemProps extends React.ComponentProps<'div'> {
  isValid: boolean;
  children: React.ReactNode;
}

export const ValidationItem = ({ isValid, children, className, ref, ...props }: ValidationItemProps) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center gap-2 text-sm',
      isValid ? 'text-[var(--color-curve-success-green)]' : 'text-[var(--color-curve-danger)]',
      className
    )}
    {...props}
  >
    {isValid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
    {children}
  </div>
);
