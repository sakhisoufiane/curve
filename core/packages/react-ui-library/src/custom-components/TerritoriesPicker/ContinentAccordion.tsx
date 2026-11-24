import { ChevronDown } from 'lucide-react';
import { Checkbox } from '../../components/checkbox';
import { cn } from '../../lib/utils';
import { type Territory, type Continent } from '../../data/territories';
import { type ContinentCheckState } from './types';
import { CountryCheckbox } from './CountryCheckbox';

export interface ContinentAccordionProps {
  continent: Continent;
  /** All countries in the continent (ignores the search filter). */
  allCountries: Territory[];
  /** Countries visible after applying the search filter. */
  visibleCountries: Territory[];
  expanded: boolean;
  continentState: ContinentCheckState;
  selectedCount: number;
  isSearching: boolean;
  showCodes: boolean;
  disabled?: boolean;
  value: string[];
  onToggleContinent: (continent: Continent) => void;
  onToggleExpanded: (continent: Continent) => void;
  onToggleCountry: (code: string) => void;
}

export function ContinentAccordion({
  continent,
  allCountries,
  visibleCountries,
  expanded,
  continentState,
  selectedCount,
  isSearching,
  showCodes,
  disabled,
  value,
  onToggleContinent,
  onToggleExpanded,
  onToggleCountry,
}: ContinentAccordionProps) {
  return (
    <div>
      {/* Accordion header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-muted/30',
          expanded && 'border-b',
          !isSearching && !disabled && 'cursor-pointer'
        )}
      >
        {!disabled && (
          <Checkbox
            checked={continentState}
            onCheckedChange={() => onToggleContinent(continent)}
            aria-label={`Select all ${continent}`}
          />
        )}
        <button
          type="button"
          className="flex flex-1 items-center gap-3 text-left"
          onClick={() => !isSearching && onToggleExpanded(continent)}
        >
          <span className="text-sm font-medium">{continent}</span>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {selectedCount > 0 ? `${selectedCount} / ${allCountries.length}` : allCountries.length}
          </span>
          {!isSearching && (
            <ChevronDown
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-150',
                expanded && 'rotate-180'
              )}
            />
          )}
        </button>
      </div>

      {/* Country grid */}
      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-4 md:grid-cols-3">
          {visibleCountries.map((territory) => (
            <CountryCheckbox
              key={territory.code}
              territory={territory}
              checked={value.includes(territory.code)}
              showCodes={showCodes}
              disabled={disabled}
              onToggle={onToggleCountry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
