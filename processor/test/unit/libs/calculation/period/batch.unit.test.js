const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { delay } = require('lodash');

logger.info('\n\n**** .test/unit/libs/calculation/period/batch.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const BatchTask = require('../../../../../models/batchTask');
const Client = require('../../../../../models/client');

describe('Batch Unit Tests', () => {
  let Batch;
  let period;
  let client;

  before(() => {
    sinon.restore();
  });

  beforeEach(() => {
    Batch = rewire('../../../../../libs/calculation/period/batch');

    period = { _id: randomId() };
    client = { _id: randomId(), concurrentCalculations: randomInt() };

    sinon.stub(Client, 'findById').resolves(client);

    sinon.stub(Batch, 'getSQSBatchIds').resolves([]);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#mainProcessRunBatches', () => {
    beforeEach(() => {
      sinon.stub(BatchTask, 'find').resolves();
      sinon.stub(Batch, 'runBatches').yields();
      sinon.stub(Batch, 'checkBatchesComplete').yields();
    });

    it('should call Batch.runBatches with the right args', (done) => {
      // Act
      Batch.mainProcessRunBatches(period, () => {
        // Assert
        expect(Batch.runBatches.calledWith(null, period)).to.be.true;
        done();
      });
    });

    describe('when Batch.runBatches errors', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        Batch.runBatches.yields(expectedError);
        // Act
        Batch.mainProcessRunBatches(period, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when Batch.runBatches returns', () => {
      it('should call Batch.checkBatchesComplete with the right args', (done) => {
        // Act
        Batch.mainProcessRunBatches(period, (err) => {
          // Assert
          expect(Batch.checkBatchesComplete.called).to.be.true;
          done();
        });
      });

      describe('when Batch.checkBatchesComplete errors', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          Batch.checkBatchesComplete.yields(expectedError);
          // Act
          Batch.mainProcessRunBatches(period, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
  });

  describe('#checkBatchesComplete', () => {
    beforeEach(() => {
      sinon.stub(BatchTask, 'find').resolves();
    });

    it('should call BatchTask.find with the right args', (done) => {
      // Act
      Batch.checkBatchesComplete(period, () => {
        // Assert
        expect(BatchTask.find.calledWith({ periodId: period._id.toString(), status: { $in: ['Pending', 'In Progress'] } })).to.be.true;
        done();
      });
    });

    describe('when BatchTask.find errors', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        BatchTask.find.rejects(expectedError);
        // Act
        Batch.checkBatchesComplete(period, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    // These two tests below are extremely flaky and depend on timeouts/delays
    // TODO: Rework these, lots of time has been wasted here
    describe('when BatchTask.find returns batches', () => {
      it('should call Batch.checkBatchesComplete with the right args', (done) => {
        // Arrange
        const batches = [randomString(), randomString()];
        BatchTask.find.resolves(batches);
        // Act
        Batch.checkBatchesComplete(period, () => {
          // Assert
          expect(Batch.checkBatchesComplete.calledWith(period)).to.be.true;
          done();
        });

        setTimeout(async () => {
          sinon.stub(Batch, 'checkBatchesComplete').yields();
          await delay(500);
          BatchTask.find.resolves([]);
        }, 2000);
      });

      describe('when Batch.checkBatchesComplete returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          const batches = [randomString(), randomString()];
          BatchTask.find.resolves(batches);
          // Act
          Batch.checkBatchesComplete(period, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });

          setTimeout(async () => {
            sinon.stub(Batch, 'checkBatchesComplete').yields(expectedError);
            await delay(500);
            BatchTask.find.resolves([]);
          }, 2000);
        });
      });
    });
  });

  describe('#runBatches', () => {
    beforeEach(() => {
      sinon.stub(BatchTask, 'find').resolves();
      sinon.stub(BatchTask, 'updateMany').resolves();
      sinon.stub(BatchTask, 'countDocuments').resolves(randomInt());
    });

    it('should call Client.findById with the right args', (done) => {
      // Arrange
      BatchTask.find.resolves(randomString());
      // Act
      Batch.runBatches(null, period, () => {
        // Assert
        expect(Client.findById.calledWith(period.clientId)).to.be.true;
        done();
      });
    });

    it('should call BatchTask.find with the right args', (done) => {
      // Arrange
      BatchTask.find.resolves(randomString());
      const batchTaskIds = [randomId()];
      Batch.getSQSBatchIds.resolves(batchTaskIds);
      // Act
      Batch.runBatches(null, period, () => {
        // Assert
        expect(BatchTask.find.calledWith({ periodId: period._id.toString(), status: 'Pending', _id: { $in: batchTaskIds } })).to.be.true;
        done();
      });
    });

    describe('when BatchTask.find returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        BatchTask.find.rejects(expectedError);
        // Act
        Batch.runBatches(null, period, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    describe('when BatchTask.find returns batches', () => {
      let batches;
      let CalculateSalesBatch; let PeriodStatementCreationBatch;
      beforeEach(() => {
        batches = [
          { _id: randomId(), name: 'Sales Batch Calculation' },
          { _id: randomId(), name: 'Sales Batch Calculation' },
        ];
        BatchTask.find.resolves(batches);

        CalculateSalesBatch = {
          calculateSalesBatch: sinon.stub().yields(),
          calculateSalesContract: sinon.stub().yields(),
        };

        PeriodStatementCreationBatch = {
          createStatementBatch: sinon.stub().yields(),
          createIndividualStatementBatch: sinon.stub().yields(),
        };

        Batch.__set__('CalculateSalesBatch', CalculateSalesBatch);
        Batch.__set__('PeriodStatementCreationBatch', PeriodStatementCreationBatch);
      });

      it('should call BatchTask.updateMany with the right args', (done) => {
        // Arrange
        CalculateSalesBatch.calculateSalesBatch.yields(randomString());
        // Act
        Batch.runBatches(null, period, () => {
          // Assert
          expect(BatchTask.updateMany.calledWith(
            { _id: { $in: batches.map((batch) => batch._id) } },
            { $set: { status: 'In Progress', processId: process.pid, batchWorkerId: 'Main Process' } },
          )).to.be.true;
          done();
        });
      });

      describe('when BatchTask.updateMany returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          BatchTask.updateMany.rejects(expectedError);
          // Act
          Batch.runBatches(null, period, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
          });
        });
      });

      describe('when BatchTask.updateMany returns a batch', () => {
        describe('when batch name is Sales Batch Calculation', () => {
          it('should call CalculateSalesBatch.calculateSalesBatch with the right args', (done) => {
            // Arrange
            batches = [
              { _id: randomId(), name: 'Sales Batch Calculation' },
            ];
            BatchTask.find.resolves(batches);
            CalculateSalesBatch.calculateSalesBatch.yields(randomString());
            // Act
            Batch.runBatches(null, period, () => {
              // Assert
              expect(CalculateSalesBatch.calculateSalesBatch.calledWith(period, batches[0])).to.be.true;
              done();
            });
          });
        });

        describe('when batch name is Sales Individual Calculation', () => {
          it('should call CalculateSalesBatch.calculateSalesContract with the right args', (done) => {
            // Arrange
            batches = [
              { _id: randomId(), name: 'Sales Individual Calculation' },
            ];
            BatchTask.find.resolves(batches);
            CalculateSalesBatch.calculateSalesContract.yields(randomString());
            // Act
            Batch.runBatches(null, period, () => {
              // Assert
              expect(CalculateSalesBatch.calculateSalesContract.calledWith(period, batches[0])).to.be.true;
              done();
            });
          });
        });

        describe('when batch name is Statement Batch Creation', () => {
          it('should call PeriodStatementCreationBatch.createStatementBatch with the right args', (done) => {
            // Arrange
            batches = [
              { _id: randomId(), name: 'Statement Batch Creation' },
            ];
            BatchTask.find.resolves(batches);
            PeriodStatementCreationBatch.createStatementBatch.yields(randomString());
            // Act
            Batch.runBatches(null, period, () => {
              // Assert
              expect(PeriodStatementCreationBatch.createStatementBatch.calledWith(period, batches[0])).to.be.true;
              done();
            });
          });
        });
        describe('when batch name is Statement Individual Creation', () => {
          it('should call PeriodStatementCreationBatch.createIndividualStatementBatch with the right args', (done) => {
            // Arrange
            batches = [
              { _id: randomId(), name: 'Statement Individual Creation' },
            ];
            BatchTask.find.resolves(batches);
            PeriodStatementCreationBatch.createIndividualStatementBatch.yields(randomString());
            // Act
            Batch.runBatches(null, period, () => {
              // Assert
              expect(PeriodStatementCreationBatch.createIndividualStatementBatch.calledWith(period, batches[0])).to.be.true;
              done();
            });
          });
        });
        describe('when batch name is unrecognized', () => {
          it('should call PeriodStatementCreationBatch.createIndividualStatementBatch with the right args', (done) => {
            // Arrange
            batches = [
              { _id: randomId(), name: randomString() },
            ];
            BatchTask.find.onFirstCall().resolves(batches);
            BatchTask.find.onSecondCall().rejects(randomString());
            // Act
            Batch.runBatches(null, period, (err) => {
              // Assert
              expect(PeriodStatementCreationBatch.createStatementBatch.called).to.be.false;
              expect(PeriodStatementCreationBatch.createIndividualStatementBatch.called).to.be.false;
              expect(CalculateSalesBatch.calculateSalesBatch.called).to.be.false;
              expect(CalculateSalesBatch.calculateSalesContract.called).to.be.false;
              expect(BatchTask.find.callCount).to.eq(2);
              done();
            });
          });
        });
        describe('when a batch errors', () => {
          it('should returns the error to the callback', (done) => {
            // Arrange
            batches = [
              { _id: randomId(), name: 'Statement Individual Creation' },
            ];
            BatchTask.find.resolves(batches);
            const expectedError = randomString();
            PeriodStatementCreationBatch.createIndividualStatementBatch.yields(expectedError);
            // Act
            Batch.runBatches(null, period, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });

        it('should rerun the process after completion', (done) => {
          // Arrange
          batches = [
            { _id: randomId(), name: randomString() },
          ];
          BatchTask.find.onFirstCall().resolves(batches);
          BatchTask.find.onThirdCall().rejects(randomString());
          // Act
          Batch.runBatches(null, period, () => {
            // Assert
            expect(BatchTask.find.callCount).to.eq(3);
            done();
          });
        });
      });
    });
  });
});
