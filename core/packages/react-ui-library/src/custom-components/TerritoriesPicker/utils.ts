import { TERRITORIES, CONTINENTS, type Territory, type Continent } from '../../data/territories';
import { type ContinentCheckState } from './types';

/** Converts an ISO 3166-1 alpha-2 code to its flag emoji. */
export function getFlag(code: string): string {
  if (code.length !== 2) return '';
  try {
    return Array.from(code.toUpperCase())
      .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
      .join('');
  } catch {
    return '';
  }
}

/** All available territories, respecting the cisacOnly filter. */
export function availableTerritories(cisacOnly: boolean): Territory[] {
  return TERRITORIES.filter((t) => !cisacOnly || t.cisacApproved);
}

/** Groups territories by continent. */
export function groupByContinent(territories: Territory[]): Record<Continent, Territory[]> {
  return Object.fromEntries(CONTINENTS.map((c) => [c, territories.filter((t) => t.continent === c)])) as Record<
    Continent,
    Territory[]
  >;
}

/** Filters each continent's territories by a search query (matches name or code). */
export function filterByContinent(
  byContinent: Record<Continent, Territory[]>,
  search: string
): Record<Continent, Territory[]> {
  const q = search.trim().toLowerCase();
  return Object.fromEntries(
    CONTINENTS.map((c) => [
      c,
      q
        ? byContinent[c].filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
        : byContinent[c],
    ])
  ) as Record<Continent, Territory[]>;
}

/** Tri-state checkbox value for a continent based on how many of its countries are selected. */
export function getContinentState(countries: Territory[], value: string[]): ContinentCheckState {
  const selectedCount = countries.filter((t) => value.includes(t.code)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === countries.length) return true;
  return 'indeterminate';
}

/** Continents that currently contain at least one selected territory (respecting cisacOnly). */
export function continentsWithSelection(value: string[], cisacOnly: boolean): Set<Continent> {
  return new Set(
    CONTINENTS.filter((c) =>
      TERRITORIES.filter((t) => t.continent === c && (!cisacOnly || t.cisacApproved)).some((t) =>
        value.includes(t.code)
      )
    )
  );
}
