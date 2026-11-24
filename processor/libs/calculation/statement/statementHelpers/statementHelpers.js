const calculationHelper = require('../../../calculationHelper');

const statementHelpers = {
  sortAndLimitCatalogueAnalysisData: (analysisData, limit) => {
    const analysisDataCopy = JSON.parse(JSON.stringify(analysisData));
    if (analysisDataCopy.gross?.releases) {
      analysisDataCopy.gross.releases = calculationHelper.sortAndLimit(analysisDataCopy.gross.releases, 'value', limit);
    }
    if (analysisDataCopy.gross?.tracks) {
      analysisDataCopy.gross.tracks = calculationHelper.sortAndLimit(analysisDataCopy.gross.tracks, 'value', limit);
    }
    if (analysisDataCopy.gross?.works) {
      analysisDataCopy.gross.works = calculationHelper.sortAndLimit(analysisDataCopy.gross.works, 'value', limit);
    }
    if (analysisDataCopy.net?.releases) {
      analysisDataCopy.net.releases = calculationHelper.sortAndLimit(analysisDataCopy.net.releases, 'value', limit);
    }
    if (analysisDataCopy.net?.tracks) {
      analysisDataCopy.net.tracks = calculationHelper.sortAndLimit(analysisDataCopy.net.tracks, 'value', limit);
    }
    if (analysisDataCopy.net?.works) {
      analysisDataCopy.net.works = calculationHelper.sortAndLimit(analysisDataCopy.net.works, 'value', limit);
    }
    return analysisDataCopy;
  },
};

module.exports = statementHelpers;
