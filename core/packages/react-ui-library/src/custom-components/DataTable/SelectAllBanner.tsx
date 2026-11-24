import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../../components/button';
import { Separator } from '../../components/separator';

interface SelectAllBannerProps {
  /** Whether the banner is visible at all. */
  show: boolean;
  /** True when the user has confirmed "select all" across all pages. */
  selectAll: boolean;
  /** Number of rows selected on the current page. */
  pageSelectedCount: number;
  /** Total number of rows across all pages. */
  totalCount: number;
  /** Called when the user clicks "Select all N". */
  onSelectAll: () => void;
  /** Called when the user clicks "Clear selection". */
  onClearSelection: () => void;
  /**
   * CSS `left` value used to centre the banner relative to the viewport
   * and sidebar. Computed by the parent from `sidebarCollapsed`.
   */
  bannerLeft: string;
  /**
   * Optional class name forwarded to the outermost element. Use this to
   * override positioning — e.g. in Storybook where there is no sidebar and
   * `fixed` placement will be off-centre.
   */
  className?: string;
}

export function SelectAllBanner({
  show,
  selectAll,
  pageSelectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  bannerLeft,
  className,
}: SelectAllBannerProps) {
  // Keep element in DOM while the exit animation plays, then unmount.
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  if (!mounted) return null;

  return (
    <div
      style={{ left: bannerLeft }}
      data-state={show ? 'open' : 'closed'}
      onAnimationEnd={() => { if (!show) setMounted(false); }}
      className={cn(
        // Positioning
        'fixed bottom-6 -translate-x-1/2 z-50',
        // Layout — overflow-hidden clips the button hover bg to the pill shape
        'flex items-center overflow-hidden rounded-full',
        // Surface
        'bg-background',
        // Layered shadow: ring + lift + ambient depth
        'shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_16px_-4px_rgba(0,0,0,0.14),0_16px_40px_-8px_rgba(0,0,0,0.10)]',
        // tailwindcss-animate: enter/exit keyed on data-state.
        // data-state drives the animation on the same render as show changing —
        // no extra render cycles, no lag on exit.
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2',
        'duration-200 motion-reduce:duration-0',
        className,
      )}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 pl-5 pr-4 py-2.5 text-sm select-none">
        {selectAll && <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} />}
        {selectAll ? (
          <span className="font-semibold tabular-nums">All {totalCount.toLocaleString()} selected</span>
        ) : (
          <span className="tabular-nums">
            <span className="font-semibold">{pageSelectedCount}</span>
            <span className="text-muted-foreground"> of {totalCount.toLocaleString()} selected</span>
          </span>
        )}
      </div>

      {/* Vertical separator */}
      <Separator orientation="vertical" className="h-4!" />

      {/* Action — rounded-r-full is concentric with the outer pill's rounded-full */}
      <Button
        variant="ghost"
        onClick={selectAll ? () => { setMounted(false); onClearSelection(); } : onSelectAll}
        className={cn(
          'h-auto rounded-none rounded-r-full pl-4 pr-5 py-2.5 text-sm font-medium [&_svg]:size-3.5',
          selectAll ? 'text-muted-foreground' : 'text-primary'
        )}
      >
        {selectAll ? (
          <>
            <X strokeWidth={2} />
            Clear selection
          </>
        ) : (
          `Select all ${totalCount.toLocaleString()}`
        )}
      </Button>
    </div>
  );
}
