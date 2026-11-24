const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/getPeriodData.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Client = require('../../../../../models/client');
const Period = require('../../../../../models/period');

describe('GetPeriodData Unit Tests', () => {
  let period; let client; let db; let bigQuery;
  let GetPeriodData;
  let headlineFiguresOutput; let headlineAnalysisOutput;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    GetPeriodData = rewire('../../../../../libs/calculation/period/getPeriodData');

    period = new Period({
      _id: randomId(),
      clientId: randomId(),
      name: randomString(),
    });

    client = new Client({
      _id: randomId(),
      name: randomString(),
      salesDatabaseTable: randomString(),
      periodSalesDatabaseTable: randomString(),
      periodCostsDatabaseTable: randomString(),
    });

    db = { type: randomString() };

    bigQuery = { type: randomString() };

    headlineFiguresOutput = {
      units: randomInt(),
      grossRevenue: randomInt(),
      netPayout: randomInt(),
      grossCosts: randomInt(),
      netCosts: randomInt(),
      lines: randomInt(),
    };
    GetPeriodData.__set__('headlineFigures', sinon.stub());
    GetPeriodData.__get__('headlineFigures').yields(null, headlineFiguresOutput);

    headlineAnalysisOutput = {
      units: randomInt(),
    };
    GetPeriodData.__set__('analysisFigures', sinon.stub());
    GetPeriodData.__get__('analysisFigures').yields(null, headlineAnalysisOutput);

    sinon.stub(Client, 'findById');
    Client.findById.resolves(client);

    sinon.stub(Period, 'findByIdAndUpdate');
    Period.findByIdAndUpdate.resolves();
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#getData', () => {
    beforeEach((done) => {
      sinon.stub(GetPeriodData, 'getHeadlineData').yields();
      sinon.stub(GetPeriodData, 'getAnalysisData').yields();

      done();
    });

    it('should call getHeadlineData with the right args', (done) => {
      // Act
      GetPeriodData.getData(period, db, bigQuery, () => {
        // Assert
        expect(GetPeriodData.getHeadlineData.calledWith(period, db, bigQuery)).to.be.true;
        done();
      });
    });

    describe('when getHeadlineData returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        GetPeriodData.getHeadlineData.yields(expectedError);
        // Act
        GetPeriodData.getData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call getAnalysisData with the right args', (done) => {
      // Act
      GetPeriodData.getData(period, db, bigQuery, () => {
        // Assert
        expect(GetPeriodData.getAnalysisData.calledWith(period, db, bigQuery)).to.be.true;
        done();
      });
    });

    describe('when getAnalysisData returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        GetPeriodData.getHeadlineData.yields(expectedError);
        // Act
        GetPeriodData.getData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });
  });

  describe('#getHeadlineData', () => {
    it('should call Client.findById with the right args', (done) => {
      // Act
      GetPeriodData.getHeadlineData(period, db, bigQuery, () => {
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
        GetPeriodData.getHeadlineData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call headlineFigures with the right args', (done) => {
      // Arrange
      const expectedObject = {
        db,
        bigQuery,
        salesInputDatabaseTable: client.salesDatabaseTable,
        salesOutputDatabaseTable: client.periodSalesDatabaseTable,
        costsInputDatabaseTable: 'costs',
        costsOutputDatabaseTable: client.periodCostsDatabaseTable,
        clientId: period.clientId,
        inputFilter: { periodIds: period._id.toString() },
        outputFilter: { periodId: period._id.toString() },
        salesOutputFilter: { periodId: period._id.toString() },
      };
      // Act
      GetPeriodData.getHeadlineData(period, db, bigQuery, () => {
        // Assert
        expect(GetPeriodData.__get__('headlineFigures').calledWith(expectedObject)).to.be.true;
        done();
      });
    });

    describe('when client.suppressZeroValueInExport', () => {
      it('should set contractCurrencyCalculationOutput to the right args', (done) => {
      // Arrange
        client.suppressZeroValueInExport = true;
        const expectedObject = {
          db,
          bigQuery,
          salesInputDatabaseTable: client.salesDatabaseTable,
          salesOutputDatabaseTable: client.periodSalesDatabaseTable,
          costsInputDatabaseTable: 'costs',
          costsOutputDatabaseTable: client.periodCostsDatabaseTable,
          clientId: period.clientId,
          inputFilter: { periodIds: period._id.toString() },
          outputFilter: { periodId: period._id.toString() },
          salesOutputFilter: {
            periodId: period._id.toString(),
            contractCurrencyCalculationOutput: { $ne: 0 },
          },
        };
        // Act
        GetPeriodData.getHeadlineData(period, db, bigQuery, () => {
        // Assert
          expect(GetPeriodData.__get__('headlineFigures').calledWith(expectedObject)).to.be.true;
          done();
        });
      });
    });

    describe('when headlineFigures returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        GetPeriodData.__get__('headlineFigures').yields(expectedError);
        // Act
        GetPeriodData.getHeadlineData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Arrange
      const expectedSet = {
        units: headlineFiguresOutput.units ? headlineFiguresOutput.units : 0,
        grossAmount: headlineFiguresOutput.grossRevenue ? headlineFiguresOutput.grossRevenue : 0,
        netAmount: headlineFiguresOutput.netPayout ? headlineFiguresOutput.netPayout : 0,
        grossCosts: headlineFiguresOutput.grossCosts ? headlineFiguresOutput.grossCosts : 0,
        netCosts: headlineFiguresOutput.netCosts ? headlineFiguresOutput.netCosts : 0,
        lines: headlineFiguresOutput.lines ? headlineFiguresOutput.lines : 0,
      };
      // Act
      GetPeriodData.getHeadlineData(period, db, bigQuery, (err) => {
        // Assert
        expect(Period.findByIdAndUpdate.calledWith(period._id, { $set: expectedSet })).be.true;
        done();
      });
    });

    describe('when Period.findByIdAndUpdate returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Period.findByIdAndUpdate.rejects(expectedError);
        // Act
        GetPeriodData.getHeadlineData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });

  describe('#getAnalysisData', () => {
    it('should call Client.findById with the right args', (done) => {
      // Act
      GetPeriodData.getAnalysisData(period, db, bigQuery, () => {
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
        GetPeriodData.getAnalysisData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    it('should call headlineFigures with the right args', (done) => {
      // Arrange
      const expectedObject = {
        db,
        bigQuery,
        salesInputDatabaseTable: client.salesDatabaseTable,
        salesOutputDatabaseTable: client.periodSalesDatabaseTable,
        costsInputDatabaseTable: 'costs',
        costsOutputDatabaseTable: client.periodCostsDatabaseTable,
        clientId: period.clientId,
        inputFilter: { periodIds: period._id.toString() },
        outputFilter: { periodId: period._id.toString() },
        salesOutputFilter: { periodId: period._id.toString() },
        outputSalesValue: 'calculationInput',
        type: 'Period',
      };
      // Act
      GetPeriodData.getAnalysisData(period, db, bigQuery, () => {
        // Assert
        expect(GetPeriodData.__get__('analysisFigures').calledWith(expectedObject)).to.be.true;
        done();
      });
    });

    describe('when client.suppressZeroValueInExport', () => {
      it('should set contractCurrencyCalculationOutput to the right args', (done) => {
      // Arrange
        client.suppressZeroValueInExport = true;
        const expectedObject = {
          db,
          bigQuery,
          salesInputDatabaseTable: client.salesDatabaseTable,
          salesOutputDatabaseTable: client.periodSalesDatabaseTable,
          costsInputDatabaseTable: 'costs',
          costsOutputDatabaseTable: client.periodCostsDatabaseTable,
          clientId: period.clientId,
          inputFilter: { periodIds: period._id.toString() },
          outputFilter: { periodId: period._id.toString() },
          salesOutputFilter: {
            periodId: period._id.toString(),
            contractCurrencyCalculationOutput: { $ne: 0 },
          },
          outputSalesValue: 'calculationInput',
          type: 'Period',
        };
        // Act
        GetPeriodData.getAnalysisData(period, db, bigQuery, () => {
        // Assert
          expect(GetPeriodData.__get__('analysisFigures').calledWith(expectedObject)).to.be.true;
          done();
        });
      });
    });

    describe('when analysisFigures returns an error', () => {
      it('should return the error to the callback', (done) => {
        // Arrange
        const expectedError = randomString();
        GetPeriodData.__get__('analysisFigures').yields(expectedError);
        // Act
        GetPeriodData.getAnalysisData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
          done();
        });
      });
    });

    it('should call Period.findByIdAndUpdate with the right args', (done) => {
      // Arrange
      const expectedSet = { analysis: headlineAnalysisOutput };
      // Act
      GetPeriodData.getAnalysisData(period, db, bigQuery, () => {
        // Assert
        expect(Period.findByIdAndUpdate.calledWith(period._id, { $set: expectedSet })).be.true;
        done();
      });
    });

    describe('when Period.findByIdAndUpdate returns an error', () => {
      it('should return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Period.findByIdAndUpdate.rejects(expectedError);
        // Act
        GetPeriodData.getAnalysisData(period, db, bigQuery, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });
  });
});
