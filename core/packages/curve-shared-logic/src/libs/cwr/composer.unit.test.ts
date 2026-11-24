import Composer from './composer';
import { CISAC_APPROVED_COUNTRIES_CODES } from './territories';

describe('prepareComposerTerritories', () => {
  it('should prepare territories for a composer object (remove invalid + duplicates)', () => {
    const output = Composer.prepareComposerTerritories({
      territories: ['GB', 'ZZ', 'SE'],
      chainTerritories: ['GB', 'GB', 'SE', 'WW'],
    });
    expect(output).toEqual({ territories: ['GB', 'SE'], chainTerritories: ['GB', 'SE', 'WW'] });
  });

  it('removes other territories if the composer has shares in WW and identical shares in at least one other territory, as they would create unnecessary lines', () => {
    const composer = {
      chainTerritories: ['WW', ['NL'], ['BE'], ['DE']],
      territories: CISAC_APPROVED_COUNTRIES_CODES, // World
      shares: {
        WW: {
          mechanicalCollection: 0,
          mechanicalOwnership: 0,
          performanceCollection: 25,
          performanceOwnership: 25,
        },
        NL: {
          mechanicalCollection: 0,
          mechanicalOwnership: 0,
          performanceCollection: 25,
          performanceOwnership: 25,
        },
        BE: {
          mechanicalCollection: 0,
          mechanicalOwnership: 0,
          performanceCollection: 25,
          performanceOwnership: 25,
        },
        DE: {
          mechanicalCollection: 0,
          mechanicalOwnership: 0,
          performanceCollection: 25,
          performanceOwnership: 25,
        },
      },
    };
    const output = Composer.prepareComposerTerritories(composer);
    expect(output).toEqual({
      territories: CISAC_APPROVED_COUNTRIES_CODES,
      chainTerritories: ['WW', ['NL'], ['BE'], ['DE']],
    });
  });
});
