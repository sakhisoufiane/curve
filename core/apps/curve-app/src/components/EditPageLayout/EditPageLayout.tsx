import React, { useEffect, useRef, useState } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';
import { Icon, Skeleton, cn } from '@curveroyaltysystems/react-ui-library';

interface EditPageLayoutProps {
  title: string;
  description?: string;
  updatedAt?: string;
  badge?: React.ReactNode;
  helpLink?: string;
  /**
   * Primary action — sits on the far right. Pass a single component (e.g. SaveButton, DownloadButton).
   * The layout handles spacing; no wrapper div or classes needed.
   */
  primaryAction?: React.ReactNode;
  /**
   * Secondary action — sits to the left of primaryAction. Pass a single component (e.g. a MoreVertical DropdownMenu).
   * The layout handles spacing; no wrapper div or classes needed.
   */
  secondaryAction?: React.ReactNode;
  /**
   * Optional metadata row shown below the badge/updatedAt line.
   * Collapses with the subtitle when the user scrolls down.
   * Accepts any ReactNode — typically a 2-column layout of key details (e.g. date range, run info).
   */
  metadata?: React.ReactNode;
  alert?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  /** Blocks all interaction while true — use during save/delete mutations. */
  disabled?: boolean;
  /**
   * react-hook-form instance. When provided, the layout wraps its output in
   * FormProvider so all descendant tab components can call useFormContext().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: UseFormReturn<any>;
}

export const EditPageLayout: React.FC<EditPageLayoutProps> = ({
  title,
  description,
  updatedAt,
  badge,
  helpLink,
  primaryAction,
  secondaryAction,
  metadata,
  alert,
  children,
  isLoading = false,
  disabled = false,
  form,
}) => {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the nearest scrollable ancestor
    let el: HTMLElement | null = containerRef.current?.parentElement ?? null;
    while (el) {
      const { overflowY } = window.getComputedStyle(el);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      el = el.parentElement;
    }
    if (!el) return;

    const scrollEl = el;
    scrollEl.scrollTop = 0;
    compactRef.current = false;
    setCompact(false);

    let prevY = 0;

    const onScroll = () => {
      const y = scrollEl.scrollTop;
      const delta = y - prevY;
      prevY = y;

      // Guard: don't expand from a rubber-band bounce when already at the bottom.
      const atBottom = scrollEl.scrollHeight - scrollEl.clientHeight - y < 4;

      // At top → expand. Scrolling down → compact. Scrolling up (not bounce) → expand.
      const next = y <= 0 ? false : delta > 0 ? true : (delta < 0 && !atBottom) ? false : compactRef.current;

      if (next !== compactRef.current) {
        compactRef.current = next;
        setCompact(next);
      }
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  const hasSubtitle = !!(updatedAt || badge || description);

  const layout = (
    <div ref={containerRef} className={cn('min-h-full flex flex-col', disabled && 'pointer-events-none')}>
      <div
        className={cn(
          'sticky top-0 z-10 bg-background border-b shrink-0 px-6 sm:px-8 transition-[padding] duration-150',
          compact ? 'py-2.5' : 'pt-5 pb-4'
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-1.5 h-4 w-32" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <h1
                    className={cn(
                      'font-semibold tracking-tight transition-[font-size,line-height] duration-150',
                      compact ? 'text-lg' : 'text-2xl'
                    )}
                  >
                    {title}
                  </h1>
                  {compact && badge && React.isValidElement(badge)
                    ? React.cloneElement(badge as React.ReactElement<{ iconOnly?: boolean }>, { iconOnly: true })
                    : null}
                </div>
                {hasSubtitle && (
                  <div
                    className={cn(
                      'flex items-center gap-2 text-sm text-muted-foreground overflow-hidden transition-all duration-150',
                      compact ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100 mt-1'
                    )}
                  >
                    {updatedAt && (
                      <span>
                        Last updated{' '}
                        {new Date(updatedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {updatedAt && badge && <span>·</span>}
                    {badge}
                    {description && <span>{description}</span>}
                  </div>
                )}
                {metadata && (
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-150',
                      compact ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100 mt-2'
                    )}
                  >
                    {metadata}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {helpLink && (
              <a
                href={helpLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon.HelpCircle className="size-3.5" />
                Help &amp; docs
                <Icon.ExternalLink className="size-3 opacity-50" />
              </a>
            )}
            {secondaryAction}
            {primaryAction}
          </div>
        </div>
        {alert && (
          <div
            className={cn(
              'overflow-hidden transition-all duration-150',
              compact ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100 mt-3'
            )}
          >
            {alert}
          </div>
        )}
      </div>
      <div
        className={cn('flex-1 bg-(--page-bg) px-6 sm:px-8 transition-opacity duration-150', disabled && 'opacity-50')}
      >
        <div className="pt-6 pb-12">{children}</div>
      </div>
    </div>
  );

  return form ? <FormProvider {...form}>{layout}</FormProvider> : layout;
};
