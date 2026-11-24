import * as React from 'react';
import { cn } from '../../lib/utils';
import { CONTINENTS, type Continent } from '../../data/territories';
import { type TerritoriesPickerProps } from './types';
import {
  availableTerritories,
  groupByContinent,
  filterByContinent,
  getContinentState as computeContinentState,
  continentsWithSelection,
} from './utils';
import { SearchBar } from './SearchBar';
import { QuickSelectBar } from './QuickSelectBar';
import { ContinentAccordion } from './ContinentAccordion';

export function TerritoriesPicker({
  value,
  onChange,
  cisacOnly = false,
  disabled = false,
  className,
}: TerritoriesPickerProps) {
  const [search, setSearch] = React.useState('');
  const [showCodes, setShowCodes] = React.useState(false);
  const [expandedContinents, setExpandedContinents] = React.useState<Set<Continent>>(() =>
    continentsWithSelection(value, cisacOnly)
  );

  // When value loads asynchronously (e.g. page refresh on a non-default tab),
  // expand continents that have selections once data arrives.
  const hasInitialized = React.useRef(value.length > 0);
  React.useEffect(() => {
    if (!hasInitialized.current && value.length > 0) {
      hasInitialized.current = true;
      setExpandedContinents(continentsWithSelection(value, cisacOnly));
    }
  }, [value, cisacOnly]);

  // All available territories (respecting cisacOnly)
  const allTerritories = React.useMemo(() => availableTerritories(cisacOnly), [cisacOnly]);

  // Territories per continent (filtered by cisacOnly)
  const byContinent = React.useMemo(() => groupByContinent(allTerritories), [allTerritories]);

  // Territories visible in each continent (filtered by search)
  const filteredByContinent = React.useMemo(() => filterByContinent(byContinent, search), [search, byContinent]);

  const isSearching = search.trim().length > 0;

  // Whether a continent accordion is open
  const isExpanded = (continent: Continent): boolean => {
    if (isSearching) return filteredByContinent[continent].length > 0;
    return expandedContinents.has(continent);
  };

  const toggleExpanded = (continent: Continent) => {
    setExpandedContinents((prev) => {
      const next = new Set(prev);
      if (next.has(continent)) {
        next.delete(continent);
      } else {
        next.add(continent);
      }
      return next;
    });
  };

  // Checkbox state for a continent
  const getContinentState = (continent: Continent) => computeContinentState(byContinent[continent], value);

  // Toggle all countries in a continent
  const toggleContinent = (continent: Continent) => {
    if (disabled) return;
    const countries = byContinent[continent];
    const state = getContinentState(continent);
    const codes = new Set(countries.map((t) => t.code));
    if (state === true) {
      // Deselect all in continent
      onChange(value.filter((c) => !codes.has(c)));
    } else {
      // Select all in continent
      const existing = value.filter((c) => !codes.has(c));
      onChange([...existing, ...countries.map((t) => t.code)]);
      // Expand the continent when selecting
      setExpandedContinents((prev) => new Set([...prev, continent]));
    }
  };

  // Toggle a single country
  const toggleCountry = (code: string) => {
    if (disabled) return;
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  };

  // Select all / world
  const selectAll = () => {
    if (disabled) return;
    const allCodes = allTerritories.map((t) => t.code);
    if (value.length === allCodes.length) {
      onChange([]);
    } else {
      onChange(allCodes);
      setExpandedContinents(new Set(CONTINENTS));
    }
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const isAllSelected = value.length === allTerritories.length && allTerritories.length > 0;
  const hasAnyResults = CONTINENTS.some((c) => filteredByContinent[c].length > 0);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        showCodes={showCodes}
        onShowCodesChange={setShowCodes}
        disabled={disabled}
      />

      {/* CISAC notice */}
      {cisacOnly && (
        <p className="text-xs text-muted-foreground">
          Only CISAC-approved territories are shown.{' '}
          <a
            href="https://members.cisac.org/CisacPortal/documentPack20.do?method=detail&id=21"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            View the official list
          </a>
          .
        </p>
      )}

      {!disabled && (
        <QuickSelectBar
          getContinentState={getContinentState}
          isAllSelected={isAllSelected}
          onSelectAll={selectAll}
          onToggleContinent={toggleContinent}
        />
      )}

      {/* Continent accordions */}
      <div className="rounded-lg border divide-y overflow-hidden">
        {CONTINENTS.map((continent) => {
          const allCountries = byContinent[continent];
          const visibleCountries = filteredByContinent[continent];

          if (isSearching && visibleCountries.length === 0) return null;

          return (
            <ContinentAccordion
              key={continent}
              continent={continent}
              allCountries={allCountries}
              visibleCountries={visibleCountries}
              expanded={isExpanded(continent)}
              continentState={getContinentState(continent)}
              selectedCount={allCountries.filter((t) => value.includes(t.code)).length}
              isSearching={isSearching}
              showCodes={showCodes}
              disabled={disabled}
              value={value}
              onToggleContinent={toggleContinent}
              onToggleExpanded={toggleExpanded}
              onToggleCountry={toggleCountry}
            />
          );
        })}

        {/* No search results */}
        {isSearching && !hasAnyResults && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No territories match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {value.length} / {allTerritories.length} territories selected
        </span>
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
