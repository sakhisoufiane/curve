import { Globe } from 'lucide-react';
import { Button } from '../../components/button';
import { cn } from '../../lib/utils';
import { CONTINENTS, type Continent } from '../../data/territories';
import { type ContinentCheckState } from './types';

export interface QuickSelectBarProps {
  getContinentState: (continent: Continent) => ContinentCheckState;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onToggleContinent: (continent: Continent) => void;
}

export function QuickSelectBar({
  getContinentState,
  isAllSelected,
  onSelectAll,
  onToggleContinent,
}: QuickSelectBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={isAllSelected ? 'default' : 'outline'}
        size="sm"
        onClick={onSelectAll}
        className="gap-1.5"
      >
        <Globe className="size-3.5" />
        World
      </Button>
      {CONTINENTS.map((continent) => {
        const state = getContinentState(continent);
        return (
          <Button
            key={continent}
            type="button"
            variant={state === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToggleContinent(continent)}
            className={cn(state === 'indeterminate' && 'border-primary/50 text-primary')}
          >
            {continent}
          </Button>
        );
      })}
    </div>
  );
}
