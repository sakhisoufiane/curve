import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      status: {
        valid: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
        incomplete: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
        inactive: 'bg-card border border-border/70 text-muted-foreground',
        approved: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
        approvedOnHold: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
        readyForApproval: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
        invalid: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
      },
    },
  }
);

const dotVariants = cva('shrink-0 flex items-center justify-center', {
  variants: {
    status: {
      valid: 'size-1.5 rounded-full bg-emerald-500',

      approved: 'size-1.5 rounded-full bg-emerald-500',

      incomplete: 'h-0.5 w-2 rounded-full bg-amber-400',

      readyForApproval: 'h-0.5 w-2 rounded-full bg-amber-400',

      inactive: `
          size-2 rounded-full
          border border-muted-foreground/40
        `,

      approvedOnHold: `
          relative size-2 rounded-full bg-emerald-500

          before:absolute
          before:left-[35%]
          before:h-1.5
          before:w-px
          before:bg-white
          before:content-['']

          after:absolute
          after:right-[35%]
          after:h-1.5
          after:w-px
          after:bg-white
          after:content-['']
        `,

      invalid: `
          relative size-2 rounded-full bg-red-500

          before:absolute
          before:h-px
          before:w-1.5
          before:rotate-45
          before:bg-white
          before:content-['']

          after:absolute
          after:h-px
          after:w-1.5
          after:-rotate-45
          after:bg-white
          after:content-['']
        `,
    },
  },
});

const DEFAULT_LABELS: Record<string, string> = {
  valid: 'Valid',
  incomplete: 'Incomplete',
  inactive: 'Inactive',
  approved: 'Approved',
  approvedOnHold: 'On Hold',
  readyForApproval: 'Ready for Approval',
  invalid: 'Invalid',
};

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: NonNullable<VariantProps<typeof statusBadgeVariants>['status']>;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}

function StatusBadge({ status, label, iconOnly = false, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), iconOnly && 'px-1.5 h-5', className)}>
      <span className={cn(dotVariants({ status }))} />
      {!iconOnly && (label ?? DEFAULT_LABELS[status])}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
