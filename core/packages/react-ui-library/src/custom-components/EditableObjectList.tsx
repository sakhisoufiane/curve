import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/select';
import { Spinner } from '../components/spinner';
import { cn } from '../lib/utils';
import { useEditableList } from '../hooks/useEditableList';
import { EditableListShell } from './EditableListShell';

// ─── Public types ─────────────────────────────────────────────────────────────

/** A selectable option used by async-search and select columns. */
export interface Option {
  value: string;
  label: string;
}

type BaseColumn<T> = {
  /** The key in the row object this column maps to. */
  key: keyof T;
  /** Column header label and aria text. */
  label: string;
  /**
   * Flex weight for column width. Defaults to 1 (equal columns).
   * E.g. `flex: 2` makes this column twice as wide as a `flex: 1` column.
   */
  flex?: number;
  /** Show a required indicator (*) and validate on blur. */
  required?: boolean;
};

export type ColumnDef<T> = BaseColumn<T> &
  (
    | {
        type: 'text';
        placeholder?: string;
        defaultValue?: string;
      }
    | {
        type: 'number';
        min?: number;
        max?: number;
        placeholder?: string;
        defaultValue?: number;
      }
    | {
        type: 'select';
        placeholder?: string;
        defaultValue?: Option | null;
        /** Static option list. Provide either this or fetchOptions (or both). */
        options?: Option[];
        /** Called once on mount to load options from an API. */
        fetchOptions?: () => Promise<Option[]>;
      }
    | {
        type: 'async-search';
        placeholder?: string;
        defaultValue?: Option | null;
        /** Called on each debounced keystroke. Must return matching options. */
        fetchOptions: (query: string) => Promise<Option[]>;
        /** Debounce delay in ms. Defaults to 300. */
        debounceMs?: number;
      }
  );

