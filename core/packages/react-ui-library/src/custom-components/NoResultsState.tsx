import React from 'react';
import { Button } from '../components/button';
import { FilterX, X } from 'lucide-react';

export interface NoResultsStateProps {
  message?: string;
  onClearSearch?: () => void;
  onClearFilters?: () => void;
}

export function NoResultsState({
  message = 'No results match your search.',
  onClearSearch,
  onClearFilters,
}: NoResultsStateProps) {
  const hasActions = onClearSearch || onClearFilters;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <p className="text-sm text-muted-foreground">{message}</p>
      {hasActions && (
        <div className="flex items-center gap-2">
          {onClearSearch && (
            <Button variant="outline" size="sm" onClick={onClearSearch} className="gap-1.5">
              <X className="size-3.5" />
              Clear search
            </Button>
          )}
          {onClearFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5">
              <FilterX className="size-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
