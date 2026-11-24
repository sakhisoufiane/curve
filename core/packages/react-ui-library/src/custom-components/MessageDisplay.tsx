import * as React from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MessageVariant = 'error' | 'success' | 'info' | 'loading';

export interface MessageDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: MessageVariant;
  message: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

const variantStyles = {
  error:
    'bg-[var(--color-curve-danger)]/10 border border-[var(--color-curve-danger)]/30 text-[var(--color-curve-danger)]',
  success:
    'bg-[var(--color-curve-success-lighter)] border border-[var(--color-curve-success-light)] text-[var(--color-curve-success-green)]',
  info: 'bg-[var(--color-curve-complete-lighter)] border border-[var(--color-curve-complete-light)] text-[var(--color-curve-complete-dark)]',
  loading:
    'bg-[var(--color-curve-info-lighter)] border border-[var(--color-curve-info-light)] text-[var(--color-curve-info-dark)]',
};

const variantIcons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  loading: Loader2,
};

export const MessageDisplay = ({
  variant,
  message,
  className,
  showIcon = false,
  children,
  ref,
  ...props
}: MessageDisplayProps) => {
  const Icon = variantIcons[variant];
  const styles = variantStyles[variant];

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-2 p-3 border rounded-md',
        styles,
        variant === 'loading' && 'items-center',
        className
      )}
      {...props}
    >
      <div className={cn('flex items-center gap-2', variant === 'loading' && 'justify-center')}>
        {showIcon && Icon && (
          <Icon className={cn('h-4 w-4 flex-shrink-0', variant === 'loading' && 'animate-spin')} />
        )}
        <p className="text-sm">{message}</p>
      </div>
      {children}
    </div>
  );
};

MessageDisplay.displayName = 'MessageDisplay';
