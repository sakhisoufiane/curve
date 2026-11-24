/* eslint-disable max-len */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/calculateSalesBatch.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const Period = require('../../../../../models/period');
const Contract = require('../../../../../models/contract');
const Client = require('../../../../../models/client');
const BatchTask = require('../../../../../models/batchTask');

describe.skip(('Calculate Sales Batch Unit Tests'), () => {
  let CalculateSalesBatch;
  let period; let client; let contract; let batchTask;
  let db; let mongoose; let bigQuery; let databaseUtils; let getBigQueryOpts;
  let salesFileId; let salesData;
  let runSalesCalculationStub; let contractQueryStub;
  let completedItemsUpdater;
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CalculateSalesBatch = rewire('../../../../../libs/calculation/period/calculateSalesBatch');

    salesFileId = randomId();

    period = new Period({
      name: randomString(),
      salesFilesIds: [salesFileId],
      salesPartitionNos: [randomString(), randomString()],
      recalculation: {
        salesFiles: {
          salesFileIds: [salesFileId],
          partitionNos: [randomString(), randomString()],
        },
      },
    });

    client = new Client({
      name: randomString(),
      salesDatabaseTable: randomString(),
      periodSalesDatabaseTable: randomString(),
    });

    sinon.stub(Client, 'findById');
    Client.findById.yields(null, client);

    contract = new Contract({
      name: randomString(),
    });
    sinon.stub(Contract, 'find');

    Contract.find.yields(null, [contract]);

    batchTask = new BatchTask({
      name: randomString(),
      value: {
        contractId: randomId(),
        contractIds: [contract._id.toString()],
        contractSizes: randomInt(),
      },
      limit: randomInt(),
      offset: randomInt(),
      runType: randomString(),
    });
    sinon.stub(BatchTask.prototype, 'save').yields(null, batchTask);

    salesData = [
      { _id: randomId() },
      { _id: randomId() },
    ];
    bigQuery = {
      setupFile: sinon.stub().yields(),
      writeFileToDb: sinon.stub().yields(),
      joinSalesCalculationFilter: sinon.stub().yields(null, salesData),
      outputTable: randomString(),
    };
    CalculateSalesBatch.__set__('BigQuery', sinon.stub().returns(bigQuery));

    getBigQueryOpts = randomString();
    databaseUtils = {
      getBigQueryOpts: sinon.stub().returns(getBigQueryOpts),
    };
    CalculateSalesBatch.__set__('databaseUtils', databaseUtils);

    db = { type: randomString() };
    mongoose = { connection: { db } };
    CalculateSalesBatch.__set__('mongoose', mongoose);

    contractQueryStub = sinon.stub().yields();
    runSalesCalculationStub = sinon.stub().yields();
    CalculateSalesBatch.__set__('CalculateContract', {
      contractQuery: contractQueryStub,
      runSalesCalculation: runSalesCalculationStub,
    });

    completedItemsUpdater = {
      increaseCount: sinon.stub(),
      stop: sinon.stub(),
    };

    CalculateSalesBatch.__set__('CompletedItemsUpdater', sinon.stub());
    CalculateSalesBatch.__get__('CompletedItemsUpdater').returns(completedItemsUpdater);
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#calculateSalesBatch', () => {
    beforeEach((done) => {
      sinon.stub(CalculateSalesBatch, 'runBatchCalculation').yields();
      done();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
        // Assert
        expect(Client.findById.calledWith(period.clientId)).to.be.true;
        done();
      });
    });

    describe('when Client.findById returns an error', () => {
      it('should set task status to errored and return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        Client.findById.yields(expectedError);
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
          // Assert
          expect(batchTask.status).to.eq('Errored');
          expect(batchTask.error).to.eq('Failed to retrieve client');
          expect(batchTask.save.called).to.be.true;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when Client.findById returns a client', () => {
      it('should connect to bigQuery', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          expect(databaseUtils.getBigQueryOpts.calledWith(client)).to.be.true;
          expect(CalculateSalesBatch.__get__('BigQuery').calledWith(getBigQueryOpts)).to.be.true;
          done();
        });
      });

      it('should call bigQuery.setupFile', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          expect(bigQuery.setupFile.called).to.be.true;
          done();
        });
      });

      describe('when bigQuery.setupFile returns an error', () => {
        it('should set task status to errored and return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          bigQuery.setupFile.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
          // Assert
            expect(batchTask.status).to.eq('Errored');
            expect(batchTask.error).to.eq('Failed to set up BQ file');
            expect(batchTask.save.called).to.be.true;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should call Contract.find with the right args', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          expect(Contract.find.calledWith({ _id: batchTask.value.contractIds.map((id) => new ObjectId(id)) })).to.be.true;
          done();
        });
      });

      describe('when Contract.find returns an error', () => {
        it('should set task status to errored and return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          Contract.find.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
          // Assert
            expect(batchTask.status).to.eq('Errored');
            expect(batchTask.error).to.eq('Failed to retrieve contracts');
            expect(batchTask.save.called).to.be.true;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should set salesFileIds to period.salesFilesIds', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          const { salesFileIds } = CalculateSalesBatch.runBatchCalculation.args[0][3];
          expect(salesFileIds).to.deep.eq(period.salesFilesIds);
          done();
        });
      });

      it('should set salesPartitionNos to period.salesPartitionNos', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          const { salesPartitionNos } = CalculateSalesBatch.runBatchCalculation.args[0][3];
          expect(salesPartitionNos).to.deep.eq(period.salesPartitionNos);
          done();
        });
      });

      describe('when batchTask.runType is modifiedSales and recalculation.salesFiles.salesFileIds.length > 0', () => {
        it('should filter out sales files removed from period since last run', (done) => {
          // Arrange
          batchTask.runType = 'modifiedSales';
          // Act
          CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
            // Assert
            const { salesFileIds } = CalculateSalesBatch.runBatchCalculation.args[0][3];
            expect(salesFileIds).to.deep.eq([salesFileId]);
            done();
          });
        });

        describe('recalculation.salesFiles.partitionNos.length > 0', () => {
          it('should set salesPartitionNos to recalculation.salesFiles.partitionNos', (done) => {
            // Arrange
            batchTask.runType = 'modifiedSales';
            // Act
            CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
              // Assert
              const { salesPartitionNos } = CalculateSalesBatch.runBatchCalculation.args[0][3];
              expect(salesPartitionNos).to.deep.eq(period.recalculation.salesFiles.partitionNos);
              done();
            });
          });
        });
      });

      it('should set object with the right args', (done) => {
        // Arrange
        const expectedObject = {
          periodId: period._id.toString(),
          periodType: period.contractType,
          runType: batchTask.runType,
          salesFileIds: period.salesFilesIds,
          salesPartitionNos: period.salesPartitionNos,
        };
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          const object = CalculateSalesBatch.runBatchCalculation.args[0][3];
          expect(object).to.deep.eq(expectedObject);
          done();
        });
      });

      it('should set mainQuery with the right args', (done) => {
        // Arrange
        const expectedMainQuery = {
          salesFileId: { $in: period.salesFilesIds },
          partitionNo: { $in: period.salesPartitionNos },
          $or: [],
        };
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          const mainQuery = CalculateSalesBatch.runBatchCalculation.args[0][6];
          expect(mainQuery).to.deep.eq(expectedMainQuery);
          done();
        });
      });

      describe('salesPartitionNos.indexOf(null) !== -1', () => {
        describe('partitionsWithoutNull.length > 0', () => {
          it('should set $or3 with the rigth args', (done) => {
            // Arrange
            const partitionNos = [randomInt(), randomInt()];
            period.salesPartitionNos = [...partitionNos, null];
            // Act
            CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
              // Assert
              const { $or3 } = CalculateSalesBatch.runBatchCalculation.args[0][6];
              expect($or3).to.deep.eq(
                [
                  { partitionNo: null },
                  { partitionNo: { $in: partitionNos.filter(Boolean) } }],
              );
              done();
            });
          });
        });

        describe('partitionsWithoutNull.length === 0', () => {
          it('should set $or3 to null partition', (done) => {
            // Arrange
            period.salesPartitionNos = [null];
            // Act
            CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
              // Assert
              const { $or3 } = CalculateSalesBatch.runBatchCalculation.args[0][6];
              expect($or3).to.deep.eq([{ partitionNo: null }]);
              done();
            });
          });
        });
      });

      describe('salesPartitionNos.indexOf(null) === -1', () => {
        it('should set mainQuery.partitionNo to $in: period.salesPartitionNos', (done) => {
          // Arrange
          const partitionNos = [randomInt(), randomInt()];
          period.salesPartitionNos = [...partitionNos];
          // Act
          CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
            // Assert
            const mainQuery = CalculateSalesBatch.runBatchCalculation.args[0][6];
            expect(mainQuery.partitionNo).to.deep.eq({ $in: partitionNos });
            done();
          });
        });
      });

      it('should call CalculateSalesBatch.runBatchCalculation with the right args', (done) => {
        // Arrange
        const batch = [contract];
        const object = {
          periodId: period._id.toString(),
          periodType: period.contractType,
          runType: batchTask.runType,
          salesFileIds: period.salesFilesIds,
          salesPartitionNos: period.salesPartitionNos,
        };
        const mainQuery = {
          salesFileId: { $in: period.salesFilesIds },
          partitionNo: { $in: period.salesPartitionNos },
          $or: [],
        };
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, () => {
          // Assert
          expect(CalculateSalesBatch.runBatchCalculation.calledWith(
            batch,
            db,
            bigQuery,
            object,
            client,
            period,
            mainQuery,
            batchTask.value.contractSizes,
            null,
          )).be.true;
          done();
        });
      });

      describe('when CalculateSalesBatch.runBatchCalculation returns an error', () => {
        it('should set task status to errored and return the error to the callback', (done) => {
          // Arrange
          const expectedError = new Error(randomString());
          CalculateSalesBatch.runBatchCalculation.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
          // Assert
            expect(batchTask.status).to.eq('Errored');
            expect(batchTask.error).to.eq(expectedError.message);
            expect(batchTask.save.called).to.be.true;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should call bigQuery.writeFileToDb with the right args', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
        // Assert
          expect(bigQuery.writeFileToDb.calledWith(bigQuery.outputTable)).be.true;
          done();
        });
      });

      describe('when bigQuery.writeFileToDb returns an error', () => {
        it('should set task status to errored and return the error to the callback', (done) => {
          // Arrange
          const expectedError = new Error(randomString());
          bigQuery.writeFileToDb.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
          // Assert
            expect(batchTask.status).to.eq('Errored');
            expect(batchTask.error).to.eq(expectedError.message);
            expect(batchTask.save.called).to.be.true;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should set task status to Complete', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
        // Assert
          expect(batchTask.status).to.eq('Complete');
          done();
        });
      });

      it('should save the batchTask', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
        // Assert
          expect(batchTask.save.called).to.be.true;
          done();
        });
      });
      describe('when batchTask.save returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          batchTask.save.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
          // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
  });

  describe('#runBatchCalculation', () => {
    let contracts; let object; let mainQuery; let options; let contractSizes; let findByIdAndUpdate;

    beforeEach((done) => {
      contracts = [contract];

      object = {
        salesPartitionNos: [randomInt(), randomInt()],
      };

      mainQuery = { salesFileId: randomId() };

      options = { type: randomString() };

      contractSizes = {};

      sinon.stub(CalculateSalesBatch, 'buildMultiContractFilter').yields(null, {});

      findByIdAndUpdate = { exec: sinon.stub().yields() };
      sinon.stub(Period, 'findByIdAndUpdate');
      Period.findByIdAndUpdate.returns(findByIdAndUpdate);
      done();
    });

    it('should set salesPartitionNos to object.salesPartitionNos', (done) => {
      // Act
      CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
      // Assert
        const newFilter = CalculateSalesBatch.buildMultiContractFilter.args[0][3];
        expect(newFilter.partitionNo).to.deep.eq({ $in: object.salesPartitionNos });
        done();
      });
    });

    it('should set sqlOptions with the right args', (done) => {
      // Arrange
      options = null;
      // Act
      CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
      // Assert
        const sqlOptions = bigQuery.joinSalesCalculationFilter.args[0][3];
        expect(sqlOptions).to.deep.eq({ limit: 1000000, offset: 0, orderBy: 'id' });
        done();
      });
    });

    describe(('when options is passed'), () => {
      it('should set sqlOptions to options', (done) => {
        // Arrange
        options = { type: randomString() };
        // Act
        CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
        // Assert
          const sqlOptions = bigQuery.joinSalesCalculationFilter.args[0][3];
          expect(sqlOptions).to.deep.eq(options);
          done();
        });
      });
    });

    it('should set newFilter with the right args', (done) => {
      // Arrange
      const expectedFilter = {
        salesFileId: mainQuery.salesFileId,
        $or: [],
        partitionNo: { $in: object.salesPartitionNos },
      };
      // Act
      CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
      // Assert
        const newFilter = CalculateSalesBatch.buildMultiContractFilter.args[0][3];
        expect(expectedFilter).to.deep.eq(newFilter);
        done();
      });
    });

    describe('salesPartitionNos.indexOf(null) !== -1', () => {
      describe('partitionsWithoutNull.length > 0', () => {
        it('should set $or3 with the rigth args', (done) => {
          // Arrange
          const partitionNos = [randomInt(), randomInt()];
          object.salesPartitionNos = [...partitionNos, null];
          // Act
          CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
            // Assert
            const { $or3 } = CalculateSalesBatch.buildMultiContractFilter.args[0][3];
            expect($or3).to.deep.eq([
              { partitionNo: null },
              { partitionNo: { $in: partitionNos.filter(Boolean) } },
            ]);
            done();
          });
        });
      });
      describe('partitionsWithoutNull.length === 0', () => {
        it('should set $or3 to null partition', (done) => {
          // Arrange
          object.salesPartitionNos = [null];
          // Act
          CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
            // Assert
            const { $or3 } = CalculateSalesBatch.buildMultiContractFilter.args[0][3];
            expect($or3).to.deep.eq([{ partitionNo: null }]);
            done();
          });
        });
      });
    });

    describe('salesPartitionNos.indexOf(null) === -1', () => {
      it('should set newFilter.partitionNo to $in: period.salesPartitionNos', (done) => {
        // Arrange
        const partitionNos = [randomInt(), randomInt()];
        object.salesPartitionNos = [...partitionNos];
        // Act
        CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
          // Assert
          const newFilter = CalculateSalesBatch.buildMultiContractFilter.args[0][3];
          expect(newFilter.partitionNo).to.deep.eq({ $in: partitionNos });
          done();
        });
      });
    });

    it('should call CalculateSalesBatch.buildMultiContractFilter with the right args', (done) => {
      // Arrange
      const newFilter = {
        salesFileId: mainQuery.salesFileId,
        $or: [],
        partitionNo: { $in: object.salesPartitionNos },
      };
      // Act
      CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
        // Assert
        expect(CalculateSalesBatch.buildMultiContractFilter.calledWith(contracts, bigQuery, period, newFilter)).to.be.true;
        done();
      });
    });
    describe('when CalculateSalesBatch.buildMultiContractFilter returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        CalculateSalesBatch.buildMultiContractFilter.yields(expectedError);
        // Act
        CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
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
        const selectFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'isrc'];
        const distinctFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'isrc'];
        // Act
        CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
          // Assert
          expect(bigQuery.joinSalesCalculationFilter.calledWith(selectFields, distinctFields, query, options)).to.be.true;
          done();
        });
      });

      describe('when bigQuery.joinSalesCalculationFilter returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          bigQuery.joinSalesCalculationFilter.yields(expectedError);
          // Act
          CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
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
        CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
          // Assert
          expect(CalculateSalesBatch.__get__('CompletedItemsUpdater').calledWith(completedItemsUpdaterInitParams)).to.be.true;
          done();
        });
      });

      describe('when contractSizes[contract._id.toString()] === 0', () => {
        it('should call CompletedCatalogueItems.increaseCount to increase count by 1', (done) => {
          // Arrange
          contractSizes[contract._id.toString()] = 0;
          // Act
          CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
            // Assert
            expect(completedItemsUpdater.increaseCount.calledWith(1)).to.be.true;
            done();
          });
        });
      });

      describe('when contractSizes[contract._id.toString()] is not 0', () => {
        it('should contract.runSalesCalculation with the rigth args', (done) => {
          // Arrange
          contractSizes[contract._id.toString()] = randomInt();
          // Act
          CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
            // Assert
            expect(runSalesCalculationStub.calledWith(contract, db, bigQuery, object, client, mainQuery, period, contractSizes[contract._id.toString()], salesData)).to.be.true;
            done();
          });
        });

        describe('when contract.runSalesCalculation returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            contractSizes[contract._id.toString()] = randomInt();
            const expectedError = randomString();
            runSalesCalculationStub.yields(expectedError);
            // Act
            CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });

      it('should call CompletedCatalogueItems.stop', (done) => {
        // Act
        CalculateSalesBatch.runBatchCalculation(contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, (err) => {
          // Assert
          expect(completedItemsUpdater.stop.called).to.be.true;
          done();
        });
      });
    });
  });

  describe('#calculateSalesContract', () => {
    let contractSizes; let calculationHelper;
    beforeEach((done) => {
      sinon.stub(Contract, 'findById');
      Contract.findById.yields(null, contract);
      sinon.stub(CalculateSalesBatch, 'runBatchCalculation').yields();

      contractSizes = randomInt();
      calculationHelper = { contractSizeByLimit: sinon.stub().returns(contractSizes) };
      CalculateSalesBatch.__set__('calculationHelper', calculationHelper);
      done();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        expect(Client.findById.calledWith(period.clientId)).to.be.true;
        done();
      });
    });

    describe('when Client.findById returns an error', () => {
      it('should set task status to errored and return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        Client.findById.yields(expectedError);
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
          expect(batchTask.status).to.eq('Errored');
          expect(batchTask.error).to.eq('Failed to retrieve client');
          expect(batchTask.save.called).to.be.true;
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should connect to BigQuery', (done) => {
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        expect(databaseUtils.getBigQueryOpts.calledWith(client)).to.be.true;
        expect(CalculateSalesBatch.__get__('BigQuery').calledWith(getBigQueryOpts)).to.be.true;
        done();
      });
    });

    it('should call bigQuery.setupFile with the right args', (done) => {
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        expect(bigQuery.setupFile.called).to.be.true;
        done();
      });
    });

    it('should call Contract.find with the right args', (done) => {
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        expect(Contract.findById.calledWith(batchTask.value.contractId)).to.be.true;
        done();
      });
    });

    describe('when batchTask.runType is modifiedSales and recalculation.salesFiles.salesFileIds.length > 0', () => {
      it('should filter out sales files removed from period since last run', (done) => {
        // Arrange
        batchTask.runType = 'modifiedSales';
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
          // Assert
          const { salesFileIds } = CalculateSalesBatch.runBatchCalculation.args[0][3];
          expect(salesFileIds).to.deep.eq([salesFileId]);
          done();
        });
      });

      describe('recalculation.salesFiles.partitionNos.length > 0', () => {
        it('should set salesPartitionNos to recalculation.salesFiles.partitionNos', (done) => {
          // Arrange
          batchTask.runType = 'modifiedSales';
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
            // Assert
            const { salesPartitionNos } = CalculateSalesBatch.runBatchCalculation.args[0][3];
            expect(salesPartitionNos).to.deep.eq(period.recalculation.salesFiles.partitionNos);
            done();
          });
        });
      });
    });

    it.skip('should set object with the right args', (done) => {
      // Arrange
      const expectedObject = {
        salesDatabaseTable: client.salesDatabaseTable,
        writeSalesDatabaseTable: client.periodSalesDatabaseTable,
        periodId: period._id.toString(),
        periodType: period.contractType,
        salesFileIds: period.salesFilesIds,
        salesPartitionNos: period.salesPartitionNos,
      };
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        const object = CalculateSalesBatch.runBatchCalculation.args[0][3];
        expect(object).to.deep.eq(expectedObject);
        done();
      });
    });

    it('should set mainQuery with the right args', (done) => {
      // Arrange
      const expectedMainQuery = {
        salesFileId: { $in: period.salesFilesIds },
        partitionNo: { $in: period.salesPartitionNos },
        $or: [],
      };
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        const mainQuery = CalculateSalesBatch.runBatchCalculation.args[0][6];
        expect(mainQuery).to.deep.eq(expectedMainQuery);
        done();
      });
    });

    describe('salesPartitionNos.indexOf(null) !== -1', () => {
      describe('partitionsWithoutNull.length > 0', () => {
        it('should set $or3 with the rigth args', (done) => {
          // Arrange
          const partitionNos = [randomInt(), randomInt()];
          period.salesPartitionNos = [...partitionNos, null];
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
            // Assert
            const { $or3 } = CalculateSalesBatch.runBatchCalculation.args[0][6];
            expect($or3).to.deep.eq(
              [
                { partitionNo: null },
                { partitionNo: { $in: partitionNos.filter(Boolean) } }],
            );
            done();
          });
        });
      });
      describe('partitionsWithoutNull.length === 0', () => {
        it('should set $or3 to null partition', (done) => {
          // Arrange
          period.salesPartitionNos = [null];
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
            // Assert
            const { $or3 } = CalculateSalesBatch.runBatchCalculation.args[0][6];
            expect($or3).to.deep.eq([{ partitionNo: null }]);
            done();
          });
        });
      });
    });

    describe('salesPartitionNos.indexOf(null) === -1', () => {
      it('should set mainQuery.partitionNo to $in: period.salesPartitionNos', (done) => {
        // Arrange
        const partitionNos = [randomInt(), randomInt()];
        period.salesPartitionNos = [...partitionNos];
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
          // Assert
          const mainQuery = CalculateSalesBatch.runBatchCalculation.args[0][6];
          expect(mainQuery.partitionNo).to.deep.eq({ $in: partitionNos });
          done();
        });
      });
    });

    it('set options with the right args', (done) => {
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        const options = CalculateSalesBatch.runBatchCalculation.args[0][8];
        expect(options).to.deep.eq({ limit: batchTask.limit, offset: batchTask.offset, orderBy: 'id' });
        done();
      });
    });

    describe('!batchTask.limit', () => {
      it('should set options to null', (done) => {
        // Arrange
        batchTask.limit = null;
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
          // Assert
          const options = CalculateSalesBatch.runBatchCalculation.args[0][8];
          expect(options).to.deep.eq(null);
          done();
        });
      });
    });

    it('should call calculationHelper.contractSizeByLimit with the right args', (done) => {
      // Act
      CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
        // Assert
        expect(calculationHelper.contractSizeByLimit.calledWith(batchTask.value.contractSize, batchTask.limit, batchTask.offset)).to.be.true;
        done();
      });
    });

    describe('batchTask.value.type is Stream', () => {
      beforeEach((done) => {
        batchTask.value.type = 'Stream';
        done();
      });

      it('should call contract.runSalesCalculation with the right args', (done) => {
        // Arrange
        const expectedObject = {
          salesDatabaseTable: client.salesDatabaseTable,
          writeSalesDatabaseTable: client.periodSalesDatabaseTable,
          periodId: period._id.toString(),
          periodType: period.contractType,
          salesFileIds: period.salesFilesIds,
          salesPartitionNos: period.salesPartitionNos,
        };
        const expectedMainQuery = {
          salesFileId: { $in: period.salesFilesIds },
          partitionNo: { $in: period.salesPartitionNos },
          $or: [],
        };
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, () => {
          // Assert
          expect(runSalesCalculationStub.calledWith(contract, db, bigQuery, expectedObject, client, expectedMainQuery, period, batchTask.value.contractSize, null)).to.be.true;
          done();
        });
      });

      describe('when contract.runSalesCalculation returns an error', () => {
        it('should set task status to errored and return the error to the callback', (done) => {
          // Arrange
          const expectedError = new Error(randomString());
          runSalesCalculationStub.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
            expect(batchTask.status).to.eq('Errored');
            expect(batchTask.error).to.eq(expectedError.message);
            expect(batchTask.save.called).to.be.true;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should call bigQuery.writeFileToDb with the right args', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
          expect(bigQuery.writeFileToDb.calledWith(bigQuery.outputTable)).to.be.true;
          done();
        });
      });

      it('should set task status to Complete', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
          expect(batchTask.status).to.eq('Complete');
          done();
        });
      });

      it('should save the batchTask', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
          expect(batchTask.save.called).to.be.true;
          done();
        });
      });

      describe('when batchTask.save returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          batchTask.save.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });

    describe('batchTask.value.type is not Stream', () => {
      beforeEach((done) => {
        batchTask.value.type = randomString();
        done();
      });

      it('should call CalculateSalesBatch.runBatchCalculation with the right args', (done) => {
        // Arrange
        const expectedObject = {
          salesDatabaseTable: client.salesDatabaseTable,
          writeSalesDatabaseTable: client.periodSalesDatabaseTable,
          periodId: period._id.toString(),
          periodType: period.contractType,
          salesFileIds: period.salesFilesIds,
          salesPartitionNos: period.salesPartitionNos,
        };
        const expectedMainQuery = {
          salesFileId: { $in: period.salesFilesIds },
          $or: [],
          partitionNo: { $in: period.salesPartitionNos },
        };
        const expectedOptions = { limit: batchTask.limit, offset: batchTask.offset, orderBy: 'id' };
        const expectedContractSizes = {};
        expectedContractSizes[batchTask.value.contractId] = contractSizes;
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
          expect(CalculateSalesBatch.runBatchCalculation.calledWith([contract], db, bigQuery, expectedObject, client, period, expectedMainQuery, expectedContractSizes, expectedOptions)).to.be.true;
          done();
        });
      });

      describe('when CalculateSalesBatch.runBatchCalculation returns an error', () => {
        it('should set task status to errored and return the error to the callback', (done) => {
          // Arrange
          const expectedError = new Error(randomString());
          CalculateSalesBatch.runBatchCalculation.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
            expect(batchTask.status).to.eq('Errored');
            expect(batchTask.error).to.eq(expectedError.message);
            expect(batchTask.save.called).to.be.true;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should call bigQuery.writeFileToDb with the right args', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
        // Assert
          expect(bigQuery.writeFileToDb.calledWith(bigQuery.outputTable)).to.be.true;
          done();
        });
      });

      describe('when bigQuery.writeFileToDb returns an error', () => {
        it('should set task status to errored and return the error to the callback', (done) => {
          // Arrange
          const expectedError = new Error(randomString());
          CalculateSalesBatch.runBatchCalculation.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
            expect(batchTask.status).to.eq('Errored');
            expect(batchTask.error).to.eq(expectedError.message);
            expect(batchTask.save.called).to.be.true;
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should set task status to Complete', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
        // Assert
          expect(batchTask.status).to.eq('Complete');
          done();
        });
      });

      it('should save the batchTask', (done) => {
        // Act
        CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
        // Assert
          expect(batchTask.save.called).to.be.true;
          done();
        });
      });

      describe('when batchTask.save returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = new Error(randomString());
          batchTask.save.yields(expectedError);
          // Act
          CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
          // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
  });

  describe('#buildMultiContractFilter', () => {
    let contracts; let mainQuery; let contractQuery;

    beforeEach((done) => {
      contracts = [contract];
      mainQuery = { type: randomString(), $or: [] };

      contractQuery = { $or: [] };

      contractQueryStub.yields(null, contractQuery);
      done();
    });

    describe('when no contracts are passed', () => {
      it('should return an error to the callback', (done) => {
        // Arrange
        contracts = null;
        const expectedError = 'An array of contracts is required';
        // Act
        CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
        // Assert
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when contracts.length === 0', () => {
      it('should not call contract.contractQuery', (done) => {
        // Arrange
        contracts = [];
        // Act
        CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
        // Assert
          expect(contractQueryStub.called).to.be.false;
          done();
        });
      });
    });

    it('should call contract.contractQuery with the right args', (done) => {
      // Act
      CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
      // Assert
        expect(contractQueryStub.calledWith(contract, bigQuery, period, mainQuery)).to.be.true;
        done();
      });
    });

    describe('when contract.contractQuery returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        contractQueryStub.yields(expectedError);
        // Act
        CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
        // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should add the contractId to contractIds', (done) => {
      // Arrange
      const expectedContractFilter = { contractId: { $in: [contract._id.toString()] } };
      // Act
      CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
      // Assert
        const { $or } = mainQuery;
        expect($or).deep.includes(expectedContractFilter);
        done();
      });
    });

    describe('when or.catType === Release and or.releaseId.$in', () => {
      it('should the releaseId to releaseIds', (done) => {
        // Arrange
        const releaseId = randomId();
        const expectedReleaseFilter = { catType: 'Release', releaseId: { $in: [releaseId] } };
        contractQuery = { $or: [{ catType: 'Release', releaseId: { $in: [releaseId] } }] };
        contractQueryStub.yields(null, contractQuery);
        // Act
        CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
        // Assert
          const { $or } = mainQuery;
          expect($or).deep.includes(expectedReleaseFilter);
          done();
        });
      });
    });

    describe('when or.catType === Track and or.trackId.$in', () => {
      it('should the trackId to trackIds', (done) => {
        // Arrange
        const trackId = randomId();
        const expectedTrackFilter = { catType: 'Track', trackId: { $in: [trackId] } };
        contractQuery = { $or: [{ catType: 'Track', trackId: { $in: [trackId] } }] };
        contractQueryStub.yields(null, contractQuery);
        // Act
        CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
        // Assert
          const { $or } = mainQuery;
          expect($or).deep.includes(expectedTrackFilter);
          done();
        });
      });
    });

    describe('when or.catType === Work and or.workId.$in', () => {
      it('should the workId to workIds', (done) => {
        // Arrange
        const workId = randomId();
        const expectedWorkFilter = { catType: 'Work', workId: { $in: [workId] } };
        contractQuery = { $or: [{ catType: 'Work', workId: { $in: [workId] } }] };
        contractQueryStub.yields(null, contractQuery);
        // Act
        CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err) => {
        // Assert
          const { $or } = mainQuery;
          expect($or).deep.includes(expectedWorkFilter);
          done();
        });
      });
    });

    it('should return the mainQuery to the callback', (done) => {
      // Act
      CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, mainQuery, (err, returnedMainQuery) => {
      // Assert
        expect(returnedMainQuery).to.deep.eq(mainQuery);
        done();
      });
    });
  });
});
