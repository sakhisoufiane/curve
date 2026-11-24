const { logger, databaseUtils, ExchangeRateLib } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate, randomInt, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/periodController.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { MongoClient } = require('mongodb');

const Client = require('../../../../models/client');
const Period = require('../../../../models/period');
const AppSettings = require('../../../../models/appSettings');
const PaymentGroup = require('../../../../models/paymentGroup');
const Payment = require('../../../../models/payment');
const Notification = require('../../../../models/notification');
const SQS = require('../../../../libs/sqs');

describe('periodController unit tests', () => {
  let PeriodController;
  let inputPeriod; let mongoClient;
  let client;
  let mongoDBName; let mongoUrl; let mongoConnectOpts; let mongoDb;
  let getBigQueryOpts;
  let findByIdAndUpdate;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PeriodController = rewire('../../../../libs/calculation/periodController');

    inputPeriod = new Period({
      _id: randomId(),
      name: randomString(),
      clientId: randomId(),
      processStartTime: randomDate(),
      runNo: randomInt(),
      calculationLog: [],
      recalculation: {},
    });
    // Stubs
    client = { _id: randomId(), name: randomString() };
    sinon.stub(Client, 'findById').resolves(client);

    findByIdAndUpdate = sinon.stub(Period, 'findByIdAndUpdate').resolves();
    sinon.stub(Period, 'findById').resolves();
    sinon.stub(PaymentGroup, 'findOne').resolves();
    sinon.stub(PaymentGroup.prototype, 'save').resolves();
    sinon.stub(PaymentGroup.prototype, 'deleteOne').resolves();
    sinon.stub(Payment, 'countDocuments').resolves();

    sinon.stub(SQS, 'createQueue').resolves();
    sinon.stub(SQS, 'deleteQueue').resolves();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#calculate', () => {
    beforeEach((done) => {
      // Stubs
      sinon.stub(PeriodController, 'startupStatus').yields();
      sinon.stub(PeriodController, 'flushCurrencies').resolves();
      sinon.stub(PeriodController, 'createSqsQueue').resolves();
      sinon.stub(PeriodController, 'refreshSalesFileIds').resolves();
      sinon.stub(PeriodController, 'refreshCostIds').resolves();
      sinon.stub(PeriodController, 'setExchangeRates').yields();
      sinon.stub(PeriodController, 'checkAppSettings').yields();
      sinon.stub(PeriodController, 'buildRecalculationFilter').yields();
      sinon.stub(PeriodController, 'clearPeriod').resolves();
      sinon.stub(PeriodController, 'setEscalcationStartingFigures').yields();
      sinon.stub(PeriodController, 'setStatementDesigns').yields();
      sinon.stub(PeriodController, 'getQueryMetadata').yields();
      sinon.stub(PeriodController, 'getReleaseMechanicalAmounts').yields();
      sinon.stub(PeriodController, 'calculateCosts').yields();
      sinon.stub(PeriodController, 'calculateSales').yields();
      sinon.stub(PeriodController, 'checkForDoubleAccounting').yields();
      sinon.stub(PeriodController, 'getPeriodData').yields();
      sinon.stub(PeriodController, 'createPeriodFiles').yields();
      sinon.stub(PeriodController, 'createStatements').yields();
      sinon.stub(PeriodController, 'getStatementData').yields();
      sinon.stub(PeriodController, 'createPaymentGroup').yields();
      sinon.stub(PeriodController, 'createTransactions').yields();
      sinon.stub(PeriodController, 'checkPaymentGroup').yields();
      sinon.stub(PeriodController, 'setSummaryStatementValues').yields();
      sinon.stub(PeriodController, 'createStatementFiles').yields();
      sinon.stub(PeriodController, 'clearLogoFiles').yields();
      sinon.stub(PeriodController, 'complete').yields();

      mongoDb = { name: randomString() };
      mongoClient = {
        db: sinon.stub().returns(mongoDb),
        close: sinon.stub().returns(),
      };
      sinon.stub(MongoClient, 'connect').resolves(mongoClient);

      mongoDBName = randomString();
      mongoUrl = randomString();
      mongoConnectOpts = randomString();
      getBigQueryOpts = randomString();
      sinon.stub(databaseUtils, 'getMongoDBName').returns(mongoDBName);
      sinon.stub(databaseUtils, 'getMongoUrl').returns(mongoUrl);
      sinon.stub(databaseUtils, 'getMongoConnectOpts').returns(mongoConnectOpts);
      sinon.stub(databaseUtils, 'getBigQueryOpts').returns(getBigQueryOpts);

      PeriodController.__set__('BigQuery', sinon.stub());

      done();
    });

    it('should assign inputPeriod to the period', () => {
      // Arrange
      MongoClient.connect.resolves(mongoClient);
      // Act
      PeriodController.calculate(inputPeriod, () => {
        // Assert
        expect(Client.findById.calledWith(inputPeriod.clientId)).to.be.true;
      });
    });

    it('should set modComparisonTime to period.processStartTime', () => {
      // Act
      PeriodController.calculate(inputPeriod, () => {
        // Assert
        const modComparisonTime = PeriodController.complete.args[0][1];
        expect(modComparisonTime).to.eq(inputPeriod.processStartTime);
      });
    });

    it('should increment period.runNo', () => {
      // Arrange
      const initialRunNo = inputPeriod.runNo;
      // Act
      PeriodController.calculate(inputPeriod, () => {
        // Assert
        expect(inputPeriod.runNo).to.eq(initialRunNo + 1);
      });
    });

    it('should call flushCurrencies', () => {
      // Act
      PeriodController.calculate(inputPeriod, () => {
        // Assert
        expect(PeriodController.flushCurrencies.called).to.be.true;
      });
    });

    describe('when flushCurrencies returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        PeriodController.flushCurrencies.rejects(new Error(expectedError));
        // Act
        PeriodController.calculate(inputPeriod, (err) => {
          // Assert
          expect(err.message).to.eq(expectedError);
        });
      });
    });

    it('should assign foundClient to client', () => {
      // Act
      PeriodController.calculate(inputPeriod, () => {
        // Assert
        expect(databaseUtils.getBigQueryOpts.calledWith(client)).to.be.true;
      });
    });

    it('should call MongoClient.connect with the right args', () => {
      // Act
      PeriodController.calculate(inputPeriod, () => {
        // Assert
        expect(MongoClient.connect.calledWith(mongoUrl, mongoConnectOpts)).to.be.true;
      });
    });

    describe('when MongoClient.connect returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        MongoClient.connect.rejects(expectedError);
        // Act
        PeriodController.calculate(inputPeriod, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    describe('when MongoClient.connect returns a client', () => {
      it('should call mongoClient.db with the db name', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(mongoClient.db.calledWith(mongoDBName)).to.be.true;
        });
      });

      it('should assign mongoClient.db to db', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.__get__('db')).to.eq(mongoDb);
        });
      });

      it('should create a new bigQuery instance using the client object', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(databaseUtils.getBigQueryOpts.calledWith(client)).to.be.true;
          expect(PeriodController.__get__('BigQuery').calledWith(getBigQueryOpts)).to.be.true;
        });
      });

      it('should call startupStatus', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.startupStatus.called).to.be.true;
        });
      });
      describe('when startupStatus returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.startupStatus.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call refreshSalesFileIds', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.refreshSalesFileIds.called).to.be.true;
        });
      });
      describe('when refreshSalesFileIds returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.refreshSalesFileIds.rejects(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call refreshCostIds', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.refreshCostIds.called).to.be.true;
        });
      });
      describe('when refreshCostIds returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.refreshCostIds.rejects(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call setExchangeRates', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.setExchangeRates.called).to.be.true;
        });
      });
      describe('when setExchangeRates returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.setExchangeRates.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call checkAppSettings', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.checkAppSettings.called).to.be.true;
        });
      });
      describe('when checkAppSettings returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.checkAppSettings.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call buildRecalculationFilter', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.buildRecalculationFilter.called).to.be.true;
        });
      });
      describe('when buildRecalculationFilter returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.buildRecalculationFilter.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call clearPeriod', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.clearPeriod.called).to.be.true;
        });
      });
      describe('when clearPeriod returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.clearPeriod.rejects(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });
      it('should call setEscalcationStartingFigures', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.setEscalcationStartingFigures.called).to.be.true;
        });
      });
      describe('when setEscalcationStartingFigures returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.setEscalcationStartingFigures.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call setStatementDesigns', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.setStatementDesigns.called).to.be.true;
        });
      });
      describe('when setStatementDesigns returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.setStatementDesigns.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call getQueryMetadata', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.getQueryMetadata.called).to.be.true;
        });
      });
      describe('when getQueryMetadata returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.getQueryMetadata.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call calculateCosts', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.calculateCosts.called).to.be.true;
        });
      });
      describe('when calculateCosts returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.calculateCosts.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call calculateSales', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.calculateSales.called).to.be.true;
        });
      });
      describe('when calculateSales returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.calculateSales.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call getPeriodData', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.getPeriodData.called).to.be.true;
        });
      });
      describe('when getPeriodData returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.getPeriodData.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call createPeriodFiles', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.createPeriodFiles.called).to.be.true;
        });
      });
      describe('when createPeriodFiles returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.createPeriodFiles.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call createStatements', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.createStatements.called).to.be.true;
        });
      });
      describe('when createStatements returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.createStatements.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call getStatementData', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.getStatementData.called).to.be.true;
        });
      });
      describe('when getStatementData returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.getStatementData.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call createPaymentGroup', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.createPaymentGroup.called).to.be.true;
        });
      });
      describe('when createPaymentGroup returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.createPaymentGroup.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call createTransactions', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.createTransactions.called).to.be.true;
        });
      });
      describe('when createTransactions returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.createTransactions.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call checkPaymentGroup', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.checkPaymentGroup.called).to.be.true;
        });
      });
      describe('when checkPaymentGroup returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.checkPaymentGroup.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call setSummaryStatementValues', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.setSummaryStatementValues.called).to.be.true;
        });
      });
      describe('when setSummaryStatementValues returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.setSummaryStatementValues.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call createStatementFiles', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.createStatementFiles.called).to.be.true;
        });
      });
      describe('when createStatementFiles returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.createStatementFiles.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call clearLogoFiles', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.clearLogoFiles.called).to.be.true;
        });
      });
      describe('when clearLogoFiles returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.clearLogoFiles.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            const calculationErr = PeriodController.complete.args[0][2];
            // Assert
            expect(calculationErr).to.eq(expectedError);
          });
        });
      });

      it('should call complete', () => {
        // Act
        PeriodController.calculate(inputPeriod, () => {
          // Assert
          expect(PeriodController.complete.calledWith(mongoClient, PeriodController.__get__('modComparisonTime'))).to.be.true;
        });
      });
      describe('when clearLogoFiles returns an error', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          PeriodController.complete.yields(expectedError);
          // Act
          PeriodController.calculate(inputPeriod, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
          });
        });
      });
    });
  });

  describe('#startupStatus', () => {
    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);

      done();
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Arrange
      const { runNo } = inputPeriod;
      // Act
      PeriodController.startupStatus(() => {
        // Assert
        const periodId = Period.findByIdAndUpdate.args[0][0];
        const update = Period.findByIdAndUpdate.args[0][1];
        expect(periodId).to.eq(inputPeriod._id);
        expect(update.$set.status).to.eq('Processing');
        expect(update.$set.calculationStatus).to.eq('Determining Recalculation Type');
        expect(update.$set.runNo).to.eq(runNo);
        done();
      });
    });
    describe('when Period.findByIdAndUpdate errors', () => {
      it('should returns the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        findByIdAndUpdate.rejects(expectedError);
        // Act
        PeriodController.startupStatus((err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });

  describe('#refreshSalesFileIds', () => {
    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);

      done();
    });

    it('should call GetIdsForCalculation.getSalesFileIds with the right args', async () => {
      // Arrange
      PeriodController.__set__('GetIdsForCalculation.getSalesFileIds', sinon.stub().resolves());
      // Act
      await PeriodController.refreshSalesFileIds();
      expect(PeriodController.__get__('GetIdsForCalculation.getSalesFileIds').calledWith(inputPeriod)).to.be.true;
    });
    describe('when GetIdsForCalculation.getSalesFileIds errors', () => {
      it('should call Period.findByIdAndUpdate with the right args', async () => {
        // Arrange
        const expectedError = randomString();
        PeriodController.__set__('GetIdsForCalculation.getSalesFileIds', sinon.stub().rejects(expectedError));
        // Act
        try {
          await PeriodController.refreshSalesFileIds();
        } catch (error) {
          expect(Period.findByIdAndUpdate.calledWith(inputPeriod._id, { $set: { calculationStatus: 'Errored in Getting Sales File IDs' } })).to.be.true;
        }
      });
      it('should returns the error to the callback', async () => {
        // Arrange
        const expectedError = randomString();
        PeriodController.__set__('GetIdsForCalculation.getSalesFileIds', sinon.stub().yields(expectedError));
        // Act
        try {
          await PeriodController.refreshSalesFileIds();
        } catch (error) {
          expect(String(error)).to.eq(expectedError);
        }
      });
    });
  });

  describe('#refreshCostIds', () => {
    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);

      done();
    });

    it('should call GetIdsForCalculation.getCostIds with the right args', async () => {
      // Arrange
      PeriodController.__set__('GetIdsForCalculation.getCostIds', sinon.stub().resolves());
      // Act
      PeriodController.refreshCostIds(() => {
        // Assert
        expect(PeriodController.__get__('GetIdsForCalculation.getCostIds').calledWith(inputPeriod)).to.be.true;
      });
    });

    describe('when GetIdsForCalculation.getCostIds errors', () => {
      it('should call Period.findByIdAndUpdate with the right args', async () => {
        // Arrange
        const expectedError = randomString();
        PeriodController.__set__('GetIdsForCalculation.getCostIds', sinon.stub().rejects(expectedError));
        // Act
        try {
          await PeriodController.refreshCostIds();
        } catch (error) {
          expect(Period.findByIdAndUpdate.calledWith(inputPeriod._id, { $set: { calculationStatus: 'Errored in Getting Cost IDs' } })).to.be.true;
        }
      });
      it('should returns the error to the callback', async () => {
        // Arrange
        const expectedError = randomString();
        PeriodController.__set__('GetIdsForCalculation.getCostIds', sinon.stub().yields(expectedError));
        // Act
        try {
          await PeriodController.refreshCostIds();
        } catch (err) {
          expect(err).to.eq(expectedError);
        }
      });
    });
  });

  describe('#setExchangeRates', () => {
    beforeEach((done) => {
      Period.findByIdAndUpdate.resolves();

      done();
    });

    describe('When a client currency doesnt have an exchange rate', () => {
      it('should add default rate to the period exchange rates', (done) => {
        // Arrange
        client.currency2 = randomString();
        PeriodController.__set__('client', client);
        inputPeriod.currencyExchangeRates = [];
        PeriodController.__set__('period', inputPeriod);
        const expectedExchangeRate = { from: client.currency2, to: client.currency2, rate: 1 };
        // Act
        PeriodController.setExchangeRates(() => {
          // Assert
          expect(inputPeriod.currencyExchangeRates[0]).to.include(expectedExchangeRate);
          done();
        });
      });
    });

    describe('When a client home currency doesnt have an exchange rate', () => {
      it('should add default rate to the period exchange rates', (done) => {
        // Arrange
        client.homeCurrency = randomString();
        PeriodController.__set__('client', client);
        inputPeriod.currencyExchangeRates = [];
        PeriodController.__set__('period', inputPeriod);
        const expectedExchangeRate = { from: client.homeCurrency, to: 'Home Currency', rate: 1 };
        // Act
        PeriodController.setExchangeRates(() => {
          // Assert
          expect(inputPeriod.currencyExchangeRates[1]).to.include(expectedExchangeRate);
          done();
        });
      });
    });

    describe('When a client currency has an exchange rate and the home currency also has one', () => {
      it('should not add default exchange rates', (done) => {
        // Arrange
        client.homeCurrency = randomString();
        PeriodController.__set__('client', client);
        inputPeriod.currencyExchangeRates = [
          { from: client.homeCurrency, to: client.homeCurrency, rate: randomInt() },
          { from: client.homeCurrency, to: 'Home Currency', rate: randomInt() },
        ];
        PeriodController.__set__('period', inputPeriod);
        // Act
        PeriodController.setExchangeRates(() => {
          // Assert
          expect(inputPeriod.currencyExchangeRates.length).to.eq(2);
          done();
        });
      });
    });

    describe('When a client currency is null', () => {
      it('should be skipped', (done) => {
        // Arrange
        client.homeCurrency = randomString();
        client.currency2 = null;
        PeriodController.__set__('client', client);
        inputPeriod.currencyExchangeRates = [
          { from: client.homeCurrency, to: client.homeCurrency, rate: randomInt() },
          { from: client.homeCurrency, to: 'Home Currency', rate: randomInt() },
        ];
        PeriodController.__set__('period', inputPeriod);
        // Act
        PeriodController.setExchangeRates(() => {
          // Assert
          expect(inputPeriod.currencyExchangeRates.length).to.eq(2);
          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Arrange
      inputPeriod.currencyExchangeRates = [];
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      // Act
      PeriodController.setExchangeRates(() => {
        // Assert
        expect(Period.findByIdAndUpdate.calledWith(inputPeriod._id, { $set: { currencyExchangeRates: inputPeriod.currencyExchangeRates } })).to.be.true;
        done();
      });
    });
  });

  describe('#buildRecalculationFilter', () => {
    beforeEach((done) => {
      PeriodController.__set__('recalculationFilter', {
        createFilter: sinon.stub().yields(randomString()),
      });
      PeriodController.__set__('client', client);
      PeriodController.__set__('db', { name: randomString() });
      PeriodController.__set__('bigQuery', { name: randomString() });
      PeriodController.__set__('modComparisonTime', randomDate());
      PeriodController.__set__('overrideAlwaysRunFull', randomBoolean());

      done();
    });

    it('should set period.recalculation to an empty object', (done) => {
      // Arrange
      inputPeriod.recalculation = { name: randomString() };
      PeriodController.__set__('period', inputPeriod);
      // Act
      PeriodController.buildRecalculationFilter(() => {
        // Assert
        expect(inputPeriod.recalculation).to.deep.eq({});
        done();
      });
    });

    it('should limit period.calculationLog to 50 logs', (done) => {
      // Arrange
      inputPeriod.recalculation = { name: randomString() };
      for (let i = 0; i < 100; i += 1) { inputPeriod.calculationLog.push(randomString()); }
      PeriodController.__set__('period', inputPeriod);
      // Act
      PeriodController.buildRecalculationFilter(() => {
        // Assert
        expect(inputPeriod.calculationLog.length).to.eq(50);
        done();
      });
    });

    it('should call recalculationFilter.createFilter with the right obj', (done) => {
      // Arrange
      inputPeriod.recalculation = { name: randomString() };
      PeriodController.__set__('period', inputPeriod);
      // Act
      PeriodController.buildRecalculationFilter(() => {
        // Assert
        inputPeriod.calculationLog = [];
        expect(PeriodController.__get__('recalculationFilter').createFilter.calledWith(
          PeriodController.__get__('db'),
          PeriodController.__get__('bigQuery'),
          inputPeriod.toObject(),
          client,
          PeriodController.__get__('modComparisonTime'),
          PeriodController.__get__('overrideAlwaysRunFull'),
        )).to.be.true;
        done();
      });
    });

    describe('when recalculationFilter.createFilter returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        PeriodController.__set__('recalculationFilter', {
          createFilter: sinon.stub().yields(expectedError),
        });
        PeriodController.__set__('period', inputPeriod);

        done();
      });

      it('should call Period.findByIdAndUpdate with the rights args', (done) => {
        // Act
        PeriodController.buildRecalculationFilter(() => {
          // Assert
          expect(Period.findByIdAndUpdate.calledWith(
            inputPeriod._id,
            {
              $set: {
                calculationStatus: 'Error in building recalculation filter',
                calculationLog: inputPeriod.calculationLog,
              },
            },
          )).to.be.true;
          done();
        });
      });

      it('should update the period logs to reflect the error', (done) => {
        // Act
        PeriodController.buildRecalculationFilter(() => {
          // Assert
          expect(inputPeriod.calculationLog[0].type).to.eq('Partial');
          expect(inputPeriod.calculationLog[0].status).to.eq('Errored');
          done();
        });
      });
    });

    describe('when recalculationFilter.createFilter returns a recalculation', () => {
      let recalculation;
      beforeEach((done) => {
        recalculation = { type: randomString() };
        PeriodController.__set__('recalculationFilter', {
          createFilter: sinon.stub().yields(null, recalculation),
        });
        PeriodController.__set__('period', inputPeriod);
        done();
      });

      it('should set period.calculationStatus to \'Clearing Previous Data\'', (done) => {
        // Act
        PeriodController.buildRecalculationFilter(() => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Clearing Previous Data');
          done();
        });
      });

      it('should set period.recalculation to the recalculation', (done) => {
        // Act
        PeriodController.buildRecalculationFilter(() => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.recalculation).to.eq(recalculation);
          done();
        });
      });

      it('should add the recalculation to period.calculationLog', (done) => {
        // Act
        PeriodController.buildRecalculationFilter(() => {
          // Assert
          expect(inputPeriod.calculationLog).to.deep.include(recalculation);
          done();
        });
      });

      describe('when recalculation.type is Partial and recalculation.status has No Changes', () => {
        it('should set the period status to complete', (done) => {
          // Arrange
          recalculation.type = 'Partial';
          recalculation.status = 'No Changes';
          // Act
          PeriodController.buildRecalculationFilter(null, () => {
            // Assert
            const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
            expect(setQuery.status).to.eq('Complete');
            expect(setQuery.calculationStatus).to.eq('Complete');
            expect(setQuery.recalculation).to.be.null;
            expect(setQuery.calculationError).to.be.null;
            done();
          });
        });
      });
    });
  });

  describe('#checkAppSettings', () => {
    let appSettings;

    beforeEach((done) => {
      appSettings = {};
      sinon.stub(AppSettings, 'findOne').resolves(appSettings);
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      done();
    });

    it('should call AppSettings.findOne with the right args', (done) => {
      // Act
      PeriodController.checkAppSettings(() => {
        // Assert
        expect(AppSettings.findOne.calledWith({})).to.be.true;
        done();
      });
    });

    describe('when AppSettings.findOne returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        AppSettings.findOne.rejects(expectedError);
        done();
      });

      it('should set the calculationStatus to \'Errored in Getting App Settings\'', (done) => {
        // Act
        PeriodController.checkAppSettings(() => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Getting App Settings');
          done();
        });
      });
      it('should return the error to the callback', () => {
        // Act
        PeriodController.checkAppSettings((err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    describe('when AppSettings.findOne returns the settings', () => {
      it('should set overrideAlwaysRunFull to settings.overrideAlwaysRunFull', (done) => {
        // Arrange
        appSettings.overrideAlwaysRunFull = randomBoolean();
        // Act
        PeriodController.checkAppSettings(() => {
          // Assert
          expect(PeriodController.__get__('overrideAlwaysRunFull')).to.eq(appSettings.overrideAlwaysRunFull);
          done();
        });
      });

      describe('when settings.features.payments is false', () => {
        it('should set generatePayments to false', (done) => {
          // Arrange
          appSettings.features = { payments: false };
          // Act
          PeriodController.checkAppSettings(() => {
            // Assert
            expect(PeriodController.__get__('generatePayments')).to.be.false;
            done();
          });
        });
      });

      describe('when client.features.payments is false', () => {
        it('should set generatePayments to false', (done) => {
          // Arrange
          appSettings.features = { payments: false };
          client.features = { payments: false };
          // Act
          PeriodController.checkAppSettings(() => {
            // Assert
            expect(PeriodController.__get__('generatePayments')).to.be.false;
            done();
          });
        });
      });

      describe('when settings.features.payments and client.features.payments are true', () => {
        it('should set generatePayments to true', (done) => {
          // Arrange
          appSettings.features = { payments: true };
          client.features = { payments: true };
          // Act
          PeriodController.checkAppSettings(() => {
            // Assert
            expect(PeriodController.__get__('generatePayments')).to.be.true;
            done();
          });
        });
      });
    });
  });

  describe('#clearPeriod', () => {
    beforeEach((done) => {
      PeriodController.__set__('Clear', {
        clearPeriod: sinon.stub().resolves(),
      });

      PeriodController.__set__('period', inputPeriod);

      done();
    });

    describe('period.recalculation.type is Initial', () => {
      it('should skip clearing the period', async () => {
        // Arrange
        inputPeriod.recalculation.type = 'Initial';
        // Act
        await PeriodController.clearPeriod();
        expect(PeriodController.__get__('Clear').clearPeriod.called).to.be.false;
      });
    });
    describe('period.recalculation.type is not Initial', () => {
      beforeEach((done) => {
        inputPeriod.recalculation.type = randomString();
        PeriodController.__set__('client', client);
        PeriodController.__set__('db', { name: randomString() });
        PeriodController.__set__('bigQuery', { name: randomString() });

        done();
      });

      it('should call Clear.clearPeriod with the right args', async () => {
        // Arrange
        inputPeriod.recalculation.type = randomString();
        // Act
        await PeriodController.clearPeriod();
        // Assert
        expect(PeriodController.__get__('Clear').clearPeriod.calledWith(
          inputPeriod,
          PeriodController.__get__('db'),
          PeriodController.__get__('bigQuery'),
        )).to.be.true;
      });

      describe('Clear.clearPeriod returns an error', () => {
        let expectedError;
        beforeEach((done) => {
          expectedError = randomString();
          PeriodController.__get__('Clear').clearPeriod.rejects(expectedError);
          done();
        });

        it('should set the calculationStatus to \'Errored in Clearing Previous Data\'', async () => {
          // Arrange
          inputPeriod.recalculation.type = randomString();
          // Act
          try {
            await PeriodController.clearPeriod();
          } catch (error) {
            // Assert
            const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
            expect(setQuery.calculationStatus).to.eq('Errored in Clearing Previous Data');
          }
        });

        it('should return the error to the callback', async () => {
          // Arrange
          inputPeriod.recalculation.type = randomString();
          // Act
          try {
            await PeriodController.clearPeriod();
          } catch (error) {
            expect(String(error)).to.eq(expectedError);
          }
        });
      });

      describe('Clear.clearPeriod doesnt return an error', () => {
        it('should set the calculationStatus to \'Updating Catalogue Data\'', async () => {
          // Arrange
          inputPeriod.recalculation.type = randomString();
          // Act
          await PeriodController.clearPeriod();
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Updating Catalogue Data');
        });

        describe('when Period.findByIdAndUpdate error', () => {
          it('should return the error to the callback', async () => {
            // Arrange
            const expectedError = randomString();
            findByIdAndUpdate.rejects(expectedError);
            // Act
            try {
              await PeriodController.clearPeriod();
            } catch (err) {
              expect(String(err)).to.eq(expectedError);
            }
          });
        });
      });
    });
  });

  describe('#setEscalcationStartingFigures', () => {
    let getEscalationStartingFigures;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      getEscalationStartingFigures = sinon.stub().resolves();
      PeriodController.__set__('Escalations', { getEscalationStartingFigures });

      done();
    });

    it('should call Escalations.getEscalationStartingFigures with the right args', (done) => {
      // Act
      PeriodController.setEscalcationStartingFigures((err) => {
        // Assert
        expect(PeriodController.__get__('Escalations').getEscalationStartingFigures.calledWith(inputPeriod)).to.be.true;
        done();
      });
    });

    describe('when Escalations.getEscalationStartingFigures returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        getEscalationStartingFigures.rejects(new Error(expectedError));

        done();
      });

      it('should set the calculationStatus to \'Errored in Getting Escalation Starting Figures\'', (done) => {
        // Act
        PeriodController.setEscalcationStartingFigures((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Getting Escalation Starting Figures');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.setEscalcationStartingFigures((err) => {
          // Assert
          expect(err.message).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#setStatementDesigns', () => {
    let setContractStatementDesigns;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      setContractStatementDesigns = sinon.stub().yields();
      PeriodController.__set__('StatementDesigns', { setContractStatementDesigns });

      done();
    });

    it('should call StatementDesigns.setContractStatementDesigns with the right args', (done) => {
      // Act
      PeriodController.setStatementDesigns((err) => {
        // Assert
        expect(PeriodController.__get__('StatementDesigns').setContractStatementDesigns.calledWith(inputPeriod, client)).to.be.true;
        done();
      });
    });

    describe('when StatementDesigns.setContractStatementDesigns returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        setContractStatementDesigns.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored in Setting Contract Statement Designs\'', (done) => {
        // Act
        PeriodController.setStatementDesigns((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Setting Contract Statement Designs');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.setStatementDesigns((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#getQueryMetadata', () => {
    let get;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('bigQuery', { name: randomString() });
      get = sinon.stub().yields();
      PeriodController.__set__('QueryMetadata', { get });

      done();
    });

    it('should call QueryMetadata.get with the right args', (done) => {
      // Act
      PeriodController.getQueryMetadata((err) => {
        // Assert
        expect(PeriodController.__get__('QueryMetadata').get.calledWith(inputPeriod, PeriodController.__get__('bigQuery'))).to.be.true;
        done();
      });
    });

    describe('when QueryMetadata.get returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        get.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored in Updating Catalogue Data\'', (done) => {
        // Act
        PeriodController.getQueryMetadata((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Updating Catalogue Data');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.getQueryMetadata((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#calculateCosts', () => {
    let calculate;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('bigQuery', { name: randomString() });
      calculate = sinon.stub().yields();
      PeriodController.__set__('CalculateCosts', { calculate });

      done();
    });

    it('should call CalculateCosts.calculate with the right args', (done) => {
      // Act
      PeriodController.calculateCosts((err) => {
        // Assert
        expect(PeriodController.__get__('CalculateCosts').calculate.calledWith(inputPeriod, PeriodController.__get__('db'), PeriodController.__get__('bigQuery'), PeriodController.__get__('client'))).to.be.true;
        done();
      });
    });

    describe('when CalculateCosts.calculate returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        calculate.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Costs Calculation Errored\'', (done) => {
        // Act
        PeriodController.calculateCosts(() => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Costs Calculation Errored');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.calculateCosts((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when CalculateCosts.calculate doesnt return an error', () => {
      it('should set the calculationStatus to \'Calculating Sales\'', (done) => {
        // Act
        PeriodController.calculateCosts(() => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Calculating Sales');
          done();
        });
      });
    });
  });

  describe('#calculateSales', () => {
    let calculate;
    let updateSalesFilesReportedStatus;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('bigQuery', { name: randomString() });
      PeriodController.__set__('db', { name: randomString() });

      calculate = sinon.stub().yields();
      updateSalesFilesReportedStatus = sinon.stub().yields();

      PeriodController.__set__('CalculateSales', { calculate, updateSalesFilesReportedStatus });

      done();
    });

    describe('when period.recalculation.salesFiles an no period.recalculation.contractIds', () => {
      it('should not call CalculateSales.calculate', (done) => {
        // Arrange
        inputPeriod.recalculation = { salesFiles: [] };
        // Act
        PeriodController.calculateSales(() => {
          // Assert
          expect(PeriodController.__get__('CalculateSales').calculate.called).to.be.false;
          done();
        });
      });
    });

    describe('when period.recalculation.salesFiles and period.recalculation.contractIds', () => {
      beforeEach((done) => {
        inputPeriod.recalculation = { salesFiles: [], contractIds: [] };

        done();
      });

      it('should call CalculateSales.calculate', (done) => {
        // Act
        PeriodController.calculateSales(() => {
          // Assert
          expect(PeriodController.__get__('CalculateSales').calculate.called).to.be.true;
          done();
        });
      });

      it('should call CalculateSales.calculate with the right args', (done) => {
        // Act
        PeriodController.calculateSales(() => {
          // Assert
          expect(PeriodController.__get__('CalculateSales').calculate.calledWith(
            inputPeriod,
            PeriodController.__get__('db'),
            PeriodController.__get__('bigQuery'),
            PeriodController.__get__('client'),
            'main',
          )).to.be.true;
          done();
        });
      });
    });

    describe('when CalculateSales.calculate returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        calculate.yields(expectedError);

        done();
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.calculateSales((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });

      it('should not call CalculateSales.updateSalesFilesReportedStatus', (done) => {
        // Act
        PeriodController.calculateSales(() => {
          // Assert
          expect(updateSalesFilesReportedStatus.called).to.be.false;
          done();
        });
      });
    });

    describe('when period.recalculation.salesFiles.contractIds.length === 0', () => {
      it('should not call CalculateSales.calculate', (done) => {
        // Arrange
        inputPeriod.recalculation = {
          salesFiles: {
            contractIds: [],
          },
        };
        // Act
        PeriodController.calculateSales(() => {
          // Assert
          expect(calculate.called).to.be.false;
          done();
        });
      });
    });

    describe('when period.recalculation.salesFiles.contractIds.length > 0', () => {
      it('should call CalculateSales.calculate', (done) => {
        // Arrange
        inputPeriod.recalculation = {
          salesFiles: {
            contractIds: [randomId()],
          },
        };
        // Act
        PeriodController.calculateSales(() => {
          // Assert
          expect(calculate.called).to.be.true;
          done();
        });
      });
    });

    describe('when CalculateSales.calculate returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        calculate.yields(expectedError);

        done();
      });

      it('should return the error to the callback', (done) => {
        // Arrange
        inputPeriod.recalculation = {
          salesFiles: {
            contractIds: [randomId()],
          },
        };
        // Act
        PeriodController.calculateSales((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });

      it('should not call CalculateSales.updateSalesFilesReportedStatus', (done) => {
        // Arrange
        inputPeriod.recalculation = {
          salesFiles: {
            contractIds: [randomId()],
          },
        };
        // Act
        PeriodController.calculateSales((err) => {
          // Assert
          expect(updateSalesFilesReportedStatus.called).to.be.false;
          done();
        });
      });
    });

    it('should call CalculateSales.updateSalesFilesReportedStatus with the rights args', (done) => {
      // Arrange
      inputPeriod.recalculation = {
        salesFiles: {
          contractIds: [randomId()],
        },
      };
      // Act
      PeriodController.calculateSales(() => {
        // Assert
        expect(updateSalesFilesReportedStatus.calledWith(inputPeriod)).to.be.true;
        done();
      });
    });

    describe('when CalculateSales.updateSalesFilesReportedStatus returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        inputPeriod.recalculation = {
          salesFiles: {
            contractIds: [randomId()],
          },
        };
        const expectedError = randomString();
        updateSalesFilesReportedStatus.yields(expectedError);
        // Act
        PeriodController.calculateSales((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#getPeriodData', () => {
    let getData;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('bigQuery', { name: randomString() });
      PeriodController.__set__('db', { name: randomString() });
      getData = sinon.stub().yields();
      PeriodController.__set__('GetPeriodData', { getData });

      done();
    });

    it('should call GetPeriodData.getData with the right args', (done) => {
      // Act
      PeriodController.getPeriodData((err) => {
        // Assert
        expect(PeriodController.__get__('GetPeriodData').getData.calledWith(inputPeriod, PeriodController.__get__('db'), PeriodController.__get__('bigQuery'))).to.be.true;
        done();
      });
    });

    describe('when GetPeriodData.getData returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        getData.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored In Getting Period Data\'', (done) => {
        // Act
        PeriodController.getPeriodData((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored In Getting Period Data');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.getPeriodData((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when GetPeriodData.getData doesnt return an error', () => {
      it('should set the calculationStatus to \'Creating Period Files\'', (done) => {
        // Act
        PeriodController.getPeriodData((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Creating Period Files');
          done();
        });
      });
    });
  });

  describe('#createPeriodFiles', () => {
    let createFiles;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('db', { name: randomString() });
      PeriodController.__set__('bigQuery', { name: randomString() });
      createFiles = sinon.stub().yields();
      PeriodController.__set__('CreatePeriodFiles', { createFiles });

      done();
    });

    it('should call CreatePeriodFiles.createFiles with the right args', (done) => {
      // Act
      PeriodController.createPeriodFiles(() => {
        // Assert
        expect(PeriodController.__get__('CreatePeriodFiles').createFiles.calledWith(inputPeriod, PeriodController.__get__('db'), PeriodController.__get__('bigQuery'), client)).to.be.true;
        done();
      });
    });

    describe('when CreatePeriodFiles.createFiles returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        createFiles.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored In Creating Period Files\'', (done) => {
        // Act
        PeriodController.createPeriodFiles((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored In Creating Period Files');
          done();
        });
      });
      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.createPeriodFiles((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when CreatePeriodFiles.createFiles doesnt return an error', () => {
      it('should set the calculationStatus to \'Creating Statements\'', (done) => {
        // Act
        PeriodController.createPeriodFiles((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Creating Statements');
          done();
        });
      });
    });
  });

  describe('#createStatements', () => {
    let create;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('db', { name: randomString() });
      create = sinon.stub().yields();
      PeriodController.__set__('CreateStatements', { create });

      done();
    });

    it('should call CreateStatements.create with the right args', (done) => {
      // Act
      PeriodController.createStatements((err) => {
        // Assert
        expect(PeriodController.__get__('CreateStatements').create.calledWith(inputPeriod, PeriodController.__get__('db'), client)).to.be.true;
        done();
      });
    });

    describe('when CreateStatements.create returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        create.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored in Creating Statements\'', (done) => {
        // Act
        PeriodController.createStatements((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Creating Statements');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.createStatements((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when CreateStatements.create doesnt return an error', () => {
      it('should set the calculationStatus to \'Setting Statement Data\'', (done) => {
        // Act
        PeriodController.createStatements((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Setting Statement Data');
          done();
        });
      });
    });
  });

  describe('#getStatementData', () => {
    let getStatementData;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('bigQuery', { name: randomString() });
      PeriodController.__set__('db', { name: randomString() });
      getStatementData = sinon.stub().yields();
      PeriodController.__set__('PeriodStatementData', { getStatementData });

      done();
    });

    it('should call PeriodStatementData.getStatementData with the right args', (done) => {
      // Act
      PeriodController.getStatementData((err) => {
        // Assert
        expect(PeriodController.__get__('PeriodStatementData').getStatementData.calledWith(inputPeriod, PeriodController.__get__('db'), PeriodController.__get__('bigQuery'))).to.be.true;
        done();
      });
    });

    describe('when PeriodStatementData.getStatementData returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        getStatementData.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored in Getting Statement Data\'', (done) => {
        // Act
        PeriodController.getStatementData((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Getting Statement Data');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.getStatementData((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    describe('when PeriodStatementData.getStatementData doesnt return an error', () => {
      it('should set the calculationStatus to \'Creating Statement Files\'', (done) => {
        // Act
        PeriodController.getStatementData((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Creating Statement Files');
          done();
        });
      });
    });
  });

  describe('#createPaymentGroup', () => {
    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);

      done();
    });

    describe('when generatePayments is false', () => {
      it('should not call PaymentGroup.findOne', (done) => {
        // Arrange
        PeriodController.__set__('generatePayments', false);
        // Act
        PeriodController.createPaymentGroup((err) => {
          // Assert
          expect(PaymentGroup.findOne.called).to.be.false;
          done();
        });
      });
    });

    describe('when generatePayments is true', () => {
      beforeEach((done) => {
        PeriodController.__set__('generatePayments', true);

        done();
      });

      it('should call PaymentGroup.findOne with the right args', (done) => {
        // Act
        PeriodController.createPaymentGroup((err) => {
          // Assert
          expect(PaymentGroup.findOne.calledWith({ clientId: client._id.toString(), periodId: inputPeriod._id.toString() })).to.be.true;
          done();
        });
      });
      describe('when a no payment group is found', () => {
        it('should create a new payment group with the right args', (done) => {
          // Act
          PeriodController.createPaymentGroup((err) => {
            // Assert
            expect(PaymentGroup.prototype.save.called).to.be.true;
            done();
          });
        });
      });
      describe('when a payment group is found', () => {
        it('should not create a payment group', (done) => {
          // Arrange
          PaymentGroup.findOne.resolves({ name: randomString() });
          // Act
          PeriodController.createPaymentGroup((err) => {
            // Assert
            expect(PaymentGroup.prototype.save.called).to.be.false;
            done();
          });
        });
      });
    });
  });

  describe('#createTransactions', () => {
    let create;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('generatePayments', randomBoolean());
      PeriodController.__set__('db', { name: randomString() });
      create = sinon.stub().yields();
      PeriodController.__set__('PeriodTransactions', { create });

      done();
    });

    it('should call PeriodTransactions.create with the right args', (done) => {
      // Act
      PeriodController.createTransactions((err) => {
        // Assert
        expect(PeriodController.__get__('PeriodTransactions').create.calledWith(inputPeriod, PeriodController.__get__('db'), client, PeriodController.__get__('generatePayments'))).to.be.true;
        done();
      });
    });

    describe('when PeriodTransactions.create returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        create.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored in Creating Transactions\'', (done) => {
        // Act
        PeriodController.createTransactions((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Creating Transactions');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.createTransactions((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#checkPaymentGroup', () => {
    let paymentGroup;
    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      paymentGroup = new PaymentGroup({ _id: randomId() });
      PaymentGroup.findOne.resolves(paymentGroup);

      done();
    });

    describe('when generatePayments is false', () => {
      it('should not call PaymentGroup.findOne', (done) => {
        // Arrange
        PeriodController.__set__('generatePayments', false);
        // Act
        PeriodController.checkPaymentGroup((err) => {
          // Assert
          expect(PaymentGroup.findOne.called).to.be.false;
          done();
        });
      });
    });

    describe('when generatePayments is true', () => {
      beforeEach((done) => {
        PeriodController.__set__('generatePayments', true);
        done();
      });

      it('should call PaymentGroup.findOne with the right args', (done) => {
        // Act
        PeriodController.checkPaymentGroup((err) => {
          // Assert
          expect(PaymentGroup.findOne.calledWith({ clientId: client._id.toString(), periodId: inputPeriod._id.toString() })).to.be.true;
          done();
        });
      });

      it('should call Payment.countDocuments with the right args', (done) => {
        // Act
        PeriodController.checkPaymentGroup((err) => {
          // Assert
          expect(Payment.countDocuments.calledWith({ clientId: client._id.toString(), paymentGroupId: paymentGroup._id.toString() })).to.be.true;
          done();
        });
      });

      describe('when PaymentGroup.findOne returns nothing', () => {
        it('should call the callback without counting documents or attempting to delete', (done) => {
          // Arrange
          PaymentGroup.findOne.resolves(null);
          // Act
          PeriodController.checkPaymentGroup((err) => {
            // Assert
            expect(Payment.countDocuments.called).to.be.false;
            expect(PaymentGroup.prototype.deleteOne.called).to.be.false;
            expect(err).to.be.undefined;
            done();
          });
        });
      });

      describe('when no payments are returned', () => {
        it('should call paymentGroup.remove', () => {
          // Arrange
          Payment.countDocuments.resolves();
          // Act
          PeriodController.checkPaymentGroup((err) => {
            // Assert
            expect(PaymentGroup.prototype.deleteOne.called).to.be.true;
          });
        });

        describe('when paymentGroup.remove returns an error', () => {
          it('should returns the error to the callback', () => {
            // Arrange
            const expectedError = randomString();
            PaymentGroup.prototype.deleteOne.rejects(expectedError);
            // Act
            PeriodController.checkPaymentGroup((err) => {
              // Assert
              expect(err).to.eq(expectedError);
            });
          });
        });
      });
      describe('when payments are returned', () => {
        it('should not call paymentGroup.remove', (done) => {
          // Arrange
          // ??????
          Payment.countDocuments.resolves([]);
          // Act
          PeriodController.checkPaymentGroup((err) => {
            // Assert
            expect(PaymentGroup.prototype.deleteOne.called).to.be.false;
            done();
          });
        });
      });
    });
  });

  describe('#setSummaryStatementValues', () => {
    let setSummaryStatementHeadlineAndAnalysis;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('bigQuery', { name: randomString() });
      PeriodController.__set__('db', { name: randomString() });
      setSummaryStatementHeadlineAndAnalysis = sinon.stub().yields();
      PeriodController.__set__('PeriodStatementData', { setSummaryStatementHeadlineAndAnalysis });

      done();
    });

    it('should call PeriodStatementData.setSummaryStatementHeadlineAndAnalysis with the right args', (done) => {
      // Act
      PeriodController.setSummaryStatementValues((err) => {
        // Assert
        expect(PeriodController.__get__('PeriodStatementData').setSummaryStatementHeadlineAndAnalysis.calledWith(inputPeriod, PeriodController.__get__('db'), PeriodController.__get__('bigQuery'), client)).to.be.true;
        done();
      });
    });

    describe('when PeriodStatementData.setSummaryStatementHeadlineAndAnalysis returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        setSummaryStatementHeadlineAndAnalysis.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Errored in Summary Statement Values\'', (done) => {
        // Act
        PeriodController.setSummaryStatementValues((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Errored in Summary Statement Values');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.setSummaryStatementValues((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#createStatementFiles', () => {
    let downloadLogos;
    let createStatementFiles;

    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);
      PeriodController.__set__('bigQuery', { name: randomString() });
      PeriodController.__set__('db', { name: randomString() });
      downloadLogos = sinon.stub().yields();
      createStatementFiles = sinon.stub().yields();
      PeriodController.__set__('LogoFiles', { downloadLogos });
      PeriodController.__set__('PeriodStatementCreation', { createStatementFiles });

      done();
    });

    it('should call LogoFiles.downloadLogos with the right args', (done) => {
      // Act
      PeriodController.createStatementFiles(() => {
        // Assert
        expect(PeriodController.__get__('LogoFiles').downloadLogos.calledWith(client)).to.be.true;
        done();
      });
    });

    it('should call PeriodStatementCreation.createStatementFiles with the right args', (done) => {
      // Act
      PeriodController.createStatementFiles(() => {
        // Assert
        expect(PeriodController.__get__('PeriodStatementCreation').createStatementFiles.calledWith(inputPeriod, PeriodController.__get__('db'), PeriodController.__get__('bigQuery'), client)).to.be.true;
        done();
      });
    });

    describe('when PeriodStatementCreation.createStatementFiles returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        createStatementFiles.yields(expectedError);

        done();
      });

      it('should set the calculationStatus to \'Creating Statement Files Errored\'', (done) => {
        // Act
        PeriodController.createStatementFiles((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Creating Statement Files Errored');
          done();
        });
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.createStatementFiles((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
    describe('when PeriodStatementCreation.createStatementFiles doesnt return an error', () => {
      it('should set the calculationStatus to \'Creating Zip of All Statements\'', (done) => {
        // Act
        PeriodController.createStatementFiles((err) => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationStatus).to.eq('Creating Zip of All Statements');
          done();
        });
      });
    });
  });

  describe('#clearLogoFiles', () => {
    let clearLogoFiles;

    beforeEach((done) => {
      PeriodController.__set__('client', client);
      clearLogoFiles = sinon.stub().yields();
      PeriodController.__set__('LogoFiles', { clearLogoFiles });

      done();
    });

    it('should call LogoFiles.clearLogoFiles with the right args', (done) => {
      // Act
      PeriodController.clearLogoFiles((err) => {
        // Assert
        expect(PeriodController.__get__('LogoFiles').clearLogoFiles.calledWith(client)).to.be.true;
        done();
      });
    });

    describe('when LogoFiles.clearLogoFiles returns an error', () => {
      let expectedError;
      beforeEach((done) => {
        expectedError = randomString();
        clearLogoFiles.yields(expectedError);

        done();
      });

      it('should return the error to the callback', (done) => {
        // Act
        PeriodController.clearLogoFiles((err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#complete', () => {
    let modComparisonTime; let calculationErr;
    let calculationNotes;

    beforeEach((done) => {
      calculationNotes = [randomString(), randomString()];
      Period.findById.resolves({ calculationNotes });
      inputPeriod.calculationLog = [{}];
      PeriodController.__set__('period', inputPeriod);
      sinon.stub(Notification, 'generate').yields();

      mongoClient = { close: sinon.stub().returns() };
      sinon.stub(MongoClient, 'connect').yields(null, mongoClient);

      modComparisonTime = randomDate();

      done();
    });

    it('should call mongoClient.close', (done) => {
      // Act
      PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
        // Assert
        expect(mongoClient.close.called).to.be.true;
        done();
      });
    });

    it('should call Period.findById with the right args', (done) => {
      // Act
      PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
        // Assert
        expect(Period.findById.calledWith(inputPeriod._id, 'calculationNotes')).to.be.true;
        done();
      });
    });

    it('should set setQuery with the right args', (done) => {
      // Act
      PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
        // Assert
        const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
        expect(setQuery.status).to.eq('Complete');
        expect(setQuery.recalculation).to.be.null;
        expect(setQuery.calculationError).to.be.null;
        expect(setQuery.processEndTime).to.exist;
        done();
      });
    });

    describe('when Period.findById returns an error', () => {
      it('should not set recalculation.calculationNotes to currentCalculationNotes.calculationNotes', (done) => {
        // Arrange
        const expectedError = randomString();
        Period.findById.rejects(expectedError);
        // Act
        PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
          // Assert
          const recalculation = inputPeriod.calculationLog[inputPeriod.calculationLog.length - 1];
          expect(recalculation.calculationNotes).to.not.exist;
          done();
        });
      });

      it('should not generate notification when error', (done) => {
        // Arrange
        const expectedError = randomString();
        Period.findById.rejects(expectedError);
        // Act
        PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
          // Assert
          expect(Notification.generate.called).to.be.false;
          done();
        });
      });
    });

    describe('when Period.findById doesnt return an error', () => {
      it('should set recalculation.calculationNotes to currentCalculationNotes.calculationNotes', (done) => {
        // Act
        PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
          // Assert
          const recalculation = inputPeriod.calculationLog[inputPeriod.calculationLog.length - 1];
          expect(recalculation.calculationNotes).to.deep.eq(calculationNotes);
          done();
        });
      });

      describe('when theres a calculationErr', () => {
        beforeEach((done) => {
          calculationErr = new Error(randomString());
          done();
        });

        it('should set recalculation.status to Errored', (done) => {
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            const recalculation = inputPeriod.calculationLog[inputPeriod.calculationLog.length - 1];
            expect(recalculation.status).to.deep.eq('Errored');
            done();
          });
        });

        it('should set recalculation.calculationError with the right args', (done) => {
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            const recalculation = inputPeriod.calculationLog[inputPeriod.calculationLog.length - 1];
            expect(recalculation.calculationError).to.deep.eq({ message: calculationErr.message, stack: calculationErr.stack });
            done();
          });
        });

        it('should set setQuery.processEndTime to modComparisonTime', (done) => {
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
            expect(setQuery.processEndTime).to.deep.eq(modComparisonTime);
            done();
          });
        });

        it('should set setQuery.status to recalculation.status', (done) => {
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            const recalculation = inputPeriod.calculationLog[inputPeriod.calculationLog.length - 1];
            const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
            expect(setQuery.processEndTime).to.deep.eq(modComparisonTime);
            expect(setQuery.status).to.deep.eq(recalculation.status);
            done();
          });
        });

        it('should set setQuery.calculationError to recalculation.calculationError', (done) => {
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            const recalculation = inputPeriod.calculationLog[inputPeriod.calculationLog.length - 1];
            const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
            expect(setQuery.processEndTime).to.deep.eq(modComparisonTime);
            expect(setQuery.calculationError).to.deep.eq(recalculation.calculationError);
            done();
          });
        });

        it('should not generate notification when calculation error', (done) => {
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            expect(Notification.generate.called).to.be.false;
            done();
          });
        });
      });

      describe('when theres no calculationErr', () => {
        it('should set recalculation.status to Complete', (done) => {
          // Arrange
          calculationErr = null;
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            const recalculation = inputPeriod.calculationLog[inputPeriod.calculationLog.length - 1];
            expect(recalculation.status).to.deep.eq('Complete');
            done();
          });
        });

        it('should not generate notification if not fuga splits client', (done) => {
          // Arrange
          calculationErr = null;
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            expect(Notification.generate.called).to.be.false;
            done();
          });
        });

        it('should not generate notification if fuga splits client but no statement notification emails', (done) => {
          // Arrange
          MongoClient.connect.resolves(mongoClient);
          Client.findById.resolves({ fugaIntegration: { statementNotifications: '' } });
          calculationErr = null;

          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            expect(Notification.generate.called).to.be.false;
            done();
          });
        });

        it('should generate notification if fuga splits client', () => {
          // Arrange
          const subject = 'Your Splits Statements Are Now Available for Review';
          const email = randomString();
          const identifier = 'periodComplete';
          const mainText = `<div>Your statements are now available for review on FUGA.</div>
                      <br />
                      <div>To review your statements, please visit your Payee Statements tab on FUGA.</div>
                      <br />
                      <div>Spot something wrong? Then simply click ‘Report a Problem’ on the statement period.</div>`;
          MongoClient.connect.resolves(mongoClient);
          Client.findById.resolves({ fugaIntegration: { statementNotifications: email } });
          calculationErr = null;

          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
            // Assert
            expect(Notification.generate.called).to.be.true;
            expect(Notification.generate.args[0][0]).to.eq('Period Complete');
            expect(Notification.generate.args[0][1]).to.eq(subject);
            expect(Notification.generate.args[0][2]).to.be.null;
            expect(Notification.generate.args[0][3]).to.contain({ identifier, subject, email, mainText });
          });
        });
      });

      it('should set setQuery.calculationLog to calculationLog', (done) => {
        // Arrange
        calculationErr = null;
        // Act
        PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
          // Assert
          const setQuery = Period.findByIdAndUpdate.args[0][1].$set;
          expect(setQuery.calculationLog).to.deep.eq(inputPeriod.calculationLog);
          done();
        });
      });

      it('should call Period.findByIdAndUpdate', (done) => {
        // Arrange
        calculationErr = null;
        // Act
        PeriodController.complete(mongoClient, modComparisonTime, calculationErr, () => {
          // Assert
          expect(Period.findByIdAndUpdate.calledWith(inputPeriod._id)).to.be.true;
          done();
        });
      });

      describe('when Period.findByIdAndUpdate errors', () => {
        it('should return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          findByIdAndUpdate.rejects(expectedError);
          // Act
          PeriodController.complete(mongoClient, modComparisonTime, calculationErr, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
          });
        });
      });
    });
  });

  describe('#flushCurrencies', () => {
    beforeEach((done) => {
      PeriodController.__set__('period', inputPeriod);
      PeriodController.__set__('client', client);

      sinon.stub(ExchangeRateLib, 'getExchangeRates').resolves();
      done();
    });

    it('should call ExchangeRateLib.getExchangeRates', async () => {
      // Act
      await PeriodController.flushCurrencies();
      // Assert
      expect(ExchangeRateLib.getExchangeRates.called).to.be.true;
    });

    describe('when ExchangeRateLib.getExchangeRates returns an error or nothing', () => {
      it('should catch error and the process should just return', async () => {
        // Arrange
        ExchangeRateLib.getExchangeRates.rejects();
        // Act
        await PeriodController.flushCurrencies();
        expect(ExchangeRateLib.getExchangeRates.called).to.be.true;
        expect(Period.findByIdAndUpdate.called).to.be.false;
      });
      it('should catch error and the process should just return', async () => {
        // Arrange
        ExchangeRateLib.getExchangeRates.resolves({});
        // Act
        await PeriodController.flushCurrencies();
        expect(ExchangeRateLib.getExchangeRates.called).to.be.true;
        expect(Period.findByIdAndUpdate.called).to.be.false;
      });
    });

    describe('when ExchangeRateLib.getExchangeRates returns exchange rates', () => {
      describe('When no new rates are found', () => {
        it('should return and not update period document', async () => {
          // Arrange
          inputPeriod.currencyExchangeRates = [{ from: 'USD', to: 'EUR', rate: 1.2 }];
          ExchangeRateLib.getExchangeRates.resolves({ USD_EUR: 1.2 });
          // Act
          await PeriodController.flushCurrencies();
          expect(Period.findByIdAndUpdate.called).to.be.false;
        });
        it('should return and not update period document', async () => {
          // Arrange
          inputPeriod.currencyExchangeRates = [{ from: 'USD', to: 'EUR', rate: 1.2 }, { from: 'AED', to: 'EUR', rate: 1.2 }];
          ExchangeRateLib.getExchangeRates.resolves({ USD_EUR: 1.2 }, { AED_EUR: 5 });
          // Act
          await PeriodController.flushCurrencies();
          expect(Period.findByIdAndUpdate.called).to.be.false;
        });
      });
      describe('When new rates are found', () => {
        it('should update period document', async () => {
          // Arrange
          inputPeriod.currencyExchangeRates = [{ from: 'USD', to: 'EUR', rate: 1.2 }, { from: 'GBP', to: 'EUR', rate: 1.2 }];
          ExchangeRateLib.getExchangeRates.resolves({ USD_EUR: 1.3, AED_EUR: 5 });
          Period.findByIdAndUpdate.resolves(inputPeriod);
          // Act
          await PeriodController.flushCurrencies();
          expect(Period.findByIdAndUpdate.called).to.be.true;
        });
      });
    });
  });
});
