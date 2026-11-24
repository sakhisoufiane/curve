const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/createStatements.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Client = require('../../../../../models/client');
const Period = require('../../../../../models/period');

describe('CreateStatements Unit Tests', () => {
  let client; let period; let db;
  let CreateStatements;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    CreateStatements = rewire('../../../../../libs/calculation/period/createStatements');

    period = new Period({
      clientId: randomId(),
      recalculation: { type: randomString() },
      _id: randomId(),
      year: randomInt(),
      accountingPeriod: randomString(),
      accountingPeriodType: randomString(),
      contractType: randomString(),
      endDate: randomDate(),
    });
    client = new Client({ name: randomString() });
    db = { type: randomString() };

    CreateStatements.__set__('createStatementsLib', sinon.stub());
    CreateStatements.__get__('createStatementsLib').yields();

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    describe('when period.contractType is MCPS', () => {
      it('should not call createStatementsLib', (done) => {
        // Arrange
        period.contractType = 'MCPS';
        // Act
        CreateStatements.create(period, db, client, () => {
          // Assert
          expect(CreateStatements.__get__('createStatementsLib').called).to.be.false;
          done();
        });
      });
    });

    describe('when period.contractType is not MCPS', () => {
      it('should call createStatementsLib with the right args', (done) => {
        // Arrange
        const expectedObject = {
          db,
          clientId: period.clientId,
          recalculation: period.recalculation,
          periodId: period._id.toString(),
          year: period.year,
          accountingPeriod: period.accountingPeriod,
          accountingPeriodType: period.accountingPeriodType,
          contractType: period.contractType,
          periodType: period.contractType,
          date: period.endDate,
        };
        // Act
        CreateStatements.create(period, db, client, () => {
          // Assert
          expect(CreateStatements.__get__('createStatementsLib').calledWith(expectedObject)).to.be.true;
          done();
        });
      });
      describe('when createStatementsLib returns an error', () => {
        it('should return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          CreateStatements.__get__('createStatementsLib').yields(expectedError);
          // Act
          CreateStatements.create(period, db, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });
    });
  });
});
