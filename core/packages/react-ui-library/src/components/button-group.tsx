import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className }) => (
  <div
    className={cn(
      'flex items-center',
      '[&>*]:rounded-none',
      '[&>*:first-child]:rounded-l-md',
      '[&>*:last-child]:rounded-r-md',
      '[&>*:not(:first-child)]:-ml-px',
      '[&>*]:relative',
      '[&>*:hover]:z-10',
      '[&>*:focus-visible]:z-10',
      '[&>*[data-state=open]]:z-10',
      className,
    )}
  >
    {children}
  </div>
);
