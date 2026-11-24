const CwrUtils = require('./utils');

// Contract Type — Writer Designation Code
const ContractType = {
  LyricsAndMusic: 'CA',
  Music: 'C',
  Lyrics: 'A',
};

function prepareComposerTerritories(composer) {
  const composerTerritories = CwrUtils.removeUnsupportedTerritories({ territories: composer.territories });
  const uniqueChainTerritories = [...new Set(composer.chainTerritories)];

  return {
    territories: composerTerritories,
    chainTerritories: uniqueChainTerritories,
  };
}

module.exports = {
  prepareComposerTerritories,
  ContractType,
};
