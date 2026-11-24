const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt, randomError } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** test/unit/libs/calculation/statement/calculateCosts.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Period = require('../../../../../models/period');
const Contract = require('../../../../../models/contract');

describe('Statement CalculateSales Unit Tests', () => {
  let CalculateSales;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CalculateSales = rewire('../../../../../libs/calculation/statement/calculateSales');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#calculate', () => {
    let period; let statement; let db; let bigQuery; let client;
    let runContractSalesCalculationsStub; let updateSalesFilesReportedStatusStub;
    beforeEach((done) => {
      period = { _id: randomId(), salesPartitionNos: [randomId(), randomId()], salesFilesIds: [randomId(), randomId()] };
      client = { _id: randomId() };
      statement = { _id: randomId(), periodId: period._id };

      db = { type: randomId() };

      bigQuery = {
        setupFile: sinon.stub().yields(),
        writeFileToDb: sinon.stub().yields(),
        filterFromObject: sinon.stub().returns(),
      };

      sinon.stub(Period, 'findById').resolves(period);

      runContractSalesCalculationsStub = sinon.stub().yields();
      CalculateSales.__set__('CalculateSales', { runContractSalesCalculations: runContractSalesCalculationsStub });
      updateSalesFilesReportedStatusStub = sinon.stub().yields();
      CalculateSales.__set__('PeriodCalculateSales', { updateSalesFilesReportedStatus: updateSalesFilesReportedStatusStub });
      done();
    });

    it('should call bigQuery.setupFile', (done) => {
      // Act
      CalculateSales.calculate(statement, db, bigQuery, client, () => {
        // Assert
        expect(bigQuery.setupFile.called).to.be.true;
        done();
      });
    });

    describe('when bigQuery.setupFile error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomError();
        bigQuery.setupFile.yields(expectedError);
        // Act
        CalculateSales.calculate(statement, db, bigQuery, client, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
          done();
        });
      });
    });

    it('should call Period.findById with the right args', (done) => {
      // Act
      CalculateSales.calculate(statement, db, bigQuery, client, () => {
        // Assert
        expect(Period.findById.calledWith(statement.periodId)).to.be.true;
        done();
      });
    });

    describe('when period.salesPartitionNos.indexOf(null) !== -1', () => {
      it('should call CalculateSales.runContractSalesCalculations with the right args', (done) => {
        // Arrange
        const object = {
          salesDatabaseTable: client.salesDatabaseTable,
          writeSalesDatabaseTable: client.periodSalesDatabaseTable,
          periodId: period._id.toString(),
          salesFileIds: period.salesFilesIds,
          periodType: period.contractType,
        };

        const query = {
          salesFileId: { $in: period.salesFilesIds },
          $or: [],
          $or3: [{ partitionNo: null }, { partitionNo: { $in: [period.salesPartitionNos[0], period.salesPartitionNos[1]] } }],
        };

        period.salesPartitionNos[2] = null;
        // Act
        CalculateSales.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(CalculateSales.__get__('CalculateSales.runContractSalesCalculations').calledWith(statement, db, bigQuery, object, client, query, period)).to.be.true;
          done();
        });
      });
    });

    describe('when period.salesPartitionNos.indexOf(null) === -1', () => {
      it('should call CalculateSales.runContractSalesCalculations with the right args', (done) => {
        // Arrange
        const object = {
          salesDatabaseTable: client.salesDatabaseTable,
          writeSalesDatabaseTable: client.periodSalesDatabaseTable,
          periodId: period._id.toString(),
          salesFileIds: period.salesFilesIds,
          periodType: period.contractType,
        };

        const query = {
          salesFileId: { $in: period.salesFilesIds },
          $or: [],
          partitionNo: { $in: period.salesPartitionNos },
        };

        // Act
        CalculateSales.calculate(statement, db, bigQuery, client, () => {
          // Assert
          expect(CalculateSales.__get__('CalculateSales.runContractSalesCalculations').calledWith(statement, db, bigQuery, object, client, query, period)).to.be.true;
          done();
        });
      });
    });

    it('should call bigQuery.writeFileToDb with the right args', (done) => {
      // Arrange
      bigQuery.outputTable = randomString();
      // Act
      CalculateSales.calculate(statement, db, bigQuery, client, () => {
        // Assert
        expect(bigQuery.writeFileToDb.calledWith(bigQuery.outputTable)).to.be.true;
        done();
      });
    });

    describe('when bigQuery.writeFileToDb error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomError();
        bigQuery.writeFileToDb.yields(expectedError);
        // Act
        CalculateSales.calculate(statement, db, bigQuery, client, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
          done();
        });
      });
    });

    it('should call PeriodCalculateSales.updateSalesFilesReportedStatus with the right args', (done) => {
      // Act
      CalculateSales.calculate(statement, db, bigQuery, client, () => {
        // Assert
        expect(CalculateSales.__get__('PeriodCalculateSales.updateSalesFilesReportedStatus').calledWith(period)).to.be.true;
        done();
      });
    });
  });

  describe('#runContractSalesCalculations', () => {
    let period; let statement; let contract; let db; let bigQuery; let client; let object; let mainQuery;
    let contractQueryStub; let mechanicalTermsToQueryStub; let completedItemsUpdaterStopStub; let runSalesCalculationStub; let getContractSizesStub;

    beforeEach((done) => {
      period = { _id: randomId(), salesPartitionNos: [randomId(), randomId()] };
      client = { _id: randomId() };
      contract = { _id: randomId() };
      statement = { _id: randomId(), periodId: period._id, contractId: contract._id };

      object = { type: randomString() };
      mainQuery = { type: randomString() };

      db = { type: randomId() };

      bigQuery = {
        getSize: sinon.stub().yields(),
        filterFromObject: sinon.stub().returns(),
        queryJob: sinon.stub().yields(null, []),
        catalogueIdsToParams: sinon.stub().returns(),
      };

      sinon.stub(Contract, 'findById');
      Contract.findById.resolves(contract);

      contractQueryStub = sinon.stub().yields();
      runSalesCalculationStub = sinon.stub().yields();
      CalculateSales.__set__('CalculateContract', { contractQuery: contractQueryStub, runSalesCalculation: runSalesCalculationStub });

      mechanicalTermsToQueryStub = sinon.stub().yields();
      CalculateSales.__set__('MechanicalContractTerms', { mechanicalTermsToQuery: mechanicalTermsToQueryStub });

      completedItemsUpdaterStopStub = sinon.stub().returns();
      CalculateSales.__set__('CompletedItemsUpdater', sinon.stub().returns({ stop: completedItemsUpdaterStopStub }));

      getContractSizesStub = sinon.stub().yields();
      CalculateSales.__set__('PeriodCalculateSales', { getContractSizes: getContractSizesStub });
      done();
    });

    it('should call Contract.findById with the right args', (done) => {
      // Act
      CalculateSales.runContractSalesCalculations(statement, db, bigQuery, object, client, mainQuery, period, () => {
        // Assert
        expect(Contract.findById.calledWith(statement.contractId)).to.be.true;
        done();
      });
    });

    it('should call PeriodCalculateSales.getContractSizes with the right args', (done) => {
      // Act
      CalculateSales.runContractSalesCalculations(statement, db, bigQuery, object, client, mainQuery, period, () => {
        // Assert
        expect(CalculateSales.__get__('PeriodCalculateSales.getContractSizes').calledWith({ period, statement, bigQuery, contracts: [contract], client })).to.be.true;
        done();
      });
    });

    describe('when PeriodCalculateSales.getContractSizes returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomError();
        getContractSizesStub.yields(expectedError);
        // Act
        CalculateSales.runContractSalesCalculations(statement, db, bigQuery, object, client, mainQuery, period, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError.message);
          done();
        });
      });
    });

    it('should call CalculateContract.runSalesCalculation with the right args', (done) => {
      // Arrange
      const contractSizes = {};
      contractSizes[contract._id.toString()] = randomInt();
      getContractSizesStub.yields(null, contractSizes);

      const completedItemsUpdater = { stop: completedItemsUpdaterStopStub };

      // Act
      CalculateSales.runContractSalesCalculations(statement, db, bigQuery, object, client, mainQuery, period, () => {
        // Assert
        expect(CalculateSales.__get__('CalculateContract.runSalesCalculation').calledWith(contract, db, bigQuery, object, client, mainQuery, period, contractSizes[contract._id.toString()], null, completedItemsUpdater, null)).to.be.true;
        done();
      });
    });

    it('should call completedItemsUpdater.stop', (done) => {
      // Arrange
      const contractSizes = {};
      contractSizes[contract._id.toString()] = randomInt();
      getContractSizesStub.yields(null, contractSizes);

      const completedItemsUpdater = { stop: completedItemsUpdaterStopStub };
      // Act
      CalculateSales.runContractSalesCalculations(statement, db, bigQuery, object, client, mainQuery, period, () => {
        // Assert
        expect(completedItemsUpdater.stop.called).to.be.true;
        done();
      });
    });
  });
});
