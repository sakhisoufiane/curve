const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/periodStatementCreation.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Statement = require('../../../../../models/statement');
const Period = require('../../../../../models/period');
const BatchTask = require('../../../../../models/batchTask');
const Task = require('../../../../../models/task');

describe('PeriodStatementCreation Unit Tests', () => {
  let PeriodStatementCreation;
  let period; let db; let bigQuery; let client;
  let SQS; let Batch;
  let statementCount; let statement; let contractIds;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PeriodStatementCreation = rewire('../../../../../libs/calculation/period/periodStatementCreation');

    period = { _id: randomId(), clientId: randomId() };
    client = { _id: randomId() };
    db = { type: randomString() };
    bigQuery = {
      getSize: sinon.stub().yields(),
      outputTable: randomString(),
      filterFromObject: sinon.stub().returns(),
      queryJob: sinon.stub().yields(null, []),
    };

    statementCount = randomInt();
    sinon.stub(Statement, 'countDocuments').resolves(statementCount);

    sinon.stub(Period, 'findByIdAndUpdate');
    Period.findByIdAndUpdate.resolves();

    statement = { _id: randomId() };
    sinon.stub(Statement, 'find').resolves([statement]);

    sinon.stub(BatchTask.prototype, 'save');
    BatchTask.prototype.save.resolves();

    sinon.stub(Task.prototype, 'save');
    Task.prototype.save.resolves();

    SQS = { sendMessage: sinon.stub().yields() };
    PeriodStatementCreation.__set__('SQS', SQS);

    Batch = { mainProcessRunBatches: sinon.stub().yields() };
    PeriodStatementCreation.__set__('Batch', Batch);

    contractIds = [randomId(), randomId()];
    PeriodStatementCreation.__set__('associatedAddToContractIds', sinon.stub());
    PeriodStatementCreation.__get__('associatedAddToContractIds').yields(null, contractIds);
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#orderContracts', () => {
    it('should sort the contracts', (done) => {
      // Arrange
      const contracts = [{ _id: randomId() }, { _id: randomId() }, { _id: randomId() }];
      const contractSizes = {};
      contractSizes[contracts[1]._id] = randomInt();
      contractSizes[contracts[0]._id] = contractSizes[contracts[1]._id] + 100;
      contractSizes[contracts[2]._id] = contractSizes[contracts[1]._id] - 100;
      const expectedOutput = [contracts[2], contracts[1], contracts[0]];
      // Act
      const output = PeriodStatementCreation.orderContracts(contracts, contractSizes);
      expect(output).to.deep.eq(expectedOutput);
      done();
    });

    it('should only include the contracts passed to the function', (done) => {
      // Arrange
      const contracts = [{ _id: randomId() }, { _id: randomId() }, { _id: randomId() }];
      const contractSizes = {};
      contractSizes[contracts[0]._id] = randomInt();
      contractSizes[randomId()] = randomInt();
      // Act
      const output = PeriodStatementCreation.orderContracts(contracts, contractSizes);
      expect(output).to.deep.eq([contracts[0]]);
      done();
    });
  });

  describe('#batchContracts', () => {
    beforeEach((done) => {
      sinon.stub(PeriodStatementCreation, 'isContractUsingEscalations').returns(false);
      done();
    });

    it('should call isContractUsingEscalations', (done) => {
      // Arrange
      const limit = randomInt();
      const contracts = [{ _id: randomId() }];
      const contractSizes = {};
      // Act
      PeriodStatementCreation.batchContracts(contracts, contractSizes, {}, limit);
      expect(PeriodStatementCreation.isContractUsingEscalations.called).to.be.true;
      done();
    });

    describe('when the contract is using escalations', () => {
      it('should add it to the batches object in a array by itself', (done) => {
        // Arrange
        PeriodStatementCreation.isContractUsingEscalations.onFirstCall().returns(true);
        PeriodStatementCreation.isContractUsingEscalations.onSecondCall().returns(false);
        PeriodStatementCreation.isContractUsingEscalations.onThirdCall().returns(false);
        const limit = randomInt();
        const contracts = [{ _id: randomId() }, { _id: randomId() }, { _id: randomId() }];
        const contractSizes = {};
        // Act
        const { batches } = PeriodStatementCreation.batchContracts(contracts, contractSizes, {}, limit);
        expect(batches[0]).to.deep.eq([contracts[0]]);
        expect(batches[1]).to.deep.eq([contracts[1], contracts[2]]);
        done();
      });
    });

    describe('when contractSizes[contract._id.toString()] > (limit / 2)', () => {
      it('should add the contract to the individuals array', (done) => {
        // Arrange
        const limit = randomInt();
        const contracts = [{ _id: randomId() }];
        const contractSizes = {};
        contractSizes[contracts[0]._id] = (limit / 2) + randomInt();
        // Act
        const { individuals } = PeriodStatementCreation.batchContracts(contracts, contractSizes, {}, limit);
        expect(individuals).to.deep.eq([contracts[0]]);
        done();
      });
    });

    describe('when contractSizes[contract._id.toString()] < (limit / 2)', () => {
      it('should add the contract to the batches array', (done) => {
        // Arrange
        const limit = randomInt();
        const contracts = [{ _id: randomId() }];
        const contractSizes = {};
        contractSizes[contracts[0]._id] = (limit / 2) - randomInt();
        // Act
        const { batches } = PeriodStatementCreation.batchContracts(contracts, contractSizes, {}, limit);
        expect(batches).to.deep.eq([[contracts[0]]]);
        done();
      });
    });

    describe('when batchCount >= limit', () => {
      it('should add the contract to the batches array', (done) => {
        // Arrange
        const limit = randomInt();
        const contracts = [{ _id: randomId() }, { _id: randomId() }];
        const contractSizes = {};
        contractSizes[contracts[0]._id] = limit + randomInt();
        // Act
        const { individuals, batches } = PeriodStatementCreation.batchContracts(contracts, contractSizes, {}, limit);
        expect(individuals).to.deep.eq([contracts[0]]);
        expect(batches).to.deep.eq([[contracts[1]]]);
        done();
      });
    });
  });

  describe('#createStatementFiles', () => {
    let statementSizes;
    beforeEach((done) => {
      statementSizes = {};
      statementSizes[randomId()] = randomInt();

      sinon.stub(PeriodStatementCreation, 'statementSalesOutputCount').yields(null, statementSizes);
      sinon.stub(PeriodStatementCreation, 'orderContracts').returns([statement]);
      sinon.stub(PeriodStatementCreation, 'batchContracts').returns({ batches: [[statement]], individuals: [statement] });
      done();
    });

    it('should call Statement.countDocuments with the right args', (done) => {
      // Arrange
      const expectedFilter = { clientId: period.clientId, periodId: period._id.toString() };
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        expect(Statement.countDocuments.calledWith(expectedFilter)).to.be.true;
        done();
      });
    });

    describe('when recalculation.contractIds', () => {
      it('should add the ids to the filter', (done) => {
        // Arrange
        period.recalculation = { contractIds: [randomId(), randomId()] };
        const expectedFilter = { clientId: period.clientId, periodId: period._id.toString(), contractId: { $in: period.recalculation.contractIds } };
        // Act
        PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
          expect(Statement.countDocuments.calledWith(expectedFilter)).to.be.true;
          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        expect(Period.findByIdAndUpdate.calledWith(period._id, { $set: { totalContractsForCalculation: statementCount } })).to.be.true;
        done();
      });
    });

    it('should call Statement.find with the right args', (done) => {
      // Arrange
      const expectedFilter = { clientId: period.clientId, periodId: period._id.toString() };
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        expect(Statement.find.calledWith(expectedFilter, 'name periodId contractId clientId')).to.be.true;
        done();
      });
    });

    it('should call PeriodStatementCreation.statementSalesOutputCount with the right args', (done) => {
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        expect(PeriodStatementCreation.statementSalesOutputCount.calledWith(period, [statement], bigQuery)).to.be.true;
        done();
      });
    });

    it('should call PeriodStatementCreation.orderContracts with the right args', (done) => {
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        expect(PeriodStatementCreation.orderContracts.calledWith([statement], statementSizes)).to.be.true;
        done();
      });
    });

    it('should call PeriodStatementCreation.batchContracts with the right args', (done) => {
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        expect(PeriodStatementCreation.batchContracts.calledWith([statement], statementSizes, {}, 200000)).to.be.true;
        done();
      });
    });

    it('should create a batch task for each batch', (done) => {
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        const batchTask = BatchTask.prototype.save.firstCall.thisValue;
        expect(batchTask.clientId).to.deep.eq(period.clientId);
        expect(batchTask.periodId).to.deep.eq(period._id.toString());
        expect(batchTask.name).to.deep.eq('Statement Batch Creation');
        expect(batchTask.status).to.deep.eq('Pending');
        expect(batchTask.value).to.deep.eq({ statementIds: [statement._id] });
        done();
      });
    });

    it('should create a batch task for each individual batch', (done) => {
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        const batchTask = BatchTask.prototype.save.secondCall.thisValue;
        expect(batchTask.clientId).to.deep.eq(period.clientId);
        expect(batchTask.periodId).to.deep.eq(period._id.toString());
        expect(batchTask.name).to.deep.eq('Statement Individual Creation');
        expect(batchTask.status).to.deep.eq('Pending');
        expect(batchTask.value).to.deep.eq({ statementId: statement._id.toString() });
        done();
      });
    });

    describe('when batch.save errors', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        BatchTask.prototype.save.rejects(expectedError);
        // Act
        PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, (err) => {
          expect(err).to.eq(expectedError);
        });
      });
    });

    it.skip('should create a task fior each client.batchWorkers', (done) => {
      // Arrange
      client.batchWorkers = 2;
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, (err) => {
        setTimeout(() => {
          const task = Task.prototype.save.firstCall.thisValue;
          expect(task.clientId).to.eq(period.clientId);
          expect(task.name).to.eq('Batch Worker');
          expect(task.status).to.eq('Pending');
          expect(task.value).to.deep.eq({ periodId: period._id.toString() });
          done();
        }, 10000);
      });
    });

    it('should call Batch.mainProcessRunBatches with the rights args', (done) => {
      // Act
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, () => {
        expect(Batch.mainProcessRunBatches.calledWith(period)).to.be.true;
        done();
      });
    });
  });

  describe('#statementSalesOutputCount', () => {
    it('should call associatedAddToContractIds with the rights args', (done) => {
      // Act
      PeriodStatementCreation.statementSalesOutputCount(period, [statement], bigQuery, () => {
        expect(PeriodStatementCreation.__get__('associatedAddToContractIds').calledWith(statement)).to.be.true;
        done();
      });
    });

    it.skip('should call bigQuery.getSize with the rights args', (done) => {
      // Arrange
      const query = {
        periodId: period._id.toString(),
        contractId: { $in: contractIds },
        royaltyRate: { $ne: 0 },
        objectPercentage: { $ne: 0 },
      };
      // Act
      PeriodStatementCreation.statementSalesOutputCount(period, [statement], bigQuery, () => {
        expect(bigQuery.getSize.calledWith(bigQuery.outputTable, '*', query)).to.be.true;
        done();
      });
    });

    it.skip('should return statementSizes to the callback', (done) => {
      // Arrange
      const data = [{ count: randomInt() }];
      bigQuery.getSize.yields(null, data);
      // Act
      PeriodStatementCreation.statementSalesOutputCount(period, [statement], bigQuery, (err, statementSizes) => {
        expect(statementSizes[statement._id.toString()]).to.eq(data[0].count);
        done();
      });
    });
  });

  describe('#isContractUsingEscalations', () => {
    describe('when a sales term is using an escalation tracker', () => {
      it('should return true', (done) => {
        const contract = {
          salesTerms: [
            {
              escalationTrackers: [randomString()],
            },
          ],
        };

        const isContractUsingEscalations = PeriodStatementCreation.isContractUsingEscalations(contract);
        expect(isContractUsingEscalations).to.be.true;
        done();
      });
    });

    describe('when a sales term is using a calculation that uses an escalation tracker', () => {
      it('should return true', (done) => {
        const contract = {
          salesTerms: [
            {
              escalations: [{
                conditions: [{
                  escalationTracker: randomString(),
                }],
              }],
            },
          ],
        };

        const isContractUsingEscalations = PeriodStatementCreation.isContractUsingEscalations(contract);
        expect(isContractUsingEscalations).to.be.true;
        done();
      });
    });

    describe('when a sales term is using a calculation that uses Sale Date as an escalation tracker', () => {
      it('should return false', (done) => {
        const contract = {
          salesTerms: [
            {
              escalations: [{
                conditions: [{
                  escalationTracker: 'Sale Date',
                }],
              }],
            },
          ],
        };

        const isContractUsingEscalations = PeriodStatementCreation.isContractUsingEscalations(contract);
        expect(isContractUsingEscalations).to.be.false;
        done();
      });
    });

    describe('when a sales term is using a calculation that uses Reporting Date as an escalation tracker', () => {
      it('should return false', (done) => {
        const contract = {
          salesTerms: [
            {
              escalations: [{
                conditions: [{
                  escalationTracker: 'Reporting Date',
                }],
              }],
            },
          ],
        };

        const isContractUsingEscalations = PeriodStatementCreation.isContractUsingEscalations(contract);
        expect(isContractUsingEscalations).to.be.false;
        done();
      });
    });

    describe('when a costs term is using an escalation', () => {
      it('should return true', (done) => {
        const contract = {
          costsTerms: [
            {
              escalationTrackers: [randomString()],
            },
          ],
        };

        const isContractUsingEscalations = PeriodStatementCreation.isContractUsingEscalations(contract);
        expect(isContractUsingEscalations).to.be.true;
        done();
      });
    });
    describe('when no escalations are used', () => {
      it('should return true', (done) => {
        const contract = {
          salessTerms: [{}],
          costsTerms: [{}],
        };

        const isContractUsingEscalations = PeriodStatementCreation.isContractUsingEscalations(contract);
        expect(isContractUsingEscalations).to.be.false;
        done();
      });
    });
  });
});
