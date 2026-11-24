import { useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { cn } from '../lib/utils';
import { useEditableList } from '../hooks/useEditableList';
import { EditableListShell } from './EditableListShell';

interface EditableListProps {
  /** Section title shown above the list. Defaults to "Aliases". */
  title?: string;
  /** Optional helper text displayed below the title. */
  description?: string;
  /**
   * Label for the item type — used in the add button and input placeholder.
   * Defaults to "Alias".
   */
  itemLabel?: string;
  /** Override the input placeholder. Defaults to "Enter {itemLabel} name". */
  placeholder?: string;
  /** Controlled list of string values. */
  value: string[];
  /** Called whenever the list changes (item added, removed, or edited). */
  onChange: (value: string[]) => void;
  /** Disables all interactions. */
  disabled?: boolean;
  className?: string;
}

function EditableList({
  title = 'Aliases',
  description,
  itemLabel = 'Alias',
  placeholder,
  value,
  onChange,
  disabled,
  className,
}: EditableListProps) {
  const resolvedPlaceholder = placeholder ?? `Enter ${itemLabel.toLowerCase()} name`;

  const createEmpty = useCallback(() => '', []);

  const { handleAdd, handleUpdate, handleRemove, rowRefs } = useEditableList({
    value,
    onChange,
    createEmpty,
  });

  return (
    <EditableListShell
      title={title}
      description={description}
      itemLabel={itemLabel}
      itemCount={value.length}
      disabled={disabled}
      onAdd={handleAdd}
      className={className}
    >
      {value.length === 0 && (
        <div className="rounded-md border border-dashed py-6 text-center">
          <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet</p>
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div
              key={index}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              className="group flex items-center gap-2"
            >
              <Input
                value={item}
                onChange={(e) => handleUpdate(index, e.target.value)}
                placeholder={resolvedPlaceholder}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                aria-label={`Remove ${itemLabel.toLowerCase()}`}
                className={cn(
                  'shrink-0 text-muted-foreground transition-opacity duration-150 hover:bg-destructive/10 hover:text-destructive',
                  disabled
                    ? 'opacity-50'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                )}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </EditableListShell>
  );
}

export { EditableList };
export type { EditableListProps };
