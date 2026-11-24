import { cn } from '@curveroyaltysystems/react-ui-library';
import type { ReactNode } from 'react';

interface EditPageTabProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container for a tab's content. Owns the vertical spacing between sections.
 * Skeleton loading, empty states, and layout inside are the tab's own responsibility.
 */
export function EditPageTab({ children, className }: EditPageTabProps) {
  return <div className={cn('flex flex-col gap-8', className)}>{children}</div>;
}
