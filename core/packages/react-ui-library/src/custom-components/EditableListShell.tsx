import { Plus } from 'lucide-react';
import { Button } from '../components/button';
import { Separator } from '../components/separator';
import { cn } from '../lib/utils';

interface EditableListShellProps {
  /** Section title shown in the card header. */
  title?: string;
  /** Optional helper text shown below the title. */
  description?: string;
  /** Label for the item type — used in the add button. */
  itemLabel?: string;
  /** Current item count — drives the count badge and add-button spacing. */
  itemCount: number;
  /** Disables the add button. */
  disabled?: boolean;
  /** Called when the add button is clicked. */
  onAdd: () => void;
  /**
   * Strips the card shell (border, background, header, separator) so the list
   * sits inline within a parent container like a FormSection.
   */
  bare?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Shared visual shell for editable list components.
 * Renders the card wrapper, header (title, description, count badge),
 * separator, content area, and add button.
 * The caller supplies the row content (and any empty state) via children.
 */
function EditableListShell({
  title = 'Items',
  description,
  itemLabel = 'Item',
  itemCount,
  disabled,
  onAdd,
  bare = false,
  className,
  children,
}: EditableListShellProps) {
  if (bare) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {children}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdd}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground px-0 hover:bg-transparent"
          >
            <Plus />
            Add {itemLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card shadow-sm', className)}>
      {/* Header — title, description, count badge */}
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {itemCount > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {itemCount}
          </span>
        )}
      </div>

      <Separator />

      {/* Content — rows, empty state, and add button supplied by parent */}
      <div className="p-5">
        {children}
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          disabled={disabled}
          className={cn('text-muted-foreground hover:text-foreground', itemCount === 0 ? 'mt-4' : 'mt-3')}
        >
          <Plus />
          Add {itemLabel}
        </Button>
      </div>
    </div>
  );
}

export { EditableListShell };
export type { EditableListShellProps };
