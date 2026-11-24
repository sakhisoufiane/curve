const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/periodStatementCreationBatch.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const Period = require('../../../../../models/period');
const Client = require('../../../../../models/client');
const Statement = require('../../../../../models/statement');
const BatchTask = require('../../../../../models/batchTask');
const Report = require('../../../../../models/report');
const config = require('../../../../../config.json');

describe('PeriodStatementCreationBatch Unit Tests', () => {
  let PeriodStatementCreationBatch;
  let period; let db; let bigQuery; let client; let statement;
  let completedItemsUpdater;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PeriodStatementCreationBatch = rewire('../../../../../libs/calculation/period/periodStatementCreationBatch');

    period = { _id: randomId(), clientId: randomId() };

    client = { _id: randomId(), concurrentStatementCreations: 1, salesReportTemplate: randomString(), suppressZeroValueInExport: randomString() };

    statement = { _id: randomId() };

    db = { type: randomString() };

    bigQuery = {
      getSize: sinon.stub().yields(),
      outputTable: randomString(),
    };

    sinon.stub(Client, 'findById');
    Client.findById.resolves(client);

    sinon.stub(Statement, 'find').resolves([statement]);
    sinon.stub(Statement, 'findById').resolves(statement);

    sinon.stub(databaseUtils, 'getBigQueryOpts').returns();

    sinon.stub(BatchTask.prototype, 'save');
    BatchTask.prototype.save.resolves();

    PeriodStatementCreationBatch.__set__('BigQuery', sinon.stub());
    PeriodStatementCreationBatch.__get__('BigQuery').returns(bigQuery);

    PeriodStatementCreationBatch.__set__('mongoose', { connection: { db } });

    sinon.stub(Period, 'findByIdAndUpdate');
    Period.findByIdAndUpdate.resolves();

    completedItemsUpdater = {
      increaseCount: sinon.stub(),
      stop: sinon.stub(),
    };

    PeriodStatementCreationBatch.__set__('CompletedItemsUpdater', sinon.stub());
    PeriodStatementCreationBatch.__get__('CompletedItemsUpdater').returns(completedItemsUpdater);
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#createStatementBatch', () => {
    let batchTask;
    beforeEach((done) => {
      batchTask = new BatchTask({
        value: {
          statementIds: [randomId(), randomId()],
        },
      });

      sinon.stub(PeriodStatementCreationBatch, 'runBatchStatementCreation').yields();

      done();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createStatementBatch(period, batchTask, () => {
        // Assert
        expect(Client.findById.calledWith(period.clientId)).to.be.true;
        done();
      });
    });

    describe('when Client.findById returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = new Error(randomString());
        Client.findById.rejects(expectedError);
        // Act
        PeriodStatementCreationBatch.createStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });

      it('should set the batchTask status to errored', () => {
        // Arrange
        const expectedError = new Error(randomString());
        Client.findById.rejects(expectedError);
        // Act
        PeriodStatementCreationBatch.createStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(batchTask.save.called).to.be.true;
          expect(batchTask.status).to.eq('Errored');
          expect(batchTask.error).to.eq('Failed to retreive client');
        });
      });
    });

    it('should call BigQuery with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createStatementBatch(period, batchTask, () => {
        // Assert
        expect(PeriodStatementCreationBatch.__get__('BigQuery').calledWith(databaseUtils.getBigQueryOpts(client))).to.be.true;
        done();
      });
    });

    it('should call Statement.find with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createStatementBatch(period, batchTask, () => {
        // Assert
        expect(Statement.find.calledWith({ _id: { $in: batchTask.value.statementIds.map((id) => ObjectId.createFromHexString(id)) } })).to.be.true;
        done();
      });
    });

    it('should call PeriodStatementCreationBatch.runBatchStatementCreation with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createStatementBatch(period, batchTask, () => {
        // Assert
        expect(PeriodStatementCreationBatch.runBatchStatementCreation.calledWith(period, [statement], db, bigQuery, client)).to.be.true;
        done();
      });
    });

    describe('when PeriodStatementCreationBatch.runBatchStatementCreation error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = new Error(randomString());
        batchTask.retryCount = 3;
        PeriodStatementCreationBatch.runBatchStatementCreation.yields(expectedError);
        // Act
        PeriodStatementCreationBatch.createStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });

      it('should set the batchTask status to errored', (done) => {
        // Arrange
        const expectedError = new Error(randomString());
        batchTask.retryCount = 3;
        PeriodStatementCreationBatch.runBatchStatementCreation.yields(expectedError);
        // Act
        PeriodStatementCreationBatch.createStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(batchTask.save.called).to.be.true;
          expect(batchTask.status).to.eq('Errored');
          expect(batchTask.error).to.eq(err.message);
          done();
        });
      });
    });

    it('should set the batchTask status to complete', (done) => {
      // Act
      PeriodStatementCreationBatch.createStatementBatch(period, batchTask, (err) => {
        // Assert
        expect(batchTask.save.called).to.be.true;
        expect(batchTask.status).to.eq('Complete');
        expect(batchTask.error).to.not.exist;
        done();
      });
    });
  });

  describe('#createIndividualStatementBatch', () => {
    let batchTask; let create;
    beforeEach((done) => {
      create = sinon.stub().yields();
      PeriodStatementCreationBatch.__set__('CreateFiles', { create });

      batchTask = new BatchTask({
        value: {
          statementId: randomId(),
        },
      });

      sinon.stub(PeriodStatementCreationBatch, 'runBatchStatementCreation').yields();

      done();
    });

    it('should call Client.findById with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
        // Assert
        expect(Client.findById.called).to.be.true;
        done();
      });
    });

    describe('when Client.findById error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = new Error(randomString());
        Client.findById.rejects(expectedError);
        // Act
        PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });

      it('should set the batchTask status to errored', () => {
        // Arrange
        const expectedError = new Error(randomString());
        Client.findById.rejects(expectedError);
        // Act
        PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(batchTask.save.called).to.be.true;
          expect(batchTask.status).to.eq('Errored');
          expect(batchTask.error).to.eq('Failed to retreive client');
        });
      });
    });

    it('should call BigQuery with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
        // Assert
        expect(PeriodStatementCreationBatch.__get__('BigQuery').calledWith(databaseUtils.getBigQueryOpts(client))).to.be.true;
        done();
      });
    });

    it('should call Statement.findById with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
        // Assert
        expect(Statement.findById.calledWith(batchTask.value.statementId)).to.be.true;
        done();
      });
    });

    it('should call CreateFiles.create with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
        // Assert
        expect(create.calledWith(statement, db, bigQuery, client, period, null)).to.be.true;
        done();
      });
    });

    describe('when CreateFiles.create error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = new Error(randomString());
        create.yields(expectedError);
        batchTask.retryCount = 3;
        // Act
        PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });

      it('should set the batchTask status to errored', (done) => {
        // Arrange
        const expectedError = new Error(randomString());
        create.yields(expectedError);
        batchTask.retryCount = 3;
        // Act
        PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
          // Assert
          expect(batchTask.save.called).to.be.true;
          expect(batchTask.status).to.eq('Errored');
          expect(batchTask.error).to.eq(err.message);
          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
        // Assert
        expect(Period.findByIdAndUpdate.calledWith(period._id, { $inc: { completedCatalogueItems: 1 } })).to.be.true;
        done();
      });
    });

    it('should set the batchTask status to errored', (done) => {
      // Act
      PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
        // Assert
        expect(batchTask.save.called).to.be.true;
        expect(batchTask.status).to.eq('Complete');
        expect(batchTask.error).to.not.exist;
        done();
      });
    });
  });

  describe('#runBatchStatementCreation', () => {
    let contractIds; let get; let getDataBatch; let create; let mappingData; let data; let workIsrcs;
    beforeEach((done) => {
      contractIds = [randomId(), randomId()];
      PeriodStatementCreationBatch.__set__('associatedAddToContractIds', sinon.stub());
      PeriodStatementCreationBatch.__get__('associatedAddToContractIds').yields(null, contractIds);

      mappingData = [[randomString(), randomString(), randomString()]];
      get = sinon.stub().yields(null, mappingData);
      PeriodStatementCreationBatch.__set__('CatalogueOverwritingData', { get });

      data = [[randomString(), randomString(), randomString()]];
      getDataBatch = sinon.stub().yields(null, data);
      PeriodStatementCreationBatch.__set__('collectData', { getDataBatch });

      create = sinon.stub().yields();
      PeriodStatementCreationBatch.__set__('CreateFiles', { create });

      workIsrcs = [[randomString(), randomString()], ...mappingData];
      PeriodStatementCreationBatch.__set__('getWorkIsrcs', sinon.stub());
      PeriodStatementCreationBatch.__get__('getWorkIsrcs').returns(workIsrcs);

      sinon.stub(Report, 'findById').resolves();

      done();
    });

    it('should set filter to the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        const filter = getDataBatch.args[0][2];
        expect(filter.periodId).to.eq(period._id.toString());
        expect(filter.royaltyRate).to.deep.eq({ $ne: 0 });
        expect(filter.objectPercentage).to.deep.eq({ $ne: 0 });
        done();
      });
    });

    it('should call associatedAddToContractIds with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        expect(PeriodStatementCreationBatch.__get__('associatedAddToContractIds').calledWith(statement)).to.be.true;
        done();
      });
    });

    it('should add the returned contractIds to the filter', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        const filter = getDataBatch.args[0][2];
        expect(filter.contractId).to.deep.eq({ $in: contractIds });
        done();
      });
    });

    it('should call Statement.find with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        expect(Statement.find.calledWith({ clientId: period.clientId, periodId: period._id.toString(), contractId: { $in: contractIds } }, 'partitionNo')).to.be.true;
        done();
      });
    });

    describe('when Statement.find error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Statement.find.rejects(expectedError);
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should add the partitionNos to the filter', (done) => {
      // Arrange
      statement.partitionNo = randomInt();
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        const filter = getDataBatch.args[0][2];
        expect(filter.contractPartitionNo).to.deep.eq({ $in: [statement.partitionNo] });
        done();
      });
    });

    describe('when only one null partitionNos', () => {
      it('should set the filter partitionNos to the right args', (done) => {
        // Arrange
        statement.partitionNo = null;
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
          // Assert
          const filter = getDataBatch.args[0][2];
          expect(filter.$or3).to.deep.eq([{ contractPartitionNo: null }]);
          done();
        });
      });
    });

    describe('when a mix of null and non null partitionNos', () => {
      it('should set the filter partitionNos to the right args', (done) => {
        // Arrange
        statement.partitionNo = null;
        const statementNonNull = { partitionNo: randomInt() };
        Statement.find.resolves([statement, statementNonNull]);
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
          // Assert
          const filter = getDataBatch.args[0][2];
          expect(filter.$or3).to.deep.eq([
            { contractPartitionNo: null },
            { contractPartitionNo: { $in: [statementNonNull.partitionNo] } },
          ]);
          done();
        });
      });
    });

    it('should call Report.findById with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        expect(Report.findById.calledWith(client.salesReportTemplate)).to.be.true;
        done();
      });
    });

    describe('when a report is found', () => {
      let report; let fields;
      beforeEach((done) => {
        fields = [
          { field: randomString(), header: randomString(), type: randomString() },
          { field: randomString(), header: randomString(), type: randomString() },
          { field: randomString(), header: randomString(), type: randomString() },
          { field: 'contractName', header: 'Contract Name', type: 'Selector' },
        ];
        report = { fields: [...fields] };
        Report.findById.resolves(report);

        done();
      });

      it('should set template to report.fields and shift contractName to the start', (done) => {
        const expectedFields = [
          { field: 'contractName', header: 'Contract Name', type: 'Selector' },
          ...fields,
        ];
        expectedFields.splice(expectedFields.length - 1, 1);
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
          // Assert
          const template = getDataBatch.args[0][3];
          expect(template).to.deep.eq(expectedFields);
          done();
        });
      });

      it('should call CatalogueOverwritingData.get with the right args', (done) => {
        const expectedOptions = {
          formatDates: true,
          joinArraysToString: true,
        };
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
          // Assert
          expect(get.calledWith(client, expectedOptions)).to.be.true;
          done();
        });
      });

      it('should call getWorkIsrcs with the right args', (done) => {
        // Arrange
        report.fields = [
          { field: 'workIsrcs', header: randomString(), type: randomString() },
        ];
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
          // Assert
          expect(PeriodStatementCreationBatch.__get__('getWorkIsrcs').calledWith(mappingData)).to.be.true;
          done();
        });
      });
      it('should set mappingData to the right value', (done) => {
        // Arrange
        report.fields = [
          { field: 'workIsrcs', header: randomString(), type: randomString() },
        ];
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
          // Assert
          const getWorkIsrcsData = getDataBatch.args[0][7];
          expect(getWorkIsrcsData).to.deep.eq(workIsrcs);

          done();
        });
      });
    });

    describe('when client.clientType is Publisher', () => {
      it('should set template to statementPublishing', (done) => {
        // Arrange
        Report.findById.resolves();
        client.clientType = 'Publisher';
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
          // Assert
          const template = getDataBatch.args[0][3];
          expect(template).to.deep.eq(config.exportTemplates.statementPublishing);
          done();
        });
      });
    });

    describe('when period.contractType is Mechanical', () => {
      it('should set template to statementMechanicals', (done) => {
        // Arrange
        Report.findById.resolves();
        period.contractType = 'Mechanical';
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
          // Assert
          const template = getDataBatch.args[0][3];
          expect(template).to.deep.eq(config.exportTemplates.statementMechanicals);
          done();
        });
      });
    });

    describe('else', () => {
      it('should set template to statementSales', (done) => {
        // Arrange
        Report.findById.resolves();
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
          // Assert
          const template = getDataBatch.args[0][3];
          expect(template).to.deep.eq(config.exportTemplates.statementSales);
          done();
        });
      });
    });

    it('should call collectData.getDataBatch with the right args', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
        // Assert
        expect(getDataBatch.args[0][0]).to.deep.eq(bigQuery);
        expect(getDataBatch.args[0][1]).to.deep.eq(bigQuery.outputTable);
        expect(getDataBatch.args[0][4]).to.deep.eq({ catalogueCatNo: 1, catalogueIsrc: 1, source: 1 });
        expect(getDataBatch.args[0][5]).to.deep.eq(client.suppressZeroValueInExport);
        done();
      });
    });

    it('should sort the data into an object', (done) => {
      // Arrange
      const expectedObject = {};
      data.forEach((line) => {
        expectedObject[line[0]] = expectedObject[line[0]] || [];
        expectedObject[line[0]].push(line);
      });
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, statement, db, bigQuery, client, (err) => {
        // Assert
        const dataObject = create.args[0][5];
        expect(dataObject).to.deep.eq(expectedObject);
        done();
      });
    });

    it('should call CreateFiles.create with the right args', (done) => {
      // Arrange
      const expectedObject = {};
      data.forEach((line) => {
        expectedObject[line[0]] = expectedObject[line[0]] || [];
        expectedObject[line[0]].push(line);
      });
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        expect(create.calledWith(statement, db, bigQuery, client, period, expectedObject)).to.be.true;
        done();
      });
    });

    it('should create CompletedCatalogueItems instance with the right args', (done) => {
      // Arrange
      const completedItemsUpdaterInitParams = {
        periodId: period._id,
        fieldToIncrease: 'completedCatalogueItems',
      };
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        expect(PeriodStatementCreationBatch.__get__('CompletedItemsUpdater').calledWith(completedItemsUpdaterInitParams)).to.be.true;
        done();
      });
    });

    it('should call CompletedCatalogueItems.increaseCount to increase count by 1', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        expect(completedItemsUpdater.increaseCount.calledWith(1)).to.be.true;
        done();
      });
    });

    it('should call CompletedCatalogueItems.stop', (done) => {
      // Act
      PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
        // Assert
        expect(completedItemsUpdater.stop.called).to.be.true;
        done();
      });
    });

    describe('when CreateFiles.create error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        create.yields(expectedError);
        // Act
        PeriodStatementCreationBatch.runBatchStatementCreation(period, [statement], db, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });
});
