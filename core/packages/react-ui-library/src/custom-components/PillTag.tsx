import React from 'react';
import { cn } from '../lib/utils';

interface PillTagProps {
  label: string;
  className?: string;
}

function PillTag({ label, className }: PillTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-card border border-border/70 px-2 py-1 text-xs font-medium whitespace-nowrap',
        className
      )}
    >
      {label}
    </span>
  );
}

export { PillTag };
export type { PillTagProps };
