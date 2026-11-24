// Define fields which require loading of catalogue data
// NOTE: Any changes and/or additions to these lists may require changes in libs/catalogueOverwritingData to ensure data is actually loaded from Catalogue DB
const fieldsToMapToCatalogue = {
  release: ['catalogueBarcode', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueReleaseProjectId', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueReleaseDate', 'ppd', 'catalogueFormat', 'releaseCatalogueGroups'],
  track: ['catalogueIsrc', 'catalogueTrackForeignId', 'catalogueTrackProjectId', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'trackCatalogueGroups'],
  work: ['catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueWorkProjectId', 'catalogueIswc', 'catalogueTunecode', 'workIsrcs', 'workCatalogueGroups'],
  contract: ['contractName', 'contractForeignId', 'contractProjectId', 'contractType', 'contractCategories', 'contractCurrency', 'contractDealType', 'contractProfitSharePercentage'],
  payee: ['payeeName', 'payeeForeignId', 'payeeProjectId', 'payeeCategories'],
  period: ['periodName', 'periodYear', 'periodAccountingPeriod', 'periodAccountingPeriodType', 'periodStartDate', 'periodEndDate', 'periodAccountingDate'],
};

module.exports = {
  fieldsToMapToCatalogue,
};
