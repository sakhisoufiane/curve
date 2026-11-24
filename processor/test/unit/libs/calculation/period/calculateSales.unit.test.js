/* eslint-disable max-len */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/calculateSales.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const SalesFile = require('../../../../../models/salesFile');
const Period = require('../../../../../models/period');
const Contract = require('../../../../../models/contract');
const BatchTask = require('../../../../../models/batchTask');
const Task = require('../../../../../models/task');
const Client = require('../../../../../models/client');
const Release = require('../../../../../models/release');

const SalesFileController = require('../../../../../libs/salesIngestion/salesFileController');

// TODO fix this test suite
describe('Period CalculateSales Unit Tests', () => {
  let CalculateSales;
  let period; let client; let contract; let contracts;
  let db; let bigQuery;
  let salesFile; let runType; let newQuery; let bigQuerySize;
  let salesData;
  let contractQueryStub; let runSalesCalculationStub;
  let completedItemsUpdater;
  let contractSizes; let catalogueCount;
  before(() => {
    sinon.restore();
  });

  beforeEach(() => {
    CalculateSales = rewire('../../../../../libs/calculation/period/calculateSales/calculateSales');

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
    CalculateSales.__set__('BigQuery', sinon.stub().returns(bigQuery));

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

    CalculateSales.__set__('CalculateContract', {
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

    CalculateSales.__set__('CompletedItemsUpdater', sinon.stub());
    CalculateSales.__get__('CompletedItemsUpdater').returns(completedItemsUpdater);

    contractSizes = {};
    contractSizes[contract._id.toString()] = randomInt();
    catalogueCount = randomInt();

    sinon.stub(CalculateSales, 'getContractSizes').yields(null, contractSizes, catalogueCount);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#updateSalesFilesReportedStatus', () => {
    beforeEach(() => {
      sinon.stub(Client, 'findById');
      Client.findById.returns({ lean: sinon.stub().resolves(client) });
    });
    it('should call SalesFile.find with the rights args', (done) => {
      // Act
      CalculateSales.updateSalesFilesReportedStatus(period, () => {
        // Assert
        expect(SalesFile.find.calledWith({ _id: { $in: period.salesFilesIds } })).to.be.true;
        done();
      });
    });

    it('should call SalesFileController.updateReportedStatus with the rights args', (done) => {
      // Act
      CalculateSales.updateSalesFilesReportedStatus(period, () => {
        // Assert
        expect(SalesFileController.updateReportedStatus.called).to.be.true;
        done();
      });
    });

    describe('when SalesFileController.updateReportedStatus returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        SalesFileController.updateReportedStatus.yields(expectedError);
        // Act
        CalculateSales.updateSalesFilesReportedStatus(period, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#calculate', () => {
    beforeEach((done) => {
      sinon.stub(CalculateSales, 'runSales').yields();
      Period.findById.resolves(period);
      done();
    });
    it('should call Period.findById with the rights args', (done) => {
      // Act
      CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
        // Assert
        expect(Period.findById.calledWith(period._id)).to.be.true;
        done();
      });
    });

    describe('when Period.findById returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = new Error(randomString());
        Period.findById.rejects(expectedError);
        // Act
        CalculateSales.calculate(period, db, bigQuery, client, runType, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('salesFileIds.length === 0', () => {
      it('should not call bigQuery.setupFile', (done) => {
        // Arrange
        period.salesFilesIds = [];
        // Act
        CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
          // Assert
          expect(bigQuery.setupFile.called).to.be.false;
          done();
        });
      });
    });
    describe('salesFileIds.length > 0', () => {
      describe('when runType is modifiedSales and recalculation.salesFiles.salesFileIds.length > 0', () => {
        it('should filter out removed salesFiles', (done) => {
          // Arrange
          period.recalculation = {
            salesFiles: {
              salesFileIds: [randomString(), randomString()],
            },
          };
          period.salesFilesIds = period.recalculation.salesFiles.salesFileIds[0];
          runType = 'modifiedSales';
          // Act
          CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
            // Assert
            const salesFilesIds = CalculateSales.runSales.args[0][3].salesFileId.$in;
            expect(salesFilesIds).to.deep.eq([period.recalculation.salesFiles.salesFileIds[0]]);
            done();
          });
        });
      });

      it('should call bigQuery.setupFile with the right args', (done) => {
        // Act
        CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
          // Assert
          expect(bigQuery.setupFile.called).to.be.true;
          done();
        });
      });

      describe('when bigQuery.setupFile returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          bigQuery.setupFile.yields(expectedError);
          // Act
          CalculateSales.calculate(period, db, bigQuery, client, runType, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      describe('salesPartitionNos.indexOf(null) !== -1', () => {
        describe('partitionsWithoutNull.length > 0', () => {
          it('should set $or3 with the right args', (done) => {
            // Arrange
            const partitionNos = [randomInt(), randomInt()];
            period.salesPartitionNos = [...partitionNos, null];
            // Act
            CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
              // Assert
              const { $or3 } = CalculateSales.runSales.args[0][3];
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
            CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
              // Assert
              const { $or3 } = CalculateSales.runSales.args[0][3];
              expect($or3).to.deep.eq([{ partitionNo: null }]);
            });
            done();
          });
        });
      });

      describe('salesPartitionNos.indexOf(null) === -1', () => {
        it('should set query.partitionNo to $in: period.salesPartitionNos', (done) => {
          // Arrange
          const partitionNos = [randomInt(), randomInt()];
          period.salesPartitionNos = [...partitionNos];
          // Act
          CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
            // Assert
            const query = CalculateSales.runSales.args[0][3];
            expect(query.partitionNo).to.deep.eq({ $in: partitionNos });
            done();
          });
        });
      });

      it('should call CalculateSales.runSales with the right args', (done) => {
        // Arrange
        const partitionNos = [randomInt(), randomInt()];
        period.salesPartitionNos = [...partitionNos];
        const expectedQuery = {
          salesFileId: { $in: period.salesFilesIds },
          partitionNo: { $in: partitionNos },
          $or: [],
        };
        const expectedObject = {
          periodId: period._id.toString(),
          periodType: period.contractType,
          salesFileIds: period.salesFilesIds,
          runType,
        };
        // Act
        CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
          // Assert
          expect(CalculateSales.runSales.calledWith(period, db, bigQuery, expectedQuery, expectedObject, client)).to.be.true;
          done();
        });
      });

      describe('when CalculateSales.runSales returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          CalculateSales.runSales.yields(expectedError);
          // Act
          CalculateSales.calculate(period, db, bigQuery, client, runType, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      describe('when CalculateSales.runSales returns', () => {
        it('should call bigQuery.writeFileToDb with the right args', (done) => {
          // Act
          CalculateSales.calculate(period, db, bigQuery, client, runType, () => {
            // Assert
            expect(bigQuery.writeFileToDb.calledWith(bigQuery.outputTable)).to.be.true;
            done();
          });
        });

        describe('when bigQuery.writeFileToDb returns an error', () => {
          it('should return the error to the callback', (done) => {
            // Arrange
            const expectedError = randomString();
            bigQuery.writeFileToDb.yields(expectedError);
            // Act
            CalculateSales.calculate(period, db, bigQuery, client, runType, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });
      });
    });
  });

  describe('#runSales', () => {
    let query; let object;
    beforeEach(() => {
      query = { type: randomString() };
      object = { type: randomString() };

      sinon.stub(CalculateSales, 'mcpsSalesCalculations').yields();
      sinon.stub(CalculateSales, 'runContractSalesCalculations').yields();
    });

    describe('when period.contractType === MCPS', () => {
      it('should call CalculateSales.mcpsSalesCalculations with the right args', (done) => {
        // Arrange
        period.contractType = 'MCPS';
        // Act
        CalculateSales.runSales(period, db, bigQuery, query, object, client, () => {
          // Assert
          expect(CalculateSales.mcpsSalesCalculations.calledWith(period, db, bigQuery, object, query)).to.be.true;
          done();
        });
      });

      describe('when CalculateSales.mcpsSalesCalculations returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          period.contractType = 'MCPS';
          const expectedError = randomString();
          CalculateSales.mcpsSalesCalculations.yields(expectedError);
          // Act
          CalculateSales.runSales(period, db, bigQuery, query, object, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
    describe('when period.contractType !== MCPS', () => {
      it('should call CalculateSales.runContractSalesCalculations with the right args', (done) => {
        // Arrange
        period.contractType = randomString();
        // Act
        CalculateSales.runSales(period, db, bigQuery, query, object, client, () => {
        // Assert
          expect(CalculateSales.runContractSalesCalculations.calledWith(period, db, bigQuery, object, client, query)).to.be.true;
          done();
        });
      });

      describe('when CalculateSales.runContractSalesCalculations returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          period.contractType = randomString();
          const expectedError = randomString();
          CalculateSales.runContractSalesCalculations.yields(expectedError);
          // Act
          CalculateSales.runSales(period, db, bigQuery, query, object, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
  });

  describe.skip('#runContractSalesCalculations', () => {
    let object; let mainQuery;
    let mechanicalGroupName; let mechanicalGroups;
    let SQS; let Batch;
    beforeEach(() => {
      object = { type: randomString() };
      mainQuery = { type: randomString() };

      sinon.stub(Period, 'findByIdAndUpdate');
      Period.findByIdAndUpdate.returns({ exec: sinon.stub().resolves(period) });

      sinon.stub(CalculateSales, 'runMechancialBatchCalculation').yields();

      mechanicalGroupName = 'group1';
      mechanicalGroups = { groups: { group1: contracts }, terms: { group1: randomString() } };
      sinon.stub(CalculateSales, 'groupMechanicalContracts').yields();
      CalculateSales.groupMechanicalContracts.yields(null, mechanicalGroups);

      SQS = { sendMessage: sinon.stub().yields() };
      CalculateSales.__set__('SQS', SQS);

      Batch = { mainProcessRunBatches: sinon.stub().yields() };
      CalculateSales.__set__('Batch', Batch);
    });
    describe('object.runType === main and recalculation.contractIds', () => {
      it('should update contractFilter._id', (done) => {
        // Arrange
        object.runType = 'main';
        period.recalculation.contractIds = [randomId(), randomId()];
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          const contractFilter = Contract.find.args[0][0];
          expect(contractFilter._id).to.deep.eq({ $in: period.recalculation.contractIds });
          done();
        });
      });
    });

    describe('object.runType === modifiedSales and recalculation.salesFiles.contractIds.length > 0', () => {
      it('should set modifiedSalesContractIds to recalculation.salesFiles.contractIds', (done) => {
        // Arrange
        object.runType = 'modifiedSales';
        period.recalculation.salesFiles = { contractIds: [randomId(), randomId()] };
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          const contractFilter = Contract.find.args[0][0];
          expect(contractFilter._id).to.deep.eq({ $in: period.recalculation.salesFiles.contractIds });
          done();
        });
      });

      describe('when recalculation.contractIds', () => {
        it('should set modifiedSalesContractIds to the right args', (done) => {
          // Arrange
          object.runType = 'modifiedSales';
          const contractId = randomId();
          const randomContractId = randomId();
          period.recalculation.contractIds = [contractId, randomId()];
          period.recalculation.salesFiles = { contractIds: [contractId, randomContractId] };
          // Act
          CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
            // Assert
            const contractFilter = Contract.find.args[0][0];
            expect(contractFilter._id).to.deep.eq({ $in: [randomContractId] });
            done();
          });
        });
      });
    });

    describe('object.runType is not main and not modifiedSales', () => {
      it('should return error ModifiedSales type sales Calculation requires contracts parameter', (done) => {
        // Arrange
        object.runType = randomString();
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
          // Assert
          expect(err.message).to.eq('ModifiedSales type sales Calculation requires contracts parameter');
          done();
        });
      });
    });

    describe('when Contract.find returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        object.runType = 'main';
        const expectedError = new Error(randomString());
        Contract.find.rejects(expectedError);

        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when period.recalculation.contractIds', () => {
      it('should set period.recalculation.totalContractsForCalculation to contracts.length', (done) => {
        // Arrange
        object.runType = 'main';
        period.recalculation.contractIds = [randomString(), randomString()];
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
          // Assert
          expect(err).to.be.null;
          expect(period.recalculation.totalContractsForCalculation).to.eq(contracts.length);
          done();
        });
      });
    });

    describe('when period.recalculation.salesFiles', () => {
      it('should set period.recalculation.totalContractsForCalculation to contracts.length', (done) => {
        // Arrange
        object.runType = 'main';
        period.recalculation.salesFiles = [randomString(), randomString()];
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
          // Assert
          expect(err).to.be.null;
          expect(period.recalculation.totalContractsForCalculation).to.eq(contracts.length);
          done();
        });
      });
    });

    it.skip('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Arrange
      object.runType = 'main';
      // Act
      CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
        // Assert
        expect(err).to.be.null;
        expect(Period.findByIdAndUpdate.calledWith(
          period._id,
          { $set: { totalContractsForCalculation: contracts.length, recalculation: period.recalculation } },
        )).be.true;
        done();
      });
    });

    describe('when Period.findByIdAndUpdate returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        object.runType = 'main';
        const expectedError = new Error(randomString());
        Period.findByIdAndUpdate.returns({ exec: sinon.stub().rejects(expectedError) });

        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when period.contractType is Mechanical', () => {
      beforeEach(() => {
        object.runType = 'main';
        period.contractType = 'Mechanical';
      });

      it('should CalculateSales.groupMechanicalContracts with the right args', (done) => {
        // Arrange
        CalculateSales.groupMechanicalContracts.yields(randomString());
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
          // Assert
          expect(err).to.be.null;
          expect(CalculateSales.groupMechanicalContracts.calledWith(contracts)).to.be.true;
          done();
        });
      });

      describe('when CalculateSales.groupMechanicalContracts returns an error', () => {
        it('should return the error to the callback', (done) => {
        // Arrange
          const expectedError = randomString();
          CalculateSales.groupMechanicalContracts.yields(expectedError);
          // Act
          CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should call CalculateSales.runMechancialBatchCalculation with the right args', (done) => {
        // Arrange
        CalculateSales.runMechancialBatchCalculation.yields(randomString());
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          expect(CalculateSales.runMechancialBatchCalculation.calledWith(period, contracts, db, bigQuery, object, client, mainQuery, mechanicalGroups.terms[mechanicalGroupName])).to.be.true;
          done();
        });
      });

      describe('when CalculateSales.runMechancialBatchCalculation returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          CalculateSales.runMechancialBatchCalculation.yields(expectedError);
          // Act
          CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      it('should call bigQuery.writeFileToDb with the right args', (done) => {
        // Arrange
        bigQuery.writeFileToDb.yields(randomString());
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          expect(bigQuery.writeFileToDb.calledWith(bigQuery.outputTable)).to.be.true;
          done();
        });
      });
      describe('when bigQuery.writeFileToDb returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          bigQuery.writeFileToDb.yields(expectedError);
          // Act
          CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });

    describe('when period.contractType is not Mechanical', () => {
      let PeriodStatementCreation;

      beforeEach(() => {
        object.runType = 'main';
        period.contractType = randomString();

        PeriodStatementCreation = {
          orderContracts: sinon.stub().returns(contracts),
          batchContracts: sinon.stub().returns({ batches: [contracts], individuals: contracts }),
        };
        CalculateSales.__set__('PeriodStatementCreation', PeriodStatementCreation);
      });

      it('should call CalculateSales.getContractSizes with the right args', (done) => {
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          expect(CalculateSales.getContractSizes.calledWith({ period, bigQuery, contracts, client })).to.be.true;
          done();
        });
      });

      it('should call PeriodStatementCreation.orderContracts', (done) => {
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          expect(PeriodStatementCreation.orderContracts.calledWith(contracts, contractSizes)).to.be.true;
          done();
        });
      });

      it('should call PeriodStatementCreation.batchContracts', (done) => {
        // Arrange
        const expectedContractSizes = { };
        expectedContractSizes[contract._id.toString()] = 0;
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          expect(PeriodStatementCreation.batchContracts.calledWith(contracts, contractSizes, catalogueCount, 20000)).to.be.true;
          done();
        });
      });

      it('should create and save the batchTask for Sales Batch Calculation', (done) => {
        // Arrange
        const expectedTaskValue = { contractId: contract._id.toString(), contractSize: contractSizes[contract._id.toString()], type: 'Batch' };
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          const task = BatchTask.prototype.save.firstCall.thisValue;
          expect(task.clientId).to.eq(period.clientId);
          expect(task.periodId).to.eq(period._id.toString());
          expect(task.name).to.eq('Sales Individual Calculation');
          expect(task.status).to.eq('Pending');
          expect(task.value).to.deep.eq(expectedTaskValue);
          expect(task.runType).to.eq(object.runType);
          done();
        });
      });

      describe('when batch size is greater than 1000000', () => {
        it('should call CalculateSales.breakDownLargeBatches', (done) => {
          // Arrange
          sinon.stub(CalculateSales, 'breakDownLargeBatches').yields();
          contractSizes[contract._id.toString()] = 1000001;
          CalculateSales.getContractSizes.yields(null, contractSizes, catalogueCount);
          const lineLimit = 150000;
          // Act
          CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
            // Assert
            expect(CalculateSales.breakDownLargeBatches.calledWith(period, contract, contractSizes[contract._id.toString()], bigQuery, mainQuery, object, lineLimit)).to.be.true;
            done();
          });
        });
      });

      describe('when batch size is lower than 1000000', () => {
        it('should create and save the batchTask for Sales Individual Calculation with the right args', (done) => {
          // Arrange
          contractSizes[contract._id.toString()] = 999999;
          CalculateSales.getContractSizes.yields(null, contractSizes, catalogueCount);
          const lineLimit = 150000;
          const expectedTaskValue = {
            contractId: contract._id.toString(),
            contractSize: contractSizes[contract._id.toString()],
            type: 'Batch',
          };
            // Act
          CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
            // Assert
            const task = BatchTask.prototype.save.secondCall.thisValue;
            expect(task.clientId).to.eq(period.clientId);
            expect(task.periodId).to.eq(period._id.toString());
            expect(task.name).to.eq('Sales Individual Calculation');
            expect(task.status).to.eq('Pending');
            expect(task.value).to.deep.eq(expectedTaskValue);
            expect(task.limit).to.eq(lineLimit);
            expect(task.offset).to.eq(150000);
            expect(task.runType).to.eq(object.runType);
            done();
          });
        });

        describe('when whilstCount !== 1', () => {
          beforeEach(() => {
            bigQuerySize = 999999;
            bigQuery.getSize.yields(null, [{ count: bigQuerySize }]);
          });

          it('should create CompletedCatalogueItems instance with the right args', (done) => {
            // Arrange
            const completedItemsUpdaterInitParams = {
              periodId: period._id,
              fieldToIncrease: 'totalContractsForCalculation',
            };
            // Act
            CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
              // Assert
              expect(CalculateSales.__get__('CompletedItemsUpdater').calledWith(completedItemsUpdaterInitParams)).to.be.true;
              done();
            });
          });
          it('should call CompletedCatalogueItems.increaseCount to increase count by 1', (done) => {
            // Act
            CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
              // Assert
              expect(completedItemsUpdater.increaseCount.calledWith(-1)).to.be.true;
              done();
            });
          });
          it('should call CompletedCatalogueItems.stop', (done) => {
            // Act
            CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
              // Assert
              expect(completedItemsUpdater.stop.called).to.be.true;
              done();
            });
          });
        });
      });
    });

    describe('when client.batchWorkers > 0', function () {
      this.timeout(50000);
      it('should create a task and send an SQS message for each worker', (done) => {
        // Arrange
        client.batchWorkers = 2;
        object.runType = 'main';
        period.contractType = randomString();
        // Act
        CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
          // Assert
          setTimeout(function () {
            const task1 = Task.prototype.save.firstCall.thisValue;
            expect(task1.clientId).to.eq(period.clientId);
            expect(task1.name).to.eq('Batch Worker');
            expect(task1.status).to.eq('Pending');
            expect(task1.value).to.deep.eq({ periodId: period._id.toString() });
            expect(SQS.sendMessage.calledWith(task1, 2)).to.be.true;

            const task2 = Task.prototype.save.secondCall.thisValue;
            expect(task2.clientId).to.eq(period.clientId);
            expect(task2.name).to.eq('Batch Worker');
            expect(task2.status).to.eq('Pending');
            expect(task2.value).to.deep.eq({ periodId: period._id.toString() });
            expect(SQS.sendMessage.calledWith(task2, 2)).to.be.true;

            expect(SQS.sendMessage.callCount).to.eq(client.batchWorkers);
            done();
          }, 35000);
        });
      });
    });

    it('Batch.mainProcessRunBatches', (done) => {
      // Arrange
      object.runType = 'main';
      period.contractType = randomString();
      // Act
      CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, mainQuery, () => {
        // Assert
        expect(Batch.mainProcessRunBatches.calledWith(period)).to.be.true;
        done();
      });
    });
  });

  describe('#groupMechanicalContracts', () => {
    let terms; let mechanicalTermsToQueryStub;
    beforeEach(() => {
      sinon.stub(CalculateSales, 'itemToArray').returns(contracts);

      terms = [{
        territory: randomString(),
        distributionChannel: randomString(),
        configuration: randomString(),
      }];

      mechanicalTermsToQueryStub = sinon.stub().yields(null, terms);
      CalculateSales.__set__('MechanicalContractTerms', {
        mechanicalTermsToQuery: mechanicalTermsToQueryStub,
      });
    });

    it('should call MechanicalContractTerms.mechanicalTermsToQuery with the right args', (done) => {
      // Act
      CalculateSales.groupMechanicalContracts(contracts, contractSizes, 20000, () => {
        // Assert
        expect(mechanicalTermsToQueryStub.called).to.be.true;
        done();
      });
    });

    it('should call CalculateSales.itemToArray for term.territory', (done) => {
      // Act
      CalculateSales.groupMechanicalContracts(contracts, contractSizes, 20000, () => {
        // Assert
        expect(CalculateSales.itemToArray.calledWith(terms[0].territory)).to.be.true;
        done();
      });
    });

    it('should call CalculateSales.itemToArray for term.distributionChannel', (done) => {
      // Act
      CalculateSales.groupMechanicalContracts(contracts, contractSizes, 20000, () => {
        // Assert
        expect(CalculateSales.itemToArray.calledWith(terms[0].distributionChannel)).to.be.true;
        done();
      });
    });

    it('should call CalculateSales.itemToArray for term.configuration', (done) => {
      // Act
      CalculateSales.groupMechanicalContracts(contracts, contractSizes, 20000, () => {
        // Assert
        expect(CalculateSales.itemToArray.calledWith(terms[0].configuration)).to.be.true;
        done();
      });
    });

    it('should construct a string of Territory, Channel and Config', (done) => {
      // Arrange
      const expectedTermsString = `Territory:${contract}Channel:${contract}Config:${contract}`;
      // Act
      CalculateSales.groupMechanicalContracts(contracts, contractSizes, 20000, (err, result) => {
        // Assert
        expect(result.terms[expectedTermsString]).to.deep.eq(terms);
        done();
      });
    });
  });

  describe('#itemToArray', () => {
    describe('when item is an array', () => {
      it('should return the item', (done) => {
        // Arrange
        const item = [randomString()];
        // Act
        const result = CalculateSales.itemToArray(item);
        // Assert
        expect(result).to.eq(item);
        done();
      });
    });

    describe('when item is not an array', () => {
      it('should return an array', (done) => {
        // Arrange
        const item = randomString();
        // Act
        const result = CalculateSales.itemToArray(item);
        // Assert
        expect(result).to.deep.eq([item]);
        done();
      });
    });
  });

  describe('#mcpsSalesCalculations', () => {
    let object; let query; let releaseCount;
    beforeEach(() => {
      object = {};
      query = {};

      sinon.stub(Client, 'findById');
      Client.findById.resolves(client);

      releaseCount = randomInt();
      sinon.stub(Release, 'countDocuments').resolves(releaseCount);

      sinon.stub(CalculateSales, 'calculateMcpsReleaseBatch').yields();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      CalculateSales.mcpsSalesCalculations(period, db, bigQuery, object, query, () => {
        // Assert
        expect(Client.findById.calledWith(period.clientId)).to.be.true;
        done();
      });
    });

    describe('when Client.findById returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Client.findById.rejects(expectedError);
        // Act
        CalculateSales.mcpsSalesCalculations(period, db, bigQuery, object, query, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call Release.countDocuments with the right args', (done) => {
      // Arrange
      const expectedCatFilter = { clientId: client._id.toString(), $or: [{ catalogueGroups: { $size: 0 } }, { catalogueGroups: { $exists: false } }, { catalogueGroups: { $nin: client.mcpsExcludedCatGroups } }] };
      // Act
      CalculateSales.mcpsSalesCalculations(period, db, bigQuery, object, query, () => {
        // Assert
        expect(Release.countDocuments.calledWith(expectedCatFilter)).to.be.true;
        done();
      });
    });

    it('should call CalculateSales.calculateMcpsReleaseBatch with the right args', (done) => {
      // Arrange
      const limit = 1000;
      const expectedCatFilter = { clientId: client._id.toString(), $or: [{ catalogueGroups: { $size: 0 } }, { catalogueGroups: { $exists: false } }, { catalogueGroups: { $nin: client.mcpsExcludedCatGroups } }] };
      // Act
      CalculateSales.mcpsSalesCalculations(period, db, bigQuery, object, query, () => {
        // Assert
        expect(CalculateSales.calculateMcpsReleaseBatch.calledWith(period, client, db, bigQuery, object, expectedCatFilter, 0, limit)).to.be.true;
        done();
      });
    });

    describe('when CalculateSales.calculateMcpsReleaseBatch returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        CalculateSales.calculateMcpsReleaseBatch.yields(expectedError);
        // Act
        CalculateSales.mcpsSalesCalculations(period, db, bigQuery, object, query, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#calculateMcpsReleaseBatch', () => {
    let release;
    let releaseSort; let releaseLimit;
    let object; let catFilter; let catOffset; let limit;
    let SalesCalculation; let salesCalculation; let moment; let date; let mcpsTerms;
    let seperatedMcpsSalesTermsStub;

    beforeEach(() => {
      object = { type: randomString() };
      catFilter = { type: randomString() };
      catOffset = randomInt();
      limit = randomInt();

      release = new Release({ name: randomString() });
      releaseLimit = sinon.stub().returns({ skip: sinon.stub().resolves([release]) });
      releaseSort = sinon.stub().returns({ limit: releaseLimit });
      sinon.stub(Release, 'find').returns({ sort: releaseSort });

      salesCalculation = { calculate: sinon.stub().yields() };
      SalesCalculation = sinon.stub().returns(salesCalculation);
      CalculateSales.__set__('SalesCalculation', SalesCalculation);

      date = randomDate();
      moment = { format: sinon.stub().returns(date) };
      CalculateSales.__set__('moment', sinon.stub().returns(moment));

      mcpsTerms = [randomString(), randomString()];
      seperatedMcpsSalesTermsStub = sinon.stub().yields(null, mcpsTerms);
      CalculateSales.__set__('McpsSalesTerms', {
        seperatedMcpsSalesTerms: seperatedMcpsSalesTermsStub,
      });
    });

    it('should call Release.find with the right args', (done) => {
      // Act
      CalculateSales.calculateMcpsReleaseBatch(period, client, db, bigQuery, object, catFilter, catOffset, limit, () => {
        // Assert
        expect(Release.find.calledWith(catFilter, { _id: 1 })).to.be.true;
        expect(releaseSort.calledWith({ _id: 1 })).to.be.true;
        expect(releaseLimit.calledWith(limit)).to.be.true;
        done();
      });
    });

    it('should call client.seperatedMcpsSalesTerms with the right args', (done) => {
      // Arrange
      client.mcpsFreeGoodsTargets = { type: randomString() };
      seperatedMcpsSalesTermsStub.yields(randomString());
      // Act
      CalculateSales.calculateMcpsReleaseBatch(period, client, db, bigQuery, object, catFilter, catOffset, limit, (err) => {
        // Assert
        expect(err).to.be.null;
        expect(seperatedMcpsSalesTermsStub.calledWith(client, client.mcpsFreeGoodsTargets)).to.be.true;
        done();
      });
    });

    it('should call SalesCalculation with the right args', (done) => {
      // Arrange
      const query = {
        salesFileId: { $in: period.salesFilesIds },
        releaseId: { $in: period.includedReleaseIds },
      };

      salesCalculation.calculate.yields(null, randomString());
      const expectedObject = JSON.parse(JSON.stringify(object));
      expectedObject.contracts = [{ name: `Period ID: ${period._id.toString()}`, objectPercentage: 100, contractId: 'MCPS', terms: { sales: mcpsTerms } }];
      expectedObject.type = 'Release';
      expectedObject.releaseIds = [release._id.toString()];
      expectedObject.periodEndDate = period.endDate;
      expectedObject.exchangeRates = period.currencyExchangeRates;
      expectedObject.clientCurrencies = {};
      expectedObject.mechanicalAmounts = {};
      expectedObject.bigQuery = bigQuery;
      expectedObject.salesData = [];
      expectedObject.contractQuery = query;
      expectedObject.db = db;

      // Act
      CalculateSales.calculateMcpsReleaseBatch(period, client, db, bigQuery, object, catFilter, catOffset, limit, (err) => {
        // Assert
        expect(err).to.be.null;
        expect(SalesCalculation.calledWith(expectedObject)).to.be.true;
        done();
      });
    });

    it('should call salesCalculation.calculate', (done) => {
      // Arrange
      salesCalculation.calculate.yields(null, randomString());
      // Act
      CalculateSales.calculateMcpsReleaseBatch(period, client, db, bigQuery, object, catFilter, catOffset, limit, (err) => {
        // Assert
        expect(err).to.be.null;
        expect(salesCalculation.calculate.called).to.be.true;
        done();
      });
    });

    describe('when salesCalculation.calculate returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        salesCalculation.calculate.yields(expectedError);
        // Act
        CalculateSales.calculateMcpsReleaseBatch(period, client, db, bigQuery, object, catFilter, catOffset, limit, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });
});
