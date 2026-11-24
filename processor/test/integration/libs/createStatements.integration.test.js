// Connect to MongoDB
process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const async = require('async');
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Contract = require('../../../models/contract');
const Statement = require('../../../models/statement');
const CreateStatements = require('../../../libs/createStatements');

const periodId = testUtils.randomId();
const periodType = testUtils.randomString();
const year = testUtils.randomInt();
const date = testUtils.randomDate();
const accountingPeriod = testUtils.randomString();

let mechanicalContract1;
let mechanicalContract2;
let nonMechanicalContract;
let contractFromDifferentClient;

describe('CreateStatements', () => {
  let clientId;
  before((done) => {
    clientId = testUtils.randomId();
    testUtils.cleanUp(clientId, done);
  });

  beforeEach((done) => {
    async.series([
      // Save to Mongo DB
      function (cb) {
        mechanicalContract1 = new Contract({ clientId, name: testUtils.randomString(), accountingPeriod, active: true, contractType: 'Mechanical', currency: testUtils.randomString() });
        mechanicalContract1.save()
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        mechanicalContract2 = new Contract({ clientId, name: testUtils.randomString(), accountingPeriod, active: true, contractType: 'Mechanical', currency: testUtils.randomString() });
        mechanicalContract2.save()
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        nonMechanicalContract = new Contract({ clientId, name: testUtils.randomString(), accountingPeriod, active: true, contractType: testUtils.randomString(), currency: testUtils.randomString() });
        nonMechanicalContract.save()
          .then(() => cb())
          .catch(cb);
      },
      function (cb) {
        contractFromDifferentClient = new Contract({ clientId: testUtils.randomId(), name: testUtils.randomString(), accountingPeriod, active: true, contractType: testUtils.randomString(), currency: testUtils.randomString() });
        contractFromDifferentClient.save()
          .then(() => cb())
          .catch(cb);
      },
    ], done);
  });

  afterEach((done) => {
    testUtils.cleanUp(clientId, done);
  });

  after((done) => {
    testUtils.cleanUp(clientId, done);
  });

  describe('When event type is Mechanical', function () {
    let event;

    beforeEach((done) => {
      event = {
        clientId,
        periodId,
        year,
        accountingPeriod,
        date,
        periodType,
        accountingPeriodType: accountingPeriod,
        contractType: 'Mechanical',
      };

      done();
    });
    it('should get the result', (done) => {
      // Arrange
      const expectedResult = { result: '2 contracts created' };
      // Act
      CreateStatements(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq(expectedResult);
        done();
      });
    });

    it('should add the statements', (done) => {
      // Act
      CreateStatements(event, () => {
        Statement.find({ clientId })
          .then((statements) => {
            // Assert
            expect(statements.length).to.eq(2);
            expect(statements[0]).to.satisfy((statement) => !!((
              statement.contractId.toString() === mechanicalContract1._id.toString()
              || statement.contractId.toString() === mechanicalContract2._id.toString()
            )));
            expect(statements[1]).to.satisfy((statement) => !!((
              statement.contractId.toString() === mechanicalContract1._id.toString()
              || statement.contractId.toString() === mechanicalContract2._id.toString()
            )));
            done();
          })
          .catch(done);
      });
    });
  });

  describe('When event type is not Mechanical', function () {
    let event;

    beforeEach((done) => {
      event = {
        clientId,
        periodId,
        year,
        accountingPeriod,
        date,
        periodType,
        accountingPeriodType: accountingPeriod,
        contractType: testUtils.randomString(),
      };

      done();
    });

    it('should get the result', (done) => {
      // Arrange
      const expectedResult = { result: '1 contracts created' };
      // Act
      CreateStatements(event, (err, result) => {
        // Assert
        expect(result).to.deep.eq(expectedResult);
        done();
      });
    });

    it('should add the statements', (done) => {
      // Act
      CreateStatements(event, () => {
        Statement.find({ clientId })
          .then((statements) => {
            // Assert
            expect(statements.length).to.eq(1);
            expect(statements[0].contractId.toString()).to.eq(nonMechanicalContract._id.toString());
            done();
          })
          .catch(done);
      });
    });
  });
});
