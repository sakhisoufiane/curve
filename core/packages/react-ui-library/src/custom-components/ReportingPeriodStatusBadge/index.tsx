import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const reportingPeriodStatusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      status: {
        Setup: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400',
        Processing: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
        Complete: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
        Errored: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400',
        Deleting: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400',
      },
    },
  }
);

const dotVariants = cva('shrink-0 flex items-center justify-center', {
  variants: {
    status: {
      Setup: 'size-2 rounded-full border border-sky-400 dark:border-sky-500',

      Processing: `
          relative size-2 rounded-full bg-amber-500

          before:absolute
          before:inset-0
          before:rounded-full
          before:bg-amber-400/70
          before:animate-ping
          before:content-['']
        `,

      Complete: 'size-1.5 rounded-full bg-emerald-500',

      Deleting: `
          relative size-2 rounded-full bg-rose-500

          before:absolute
          before:inset-0
          before:rounded-full
          before:bg-rose-400/70
          before:animate-ping
          before:content-['']
        `,

      Errored: `
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
  Setup: 'Setup',
  Processing: 'Processing',
  Complete: 'Complete',
  Errored: 'Errored',
  Deleting: 'Deleting',
};

interface ReportingPeriodStatusBadgeProps extends VariantProps<typeof reportingPeriodStatusBadgeVariants> {
  status: NonNullable<VariantProps<typeof reportingPeriodStatusBadgeVariants>['status']>;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}

function ReportingPeriodStatusBadge({ status, label, iconOnly = false, className }: ReportingPeriodStatusBadgeProps) {
  return (
    <span className={cn(reportingPeriodStatusBadgeVariants({ status }), iconOnly && 'px-1.5 h-5', className)}>
      <span className={cn(dotVariants({ status }))} />
      {!iconOnly && (label ?? DEFAULT_LABELS[status])}
    </span>
  );
}

export { ReportingPeriodStatusBadge, reportingPeriodStatusBadgeVariants };
export type { ReportingPeriodStatusBadgeProps };
