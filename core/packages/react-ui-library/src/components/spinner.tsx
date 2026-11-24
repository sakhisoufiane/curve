import { Loader2Icon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Spinner({
  className,
  size = 'sm',
  ...props
}: React.ComponentProps<'svg'> & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeMap = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-10',
  };

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(sizeMap[size], 'animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
