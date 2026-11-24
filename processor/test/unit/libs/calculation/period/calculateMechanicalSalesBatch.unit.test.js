/* eslint-disable max-len */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/allCostsCsv.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const SalesFile = require('../../../../../models/salesFile');
const Period = require('../../../../../models/period');
const Contract = require('../../../../../models/contract');
const BatchTask = require('../../../../../models/batchTask');
const Task = require('../../../../../models/task');
const Client = require('../../../../../models/client');

const SalesFileController = require('../../../../../libs/salesIngestion/salesFileController');

describe('CalculateMechanicalSalesBatch Unit Tests', () => {
  let CalculateMechanicalSalesBatch;
  let period; let client; let contract; let contracts;
  let db; let bigQuery;
  let salesFile; let runType; let newQuery; let bigQuerySize;
  let salesData;
  let contractQueryStub; let runSalesCalculationStub;
  let completedItemsUpdater;
  let contractSizes; let catalogueCount;
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CalculateMechanicalSalesBatch = rewire('../../../../../libs/calculation/period/calculateMechanicalSalesBatch');

    period = new Period({
      _id: randomId(),
      name: randomString(),
      clientId: randomId(),
      salesFilesIds: [randomId(), randomId()],
      recalculation: {
        salesFiles: [randomString(), randomString()],
        contractIds: [randomString(), randomString()],
      },
    });
    sinon.stub(Period, 'findById').resolves(period);

    client = new Client({ _id: randomId(), name: randomString() });
    sinon.stub(Client, 'findById');
    Client.findById.resolves(client);

    db = { name: randomString() };
    bigQuerySize = randomInt();
    salesData = [{ _id: randomId() }, { _id: randomId() }];
    bigQuery = {
      setupFile: sinon.stub().yields(),
      writeFileToDb: sinon.stub().yields(),
      joinSalesCalculationFilter: sinon.stub().yields(null, salesData),
      filterFromObject: sinon.stub().returns(),
      getSize: sinon.stub().yields(null, [{ count: bigQuerySize }]),
      outputTable: randomString(),
      queryJob: sinon.stub().yields(null, []),
      catalogueIdsToParams: sinon.stub().returns(),
    };
    CalculateMechanicalSalesBatch.__set__('BigQuery', sinon.stub().returns(bigQuery));

    salesFile = new SalesFile({ _id: randomId() });
    sinon.stub(SalesFileController, 'updateReportedStatus');
    SalesFileController.updateReportedStatus.yields();
    sinon.stub(SalesFile, 'find').resolves([salesFile]);

    runType = randomString();

    contract = new Contract({ name: randomString() });
    contracts = [contract];
    sinon.stub(Contract, 'find');

    Contract.find.resolves(contracts);

    newQuery = { type: randomString() };
    contractQueryStub = sinon.stub().yields(null, newQuery);

    runSalesCalculationStub = sinon.stub().yields();

    CalculateMechanicalSalesBatch.__set__('CalculateContract', {
      contractQuery: contractQueryStub,
      runSalesCalculation: runSalesCalculationStub,
      getContractCatalogueIds: sinon.stub().yields(null, { releases: [], tracks: [], works: [] }),
    });

    sinon.stub(BatchTask.prototype, 'save');
    BatchTask.prototype.save.resolves();

    sinon.stub(Task.prototype, 'save');
    Task.prototype.save.resolves();

    completedItemsUpdater = {
      increaseCount: sinon.stub(),
      stop: sinon.stub(),
    };

    CalculateMechanicalSalesBatch.__set__('CompletedItemsUpdater', sinon.stub());
    CalculateMechanicalSalesBatch.__get__('CompletedItemsUpdater').returns(completedItemsUpdater);

    contractSizes = {};
    contractSizes[contract._id.toString()] = randomInt();
    catalogueCount = randomInt();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#calculateMechanicalSalesBatch', () => {
    let object; let mainQuery; let mechanicalQuery;
    let CalculateSalesBatch; let batchTask;

    beforeEach((done) => {
      object = {};

      CalculateSalesBatch = { buildMultiContractFilter: sinon.stub().yields() };
      CalculateMechanicalSalesBatch.__set__('CalculateSalesBatch', CalculateSalesBatch);

      batchTask = new BatchTask({
        clientId: period.clientId,
        periodId: period._id.toString(),
        name: 'Mechanical Sales Calculation',
        status: 'Pending',
        value: {
          contracts,
          mainQuery: { salesFileId: randomId() },
          mechanicalQuery: { type: randomString() },
          object,
        },
        runType: object.runType,
      });

      bigQuery.joinSalesCalculationFilter.yields(null, salesData);
      done();
    });

    it('should set newFilter to { ...mainQuery }', (done) => {
      // Arrange
      const expectedFilter = { ...batchTask.value.mainQuery };
      // Act
      CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, () => {
        // Assert
        const filter = CalculateSalesBatch.buildMultiContractFilter.args[0][3];
        expect(filter).to.deep.eq(expectedFilter);
        done();
      });
    });

    describe('mechanicalQuery.length > 0', () => {
      it('should set newFilter.$or2 to mechanicalQuery', (done) => {
        // Arrange
        batchTask.value.mechanicalQuery = [{ type: randomString() }, { type: randomString() }];
        // Act
        CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, () => {
          // Assert
          const filter = CalculateSalesBatch.buildMultiContractFilter.args[0][3];
          expect(filter.$or2).to.deep.eq(batchTask.value.mechanicalQuery);
          done();
        });
      });
    });

    it('should call CalculateSalesBatch.buildMultiContractFilter with the right args', (done) => {
      // Arrange
      const expectedFilter = { ...batchTask.value.mainQuery };
      // Act
      CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, () => {
        // Assert
        expect(CalculateSalesBatch.buildMultiContractFilter.calledWith(contracts, bigQuery, period, expectedFilter)).to.be.true;
        done();
      });
    });

    describe('when CalculateSalesBatch.buildMultiContractFilter returns an error', () => {
      it('should return the error to the callback', (done) => {
      // Arrange
        const expectedError = randomString();
        CalculateSalesBatch.buildMultiContractFilter.yields(expectedError);
        // Act
        CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, (err) => {
        // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when CalculateSalesBatch.buildMultiContractFilter doesnt return a query', () => {
      it('should not call bigQuery.joinSalesCalculationFilter', (done) => {
        // Arrange
        CalculateSalesBatch.buildMultiContractFilter.yields();
        // Act
        CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, () => {
          // Assert
          expect(bigQuery.joinSalesCalculationFilter.called).to.be.false;
          done();
        });
      });
    });

    describe('when CalculateSalesBatch.buildMultiContractFilter returns a query', () => {
      let query;
      beforeEach((done) => {
        query = { type: randomString() };
        CalculateSalesBatch.buildMultiContractFilter.yields(null, query);
        done();
      });

      it('should call bigQuery.joinSalesCalculationFilter with the right args', (done) => {
        // Arrange
        const selectFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];
        const distinctFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];
        bigQuery.joinSalesCalculationFilter.yields(randomString());
        // Act
        CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, () => {
          // Assert
          expect(bigQuery.joinSalesCalculationFilter.calledWith(selectFields, distinctFields, query, { })).to.be.true;
          done();
        });
      });

      describe('when bigQuery.joinSalesCalculationFilter returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange.
          const expectedError = randomString();
          bigQuery.joinSalesCalculationFilter.yields(expectedError);
          // Act
          CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should create CompletedCatalogueItems instance with the right args', (done) => {
        // Arrange
        const completedItemsUpdaterInitParams = {
          periodId: period._id,
          fieldToIncrease: 'completedCatalogueItems',
        };
        // Act
        CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, (err) => {
          // Assert
          expect(CalculateMechanicalSalesBatch.__get__('CompletedItemsUpdater').calledWith(completedItemsUpdaterInitParams)).to.be.true;
          done();
        });
      });

      describe('when CalculateContract.runSalesCalculation returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          CalculateMechanicalSalesBatch.__get__('CalculateContract').runSalesCalculation.yields(expectedError);
          // Act
          CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
  });
});
