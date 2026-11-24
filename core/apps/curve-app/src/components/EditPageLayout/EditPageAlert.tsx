import React from 'react';
import { Icon, cn } from '@curveroyaltysystems/react-ui-library';

export type EditPageAlertVariant = 'error' | 'warning' | 'info';

export interface EditPageAlertProps {
  variant?: EditPageAlertVariant;
  title: string;
  messages?: string[];
  className?: string;
}

const config = {
  error: {
    bar: 'bg-destructive',
    bg: 'bg-destructive/5 dark:bg-destructive/10',
    border: 'border-destructive/25',
    icon: 'text-destructive',
    title: 'text-destructive',
    description: 'text-destructive/80',
    IconComponent: Icon.AlertCircle,
  },
  warning: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-300/50 dark:border-amber-700/40',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-300',
    description: 'text-amber-700/80 dark:text-amber-400/70',
    IconComponent: Icon.AlertCircle,
  },
  info: {
    bar: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-300/50 dark:border-blue-700/40',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-300',
    description: 'text-blue-700/80 dark:text-blue-400/70',
    IconComponent: Icon.AlertCircle,
  },
} as const;

export const EditPageAlert: React.FC<EditPageAlertProps> = ({
  variant = 'error',
  title,
  messages = [],
  className,
}) => {
  const c = config[variant];
  return (
    <div
      className={cn(
        'flex items-start overflow-hidden rounded-md border text-sm',
        c.bg,
        c.border,
        className,
      )}
    >
      <div className={cn('w-1 self-stretch shrink-0', c.bar)} />
      <div className="flex items-start gap-2.5 px-3.5 py-2.5 min-w-0 flex-1">
        <c.IconComponent className={cn('mt-px size-3.5 shrink-0', c.icon)} />
        <div className="min-w-0">
          <span className={cn('font-medium', c.title)}>{title}</span>
          {messages.length === 1 && (
            <span className={cn('ml-1.5', c.description)}>{messages[0]}</span>
          )}
          {messages.length > 1 && (
            <ul className={cn('mt-0.5 list-disc list-inside space-y-0.5', c.description)}>
              {messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
