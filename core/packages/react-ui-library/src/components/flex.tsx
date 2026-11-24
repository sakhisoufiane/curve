import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const flexVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
    },
    responsive: {
      'mobile-stack': 'flex-col md:flex-row',
      'mobile-center': 'flex-col items-center md:flex-row md:items-start',
      'mobile-between': 'flex-col md:flex-row md:justify-between',
      'mobile-wrap': 'flex-col flex-wrap md:flex-row md:flex-nowrap',
    },
  },
  defaultVariants: {
    direction: 'row',
    justify: 'start',
    align: 'start',
    gap: 'md',
    wrap: 'nowrap',
  },
});

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof flexVariants> {}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction, justify, align, gap, wrap, responsive, ...props }, ref) => {
    return (
      <div
        className={cn(flexVariants({ direction, justify, align, gap, wrap, responsive, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Flex.displayName = 'Flex';

export { Flex, flexVariants };