export interface EditableObjectListProps<T extends Record<string, unknown>> {
  /** Section title shown in the card header. */
  title?: string;
  /** Optional helper text shown below the title. */
  description?: string;
  /** Label for each row — used in the add button and delete aria-label. */
  itemLabel?: string;
  /** Column definitions. Drives headers, inputs, flex widths, and validation. */
  columns: ColumnDef<T>[];
  /** Controlled list of row objects. */
  value: T[];
  /** Called whenever the list changes. */
  onChange: (value: T[]) => void;
  /** Disables all interactions. */
  disabled?: boolean;
  /**
   * External (e.g. server-side) errors keyed by row index then column key.
   * These are shown alongside inline validation errors.
   */
  rowErrors?: Record<number, Partial<Record<keyof T, string>>>;
  /** Strips the card shell so the list sits inline within a parent container. */
  bare?: boolean;
  /** Custom empty state message. Defaults to "No {itemLabel}s yet". */
  emptyMessage?: string;
  className?: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function createEmptyRow<T extends Record<string, unknown>>(columns: ColumnDef<T>[]): T {
  return Object.fromEntries(
    columns.map((col) => {
      let blank: unknown;
      if ('defaultValue' in col && col.defaultValue !== undefined) {
        blank = col.defaultValue;
      } else if (col.type === 'text') {
        blank = '';
      } else if (col.type === 'number') {
        blank = 0;
      } else {
        blank = null; // select, async-search
      }
      return [col.key, blank];
    })
  ) as T;
}

// ─── Cell inputs ──────────────────────────────────────────────────────────────

// TextCell ────────────────────────────────────────────────────────────────────

interface TextCellProps {
  column: Extract<ColumnDef<Record<string, unknown>>, { type: 'text' }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function TextCell({ column, value, onChange, error: externalError, disabled }: TextCellProps) {
  const [touched, setTouched] = React.useState(false);
  const localError = touched && column.required && !value.trim() ? 'Required' : undefined;
  const error = externalError ?? localError;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={column.placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// NumberCell ──────────────────────────────────────────────────────────────────

interface NumberCellProps {
  column: Extract<ColumnDef<Record<string, unknown>>, { type: 'number' }>;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  disabled?: boolean;
}

function NumberCell({ column, value, onChange, error: externalError, disabled }: NumberCellProps) {
  const [touched, setTouched] = React.useState(false);

  const localError = React.useMemo(() => {
    if (!touched) return undefined;
    const isEmpty = value === undefined || value === null || isNaN(value);
    if (column.required && isEmpty) return 'Required';
    if (!isEmpty) {
      if (column.min !== undefined && value < column.min) return `Minimum value is ${column.min}`;
      if (column.max !== undefined && value > column.max) return `Maximum value is ${column.max}`;
    }
    return undefined;
  }, [touched, value, column]);

  const error = externalError ?? localError;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Input
        type="number"
        value={isNaN(value) || value === undefined ? '' : value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        onBlur={() => setTouched(true)}
        placeholder={column.placeholder}
        min={column.min}
        max={column.max}
        disabled={disabled}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// SelectCell ──────────────────────────────────────────────────────────────────

interface SelectCellProps {
  column: Extract<ColumnDef<Record<string, unknown>>, { type: 'select' }>;
  value: Option | null;
  onChange: (value: Option | null) => void;
  error?: string;
  disabled?: boolean;
}

function SelectCell({ column, value, onChange, error: externalError, disabled }: SelectCellProps) {
  const [options, setOptions] = React.useState<Option[]>(column.options ?? []);
  const [touched, setTouched] = React.useState(false);

  const { fetchOptions } = column;
  React.useEffect(() => {
    if (!fetchOptions) return;
    fetchOptions()
      .then(setOptions)
      .catch(() => {});
  }, [fetchOptions]);

  const localError = touched && column.required && !value ? 'Required' : undefined;
  const error = externalError ?? localError;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Select
        value={value?.value ?? ''}
        onValueChange={(v) => {
          const opt = options.find((o) => o.value === v);
          onChange(opt ?? null);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          onBlur={() => setTouched(true)}
          aria-invalid={!!error}
          className={cn('w-full', error && 'border-destructive focus:ring-destructive')}
        >
          <SelectValue placeholder={column.placeholder ?? 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// AsyncSearchCell ─────────────────────────────────────────────────────────────

interface AsyncSearchCellProps {
  column: Extract<ColumnDef<Record<string, unknown>>, { type: 'async-search' }>;
  value: Option | null;
  onChange: (value: Option | null) => void;
  error?: string;
  disabled?: boolean;
}

function AsyncSearchCell({ column, value, onChange, error: externalError, disabled }: AsyncSearchCellProps) {
  const [inputText, setInputText] = React.useState(value?.label ?? '');
  const [options, setOptions] = React.useState<Option[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [touched, setTouched] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync display text when value is set externally (e.g. pre-loaded rows)
  React.useEffect(() => {
    setInputText(value?.label ?? '');
  }, [value?.label]);

  const runSearch = React.useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!query.trim()) {
        setOptions([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await column.fetchOptions(query);
          setOptions(results);
          setHighlightedIndex(-1);
        } catch {
          setOptions([]);
        } finally {
          setIsLoading(false);
        }
      }, column.debounceMs ?? 300);
    },
    [column]
  );

  const handleSelect = React.useCallback(
    (opt: Option) => {
      onChange(opt);
      setInputText(opt.label);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    setIsOpen(true);
    if (!text.trim()) {
      // Clearing the input clears the selection
      onChange(null);
    }
    runSearch(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && options[highlightedIndex]) {
      e.preventDefault();
      handleSelect(options[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(value?.label ?? '');
    }
  };

  const handleFocus = () => {
    // Re-open dropdown if there are previous results to show
    if (options.length > 0 || isLoading) setIsOpen(true);
  };

  // Close when focus leaves the container entirely
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
      setTouched(true);
      // Revert display text to current value's label if user didn't select anything new
      setInputText(value?.label ?? '');
    }
  };

  const localError = touched && column.required && !value ? 'Required' : undefined;
  const error = externalError ?? localError;
  const showDropdown = isOpen && (isLoading || options.length > 0);

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-col gap-1" onBlur={handleBlur}>
      <Input
        value={inputText}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={column.placeholder ?? 'Type to search...'}
        disabled={disabled}
        aria-invalid={!!error}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        autoComplete="off"
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />

      {showDropdown && (
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md"
        >
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Spinner size="md" />
            </div>
          )}
          {!isLoading &&
            options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={value?.value === opt.value}
                className={cn(
                  'flex w-full items-center px-2 py-1.5 text-left text-sm outline-none',
                  i === highlightedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                  value?.value === opt.value && 'font-medium'
                )}
                // Prevent the input from losing focus before the click registers
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {opt.label}
              </button>
            ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── ColumnInput dispatcher ───────────────────────────────────────────────────

interface ColumnInputProps<T extends Record<string, unknown>> {
  column: ColumnDef<T>;
  value: T[keyof T];
  onChange: (value: T[keyof T]) => void;
  error?: string;
  disabled?: boolean;
}

function ColumnInput<T extends Record<string, unknown>>({
  column,
  value,
  onChange,
  error,
  disabled,
}: ColumnInputProps<T>) {
  if (column.type === 'text') {
    return (
      <TextCell
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        column={column as any}
        value={(value as string) ?? ''}
        onChange={onChange as (v: string) => void}
        error={error}
        disabled={disabled}
      />
    );
  }
  if (column.type === 'number') {
    return (
      <NumberCell
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        column={column as any}
        value={(value as number) ?? 0}
        onChange={onChange as (v: number) => void}
        error={error}
        disabled={disabled}
      />
    );
  }
  if (column.type === 'select') {
    return (
      <SelectCell
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        column={column as any}
        value={(value as Option | null) ?? null}
        onChange={onChange as (v: Option | null) => void}
        error={error}
        disabled={disabled}
      />
    );
  }
  if (column.type === 'async-search') {
    return (
      <AsyncSearchCell
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        column={column as any}
        value={(value as Option | null) ?? null}
        onChange={onChange as (v: Option | null) => void}
        error={error}
        disabled={disabled}
      />
    );
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

function EditableObjectList<T extends Record<string, unknown>>({
  title = 'Items',
  description,
  itemLabel = 'Item',
  columns,
  value,
  onChange,
  disabled,
  rowErrors,
  bare = false,
  emptyMessage,
  className,
}: EditableObjectListProps<T>) {
  const createEmpty = React.useCallback(() => createEmptyRow(columns), [columns]);

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
      bare={bare}
      className={className}
    >
      {/* Column headers — hidden in bare single-column mode or when no rows exist */}
      {!(bare && columns.length === 1) && value.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          {columns.map((col) => (
            <span
              key={String(col.key)}
              style={{ flex: col.flex ?? 1, minWidth: 0 }}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {col.label}
              {col.required && (
                <span className="ml-0.5 text-destructive" aria-hidden="true">
                  *
                </span>
              )}
            </span>
          ))}
          {/* Spacer matching the delete button width (size-icon = w-9) */}
          <div className="w-9 shrink-0" />
        </div>
      )}

      {/* Empty state */}
      {value.length === 0 && (
        <div className="rounded-md border border-dashed py-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage ?? `No ${itemLabel.toLowerCase()}s yet`}</p>
        </div>
      )}

      {/* Rows */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((row, rowIndex) => (
            <div
              key={rowIndex}
              ref={(el) => {
                rowRefs.current[rowIndex] = el;
              }}
              className="group flex items-start gap-2"
            >
              {columns.map((col) => (
                <div key={String(col.key)} style={{ flex: col.flex ?? 1, minWidth: 0 }}>
                  <ColumnInput
                    column={col}
                    value={row[col.key]}
                    onChange={(newValue) => handleUpdate(rowIndex, { ...row, [col.key]: newValue } as T)}
                    error={rowErrors?.[rowIndex]?.[col.key] as string | undefined}
                    disabled={disabled}
                  />
                </div>
              ))}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(rowIndex)}
                disabled={disabled}
                aria-label={`Remove ${itemLabel.toLowerCase()}`}
                className={cn(
                  'shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                  disabled && 'opacity-50'
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

export { EditableObjectList };
