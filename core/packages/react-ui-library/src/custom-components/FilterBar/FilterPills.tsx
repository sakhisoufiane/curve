import { X } from 'lucide-react';
import { Button } from '@/components/button';
import { ButtonGroup } from '@/components/button-group';
import type { FilterField, ActiveFilter } from './types';

interface FilterPillsProps {
  fields: FilterField[];
  activeFilters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}

function formatOperator(filter: ActiveFilter, field: FilterField): string {
  if (field.type === 'number') return filter.operator;
  return filter.operator === '=' ? 'is' : filter.operator;
}

function formatValues(filter: ActiveFilter, field: FilterField): string {
  if (field.type === 'date' && filter.values[0]) {
    const parts = filter.values[0].split('-').map(Number);
    const date = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (field.type === 'number') return filter.values[0] ?? '';
  return filter.values.map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(', ');
}

export function FilterPills({ fields, activeFilters, onChange }: FilterPillsProps) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted border border-border/50 px-3 py-2 mt-2">
      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {activeFilters.map((filter) => {
          const field = fields.find((f) => f.id === filter.fieldId);
          if (!field) return null;

          return (
            <ButtonGroup key={filter.fieldId}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 cursor-default hover:bg-background"
                tabIndex={-1}
              >
                <span className="font-medium text-foreground">{field.label}</span>
                <span className="text-muted-foreground">{formatOperator(filter, field)}</span>
                <span className="text-foreground">{formatValues(filter, field)}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange(activeFilters.filter((f) => f.fieldId !== filter.fieldId))}
                className="px-2"
                aria-label={`Remove ${field.label} filter`}
              >
                <X className="size-3" />
              </Button>
            </ButtonGroup>
          );
        })}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange([])}
        className="text-xs text-muted-foreground hover:text-foreground px-2 shrink-0"
      >
        Clear all
      </Button>
    </div>
  );
}
