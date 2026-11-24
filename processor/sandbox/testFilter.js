const async = require('async');

const filter = { 
  $or: [
    { 
      catType: 'Release', 
      releaseId: { $in: ['5e3b0e2078b4953996676f49'] } },
      { catType: 'Track', trackId: { $in: ['123'] } }], territory: { $in: ['US'] }, configuration: { $in: ['Download', 'CD', 'LP', 'DVD', 'Cassette', 'Download (Track)', 'Download (Album)', 'Download (Video)', 'Vinyl 7"', 'Vinyl 12"'] } };
const salesLine = {
  _id: '5e600b6fcdcda8624b526a5f', salesFileId: '5e600b1376f06668bca08551', originalConfiguration: 'CD', source: 'Domestic Physical', catNo: '816651014538', originalReleaseArtist: 'The Blind Boys Of Alabama', originalReleaseTitle: 'Atom Bomb', units: -2, grossAmount: -18.06, netAmount: -15.351, retailPrice: 18.98, perUnitRate: 10.75, originalDistributionChannel: 'Physical', originalCurrency: 'USD', exchangeRate: 1, originalTerritory: 'US', territory: 'US', distributionChannel: 'Physical', configuration: 'CD', priceCategory: null, positiveNegative: null, subSource: null, catType: 'Release', titleMapper: '', releaseId: '5e3b0e2078b4953996676f49', contractId: null, homeCurrencyGrossAmount: -18.06, homeCurrencyNetAmount: -15.351, homeCurrencyPerUnitRate: 10.75, homeCurrencyRetailPrice: 18.98, status: 'Complete', catalogueReleaseTitle: 'Atom Bomb', catalogueReleaseArtist: 'The Blind Boys Of Alabama', catalogueCatNo: '816651014538', catalogueBarcode: '816651014538', ppd: 10.75, priceCategoryDealerPrices: [], catalogueFormat: 'CD', mechanicalBasisPercentage: 100, totalMechanicalAmount: 1.5749999999999997, catalogueContractIds: ['5e54244763ce794c3befd2ba'], calculationContractIds: [],
};

filterMatches(salesLine, filter, (res) => {
  console.log(res);
});

function filterMatches(salesLine, filter, callback) {
  const keys = Object.keys(filter);
  const results = { true: 0, false: 0 };
  async.each(keys, (key, cb) => {
    // Remove when not the same cat type
    if (salesLine[key] == filter[key]
				|| (Object.getPrototypeOf(filter[key]) == Object.prototype && filter[key] && filter[key].$in && filter[key].$in.includes(salesLine[key]))
				|| (Object.getPrototypeOf(filter[key]) == Object.prototype && filter[key] && filter[key].$nin && !filter[key].$nin.includes(salesLine[key]))
    ) {
      results.true += 1;
    } else if (key === '$or') {
      let orResult = false;
      filter[key].forEach((orItem) => {
        // console.log(orItem);
        // if(salesLine.catType == "Release" && salesLine.territory == "US" && orItem.releaseId) {
        // console.log("US RELEASE");
        // console.log(filter);
        // console.log(salesLine);
        // console.log("RELEASE INCLUDED:", orItem.releaseId["$in"].includes(salesLine.releaseId));
        // }
        if (
          (orItem && orItem.catType === 'Release' && orItem.releaseId && orItem.releaseId == salesLine.releaseId && salesLine.catType === 'Release')
						|| (orItem && orItem.catType === 'Release' && orItem.releaseId && orItem.releaseId.$in.includes(salesLine.releaseId) && salesLine.catType === 'Release')
						|| (orItem && orItem.catType === 'Track' && orItem.trackId && orItem.trackId == salesLine.trackId && salesLine.catType === 'Track')
						|| (orItem && orItem.catType === 'Track' && orItem.trackId && orItem.trackId.$in.includes(salesLine.trackId) && salesLine.catType === 'Track')
        ) {
          orResult = true;
        } else {
          console.log('MISSING OR');
          console.log(orItem);
          // orResult = false;
        }
      });
      if (!orResult) {
        results.false += 1;
      }
    } else {
      console.log('MISSING OTHER');
      results.false += 1;
    }
    cb();
  }, () => {
    if (results.false > 0) {
      callback(false);
    } else {
      callback(true);
    }
  });
}
