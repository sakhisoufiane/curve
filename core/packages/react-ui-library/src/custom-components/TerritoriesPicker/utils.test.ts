import { CONTINENTS, type Territory } from '../../data/territories';
import { getFlag, groupByContinent, filterByContinent, getContinentState, continentsWithSelection } from './utils';

const t = (code: string, name: string, continent: Territory['continent']): Territory => ({
  code,
  name,
  continent,
  cisacApproved: true,
});

describe('getFlag', () => {
  it('converts a valid alpha-2 code to its flag emoji', () => {
    expect(getFlag('NL')).toBe('🇳🇱');
    expect(getFlag('GB')).toBe('🇬🇧');
  });

  it('uppercases lowercase input', () => {
    expect(getFlag('fr')).toBe(getFlag('FR'));
  });

  it('returns an empty string for codes that are not two characters', () => {
    expect(getFlag('')).toBe('');
    expect(getFlag('U')).toBe('');
    expect(getFlag('USA')).toBe('');
  });
});

describe('groupByContinent', () => {
  it('returns an entry for every continent', () => {
    const grouped = groupByContinent([]);
    expect(Object.keys(grouped).sort()).toEqual([...CONTINENTS].sort());
  });

  it('places each territory under its own continent', () => {
    const territories = [t('NG', 'Nigeria', 'Africa'), t('FR', 'France', 'Europe'), t('KE', 'Kenya', 'Africa')];
    const grouped = groupByContinent(territories);
    expect(grouped.Africa.map((c) => c.code)).toEqual(['NG', 'KE']);
    expect(grouped.Europe.map((c) => c.code)).toEqual(['FR']);
    expect(grouped.Asia).toEqual([]);
  });
});

describe('filterByContinent', () => {
  const byContinent = groupByContinent([
    t('FR', 'France', 'Europe'),
    t('DE', 'Germany', 'Europe'),
    t('NG', 'Nigeria', 'Africa'),
  ]);

  it('returns all territories unchanged for an empty query', () => {
    expect(filterByContinent(byContinent, '')).toEqual(byContinent);
    expect(filterByContinent(byContinent, '   ')).toEqual(byContinent);
  });

  it('matches on territory name', () => {
    const result = filterByContinent(byContinent, 'germ');
    expect(result.Europe.map((c) => c.code)).toEqual(['DE']);
    expect(result.Africa).toEqual([]);
  });

  it('matches on territory code', () => {
    const result = filterByContinent(byContinent, 'ng');
    expect(result.Africa.map((c) => c.code)).toEqual(['NG']);
  });

  it('is case-insensitive', () => {
    expect(filterByContinent(byContinent, 'FRANCE').Europe.map((c) => c.code)).toEqual(['FR']);
  });
});

describe('getContinentState', () => {
  const countries = [t('FR', 'France', 'Europe'), t('DE', 'Germany', 'Europe'), t('ES', 'Spain', 'Europe')];

  it('returns false when none are selected', () => {
    expect(getContinentState(countries, [])).toBe(false);
    expect(getContinentState(countries, ['US'])).toBe(false);
  });

  it('returns true when all are selected', () => {
    expect(getContinentState(countries, ['FR', 'DE', 'ES'])).toBe(true);
  });

  it('returns indeterminate when some are selected', () => {
    expect(getContinentState(countries, ['FR'])).toBe('indeterminate');
    expect(getContinentState(countries, ['FR', 'DE'])).toBe('indeterminate');
  });
});

describe('continentsWithSelection', () => {
  it('returns an empty set when nothing is selected', () => {
    expect(continentsWithSelection([], false).size).toBe(0);
  });

  it('includes only continents that contain a selected territory', () => {
    const result = continentsWithSelection(['FR'], false);
    expect(result.has('Europe')).toBe(true);
    expect(result.has('Africa')).toBe(false);
  });

  it('ignores non-CISAC territories when cisacOnly is true', () => {
    // RE (Reunion) is a non-CISAC Africa territory in the dataset.
    expect(continentsWithSelection(['RE'], true).has('Africa')).toBe(false);
    expect(continentsWithSelection(['RE'], false).has('Africa')).toBe(true);
  });
});
