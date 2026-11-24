/* eslint-disable prefer-destructuring */
/* eslint-disable max-len */
process.env.NODE_ENV = 'test';

require('dotenv').config();
const async = require('async');
const { expect } = require('chai');
const moment = require('moment');

const logger = require('../logger');
const testUtils = require('../testUtils');
const { BigQueryTestUtils } = require('../bigQueryTestUtils');

const bqTestUtils = new BigQueryTestUtils({ containerised: false });

let bigQuery;

function writeToDb(data, table, callback) {
  bigQuery.setupFile(() => {
    bigQuery.writeToFile(data, () => {
      bigQuery.writeFileToDb(table, (err) => {
        callback(err);
      });
    });
  });
}

describe('bigQuery', () => {
  beforeAll(async () => {
    await bqTestUtils.init();
  });

  beforeEach(async () => {
    bigQuery = await bqTestUtils.getBigQuery();
  });

  afterEach(async () => {
    await bqTestUtils.cleanUpTestTables({ bigQuery });
  });

  describe('costsTable', () => {
    function updateObj(obj) {
      const update = {};
      for (const key in obj) {
        // ignore periodId
        if (key !== 'periodId') {
          if (['date'].indexOf(key) !== -1) {
            // update dates
            update[key] = testUtils.randomDate();
          } else if (['priceCategoryDealerPrices'].indexOf(key) !== -1) {
            // update arrays
            // TODO  Fix arrays not updating..
            // update[key] = randomArray();
          } else if (
            ['amount', 'objectPercentage', 'rechargeRate', 'calculationInput', 'calculationOutput'].indexOf(key) !== -1
          ) {
            // update numbers
            update[key] = testUtils.randomFloat();
          } else {
            update[key] = testUtils.randomString();
          }
        }
      }
      return update;
    }

    const cost = {
      periodId: testUtils.randomId(),
      contractId: testUtils.randomId(),
      costId: testUtils.randomId(),
      contractName: testUtils.randomString(),
      type: testUtils.randomString(),
      name: testUtils.randomString(),
      invoiceNo: testUtils.randomString(),
      description: testUtils.randomString(),
      date: testUtils.randomDate(),
      amount: testUtils.randomFloat(),
      territory: testUtils.randomString(),
      objectPercentage: testUtils.randomFloat(),
      rechargeRate: testUtils.randomFloat(),
      calculationInput: testUtils.randomFloat(),
      calculationOutput: testUtils.randomFloat(),
      catalogueReleaseTitle: testUtils.randomString(),
      catalogueReleaseVersion: testUtils.randomString(),
      catalogueReleaseArtist: testUtils.randomString(),
      catalogueLabel: testUtils.randomString(),
      catalogueCatNo: testUtils.randomString(),
      catalogueReleaseForeignId: testUtils.randomString(),
      catalogueBarcode: testUtils.randomString(),
      catalogueTrackTitle: testUtils.randomString(),
      catalogueTrackVersion: testUtils.randomString(),
      catalogueTrackArtist: testUtils.randomString(),
      catalogueIsrc: testUtils.randomString(),
      catalogueTrackForeignId: testUtils.randomString(),
    };

    beforeEach((done) => {
      async.series(
        [
          function (cb) {
            writeToDb([cost], bigQuery.costsTable, cb);
          },
        ],
        done
      );
    });
    describe('should save to the database', () => {
      let costDB;

      beforeEach((done) => {
        bigQuery.getData(bigQuery.costsTable, '*', { periodId: cost.periodId }, {}, (err, data) => {
          if (err) {
            logger.error(err);
          }
          [costDB] = data;
          done();
        });
      });

      it('should have saved all the fields', (done) => {
        expect(costDB).to.have.a.property('periodId', cost.periodId);
        expect(costDB).to.have.a.property('contractId', cost.contractId);
        expect(costDB).to.have.a.property('costId', cost.costId);
        expect(costDB).to.have.a.property('contractName', cost.contractName);
        expect(costDB).to.have.a.property('type', cost.type);
        expect(costDB).to.have.a.property('name', cost.name);
        expect(costDB).to.have.a.property('invoiceNo', cost.invoiceNo);
        expect(costDB).to.have.a.property('description', cost.description);
        expect(costDB).to.have.a.property('date');
        expect(costDB.date).to.deep.equal({ value: cost.date });
        expect(costDB).to.have.a.property('amount', cost.amount);
        expect(costDB).to.have.a.property('territory', cost.territory);
        expect(costDB).to.have.a.property('objectPercentage', cost.objectPercentage);
        expect(costDB).to.have.a.property('rechargeRate', cost.rechargeRate);
        expect(costDB).to.have.a.property('calculationInput', cost.calculationInput);
        expect(costDB).to.have.a.property('calculationOutput', cost.calculationOutput);
        expect(costDB).to.have.a.property('catalogueReleaseTitle', cost.catalogueReleaseTitle);
        expect(costDB).to.have.a.property('catalogueReleaseVersion', cost.catalogueReleaseVersion);
        expect(costDB).to.have.a.property('catalogueReleaseArtist', cost.catalogueReleaseArtist);
        expect(costDB).to.have.a.property('catalogueLabel', cost.catalogueLabel);
        expect(costDB).to.have.a.property('catalogueCatNo', cost.catalogueCatNo);
        expect(costDB).to.have.a.property('catalogueReleaseForeignId', cost.catalogueReleaseForeignId);
        expect(costDB).to.have.a.property('catalogueBarcode', cost.catalogueBarcode);
        expect(costDB).to.have.a.property('catalogueTrackTitle', cost.catalogueTrackTitle);
        expect(costDB).to.have.a.property('catalogueTrackVersion', cost.catalogueTrackVersion);
        expect(costDB).to.have.a.property('catalogueTrackArtist', cost.catalogueTrackArtist);
        expect(costDB).to.have.a.property('catalogueIsrc', cost.catalogueIsrc);
        expect(costDB).to.have.a.property('catalogueTrackForeignId', cost.catalogueTrackForeignId);
        done();
      });
    });

    describe('should update the database', () => {
      let costDB;
      let costUpdated;

      beforeEach((done) => {
        costUpdated = updateObj(cost);
        bigQuery.updateData(bigQuery.costsTable, { periodId: cost.periodId }, costUpdated, (err) => {
          if (err) {
            logger.error(err);
          }

          bigQuery.getData(bigQuery.costsTable, '*', {}, {}, (getDataErr, data) => {
            if (getDataErr) {
              logger.error(getDataErr);
            }
            [costDB] = data;
            done();
          });
        });
      });

      it('should have updated all the fields', (done) => {
        expect(costDB).to.have.a.property('periodId', cost.periodId);
        expect(costDB).to.have.a.property('contractId', costUpdated.contractId);
        expect(costDB).to.have.a.property('costId', costUpdated.costId);
        expect(costDB).to.have.a.property('contractName', costUpdated.contractName);
        expect(costDB).to.have.a.property('type', costUpdated.type);
        expect(costDB).to.have.a.property('name', costUpdated.name);
        expect(costDB).to.have.a.property('invoiceNo', costUpdated.invoiceNo);
        expect(costDB).to.have.a.property('description', costUpdated.description);
        expect(costDB).to.have.a.property('date');
        expect(costDB.date).to.deep.equal({ value: costUpdated.date });
        expect(costDB).to.have.a.property('amount', costUpdated.amount);
        expect(costDB).to.have.a.property('territory', costUpdated.territory);
        expect(costDB).to.have.a.property('objectPercentage', costUpdated.objectPercentage);
        expect(costDB).to.have.a.property('rechargeRate', costUpdated.rechargeRate);
        expect(costDB).to.have.a.property('calculationInput', costUpdated.calculationInput);
        expect(costDB).to.have.a.property('calculationOutput', costUpdated.calculationOutput);
        expect(costDB).to.have.a.property('catalogueReleaseTitle', costUpdated.catalogueReleaseTitle);
        expect(costDB).to.have.a.property('catalogueReleaseVersion', costUpdated.catalogueReleaseVersion);
        expect(costDB).to.have.a.property('catalogueReleaseArtist', costUpdated.catalogueReleaseArtist);
        expect(costDB).to.have.a.property('catalogueLabel', costUpdated.catalogueLabel);
        expect(costDB).to.have.a.property('catalogueCatNo', costUpdated.catalogueCatNo);
        expect(costDB).to.have.a.property('catalogueReleaseForeignId', costUpdated.catalogueReleaseForeignId);
        expect(costDB).to.have.a.property('catalogueBarcode', costUpdated.catalogueBarcode);
        expect(costDB).to.have.a.property('catalogueTrackTitle', costUpdated.catalogueTrackTitle);
        expect(costDB).to.have.a.property('catalogueTrackVersion', costUpdated.catalogueTrackVersion);
        expect(costDB).to.have.a.property('catalogueTrackArtist', costUpdated.catalogueTrackArtist);
        expect(costDB).to.have.a.property('catalogueIsrc', costUpdated.catalogueIsrc);
        expect(costDB).to.have.a.property('catalogueTrackForeignId', costUpdated.catalogueTrackForeignId);
        done();
      });
    });

    describe('should get distinct values', () => {
      const distinct1 = {
        periodId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        costId: testUtils.randomId(),
      };
      const distinct2 = {
        periodId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        costId: testUtils.randomId(),
      };
      const distinct3 = {
        periodId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        costId: testUtils.randomId(),
      };
      const distinct1Copy = {
        periodId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        costId: distinct1.costId,
      };

      let distinctResult;

      beforeEach((done) => {
        async.series(
          [
            function (cb) {
              bigQuery.deleteData(bigQuery.costsTable, { periodId: { $exists: true } }, cb);
            },
            function (cb) {
              writeToDb([distinct1, distinct2, distinct3, distinct1Copy], bigQuery.costsTable, cb);
            },
            function () {
              bigQuery.getDistinct(bigQuery.costsTable, 'costId', { periodId: { $exists: true } }, (err, data) => {
                distinctResult = data;
                done();
              });
            },
          ],
          (err) => {
            done(err);
          }
        );
      });

      it('should get distinct costId values', (done) => {
        expect(distinctResult.sort()).to.deep.equal([distinct1.costId, distinct2.costId, distinct3.costId].sort());
        done();
      });
    });

    describe('should get multiple distinct values', () => {
      const distinct1 = {
        periodId: testUtils.randomId(),
        costId: testUtils.randomId(),
        contractId: testUtils.randomId(),
      };
      const distinct2 = {
        periodId: testUtils.randomId(),
        costId: testUtils.randomId(),
        contractId: testUtils.randomId(),
      };
      const distinct3 = {
        periodId: testUtils.randomId(),
        costId: testUtils.randomId(),
        contractId: testUtils.randomId(),
      };

      const distinct1Copy = {
        periodId: testUtils.randomId(),
        costId: distinct1.costId,
        contractId: distinct1.contractId,
      };
      const distinct2Copy = {
        periodId: testUtils.randomId(),
        costId: distinct2.costId,
        contractId: distinct2.contractId,
      };
      const distinct3Copy = {
        periodId: testUtils.randomId(),
        costId: distinct3.costId,
        contractId: distinct3.contractId,
      };

      let distinctResult;

      beforeEach((done) => {
        async.series(
          [
            function (cb) {
              bigQuery.deleteData(bigQuery.costsTable, { periodId: { $exists: true } }, () => {
                cb();
              });
            },
            function (cb) {
              writeToDb(
                [distinct1, distinct2, distinct3, distinct1Copy, distinct2Copy, distinct3Copy],
                bigQuery.costsTable,
                cb
              );
            },
            function () {
              bigQuery.getMultiDistinct(
                bigQuery.costsTable,
                ['costId', 'contractId'],
                { periodId: { $exists: true } },
                (err, data) => {
                  distinctResult = data;
                  done(err);
                }
              );
            },
          ],
          (err) => {
            done(err);
          }
        );
      });

      it('should get distinct salesFileId and releaseId values', (done) => {
        delete distinct1.periodId;
        delete distinct1.salesLineId;
        delete distinct2.periodId;
        delete distinct2.salesLineId;
        delete distinct3.periodId;
        delete distinct3.salesLineId;

        expect(distinctResult.map((item) => item.contractId).sort()).to.deep.equal(
          [distinct1, distinct2, distinct3].map((item) => item.contractId).sort()
        );
        done();
      });
    });
  });

  describe('inputTable', () => {
    function updateObj(obj) {
      const update = {};
      const updateNumberFields = [
        'discountAmount',
        'mechanicalAtSource',
        'homeCurrencyDiscountAmount',
        'homeCurrencyMechanicalAtSource',
        'multiplier',
        'units',
        'sharePercentage',
        'returnUnits',
        'salePrice',
        'exchangeRate',
        'grossAmount',
        'netAmount',
        'returnGrossAmount',
        'returnNetAmount',
        'homeCurrencyGrossAmount',
        'homeCurrencyNetAmount',
        'homeCurrencyReturnGrossAmount',
        'homeCurrencyReturnNetAmount',
        'perUnitRate',
        'homeCurrencyPerUnitRate',
        'retailPrice',
        'homeCurrencyRetailPrice',
        'ppd',
        'proRataAmount',
        'mechanicalBasisPercentage',
        'totalMechanicalAmount',
        'mechanicalRate',
      ];

      for (const key in obj) {
        if (key !== 'id' && key !== 'ignore') {
          if (['saleDate', 'transactionDate', 'episode', 'dateFrom', 'dateTo'].indexOf(key) !== -1) {
            // update dates
            update[key] = testUtils.randomDate();
          } else if (key === 'priceCategoryDealerPrices') {
            // (['priceCategoryDealerPrices'].indexOf(key) !== -1) {
            // update arrays
            // TODO  Fix arrays not updating..
            // update[key] = [];// testUtils.randomArray();
          } else if (updateNumberFields.indexOf(key) !== -1) {
            // update numbers
            update[key] = testUtils.randomFloat();
          } else {
            update[key] = testUtils.randomString();
          }
        }
      }

      return update;
    }

    const input = {
      id: testUtils.randomId(),
      salesFileId: testUtils.randomId(),
      ignore: testUtils.randomString(),
      status: testUtils.randomString(),
      catType: testUtils.randomString(),
      releaseId: testUtils.randomId(),
      trackId: testUtils.randomId(),
      workId: testUtils.randomId(),
      contractId: testUtils.randomId(),
      distributionChannel: testUtils.randomString(),
      configuration: testUtils.randomString(),
      priceCategory: testUtils.randomString(),
      territory: testUtils.randomString(),
      originalDistributionChannel: testUtils.randomString(),
      originalConfiguration: testUtils.randomString(),
      originalPriceCategory: testUtils.randomString(),
      originalReleaseTitle: testUtils.randomString(),
      originalReleaseArtist: testUtils.randomString(),
      originalTrackTitle: testUtils.randomString(),
      originalTrackArtist: testUtils.randomString(),
      catNo: testUtils.randomString(),
      barcode: testUtils.randomString(),
      isrc: testUtils.randomString(),
      originalWorkTitle: testUtils.randomString(),
      originalComposers: testUtils.randomString(),
      originalIdentifier: testUtils.randomString(),
      iswc: testUtils.randomString(),
      tunecode: testUtils.randomString(),
      songCode: testUtils.randomString(),
      contractIdentifier: testUtils.randomString(),
      titleMapper: testUtils.randomString(),
      originalTerritory: testUtils.randomString(),
      saleDate: testUtils.randomDate(),
      transactionDate: testUtils.randomDate(),
      source: testUtils.randomString(),
      subSource: testUtils.randomString(),
      description: testUtils.randomString(),
      multiplier: testUtils.randomFloat(),
      units: testUtils.randomFloat(),
      sharePercentage: testUtils.randomFloat(),
      returnUnits: testUtils.randomFloat(),
      salePrice: testUtils.randomFloat(),
      originalCurrency: testUtils.randomString(),
      positiveNegative: testUtils.randomString(),
      exchangeRate: testUtils.randomFloat(),
      grossAmount: testUtils.randomFloat(),
      netAmount: testUtils.randomFloat(),
      returnGrossAmount: testUtils.randomFloat(),
      returnNetAmount: testUtils.randomFloat(),
      homeCurrencyGrossAmount: testUtils.randomFloat(),
      homeCurrencyNetAmount: testUtils.randomFloat(),
      homeCurrencyReturnGrossAmount: testUtils.randomFloat(),
      homeCurrencyReturnNetAmount: testUtils.randomFloat(),
      perUnitRate: testUtils.randomFloat(),
      homeCurrencyPerUnitRate: testUtils.randomFloat(),
      retailPrice: testUtils.randomFloat(),
      homeCurrencyRetailPrice: testUtils.randomFloat(),
      originalPositiveNegative: testUtils.randomString(),
      duration: testUtils.randomString(),
      temp1: testUtils.randomString(),
      temp2: testUtils.randomString(),
      temp3: testUtils.randomString(),
      temp4: testUtils.randomString(),
      temp5: testUtils.randomString(),
      production: testUtils.randomString(),
      episode: testUtils.randomDate(),
      dateFrom: testUtils.randomDate(),
      dateTo: testUtils.randomDate(),
      party1: testUtils.randomString(),
      party2: testUtils.randomString(),
      party3: testUtils.randomString(),
      party4: testUtils.randomString(),
      party5: testUtils.randomString(),
      catalogueReleaseTitle: testUtils.randomString(),
      catalogueReleaseVersion: testUtils.randomString(),
      catalogueReleaseArtist: testUtils.randomString(),
      catalogueCatNo: testUtils.randomString(),
      catalogueReleaseForeignId: testUtils.randomId(),
      catalogueBarcode: testUtils.randomString(),
      ppd: testUtils.randomFloat(),
      proRataAmount: testUtils.randomFloat(),
      priceCategoryDealerPrices: testUtils.randomArray(),
      catalogueFormat: testUtils.randomString(),
      mechanicalBasisPercentage: testUtils.randomFloat(),
      totalMechanicalAmount: testUtils.randomFloat(),
      catalogueTrackTitle: testUtils.randomString(),
      catalogueTrackVersion: testUtils.randomString(),
      catalogueTrackArtist: testUtils.randomString(),
      catalogueIsrc: testUtils.randomString(),
      catalogueTrackForeignId: testUtils.randomString(),
      mechanicalRate: testUtils.randomFloat(),
      catalogueWorkTitle: testUtils.randomString(),
      catalogueWorkComposer: testUtils.randomString(),
      catalogueIdentifier: testUtils.randomString(),
      catalogueWorkForeignId: testUtils.randomString(),
      catalogueIswc: testUtils.randomString(),
      catalogueTunecode: testUtils.randomString(),
      catalogueContractIds: testUtils.randomString(),
      discountAmount: testUtils.randomFloat(),
      mechanicalAtSource: testUtils.randomFloat(),
      homeCurrencyDiscountAmount: testUtils.randomFloat(),
      homeCurrencyMechanicalAtSource: testUtils.randomFloat(),
    };

    beforeEach((done) => {
      writeToDb([input], bigQuery.inputTable, done);
    });

    describe('should save to the database', () => {
      let inputDB;

      beforeEach((done) => {
        bigQuery.getData(bigQuery.inputTable, '*', { id: input.id }, {}, (getDataErr, data) => {
          if (getDataErr) {
            logger.error(getDataErr);
          }

          [inputDB] = data;
          done();
        });
      });

      it('should have saved all the fields', (done) => {
        expect(inputDB).to.have.a.property('id', input.id);
        expect(inputDB).to.have.a.property('salesFileId', input.salesFileId);
        expect(inputDB).to.have.a.property('ignore', input.ignore);
        expect(inputDB).to.have.a.property('status', input.status);
        expect(inputDB).to.have.a.property('catType', input.catType);
        expect(inputDB).to.have.a.property('releaseId', input.releaseId);
        expect(inputDB).to.have.a.property('trackId', input.trackId);
        expect(inputDB).to.have.a.property('workId', input.workId);
        expect(inputDB).to.have.a.property('contractId', input.contractId);
        expect(inputDB).to.have.a.property('distributionChannel', input.distributionChannel);
        expect(inputDB).to.have.a.property('configuration', input.configuration);
        expect(inputDB).to.have.a.property('priceCategory', input.priceCategory);
        expect(inputDB).to.have.a.property('territory', input.territory);
        expect(inputDB).to.have.a.property('originalDistributionChannel', input.originalDistributionChannel);
        expect(inputDB).to.have.a.property('originalConfiguration', input.originalConfiguration);
        expect(inputDB).to.have.a.property('originalPriceCategory', input.originalPriceCategory);
        expect(inputDB).to.have.a.property('originalReleaseTitle', input.originalReleaseTitle);
        expect(inputDB).to.have.a.property('originalReleaseArtist', input.originalReleaseArtist);
        expect(inputDB).to.have.a.property('originalTrackTitle', input.originalTrackTitle);
        expect(inputDB).to.have.a.property('originalTrackArtist', input.originalTrackArtist);
        expect(inputDB).to.have.a.property('catNo', input.catNo);
        expect(inputDB).to.have.a.property('barcode', input.barcode);
        expect(inputDB).to.have.a.property('isrc', input.isrc);
        expect(inputDB).to.have.a.property('originalWorkTitle', input.originalWorkTitle);
        expect(inputDB).to.have.a.property('originalComposers', input.originalComposers);
        expect(inputDB).to.have.a.property('originalIdentifier', input.originalIdentifier);
        expect(inputDB).to.have.a.property('iswc', input.iswc);
        expect(inputDB).to.have.a.property('tunecode', input.tunecode);
        expect(inputDB).to.have.a.property('songCode', input.songCode);
        expect(inputDB).to.have.a.property('contractIdentifier', input.contractIdentifier);
        expect(inputDB).to.have.a.property('titleMapper', input.titleMapper);
        expect(inputDB).to.have.a.property('originalTerritory', input.originalTerritory);
        expect(inputDB).to.have.a.property('saleDate');
        expect(inputDB.saleDate).to.deep.equal({ value: input.saleDate });
        expect(inputDB.transactionDate).to.deep.equal({ value: input.transactionDate });
        expect(inputDB).to.have.a.property('source', input.source);
        expect(inputDB).to.have.a.property('subSource', input.subSource);
        expect(inputDB).to.have.a.property('description', input.description);
        expect(inputDB).to.have.a.property('multiplier', input.multiplier);
        expect(inputDB).to.have.a.property('units', input.units);
        expect(inputDB).to.have.a.property('sharePercentage', input.sharePercentage);
        expect(inputDB).to.have.a.property('returnUnits', input.returnUnits);
        expect(inputDB).to.have.a.property('salePrice', input.salePrice);
        expect(inputDB).to.have.a.property('originalCurrency', input.originalCurrency);
        expect(inputDB).to.have.a.property('positiveNegative', input.positiveNegative);
        expect(inputDB).to.have.a.property('exchangeRate', input.exchangeRate);
        expect(inputDB).to.have.a.property('grossAmount', input.grossAmount);
        expect(inputDB).to.have.a.property('netAmount', input.netAmount);
        expect(inputDB).to.have.a.property('returnGrossAmount', input.returnGrossAmount);
        expect(inputDB).to.have.a.property('returnNetAmount', input.returnNetAmount);
        expect(inputDB).to.have.a.property('homeCurrencyGrossAmount', input.homeCurrencyGrossAmount);
        expect(inputDB).to.have.a.property('homeCurrencyNetAmount', input.homeCurrencyNetAmount);
        expect(inputDB).to.have.a.property('homeCurrencyReturnGrossAmount', input.homeCurrencyReturnGrossAmount);
        expect(inputDB).to.have.a.property('homeCurrencyReturnNetAmount', input.homeCurrencyReturnNetAmount);
        expect(inputDB).to.have.a.property('perUnitRate', input.perUnitRate);
        expect(inputDB).to.have.a.property('homeCurrencyPerUnitRate', input.homeCurrencyPerUnitRate);
        expect(inputDB).to.have.a.property('retailPrice', input.retailPrice);
        expect(inputDB).to.have.a.property('homeCurrencyRetailPrice', input.homeCurrencyRetailPrice);
        expect(inputDB).to.have.a.property('originalPositiveNegative', input.originalPositiveNegative);
        expect(inputDB).to.have.a.property('duration', input.duration);
        expect(inputDB).to.have.a.property('temp1', input.temp1);
        expect(inputDB).to.have.a.property('temp2', input.temp2);
        expect(inputDB).to.have.a.property('temp3', input.temp3);
        expect(inputDB).to.have.a.property('temp4', input.temp4);
        expect(inputDB).to.have.a.property('temp5', input.temp5);
        expect(inputDB).to.have.a.property('production', input.production);
        expect(inputDB).to.have.a.property('episode', input.episode);
        expect(inputDB).to.have.a.property('dateFrom');
        expect(inputDB.dateFrom).to.deep.equal({ value: input.dateFrom });
        expect(inputDB).to.have.a.property('dateTo');
        expect(inputDB.dateTo).to.deep.equal({ value: input.dateTo });
        expect(inputDB).to.have.a.property('party1', input.party1);
        expect(inputDB).to.have.a.property('party2', input.party2);
        expect(inputDB).to.have.a.property('party3', input.party3);
        expect(inputDB).to.have.a.property('party4', input.party4);
        expect(inputDB).to.have.a.property('party5', input.party5);
        expect(inputDB).to.have.a.property('catalogueReleaseTitle', input.catalogueReleaseTitle);
        expect(inputDB).to.have.a.property('catalogueReleaseVersion', input.catalogueReleaseVersion);
        expect(inputDB).to.have.a.property('catalogueReleaseArtist', input.catalogueReleaseArtist);
        expect(inputDB).to.have.a.property('catalogueCatNo', input.catalogueCatNo);
        expect(inputDB).to.have.a.property('catalogueReleaseForeignId', input.catalogueReleaseForeignId);
        expect(inputDB).to.have.a.property('catalogueBarcode', input.catalogueBarcode);
        expect(inputDB).to.have.a.property('ppd', input.ppd);
        expect(inputDB).to.have.a.property('proRataAmount', input.proRataAmount);
        expect(inputDB.priceCategoryDealerPrices).to.deep.equal(input.priceCategoryDealerPrices);
        expect(inputDB).to.have.a.property('catalogueFormat', input.catalogueFormat);
        expect(inputDB).to.have.a.property('mechanicalBasisPercentage', input.mechanicalBasisPercentage);
        expect(inputDB).to.have.a.property('totalMechanicalAmount', input.totalMechanicalAmount);
        expect(inputDB).to.have.a.property('catalogueTrackTitle', input.catalogueTrackTitle);
        expect(inputDB).to.have.a.property('catalogueTrackVersion', input.catalogueTrackVersion);
        expect(inputDB).to.have.a.property('catalogueTrackArtist', input.catalogueTrackArtist);
        expect(inputDB).to.have.a.property('catalogueIsrc', input.catalogueIsrc);
        expect(inputDB).to.have.a.property('catalogueTrackForeignId', input.catalogueTrackForeignId);
        expect(inputDB).to.have.a.property('mechanicalRate', input.mechanicalRate);
        expect(inputDB).to.have.a.property('catalogueWorkTitle', input.catalogueWorkTitle);
        expect(inputDB).to.have.a.property('catalogueWorkComposer', input.catalogueWorkComposer);
        expect(inputDB).to.have.a.property('catalogueIdentifier', input.catalogueIdentifier);
        expect(inputDB).to.have.a.property('catalogueWorkForeignId', input.catalogueWorkForeignId);
        expect(inputDB).to.have.a.property('catalogueIswc', input.catalogueIswc);
        expect(inputDB).to.have.a.property('catalogueTunecode', input.catalogueTunecode);
        expect(inputDB).to.have.a.property('discountAmount', input.discountAmount);
        expect(inputDB).to.have.a.property('mechanicalAtSource', input.mechanicalAtSource);
        expect(inputDB).to.have.a.property('homeCurrencyDiscountAmount', input.homeCurrencyDiscountAmount);
        expect(inputDB).to.have.a.property('homeCurrencyMechanicalAtSource', input.homeCurrencyMechanicalAtSource);
        expect(inputDB.catalogueContractIds).to.deep.equal(input.catalogueContractIds);
        done();
      });
    });

    describe('should update the database', () => {
      let inputDB;
      let inputUpdated;

      beforeEach((done) => {
        inputUpdated = updateObj(input);
        bigQuery.updateData(bigQuery.inputTable, { id: input.id }, inputUpdated, (err) => {
          if (err) {
            logger.error(err);
          }

          bigQuery.getData(bigQuery.inputTable, '*', {}, {}, (getDataErr, data) => {
            if (getDataErr) {
              logger.error(getDataErr);
            }

            [inputDB] = data;

            done();
          });
        });
      });

      it('should have updated all the fields', (done) => {
        expect(inputDB).to.have.a.property('id', input.id);
        expect(inputDB).to.have.a.property('salesFileId', inputUpdated.salesFileId);
        expect(inputDB).to.have.a.property('status', inputUpdated.status);
        expect(inputDB).to.have.a.property('catType', inputUpdated.catType);
        expect(inputDB).to.have.a.property('releaseId', inputUpdated.releaseId);
        expect(inputDB).to.have.a.property('trackId', inputUpdated.trackId);
        expect(inputDB).to.have.a.property('workId', inputUpdated.workId);
        expect(inputDB).to.have.a.property('contractId', inputUpdated.contractId);
        expect(inputDB).to.have.a.property('distributionChannel', inputUpdated.distributionChannel);
        expect(inputDB).to.have.a.property('configuration', inputUpdated.configuration);
        expect(inputDB).to.have.a.property('priceCategory', inputUpdated.priceCategory);
        expect(inputDB).to.have.a.property('territory', inputUpdated.territory);
        expect(inputDB).to.have.a.property('originalDistributionChannel', inputUpdated.originalDistributionChannel);
        expect(inputDB).to.have.a.property('originalConfiguration', inputUpdated.originalConfiguration);
        expect(inputDB).to.have.a.property('originalPriceCategory', inputUpdated.originalPriceCategory);
        expect(inputDB).to.have.a.property('originalReleaseTitle', inputUpdated.originalReleaseTitle);
        expect(inputDB).to.have.a.property('originalReleaseArtist', inputUpdated.originalReleaseArtist);
        expect(inputDB).to.have.a.property('originalTrackTitle', inputUpdated.originalTrackTitle);
        expect(inputDB).to.have.a.property('originalTrackArtist', inputUpdated.originalTrackArtist);
        expect(inputDB).to.have.a.property('catNo', inputUpdated.catNo);
        expect(inputDB).to.have.a.property('barcode', inputUpdated.barcode);
        expect(inputDB).to.have.a.property('isrc', inputUpdated.isrc);
        expect(inputDB).to.have.a.property('originalWorkTitle', inputUpdated.originalWorkTitle);
        expect(inputDB).to.have.a.property('originalComposers', inputUpdated.originalComposers);
        expect(inputDB).to.have.a.property('originalIdentifier', inputUpdated.originalIdentifier);
        expect(inputDB).to.have.a.property('iswc', inputUpdated.iswc);
        expect(inputDB).to.have.a.property('tunecode', inputUpdated.tunecode);
        expect(inputDB).to.have.a.property('songCode', inputUpdated.songCode);
        expect(inputDB).to.have.a.property('contractIdentifier', inputUpdated.contractIdentifier);
        expect(inputDB).to.have.a.property('titleMapper', inputUpdated.titleMapper);
        expect(inputDB).to.have.a.property('originalTerritory', inputUpdated.originalTerritory);
        expect(inputDB).to.have.a.property('saleDate');
        expect(inputDB.saleDate).to.deep.equal({ value: inputUpdated.saleDate });
        expect(inputDB.transactionDate).to.deep.equal({ value: inputUpdated.transactionDate });
        expect(inputDB).to.have.a.property('source', inputUpdated.source);
        expect(inputDB).to.have.a.property('subSource', inputUpdated.subSource);
        expect(inputDB).to.have.a.property('description', inputUpdated.description);
        expect(inputDB).to.have.a.property('multiplier', inputUpdated.multiplier);
        expect(inputDB).to.have.a.property('units', inputUpdated.units);
        expect(inputDB).to.have.a.property('sharePercentage', inputUpdated.sharePercentage);
        expect(inputDB).to.have.a.property('returnUnits', inputUpdated.returnUnits);
        expect(inputDB).to.have.a.property('salePrice', inputUpdated.salePrice);
        expect(inputDB).to.have.a.property('originalCurrency', inputUpdated.originalCurrency);
        expect(inputDB).to.have.a.property('positiveNegative', inputUpdated.positiveNegative);
        expect(inputDB).to.have.a.property('exchangeRate', inputUpdated.exchangeRate);
        expect(inputDB).to.have.a.property('grossAmount', inputUpdated.grossAmount);
        expect(inputDB).to.have.a.property('netAmount', inputUpdated.netAmount);
        expect(inputDB).to.have.a.property('returnGrossAmount', inputUpdated.returnGrossAmount);
        expect(inputDB).to.have.a.property('returnNetAmount', inputUpdated.returnNetAmount);
        expect(inputDB).to.have.a.property('homeCurrencyGrossAmount', inputUpdated.homeCurrencyGrossAmount);
        expect(inputDB).to.have.a.property('homeCurrencyNetAmount', inputUpdated.homeCurrencyNetAmount);
        expect(inputDB).to.have.a.property('homeCurrencyReturnGrossAmount', inputUpdated.homeCurrencyReturnGrossAmount);
        expect(inputDB).to.have.a.property('homeCurrencyReturnNetAmount', inputUpdated.homeCurrencyReturnNetAmount);
        expect(inputDB).to.have.a.property('perUnitRate', inputUpdated.perUnitRate);
        expect(inputDB).to.have.a.property('homeCurrencyPerUnitRate', inputUpdated.homeCurrencyPerUnitRate);
        expect(inputDB).to.have.a.property('retailPrice', inputUpdated.retailPrice);
        expect(inputDB).to.have.a.property('homeCurrencyRetailPrice', inputUpdated.homeCurrencyRetailPrice);
        expect(inputDB).to.have.a.property('originalPositiveNegative', inputUpdated.originalPositiveNegative);
        expect(inputDB).to.have.a.property('duration', inputUpdated.duration);
        expect(inputDB).to.have.a.property('temp1', inputUpdated.temp1);
        expect(inputDB).to.have.a.property('temp2', inputUpdated.temp2);
        expect(inputDB).to.have.a.property('temp3', inputUpdated.temp3);
        expect(inputDB).to.have.a.property('temp4', inputUpdated.temp4);
        expect(inputDB).to.have.a.property('temp5', inputUpdated.temp5);
        expect(inputDB).to.have.a.property('production', inputUpdated.production);
        expect(inputDB).to.have.a.property('episode', inputUpdated.episode);
        expect(inputDB).to.have.a.property('dateFrom');
        expect(inputDB.dateFrom).to.deep.equal({ value: inputUpdated.dateFrom });
        expect(inputDB).to.have.a.property('dateTo');
        expect(inputDB.dateTo).to.deep.equal({ value: inputUpdated.dateTo });
        expect(inputDB).to.have.a.property('party1', inputUpdated.party1);
        expect(inputDB).to.have.a.property('party2', inputUpdated.party2);
        expect(inputDB).to.have.a.property('party3', inputUpdated.party3);
        expect(inputDB).to.have.a.property('party4', inputUpdated.party4);
        expect(inputDB).to.have.a.property('party5', inputUpdated.party5);
        expect(inputDB).to.have.a.property('catalogueReleaseTitle', inputUpdated.catalogueReleaseTitle);
        expect(inputDB).to.have.a.property('catalogueReleaseVersion', inputUpdated.catalogueReleaseVersion);
        expect(inputDB).to.have.a.property('catalogueReleaseArtist', inputUpdated.catalogueReleaseArtist);
        expect(inputDB).to.have.a.property('catalogueCatNo', inputUpdated.catalogueCatNo);
        expect(inputDB).to.have.a.property('catalogueReleaseForeignId', inputUpdated.catalogueReleaseForeignId);
        expect(inputDB).to.have.a.property('catalogueBarcode', inputUpdated.catalogueBarcode);
        expect(inputDB).to.have.a.property('ppd', inputUpdated.ppd);
        expect(inputDB).to.have.a.property('proRataAmount', inputUpdated.proRataAmount);
        expect(inputDB).to.have.a.property('catalogueFormat', inputUpdated.catalogueFormat);
        expect(inputDB).to.have.a.property('mechanicalBasisPercentage', inputUpdated.mechanicalBasisPercentage);
        expect(inputDB).to.have.a.property('totalMechanicalAmount', inputUpdated.totalMechanicalAmount);
        expect(inputDB).to.have.a.property('catalogueTrackTitle', inputUpdated.catalogueTrackTitle);
        expect(inputDB).to.have.a.property('catalogueTrackVersion', inputUpdated.catalogueTrackVersion);
        expect(inputDB).to.have.a.property('catalogueTrackArtist', inputUpdated.catalogueTrackArtist);
        expect(inputDB).to.have.a.property('catalogueIsrc', inputUpdated.catalogueIsrc);
        expect(inputDB).to.have.a.property('catalogueTrackForeignId', inputUpdated.catalogueTrackForeignId);
        expect(inputDB).to.have.a.property('mechanicalRate', inputUpdated.mechanicalRate);
        expect(inputDB).to.have.a.property('catalogueWorkTitle', inputUpdated.catalogueWorkTitle);
        expect(inputDB).to.have.a.property('catalogueWorkComposer', inputUpdated.catalogueWorkComposer);
        expect(inputDB).to.have.a.property('catalogueIdentifier', inputUpdated.catalogueIdentifier);
        expect(inputDB).to.have.a.property('catalogueWorkForeignId', inputUpdated.catalogueWorkForeignId);
        expect(inputDB).to.have.a.property('catalogueIswc', inputUpdated.catalogueIswc);
        expect(inputDB).to.have.a.property('catalogueTunecode', inputUpdated.catalogueTunecode);
        expect(inputDB.catalogueContractIds).to.equal(inputUpdated.catalogueContractIds);
        expect(inputDB).to.have.a.property('discountAmount', inputUpdated.discountAmount);
        expect(inputDB).to.have.a.property('mechanicalAtSource', inputUpdated.mechanicalAtSource);
        expect(inputDB).to.have.a.property('homeCurrencyDiscountAmount', inputUpdated.homeCurrencyDiscountAmount);
        expect(inputDB).to.have.a.property(
          'homeCurrencyMechanicalAtSource',
          inputUpdated.homeCurrencyMechanicalAtSource
        );
        done();
      });
    });

    describe('should get distinct values', () => {
      const distinct1 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
      };
      const distinct2 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
      };
      const distinct3 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
      };
      const distinct1Copy = {
        id: testUtils.randomId(),
        salesFileId: distinct1.salesFileId,
      };

      let distinctResult;

      beforeEach((done) => {
        async.waterfall(
          [
            function (cb) {
              bigQuery.deleteData(bigQuery.inputTable, { id: { $exists: true } }, () => {
                cb();
              });
            },
            function (cb) {
              bigQuery.setupFile(() => {
                bigQuery.writeToFile([distinct1, distinct2, distinct3, distinct1Copy], () => {
                  bigQuery.writeFileToDb(bigQuery.inputTable, (err) => {
                    if (err) {
                      logger.error(err);
                    }

                    cb();
                  });
                });
              });
            },
            function () {
              bigQuery.getDistinct(bigQuery.inputTable, 'salesFileId', { id: { $exists: true } }, (err, data) => {
                distinctResult = data;
                done(err);
              });
            },
          ],
          (err) => {
            done(err);
          }
        );
      });

      it('should get distinct salesFileId values', (done) => {
        expect(distinctResult.sort()).to.deep.equal(
          [distinct1.salesFileId, distinct2.salesFileId, distinct3.salesFileId].sort()
        );
        done();
      });
    });

    describe('should get multiple distinct values', () => {
      const distinct1 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        releaseId: testUtils.randomId(),
      };
      const distinct2 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        releaseId: testUtils.randomId(),
      };
      const distinct3 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        releaseId: testUtils.randomId(),
      };
      const distinct1Copy = {
        id: testUtils.randomId(),
        salesFileId: distinct1.salesFileId,
        releaseId: distinct1.releaseId,
      };

      let distinctResult;

      beforeEach((done) => {
        async.waterfall(
          [
            function (cb) {
              bigQuery.deleteData(bigQuery.inputTable, { id: { $exists: true } }, () => {
                cb();
              });
            },
            function (cb) {
              bigQuery.setupFile(() => {
                bigQuery.writeToFile([distinct1, distinct2, distinct3, distinct1Copy], () => {
                  bigQuery.writeFileToDb(bigQuery.inputTable, (err) => {
                    if (err) {
                      logger.error(err);
                    }

                    cb();
                  });
                });
              });
            },
            function () {
              bigQuery.getMultiDistinct(
                bigQuery.inputTable,
                ['salesFileId', 'releaseId'],
                { id: { $exists: true } },
                (err, data) => {
                  distinctResult = data;
                  done(err);
                }
              );
            },
          ],
          (err) => {
            done(err);
          }
        );
      });

      function sortMultiDistinct(a, b) {
        if (a.releaseId < b.releaseId) {
          return -1;
        }
        if (a.releaseId > b.releaseId) {
          return 1;
        }
        return 0;
      }

      it('should get distinct salesFileId and releaseId values', (done) => {
        delete distinct1.id;
        delete distinct2.id;
        delete distinct3.id;

        expect(distinctResult.sort(sortMultiDistinct)).to.deep.equal(
          [distinct1, distinct2, distinct3].sort(sortMultiDistinct)
        );
        done();
      });
    });
  });

  describe('joinQueries', () => {
    describe('getAggregate', () => {
      let aggregate;

      const periodId1 = testUtils.randomId();
      const periodId2 = testUtils.randomId();
      const releaseId1 = testUtils.randomId();
      const releaseId2 = testUtils.randomId();

      const output1Period1 = {
        periodId: periodId1,
        contractId: testUtils.randomId(),
        releaseId: releaseId1,
        salesFileId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
      };

      const output2Period1 = {
        periodId: periodId1,
        contractId: testUtils.randomId(),
        releaseId: releaseId1,
        salesFileId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
      };

      const output3Period1 = {
        periodId: periodId1,
        contractId: testUtils.randomId(),
        releaseId: releaseId1,
        salesFileId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
      };

      const output1Period2 = {
        periodId: periodId2,
        contractId: testUtils.randomId(),
        releaseId: releaseId1,
        salesFileId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
      };

      const output2Period2 = {
        periodId: periodId2,
        contractId: testUtils.randomId(),
        releaseId: releaseId2,
        salesFileId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
      };

      beforeEach((done) => {
        writeToDb(
          [output1Period1, output2Period1, output3Period1, output1Period2, output2Period2],
          bigQuery.outputTable,
          (err) => {
            if (err) {
              logger.error(err);
            }
            // Get period1 aggregate
            bigQuery.getAggregate(
              bigQuery.outputTable,
              [
                {
                  column: 'periodId',
                  isSelector: true,
                  isGroupBy: true,
                },
                {
                  column: 'releaseId',
                  isSelector: true,
                  isGroupBy: true,
                },
              ],
              [
                { column: 'units', displayAs: 'units' },
                { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' },
              ],
              'lines',
              { periodId: periodId1 },
              (aggErr, data) => {
                aggregate = data[0];
                done();
              }
            );
          }
        );
      });

      it('should return the right result', (done) => {
        expect(aggregate).to.exist;
        expect(aggregate.periodId).to.eq(periodId1);
        expect(aggregate.releaseId).to.eq(releaseId1);
        expect(aggregate.units).to.eq(output1Period1.units + output2Period1.units + output3Period1.units);
        expect(aggregate.grossRevenue).to.eq(
          output1Period1.homeCurrencyNetAmount +
            output2Period1.homeCurrencyNetAmount +
            output3Period1.homeCurrencyNetAmount
        );
        expect(aggregate.lines).to.eq(3);
        done();
      });
    });

    describe('getSalesInputAggregate', () => {
      let aggregate;

      const periodId = testUtils.randomId();
      const contractId = testUtils.randomId();

      const input1 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        contractId,
      };

      const input2 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        contractId,
      };

      const input3 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        contractId,
      };

      const output1Input1 = {
        periodId,
        contractId,
        salesFileId: input1.salesFileId,
        salesLineId: input1.id,
      };

      const output2Input1 = {
        periodId,
        contractId,
        salesFileId: input1.salesFileId,
        salesLineId: input1.id,
      };

      const output1Input2 = {
        periodId,
        contractId,
        salesFileId: input2.salesFileId,
        salesLineId: input2.id,
      };

      const output2Input2 = {
        periodId,
        contractId,
        salesFileId: input2.salesFileId,
        salesLineId: input2.id,
      };

      const output1Input3 = {
        periodId,
        contractId,
        salesFileId: input3.salesFileId,
        salesLineId: input3.id,
      };

      const output2Input3 = {
        periodId,
        contractId,
        salesFileId: input3.salesFileId,
        salesLineId: input3.id,
      };

      beforeEach((done) => {
        async.series(
          [
            function (cb) {
              writeToDb([input1, input2, input3], bigQuery.inputTable, cb);
            },
            function (cb) {
              writeToDb(
                [output1Input1, output2Input1, output1Input2, output2Input2, output1Input3, output2Input3],
                bigQuery.outputTable,
                cb
              );
            },
            function (cb) {
              bigQuery.getSalesInputAggregate(
                'periodId',
                [
                  { column: 'units', displayAs: 'units' },
                  { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' },
                ],
                'lines',
                { periodId },
                (err, data) => {
                  aggregate = data[0];
                  cb();
                }
              );
            },
          ],
          done
        );
      });

      it('should return ther right result', (done) => {
        expect(aggregate.units).to.eq(input1.units + input2.units + input3.units);
        expect(aggregate.grossRevenue).to.eq(
          input1.homeCurrencyNetAmount + input2.homeCurrencyNetAmount + input3.homeCurrencyNetAmount
        );
        expect(aggregate.lines).to.eq(3);
        expect(aggregate).to.exist;
        done();
      });
    });

    describe('joinSalesCalculationFilter', () => {
      let aggregate;

      const periodId = testUtils.randomId();
      const contractId1 = testUtils.randomId();
      const contractId2 = testUtils.randomId();

      const input1 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        contractId: contractId1,
        catalogueContractIds: `${contractId1},${contractId2}`,
      };

      const input2 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        contractId: contractId1,
        catalogueContractIds: `${contractId1},${contractId2}`,
      };

      const input3 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        contractId: contractId1,
        catalogueContractIds: `${contractId1},${contractId2}`,
      };

      const output1Input1 = {
        periodId,
        contractId: testUtils.randomId(),
        salesFileId: input1.salesFileId,
        salesLineId: input1.id,
      };

      const output2Input1 = {
        periodId,
        contractId: testUtils.randomId(),
        salesFileId: input1.salesFileId,
        salesLineId: input1.id,
      };

      const output1Input2 = {
        periodId,
        contractId: testUtils.randomId(),
        salesFileId: input2.salesFileId,
        salesLineId: input2.id,
      };

      const output2Input2 = {
        periodId,
        contractId: testUtils.randomId(),
        salesFileId: input2.salesFileId,
        salesLineId: input2.id,
      };

      const output1Input3 = {
        periodId,
        contractId: testUtils.randomId(),
        salesFileId: input3.salesFileId,
        salesLineId: input3.id,
      };

      const output2Input3 = {
        periodId,
        contractId: testUtils.randomId(),
        salesFileId: input3.salesFileId,
        salesLineId: input3.id,
      };

      const selectFields = [
        'id',
        'contractId',
        'salesFileId',
        'catType',
        'releaseId',
        'trackId',
        'workId',
        'distributionChannel',
        'configuration',
        'priceCategory',
        'territory',
        'saleDate',
        'transactionDate',
        'source',
        'subSource',
        'description',
        'units',
        'sharePercentage',
        'returnUnits',
        'salePrice',
        'originalCurrency',
        'exchangeRate',
        'grossAmount',
        'netAmount',
        'homeCurrencyGrossAmount',
        'homeCurrencyNetAmount',
        'perUnitRate',
        'homeCurrencyPerUnitRate',
        'retailPrice',
        'homeCurrencyRetailPrice',
        'duration',
        'production',
        'episode',
        'dateFrom',
        'dateTo',
        'catalogueReleaseTitle',
        'catalogueReleaseVersion',
        'catalogueReleaseArtist',
        'catalogueCatNo',
        'catalogueReleaseForeignId',
        'catalogueBarcode',
        'ppd',
        'proRataAmount',
        'catalogueFormat',
        'mechanicalBasisPercentage',
        'totalMechanicalAmount',
        'catalogueTrackTitle',
        'catalogueTrackVersion',
        'catalogueTrackArtist',
        'catalogueIsrc',
        'catalogueTrackForeignId',
        'mechanicalRate',
        'catalogueWorkTitle',
        'catalogueWorkComposer',
        'catalogueIdentifier',
        'catalogueWorkForeignId',
        'catalogueIswc',
        'catalogueTunecode',
        'status',
      ];
      const distinctFields = [
        'id',
        'contractId',
        'salesFileId',
        'catType',
        'releaseId',
        'trackId',
        'workId',
        'distributionChannel',
        'configuration',
        'priceCategory',
        'territory',
        'saleDate',
        'transactionDate',
        'source',
        'subSource',
        'description',
        'units',
        'sharePercentage',
        'returnUnits',
        'salePrice',
        'originalCurrency',
        'exchangeRate',
        'grossAmount',
        'netAmount',
        'homeCurrencyGrossAmount',
        'homeCurrencyNetAmount',
        'perUnitRate',
        'homeCurrencyPerUnitRate',
        'retailPrice',
        'homeCurrencyRetailPrice',
        'duration',
        'production',
        'episode',
        'dateFrom',
        'dateTo',
        'catalogueReleaseTitle',
        'catalogueReleaseVersion',
        'catalogueReleaseArtist',
        'catalogueCatNo',
        'catalogueReleaseForeignId',
        'catalogueBarcode',
        'ppd',
        'proRataAmount',
        'catalogueFormat',
        'mechanicalBasisPercentage',
        'totalMechanicalAmount',
        'catalogueTrackTitle',
        'catalogueTrackVersion',
        'catalogueTrackArtist',
        'catalogueIsrc',
        'catalogueTrackForeignId',
        'mechanicalRate',
        'catalogueWorkTitle',
        'catalogueWorkComposer',
        'catalogueIdentifier',
        'catalogueWorkForeignId',
        'catalogueIswc',
        'catalogueTunecode',
        'status',
      ];

      const timestamp = moment().format('YYYYMMDDHHmmSSssss');

      let offset;
      let offsetResult1;
      let offsetResult2;
      let offsetResult3;

      beforeEach((done) => {
        offset = 0;
        async.series(
          [
            function (cb) {
              writeToDb([input1, input2, input3], bigQuery.inputTable, cb);
            },
            function (cb) {
              writeToDb(
                [output1Input1, output2Input1, output1Input2, output2Input2, output1Input3, output2Input3],
                bigQuery.outputTable,
                cb
              );
            },
            // get All Data
            function (cb) {
              const filter = { limit: 10, offset, orderBy: 'id', uniqueValue: `${contractId1}-${timestamp}` };
              bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, {}, filter, (err, data) => {
                aggregate = data;
                cb();
              });
            },
            // Get 1st offseted result
            function (cb) {
              const filter = { limit: 1, offset, orderBy: 'id', uniqueValue: `${contractId1}-${timestamp}` };
              bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, {}, filter, (err, data) => {
                if (data) {
                  offsetResult1 = data[0];
                } else {
                  offsetResult1 = null;
                }
                cb(err);
              });
            },
            // Get 2nd offseted result
            function (cb) {
              offset += 1;
              const filter = { limit: 1, offset, orderBy: 'id', uniqueValue: `${contractId1}-${timestamp}` };
              bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, {}, filter, (err, data) => {
                if (data) {
                  offsetResult2 = data[0];
                } else {
                  offsetResult2 = null;
                }
                cb(err);
              });
            },
            // Get 1st offseted result
            function (cb) {
              offset += 1;
              const filter = { limit: 1, offset, orderBy: 'id', uniqueValue: `${contractId1}-${timestamp}` };
              bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, {}, filter, (err, data) => {
                if (data) {
                  offsetResult3 = data[0];
                } else {
                  offsetResult3 = null;
                }
                cb(err);
              });
            },
          ],
          done
        );
      });

      it('should return the right result', (done) => {
        expect(aggregate).to.exist;
        expect(aggregate.length).to.eq(3);
        expect(aggregate).to.satisfy(() => {
          let valid = true;
          let contractIds;

          aggregate.map((line) => {
            switch (line.id) {
              case input1.id:
                contractIds = [output1Input1.contractId, output2Input1.contractId];
                break;
              case input2.id:
                contractIds = [output1Input2.contractId, output2Input2.contractId];
                break;
              case input3.id:
                contractIds = [output1Input3.contractId, output2Input3.contractId];
                break;
              default:
                break;
            }

            contractIds.map((id) => {
              if (line.contractIds.indexOf(id) === -1) {
                valid = false;
              }
            });
          });

          return valid;
        });
        done();
      });

      it('should limit as expected', (done) => {
        const limit = 1;
        bigQuery.joinSalesCalculationFilter(
          selectFields,
          distinctFields,
          {},
          {
            limit,
            offset: 0,
            orderBy: 'id',
            uniqueValue: `${contractId1}-${timestamp}`,
          },
          (err, data) => {
            expect(data.length).to.eq(1);
            done();
          }
        );
      });

      it('should offset as expected', (done) => {
        expect(offsetResult1).to.exist;
        expect(offsetResult2).to.exist;
        expect(offsetResult3).to.exist;
        expect(offsetResult1 !== offsetResult2).to.be.true;
        expect(offsetResult1 !== offsetResult3).to.be.true;

        done();
      });
    });

    describe('joinSalesFilter', () => {
      let aggregate;

      const periodId = testUtils.randomId();
      const contractId = testUtils.randomId();
      const releaseId = testUtils.randomId();

      // Is NOT in the output table : Should return it
      const input1 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        releaseId,
        distributionChannel: 'Digital',
        catalogueContractIds: `${testUtils.randomId()},${testUtils.randomId()}`,
      };

      // Is in the output table with a diffrent contractId : Should return it
      const input2 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        releaseId,
        catalogueContractIds: `${testUtils.randomId()},${testUtils.randomId()}`,
      };

      // Is in the output table with the same contractId : Should NOT return it
      const input3 = {
        id: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        units: testUtils.randomFloat(),
        homeCurrencyNetAmount: testUtils.randomFloat(),
        releaseId,
        catalogueContractIds: `${contractId},${testUtils.randomId()}`,
      };

      const output1 = {
        periodId,
        contractId: testUtils.randomId(),
        salesFileId: input2.salesFileId,
        salesLineId: input2.id,
      };

      const output2 = {
        periodId,
        contractId,
        salesFileId: input3.salesFileId,
        salesLineId: input3.id,
      };

      beforeEach((done) => {
        async.series(
          [
            function (cb) {
              writeToDb([input1, input2, input3], bigQuery.inputTable, cb);
            },
            function (cb) {
              writeToDb([output1, output2], bigQuery.outputTable, cb);
            },
            function (cb) {
              const salesInputColumns = ['id', 'salesFileId', 'releaseId'];
              const salesOutputColumns = ['salesLineId'];
              const filter = { 'Input.releaseId': releaseId };

              bigQuery.joinSalesFilter(salesInputColumns, salesOutputColumns, filter, contractId, {}, (err, data) => {
                aggregate = data;

                cb();
              });
            },
          ],
          done
        );
      });

      // Should return Input1 and Input2 : Sales that are not in the output table or are in the output table with a different contract id
      it('should return the right result', (done) => {
        expect(aggregate).to.exist;
        expect(aggregate.length).to.eq(2);
        expect(aggregate[0]).to.satisfy((line) => {
          if (line.id === input1.id || line.id === input2.id) {
            return true;
          }
          return false;
        });
        expect(aggregate[1]).to.satisfy((line) => {
          if (line.id === input1.id || line.id === input2.id) {
            return true;
          }
          return false;
        });
        done();
      });
    });
  });

  describe('outputTable', () => {
    function updateObj(obj) {
      const update = {};
      for (const key in obj) {
        // ignore periodId
        if (key === 'periodId') {
          // Ignore
        } else if (['saleDate', 'transactionDate', 'dateFrom', 'dateTo'].indexOf(key) !== -1) {
          // update dates
          update[key] = testUtils.randomDate();
        } else if (['priceCategoryDealerPrices'].indexOf(key) !== -1) {
          // update arrays
          // TODO  Fix arrays not updating..
          // update[key] = testUtils.randomArray();
        } else if (
          [
            'units',
            'sharePercentage',
            'share',
            'returnUnits',
            'salePrice',
            'exchangeRate',
            'grossAmount',
            'netAmount',
            'homeCurrencyGrossAmount',
            'homeCurrencyNetAmount',
            'perUnitRate',
            'homeCurrencyPerUnitRate',
            'retailPrice',
            'homeCurrencyRetailPrice',
            'ppd',
            'proRataAmount',
            'mechanicalBasisPercentage',
            'totalMechanicalAmount',
            'mechanicalRate',
            'objectPercentage',
            'proRataTrackAmount',
            'multiplier',
            'royaltyRate',
            'unitRate',
            'reductionRate',
            'calculationInput',
            'deduction',
            'deductionUnitRate',
            'deductionRate',
            'withholdingTax',
            'withholdingTaxUnitRate',
            'withholdingTaxRate',
            'mechanicalAmount',
            'mechanicalDeduction',
            'mechanicalPercentage',
            'calculationOutput',
            'reserveRate',
            'reserve',
          ].indexOf(key) !== -1
        ) {
          // update numbers
          update[key] = testUtils.randomFloat();
        } else {
          update[key] = testUtils.randomString();
        }
      }

      return update;
    }

    const output = {
      periodId: testUtils.randomId(),
      contractId: testUtils.randomId(),
      contractName: testUtils.randomString(),
      salesFileId: testUtils.randomId(),
      salesLineId: testUtils.randomId(),
      catType: testUtils.randomString(),
      releaseId: testUtils.randomId(),
      trackId: testUtils.randomId(),
      workId: testUtils.randomId(),
      distributionChannel: testUtils.randomString(),
      configuration: testUtils.randomString(),
      priceCategory: testUtils.randomString(),
      territory: testUtils.randomString(),
      saleDate: testUtils.randomDate(),
      transactionDate: testUtils.randomDate(),
      source: testUtils.randomString(),
      subSource: testUtils.randomString(),
      description: testUtils.randomString(),
      units: testUtils.randomFloat(),
      sharePercentage: testUtils.randomFloat(),
      share: testUtils.randomFloat(),
      returnUnits: testUtils.randomFloat(),
      salePrice: testUtils.randomFloat(),
      originalCurrency: testUtils.randomString(),
      exchangeRate: testUtils.randomFloat(),
      grossAmount: testUtils.randomFloat(),
      netAmount: testUtils.randomFloat(),
      homeCurrencyGrossAmount: testUtils.randomFloat(),
      homeCurrencyNetAmount: testUtils.randomFloat(),
      perUnitRate: testUtils.randomFloat(),
      homeCurrencyPerUnitRate: testUtils.randomFloat(),
      retailPrice: testUtils.randomFloat(),
      homeCurrencyRetailPrice: testUtils.randomFloat(),
      duration: testUtils.randomString(),
      production: testUtils.randomString(),
      episode: testUtils.randomString(),
      dateFrom: testUtils.randomDate(),
      dateTo: testUtils.randomDate(),
      catalogueReleaseTitle: testUtils.randomString(),
      catalogueReleaseVersion: testUtils.randomString(),
      catalogueReleaseArtist: testUtils.randomString(),
      catalogueLabel: testUtils.randomString(),
      catalogueCatNo: testUtils.randomString(),
      catalogueReleaseForeignId: testUtils.randomString(),
      catalogueBarcode: testUtils.randomString(),
      ppd: testUtils.randomFloat(),
      proRataAmount: testUtils.randomFloat(),
      priceCategoryDealerPrices: testUtils.randomArray(),
      catalogueFormat: testUtils.randomString(),
      mechanicalBasisPercentage: testUtils.randomFloat(),
      totalMechanicalAmount: testUtils.randomFloat(),
      catalogueTrackTitle: testUtils.randomString(),
      catalogueTrackVersion: testUtils.randomString(),
      catalogueTrackArtist: testUtils.randomString(),
      catalogueIsrc: testUtils.randomString(),
      catalogueTrackForeignId: testUtils.randomString(),
      mechanicalRate: testUtils.randomFloat(),
      catalogueWorkTitle: testUtils.randomString(),
      catalogueWorkComposer: testUtils.randomString(),
      catalogueIdentifier: testUtils.randomString(),
      catalogueWorkForeignId: testUtils.randomString(),
      catalogueIswc: testUtils.randomString(),
      catalogueTunecode: testUtils.randomString(),
      licenseNo: testUtils.randomString(),
      objectPercentage: testUtils.randomFloat(),
      proRataTrackAmount: testUtils.randomFloat(),
      multiplier: testUtils.randomFloat(),
      royaltyRate: testUtils.randomFloat(),
      unitRate: testUtils.randomFloat(),
      reductionRate: testUtils.randomFloat(),
      calculationInput: testUtils.randomFloat(),
      calculationType: testUtils.randomString(),
      deduction: testUtils.randomFloat(),
      deductionUnitRate: testUtils.randomFloat(),
      deductionRate: testUtils.randomFloat(),
      deductionCalculationType: testUtils.randomString(),
      deductionType: testUtils.randomString(),
      withholdingTax: testUtils.randomFloat(),
      withholdingTaxUnitRate: testUtils.randomFloat(),
      withholdingTaxRate: testUtils.randomFloat(),
      withholdingTaxCalculationType: testUtils.randomString(),
      withholdingTaxType: testUtils.randomString(),
      mechanicalAmount: testUtils.randomFloat(),
      mechanicalDeduction: testUtils.randomFloat(),
      mechanicalPercentage: testUtils.randomFloat(),
      mechanicalType: testUtils.randomString(),
      mechanicalDeductionType: testUtils.randomString(),
      mechanicalCurrency: testUtils.randomString(),
      calculationOutput: testUtils.randomFloat(),
      reserveRate: testUtils.randomFloat(),
      reserve: testUtils.randomFloat(),
    };

    let outputDB;
    beforeEach((done) => {
      writeToDb([output], bigQuery.outputTable, () => {
        bigQuery.getData(bigQuery.outputTable, '*', { periodId: output.periodId }, {}, (err, data) => {
          if (err) {
            logger.error(err);
          }

          outputDB = data[0];
          done();
        });
      });
    });

    it('should save to the database', (done) => {
      expect(outputDB).to.have.a.property('periodId', output.periodId);
      expect(outputDB).to.have.a.property('contractId', output.contractId);
      expect(outputDB).to.have.a.property('contractName', output.contractName);
      expect(outputDB).to.have.a.property('salesFileId', output.salesFileId);
      expect(outputDB).to.have.a.property('salesLineId', output.salesLineId);
      expect(outputDB).to.have.a.property('catType', output.catType);
      expect(outputDB).to.have.a.property('releaseId', output.releaseId);
      expect(outputDB).to.have.a.property('trackId', output.trackId);
      expect(outputDB).to.have.a.property('workId', output.workId);
      expect(outputDB).to.have.a.property('distributionChannel', output.distributionChannel);
      expect(outputDB).to.have.a.property('configuration', output.configuration);
      expect(outputDB).to.have.a.property('priceCategory', output.priceCategory);
      expect(outputDB).to.have.a.property('territory', output.territory);
      expect(outputDB).to.have.a.property('saleDate');
      expect(outputDB.saleDate).to.deep.equal({ value: output.saleDate });
      expect(outputDB).to.have.a.property('transactionDate');
      expect(outputDB.transactionDate).to.deep.equal({ value: output.transactionDate });
      expect(outputDB).to.have.a.property('source', output.source);
      expect(outputDB).to.have.a.property('subSource', output.subSource);
      expect(outputDB).to.have.a.property('description', output.description);
      expect(outputDB).to.have.a.property('units', output.units);
      expect(outputDB).to.have.a.property('sharePercentage', output.sharePercentage);
      expect(outputDB).to.have.a.property('share', output.share);
      expect(outputDB).to.have.a.property('returnUnits', output.returnUnits);
      expect(outputDB).to.have.a.property('salePrice', output.salePrice);
      expect(outputDB).to.have.a.property('originalCurrency', output.originalCurrency);
      expect(outputDB).to.have.a.property('exchangeRate', output.exchangeRate);
      expect(outputDB).to.have.a.property('grossAmount', output.grossAmount);
      expect(outputDB).to.have.a.property('netAmount', output.netAmount);
      expect(outputDB).to.have.a.property('homeCurrencyGrossAmount', output.homeCurrencyGrossAmount);
      expect(outputDB).to.have.a.property('homeCurrencyNetAmount', output.homeCurrencyNetAmount);
      expect(outputDB).to.have.a.property('perUnitRate', output.perUnitRate);
      expect(outputDB).to.have.a.property('homeCurrencyPerUnitRate', output.homeCurrencyPerUnitRate);
      expect(outputDB).to.have.a.property('retailPrice', output.retailPrice);
      expect(outputDB).to.have.a.property('homeCurrencyRetailPrice', output.homeCurrencyRetailPrice);
      expect(outputDB).to.have.a.property('duration', output.duration);
      expect(outputDB).to.have.a.property('production', output.production);
      expect(outputDB).to.have.a.property('episode', output.episode);
      expect(outputDB).to.have.a.property('dateFrom');
      expect(outputDB.dateFrom).to.deep.equal({ value: output.dateFrom });
      expect(outputDB).to.have.a.property('dateTo');
      expect(outputDB.dateTo).to.deep.equal({ value: output.dateTo });
      expect(outputDB).to.have.a.property('catalogueReleaseTitle', output.catalogueReleaseTitle);
      expect(outputDB).to.have.a.property('catalogueReleaseVersion', output.catalogueReleaseVersion);
      expect(outputDB).to.have.a.property('catalogueReleaseArtist', output.catalogueReleaseArtist);
      expect(outputDB).to.have.a.property('catalogueLabel', output.catalogueLabel);
      expect(outputDB).to.have.a.property('catalogueCatNo', output.catalogueCatNo);
      expect(outputDB).to.have.a.property('catalogueReleaseForeignId', output.catalogueReleaseForeignId);
      expect(outputDB).to.have.a.property('catalogueBarcode', output.catalogueBarcode);
      expect(outputDB).to.have.a.property('ppd', output.ppd);
      expect(outputDB).to.have.a.property('proRataAmount', output.proRataAmount);
      expect(outputDB).to.have.a.property('priceCategoryDealerPrices');
      expect(outputDB.priceCategoryDealerPrices).to.deep.equal(output.priceCategoryDealerPrices);
      expect(outputDB).to.have.a.property('catalogueFormat', output.catalogueFormat);
      expect(outputDB).to.have.a.property('mechanicalBasisPercentage', output.mechanicalBasisPercentage);
      expect(outputDB).to.have.a.property('totalMechanicalAmount', output.totalMechanicalAmount);
      expect(outputDB).to.have.a.property('catalogueTrackTitle', output.catalogueTrackTitle);
      expect(outputDB).to.have.a.property('catalogueTrackVersion', output.catalogueTrackVersion);
      expect(outputDB).to.have.a.property('catalogueTrackArtist', output.catalogueTrackArtist);
      expect(outputDB).to.have.a.property('catalogueIsrc', output.catalogueIsrc);
      expect(outputDB).to.have.a.property('catalogueTrackForeignId', output.catalogueTrackForeignId);
      expect(outputDB).to.have.a.property('mechanicalRate', output.mechanicalRate);
      expect(outputDB).to.have.a.property('catalogueWorkTitle', output.catalogueWorkTitle);
      expect(outputDB).to.have.a.property('catalogueWorkComposer', output.catalogueWorkComposer);
      expect(outputDB).to.have.a.property('catalogueIdentifier', output.catalogueIdentifier);
      expect(outputDB).to.have.a.property('catalogueWorkForeignId', output.catalogueWorkForeignId);
      expect(outputDB).to.have.a.property('catalogueIswc', output.catalogueIswc);
      expect(outputDB).to.have.a.property('catalogueTunecode', output.catalogueTunecode);
      expect(outputDB).to.have.a.property('licenseNo', output.licenseNo);
      expect(outputDB).to.have.a.property('objectPercentage', output.objectPercentage);
      expect(outputDB).to.have.a.property('proRataTrackAmount', output.proRataTrackAmount);
      expect(outputDB).to.have.a.property('multiplier', output.multiplier);
      expect(outputDB).to.have.a.property('royaltyRate', output.royaltyRate);
      expect(outputDB).to.have.a.property('unitRate', output.unitRate);
      expect(outputDB).to.have.a.property('reductionRate', output.reductionRate);
      expect(outputDB).to.have.a.property('calculationInput', output.calculationInput);
      expect(outputDB).to.have.a.property('calculationType', output.calculationType);
      expect(outputDB).to.have.a.property('deduction', output.deduction);
      expect(outputDB).to.have.a.property('deductionUnitRate', output.deductionUnitRate);
      expect(outputDB).to.have.a.property('deductionRate', output.deductionRate);
      expect(outputDB).to.have.a.property('deductionCalculationType', output.deductionCalculationType);
      expect(outputDB).to.have.a.property('deductionType', output.deductionType);
      expect(outputDB).to.have.a.property('withholdingTax', output.withholdingTax);
      expect(outputDB).to.have.a.property('withholdingTaxUnitRate', output.withholdingTaxUnitRate);
      expect(outputDB).to.have.a.property('withholdingTaxRate', output.withholdingTaxRate);
      expect(outputDB).to.have.a.property('withholdingTaxCalculationType', output.withholdingTaxCalculationType);
      expect(outputDB).to.have.a.property('withholdingTaxType', output.withholdingTaxType);
      expect(outputDB).to.have.a.property('mechanicalAmount', output.mechanicalAmount);
      expect(outputDB).to.have.a.property('mechanicalDeduction', output.mechanicalDeduction);
      expect(outputDB).to.have.a.property('mechanicalPercentage', output.mechanicalPercentage);
      expect(outputDB).to.have.a.property('mechanicalType', output.mechanicalType);
      expect(outputDB).to.have.a.property('mechanicalDeductionType', output.mechanicalDeductionType);
      expect(outputDB).to.have.a.property('mechanicalCurrency', output.mechanicalCurrency);
      expect(outputDB).to.have.a.property('calculationOutput', output.calculationOutput);
      expect(outputDB).to.have.a.property('reserveRate', output.reserveRate);
      expect(outputDB).to.have.a.property('reserve', output.reserve);
      done();
    });

    describe('should update the database', () => {
      let outputUpdated;

      beforeEach((done) => {
        outputUpdated = updateObj(output);
        bigQuery.updateData(bigQuery.outputTable, { periodId: output.periodId }, outputUpdated, (err, update) => {
          if (err) {
            logger.error(err);
          }

          bigQuery.getData(bigQuery.outputTable, '*', {}, {}, (dataErr, data) => {
            if (dataErr) {
              logger.error(dataErr);
            }

            outputDB = data[0];
            done();
          });
        });
      });

      it('should have updated all the fields', (done) => {
        expect(outputDB).to.have.a.property('contractName', outputUpdated.contractName);
        expect(outputDB).to.have.a.property('salesFileId', outputUpdated.salesFileId);
        expect(outputDB).to.have.a.property('salesLineId', outputUpdated.salesLineId);
        expect(outputDB).to.have.a.property('catType', outputUpdated.catType);
        expect(outputDB).to.have.a.property('releaseId', outputUpdated.releaseId);
        expect(outputDB).to.have.a.property('trackId', outputUpdated.trackId);
        expect(outputDB).to.have.a.property('workId', outputUpdated.workId);
        expect(outputDB).to.have.a.property('distributionChannel', outputUpdated.distributionChannel);
        expect(outputDB).to.have.a.property('configuration', outputUpdated.configuration);
        expect(outputDB).to.have.a.property('periodId', output.periodId);
        expect(outputDB).to.have.a.property('contractId', outputUpdated.contractId);
        expect(outputDB).to.have.a.property('priceCategory', outputUpdated.priceCategory);
        expect(outputDB).to.have.a.property('territory', outputUpdated.territory);
        expect(outputDB).to.have.a.property('saleDate');
        expect(outputDB.saleDate).to.deep.equal({ value: outputUpdated.saleDate });
        expect(outputDB).to.have.a.property('transactionDate');
        expect(outputDB.transactionDate).to.deep.equal({ value: outputUpdated.transactionDate });
        expect(outputDB).to.have.a.property('source', outputUpdated.source);
        expect(outputDB).to.have.a.property('subSource', outputUpdated.subSource);
        expect(outputDB).to.have.a.property('description', outputUpdated.description);
        expect(outputDB).to.have.a.property('units', outputUpdated.units);
        expect(outputDB).to.have.a.property('sharePercentage', outputUpdated.sharePercentage);
        expect(outputDB).to.have.a.property('share', outputUpdated.share);
        expect(outputDB).to.have.a.property('returnUnits', outputUpdated.returnUnits);
        expect(outputDB).to.have.a.property('salePrice', outputUpdated.salePrice);
        expect(outputDB).to.have.a.property('originalCurrency', outputUpdated.originalCurrency);
        expect(outputDB).to.have.a.property('exchangeRate', outputUpdated.exchangeRate);
        expect(outputDB).to.have.a.property('grossAmount', outputUpdated.grossAmount);
        expect(outputDB).to.have.a.property('netAmount', outputUpdated.netAmount);
        expect(outputDB).to.have.a.property('homeCurrencyGrossAmount', outputUpdated.homeCurrencyGrossAmount);
        expect(outputDB).to.have.a.property('homeCurrencyNetAmount', outputUpdated.homeCurrencyNetAmount);
        expect(outputDB).to.have.a.property('perUnitRate', outputUpdated.perUnitRate);
        expect(outputDB).to.have.a.property('homeCurrencyPerUnitRate', outputUpdated.homeCurrencyPerUnitRate);
        expect(outputDB).to.have.a.property('retailPrice', outputUpdated.retailPrice);
        expect(outputDB).to.have.a.property('homeCurrencyRetailPrice', outputUpdated.homeCurrencyRetailPrice);
        expect(outputDB).to.have.a.property('duration', outputUpdated.duration);
        expect(outputDB).to.have.a.property('production', outputUpdated.production);
        expect(outputDB).to.have.a.property('episode', outputUpdated.episode);
        expect(outputDB).to.have.a.property('dateFrom');
        expect(outputDB.dateFrom).to.deep.equal({ value: outputUpdated.dateFrom });
        expect(outputDB).to.have.a.property('dateTo');
        expect(outputDB.dateTo).to.deep.equal({ value: outputUpdated.dateTo });
        expect(outputDB).to.have.a.property('catalogueReleaseTitle', outputUpdated.catalogueReleaseTitle);
        expect(outputDB).to.have.a.property('catalogueReleaseVersion', outputUpdated.catalogueReleaseVersion);
        expect(outputDB).to.have.a.property('catalogueReleaseArtist', outputUpdated.catalogueReleaseArtist);
        expect(outputDB).to.have.a.property('catalogueLabel', outputUpdated.catalogueLabel);
        expect(outputDB).to.have.a.property('catalogueCatNo', outputUpdated.catalogueCatNo);
        expect(outputDB).to.have.a.property('catalogueReleaseForeignId', outputUpdated.catalogueReleaseForeignId);
        expect(outputDB).to.have.a.property('catalogueBarcode', outputUpdated.catalogueBarcode);
        expect(outputDB).to.have.a.property('ppd', outputUpdated.ppd);
        expect(outputDB).to.have.a.property('proRataAmount', outputUpdated.proRataAmount);
        expect(outputDB).to.have.a.property('catalogueFormat', outputUpdated.catalogueFormat);
        expect(outputDB).to.have.a.property('mechanicalBasisPercentage', outputUpdated.mechanicalBasisPercentage);
        expect(outputDB).to.have.a.property('totalMechanicalAmount', outputUpdated.totalMechanicalAmount);
        expect(outputDB).to.have.a.property('catalogueTrackTitle', outputUpdated.catalogueTrackTitle);
        expect(outputDB).to.have.a.property('catalogueTrackVersion', outputUpdated.catalogueTrackVersion);
        expect(outputDB).to.have.a.property('catalogueIsrc', outputUpdated.catalogueIsrc);
        expect(outputDB).to.have.a.property('catalogueTrackForeignId', outputUpdated.catalogueTrackForeignId);
        expect(outputDB).to.have.a.property('mechanicalRate', outputUpdated.mechanicalRate);
        expect(outputDB).to.have.a.property('catalogueWorkTitle', outputUpdated.catalogueWorkTitle);
        expect(outputDB).to.have.a.property('catalogueWorkComposer', outputUpdated.catalogueWorkComposer);
        expect(outputDB).to.have.a.property('catalogueIdentifier', outputUpdated.catalogueIdentifier);
        expect(outputDB).to.have.a.property('catalogueWorkForeignId', outputUpdated.catalogueWorkForeignId);
        expect(outputDB).to.have.a.property('catalogueIswc', outputUpdated.catalogueIswc);
        expect(outputDB).to.have.a.property('catalogueTunecode', outputUpdated.catalogueTunecode);
        expect(outputDB).to.have.a.property('licenseNo', outputUpdated.licenseNo);
        expect(outputDB).to.have.a.property('objectPercentage', outputUpdated.objectPercentage);
        expect(outputDB).to.have.a.property('proRataTrackAmount', outputUpdated.proRataTrackAmount);
        expect(outputDB).to.have.a.property('multiplier', outputUpdated.multiplier);
        expect(outputDB).to.have.a.property('royaltyRate', outputUpdated.royaltyRate);
        expect(outputDB).to.have.a.property('unitRate', outputUpdated.unitRate);
        expect(outputDB).to.have.a.property('reductionRate', outputUpdated.reductionRate);
        expect(outputDB).to.have.a.property('calculationInput', outputUpdated.calculationInput);
        expect(outputDB).to.have.a.property('calculationType', outputUpdated.calculationType);
        expect(outputDB).to.have.a.property('deduction', outputUpdated.deduction);
        expect(outputDB).to.have.a.property('deductionUnitRate', outputUpdated.deductionUnitRate);
        expect(outputDB).to.have.a.property('deductionRate', outputUpdated.deductionRate);
        expect(outputDB).to.have.a.property('deductionCalculationType', outputUpdated.deductionCalculationType);
        expect(outputDB).to.have.a.property('deductionType', outputUpdated.deductionType);
        expect(outputDB).to.have.a.property('withholdingTax', outputUpdated.withholdingTax);
        expect(outputDB).to.have.a.property('withholdingTaxUnitRate', outputUpdated.withholdingTaxUnitRate);
        expect(outputDB).to.have.a.property('withholdingTaxRate', outputUpdated.withholdingTaxRate);
        expect(outputDB).to.have.a.property(
          'withholdingTaxCalculationType',
          outputUpdated.withholdingTaxCalculationType
        );
        expect(outputDB).to.have.a.property('withholdingTaxType', outputUpdated.withholdingTaxType);
        expect(outputDB).to.have.a.property('mechanicalAmount', outputUpdated.mechanicalAmount);
        expect(outputDB).to.have.a.property('mechanicalDeduction', outputUpdated.mechanicalDeduction);
        expect(outputDB).to.have.a.property('mechanicalPercentage', outputUpdated.mechanicalPercentage);
        expect(outputDB).to.have.a.property('mechanicalType', outputUpdated.mechanicalType);
        expect(outputDB).to.have.a.property('mechanicalDeductionType', outputUpdated.mechanicalDeductionType);
        expect(outputDB).to.have.a.property('mechanicalCurrency', outputUpdated.mechanicalCurrency);
        expect(outputDB).to.have.a.property('calculationOutput', outputUpdated.calculationOutput);
        expect(outputDB).to.have.a.property('reserveRate', outputUpdated.reserveRate);
        expect(outputDB).to.have.a.property('reserve', outputUpdated.reserve);
        expect(outputDB).to.have.a.property('catalogueTrackArtist', outputUpdated.catalogueTrackArtist);
        done();
      });
    });

    describe('should get distinct values', () => {
      const distinct1 = {
        periodId: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
      };
      const distinct2 = {
        periodId: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
      };
      const distinct3 = {
        periodId: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
      };
      const distinct1Copy = {
        periodId: testUtils.randomId(),
        salesFileId: distinct1.salesFileId,
        contractId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
      };

      let distinctResult;

      beforeEach((done) => {
        async.series(
          [
            function (cb) {
              bigQuery.deleteData(bigQuery.outputTable, { periodId: { $exists: true } }, cb);
            },
            function (cb) {
              writeToDb([distinct1, distinct2, distinct3, distinct1Copy], bigQuery.outputTable, cb);
            },
            function (cb) {
              bigQuery.getDistinct(
                bigQuery.outputTable,
                'salesFileId',
                { periodId: { $exists: true } },
                (err, data) => {
                  distinctResult = data;
                  cb();
                }
              );
            },
          ],
          done
        );
      });

      it('should get distinct salesFileId values', (done) => {
        expect(distinctResult.sort()).to.deep.equal(
          [distinct1.salesFileId, distinct2.salesFileId, distinct3.salesFileId].sort()
        );
        done();
      });
    });

    describe('should get multiple distinct values', () => {
      const distinct1 = {
        periodId: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
      };
      const distinct2 = {
        periodId: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
      };
      const distinct3 = {
        periodId: testUtils.randomId(),
        salesFileId: testUtils.randomId(),
        contractId: testUtils.randomId(),
        salesLineId: testUtils.randomId(),
      };

      const distinct1Copy = {
        periodId: testUtils.randomId(),
        salesFileId: distinct1.salesFileId,
        contractId: distinct1.contractId,
        salesLineId: testUtils.randomId(),
      };
      const distinct2Copy = {
        periodId: testUtils.randomId(),
        salesFileId: distinct2.salesFileId,
        contractId: distinct2.contractId,
        salesLineId: testUtils.randomId(),
      };
      const distinct3Copy = {
        periodId: testUtils.randomId(),
        salesFileId: distinct3.salesFileId,
        contractId: distinct3.contractId,
        salesLineId: testUtils.randomId(),
      };

      let distinctResult;

      beforeEach((done) => {
        async.series(
          [
            function (cb) {
              bigQuery.deleteData(bigQuery.outputTable, { periodId: { $exists: true } }, cb);
            },
            function (cb) {
              writeToDb(
                [distinct1, distinct2, distinct3, distinct1Copy, distinct2Copy, distinct3Copy],
                bigQuery.outputTable,
                cb
              );
            },
            function (cb) {
              bigQuery.getMultiDistinct(
                bigQuery.outputTable,
                ['salesFileId', 'contractId'],
                { periodId: { $exists: true } },
                (err, data) => {
                  distinctResult = data;
                  cb();
                }
              );
            },
          ],
          done
        );
      });

      it('should get distinct salesFileId and releaseId values', (done) => {
        delete distinct1.periodId;
        delete distinct1.salesLineId;
        delete distinct2.periodId;
        delete distinct2.salesLineId;
        delete distinct3.periodId;
        delete distinct3.salesLineId;

        expect(distinctResult.map((item) => item.contractId).sort()).to.deep.equal(
          [distinct1, distinct2, distinct3].map((item) => item.contractId).sort()
        );
        done();
      });
    });
  });

  describe('removeLargeParamValues', () => {
    const periodId1 = testUtils.randomId();
    const periodId2 = testUtils.randomId();
    const releaseId1 = testUtils.randomId();
    const releaseId2 = testUtils.randomId();

    const output1Period1 = {
      periodId: periodId1,
      contractId: testUtils.randomId(),
      releaseId: releaseId1,
      salesFileId: testUtils.randomId(),
      salesLineId: testUtils.randomId(),
      units: testUtils.randomFloat(),
      homeCurrencyNetAmount: testUtils.randomFloat(),
    };

    const output2Period1 = {
      periodId: periodId1,
      contractId: testUtils.randomId(),
      releaseId: releaseId1,
      salesFileId: testUtils.randomId(),
      salesLineId: testUtils.randomId(),
      units: testUtils.randomFloat(),
      homeCurrencyNetAmount: testUtils.randomFloat(),
    };

    const output3Period1 = {
      periodId: periodId1,
      contractId: testUtils.randomId(),
      releaseId: releaseId1,
      salesFileId: testUtils.randomId(),
      salesLineId: testUtils.randomId(),
      units: testUtils.randomFloat(),
      homeCurrencyNetAmount: testUtils.randomFloat(),
    };

    const output1Period2 = {
      periodId: periodId2,
      contractId: testUtils.randomId(),
      releaseId: releaseId1,
      salesFileId: testUtils.randomId(),
      salesLineId: testUtils.randomId(),
      units: testUtils.randomFloat(),
      homeCurrencyNetAmount: testUtils.randomFloat(),
    };

    const output2Period2 = {
      periodId: periodId2,
      contractId: testUtils.randomId(),
      releaseId: releaseId2,
      salesFileId: testUtils.randomId(),
      salesLineId: testUtils.randomId(),
      units: testUtils.randomFloat(),
      homeCurrencyNetAmount: testUtils.randomFloat(),
    };

    beforeEach(async () => {
      await new Promise((resolve, reject) => {
        writeToDb(
          [output1Period1, output2Period1, output3Period1, output1Period2, output2Period2],
          bigQuery.outputTable,
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    });

    it('update array params in a query to use a temp table filter', async () => {
      // Arrange
      const query = {
        query: `
          SELECT contractId, units 
          FROM \`${bigQuery.datasetName}.${bigQuery.outputTable}\`
          WHERE contractId IN UNNEST(@contractId0)
        `,
        params: {
          contractId0: [
            output1Period1.contractId,
            output2Period1.contractId,
            output3Period1.contractId,
            output1Period2.contractId,
            // Not including output2Period2.contractId so that the temp table filter can be tested
          ],
        },
      };
      const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes from now

      jest.spyOn(bigQuery, 'createTempTable');

      // Act
      const updatedQuery = await bigQuery.removeLargeParamValues(query, {
        maxArrayParamSize: 3,
        expirationTime: expiryTime,
        tempTablePrefix: 'test',
      });

      // Assert
      // The query should have been updated to use a temp table instead of array params
      const tempTable = await bigQuery.createTempTable.mock.results[0].value;
      expect(updatedQuery).to.deep.equal({
        query: `
          SELECT contractId, units 
          FROM \`${bigQuery.datasetName}.${bigQuery.outputTable}\`
          WHERE EXISTS (SELECT 1 FROM \`${bigQuery.datasetName}.${tempTable.id}\` t WHERE t.contractId0 = contractId)
        `,
        params: {},
      });

      // The updated query should work as expected
      const data = await new Promise((resolve, reject) => {
        bigQuery.query(updatedQuery, (err, data) => (err ? reject(err) : resolve(data)));
      });
      expect(data).to.deep.equal([
        { contractId: output1Period1.contractId, units: output1Period1.units },
        { contractId: output2Period1.contractId, units: output2Period1.units },
        { contractId: output3Period1.contractId, units: output3Period1.units },
        { contractId: output1Period2.contractId, units: output1Period2.units },
      ]);
    });
  });
});
