import { useState } from 'react';
import { cn, Icon } from '@curveroyaltysystems/react-ui-library';
import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  /** When false, the section cannot be collapsed and no chevron is shown. */
  collapsible?: boolean;
}

export function FormSection({
  title,
  description,
  children,
  className,
  defaultOpen = true,
  collapsible = true,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  return (
    <div className={cn('rounded-lg border shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden', className)}>
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
        onKeyDown={
          collapsible
            ? (e) => (e.key === 'Enter' || e.key === ' ') && setOpen((v) => !v)
            : undefined
        }
        className={cn(
          'w-full bg-background px-5 py-3.5 flex items-center justify-between gap-4 text-left',
          collapsible && 'hover:bg-muted/40 transition-colors cursor-pointer',
          isOpen && 'border-b'
        )}
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {collapsible && (
          <Icon.ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform duration-200',
              isOpen ? 'text-muted-foreground/60' : 'text-muted-foreground -rotate-90'
            )}
          />
        )}
      </div>
      {isOpen && <div className="bg-background p-5 space-y-4">{children}</div>}
    </div>
  );
}
