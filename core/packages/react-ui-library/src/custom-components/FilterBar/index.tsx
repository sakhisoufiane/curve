import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/button';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/dropdown-menu';
import { cn } from '@/lib/utils';
import { FilterMenuContent } from './FilterMenu';
import { FilterPills } from './FilterPills';
import type { FilterBarProps } from './types';

export { FilterPills } from './FilterPills';

export function FilterBar({
  fields,
  activeFilters,
  onChange,
  showPills = true,
}: FilterBarProps & { showPills?: boolean }) {
  const activeCount = activeFilters.length;

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn('gap-1.5 w-fit', activeCount > 0 && 'border-primary/60 text-primary')}
          >
            <Filter className="size-3.5" />
            Filters
            {activeCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <FilterMenuContent fields={fields} activeFilters={activeFilters} onChange={onChange} />
      </DropdownMenu>

      {showPills && activeFilters.length > 0 && (
        <FilterPills fields={fields} activeFilters={activeFilters} onChange={onChange} />
      )}
    </div>
  );
}

export type { FilterBarProps } from './types';
export type { FilterField, FilterOption, ActiveFilter, FilterFieldType } from './types';
