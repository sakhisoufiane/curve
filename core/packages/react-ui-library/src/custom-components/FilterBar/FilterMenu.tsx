import React, { useEffect, useRef, useState } from 'react';
import type { NumberOperator } from './types';
import { Check } from 'lucide-react';
import { Skeleton } from '@/components/skeleton';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ActiveFilter, FilterField } from './types';

interface FilterMenuProps {
  fields: FilterField[];
  activeFilters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}

interface FieldSubMenuProps {
  field: FilterField;
  activeFilter: ActiveFilter | null;
  onFilterChange: (filter: ActiveFilter | null) => void;
}

// ── Shared visuals ────────────────────────────────────────────────────────────

function SquareCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
        checked ? 'border-primary bg-primary' : 'border-input'
      )}
    >
      {checked && <Check className="size-3 text-white" strokeWidth={3} />}
    </span>
  );
}

function RadioCircle({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        checked ? 'border-primary' : 'border-input'
      )}
    >
      {checked && <span className="size-1.5 rounded-full bg-primary" />}
    </span>
  );
}

// ── Radio ─────────────────────────────────────────────────────────────────────

function RadioSubMenu({ field, activeFilter, onFilterChange }: FieldSubMenuProps) {
  const currentValue = activeFilter?.values[0] ?? null;
  return (
    <>
      {field.options?.map((opt) => {
        const isChecked = currentValue === opt.value;
        return (
          <DropdownMenuItem
            key={opt.value}
            onSelect={(e) => {
              e.preventDefault();
              onFilterChange(
                isChecked ? null : { fieldId: field.id, operator: 'is', values: [opt.value] }
              );
            }}
            className="gap-2.5 overflow-hidden"
          >
            <RadioCircle checked={isChecked} />
            <span className="truncate min-w-0">{opt.label}</span>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

// ── Multi-select ──────────────────────────────────────────────────────────────

function MultiSelectSubMenu({ field, activeFilter, onFilterChange }: FieldSubMenuProps) {
  const selectedValues = activeFilter?.values ?? [];
  const [search, setSearch] = useState('');
  const isApiDriven = !!field.onSearchChange;

  useEffect(() => {
    field.onSearchChange?.(search);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = isApiDriven
    ? (field.options ?? [])
    : (field.options ?? []).filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="w-72">
      <div className="p-2 border-b border-border">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key !== 'Escape') e.stopPropagation();
          }}
        />
      </div>
      <div className="p-1 max-h-64 overflow-y-auto">
        {field.isLoading ? (
          <div className="space-y-1 p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                <Skeleton className="size-4 rounded-sm shrink-0" />
                <Skeleton className="h-3.5 rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && isApiDriven && !search ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Type to search…</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No results.</p>
        ) : (
          filtered.map((opt) => {
            const isChecked = selectedValues.includes(opt.value);
            return (
              <DropdownMenuItem
                key={opt.value}
                onSelect={(e) => {
                  e.preventDefault();
                  const next = isChecked
                    ? selectedValues.filter((v) => v !== opt.value)
                    : [...selectedValues, opt.value];
                  onFilterChange(
                    next.length === 0
                      ? null
                      : { fieldId: field.id, operator: 'one of', values: next }
                  );
                }}
                className="gap-2.5 overflow-hidden"
              >
                <SquareCheck checked={isChecked} />
                <span className="truncate min-w-0">{opt.label}</span>
              </DropdownMenuItem>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Date ──────────────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 12 months', days: 365 },
] as const;

function getRelativeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0] ?? '';
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const date = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function DateSubMenu({ field, activeFilter, onFilterChange }: FieldSubMenuProps) {
  const customRef = useRef<HTMLInputElement>(null);

  function apply(val: string) {
    onFilterChange(val ? { fieldId: field.id, operator: 'on', values: [val] } : null);
  }

  const isPresetActive = DATE_PRESETS.some(
    ({ days }) =>
      activeFilter?.operator === 'after' && activeFilter?.values[0] === getRelativeDate(days)
  );
  const isCustomActive = !!activeFilter && !isPresetActive;

  return (
    <div className="w-52 p-1">
      {DATE_PRESETS.map(({ label, days }) => {
        const presetDate = getRelativeDate(days);
        const isActive =
          activeFilter?.operator === 'after' && activeFilter?.values[0] === presetDate;
        return (
          <DropdownMenuItem
            key={days}
            onSelect={(e) => {
              e.preventDefault();
              if (isActive) {
                onFilterChange(null);
              } else {
                onFilterChange({ fieldId: field.id, operator: 'after', values: [presetDate] });
              }
            }}
            className={cn(isActive && 'bg-accent font-medium')}
          >
            {label}
          </DropdownMenuItem>
        );
      })}

      <DropdownMenuSeparator className="my-1" />

      <DropdownMenuItem
        onSelect={(e) => e.preventDefault()}
        onClick={() => customRef.current?.showPicker?.()}
        className={cn(isCustomActive && 'bg-accent font-medium')}
      >
        Custom
        {isCustomActive && (
          <span className="ml-auto text-xs text-muted-foreground">
            {formatShortDate(activeFilter!.values[0] ?? '')}
          </span>
        )}
      </DropdownMenuItem>

      <input
        ref={customRef}
        type="date"
        value={isCustomActive ? (activeFilter!.values[0] ?? '') : ''}
        onChange={(e) => apply(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}

// ── Number ────────────────────────────────────────────────────────────────────

const NUMBER_OPERATORS: NumberOperator[] = ['<', '≤', '=', '≥', '>'];

function NumberSubMenu({ field, activeFilter, onFilterChange }: FieldSubMenuProps) {
  const [operator, setOperator] = useState<NumberOperator>(
    (activeFilter?.operator as NumberOperator) ?? '='
  );
  const [value, setValue] = useState(activeFilter?.values[0] ?? '');

  function apply(op: NumberOperator, val: string) {
    onFilterChange(
      val.trim() ? { fieldId: field.id, operator: op, values: [val.trim()] } : null
    );
  }

  function handleOperatorClick(op: NumberOperator) {
    setOperator(op);
    apply(op, value);
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    apply(operator, e.target.value);
  }

  return (
    <div className="w-44 p-2 space-y-2">
      <div className="flex rounded-md border border-input overflow-hidden">
        {NUMBER_OPERATORS.map((op, i) => (
          <button
            key={op}
            type="button"
            onClick={() => handleOperatorClick(op)}
            className={cn(
              'flex-1 py-1 text-xs font-medium transition-colors',
              i > 0 && 'border-l border-input',
              op === operator
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-muted'
            )}
          >
            {op}
          </button>
        ))}
      </div>
      <input
        type="number"
        value={value}
        onChange={handleValueChange}
        placeholder="Value…"
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key !== 'Escape') e.stopPropagation();
        }}
      />
    </div>
  );
}

// ── Menu content ──────────────────────────────────────────────────────────────

export function FilterMenuContent({ fields, activeFilters, onChange }: FilterMenuProps) {
  function handleFilterChange(fieldId: string, filter: ActiveFilter | null) {
    if (!filter) {
      onChange(activeFilters.filter((f) => f.fieldId !== fieldId));
    } else {
      const exists = activeFilters.some((f) => f.fieldId === fieldId);
      onChange(
        exists
          ? activeFilters.map((f) => (f.fieldId === fieldId ? filter : f))
          : [...activeFilters, filter]
      );
    }
  }

  return (
    <DropdownMenuContent align="start" className="w-44 p-1">
      {fields.map((field) => {
        const activeFilter = activeFilters.find((f) => f.fieldId === field.id) ?? null;
        const isActive = activeFilter !== null;
        const Icon = field.icon;

        return (
          <DropdownMenuSub key={field.id}>
            <DropdownMenuSubTrigger
              className={cn('gap-2', isActive && 'font-medium', field.disabled && 'opacity-50 cursor-not-allowed')}
              disabled={field.disabled}
            >
              {Icon && <Icon className="size-4 text-muted-foreground flex-shrink-0" />}
              {field.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {field.type === 'radio' && (
                <RadioSubMenu
                  field={field}
                  activeFilter={activeFilter}
                  onFilterChange={(f) => handleFilterChange(field.id, f)}
                />
              )}
              {field.type === 'multi-select' && (
                <MultiSelectSubMenu
                  field={field}
                  activeFilter={activeFilter}
                  onFilterChange={(f) => handleFilterChange(field.id, f)}
                />
              )}
              {field.type === 'date' && (
                <DateSubMenu
                  field={field}
                  activeFilter={activeFilter}
                  onFilterChange={(f) => handleFilterChange(field.id, f)}
                />
              )}
              {field.type === 'number' && (
                <NumberSubMenu
                  field={field}
                  activeFilter={activeFilter}
                  onFilterChange={(f) => handleFilterChange(field.id, f)}
                />
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      })}
    </DropdownMenuContent>
  );
}
