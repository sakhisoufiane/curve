import CwrUtils from './utils';

// Contract Type — Writer Designation Code
export const ContractType = {
  LyricsAndMusic: 'CA',
  Music: 'C',
  Lyrics: 'A',
};

type Composer = {
  territories: string[];
  chainTerritories: (string | string[])[];
  shares?: Record<
    string,
    {
      mechanicalCollection: number;
      mechanicalOwnership: number;
      performanceCollection: number;
      performanceOwnership: number;
    }
  >;
};

export function prepareComposerTerritories(composer: Composer) {
  const composerTerritories = CwrUtils.removeUnsupportedTerritories!({ territories: composer.territories });
  const uniqueChainTerritories = [...new Set(composer.chainTerritories)];

  return {
    territories: composerTerritories,
    chainTerritories: uniqueChainTerritories,
  };
}

export default {
  ContractType,
  prepareComposerTerritories,
};
