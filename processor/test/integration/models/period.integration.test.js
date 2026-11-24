process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const async = require('async');

const Period = require('../../../models/period');
const Statement = require('../../../models/statement');
const Contract = require('../../../models/contract');
const PeriodTransactions = require('../../../libs/calculation/period/periodTransactions');

logger.info('\n\n**** .test/integration/models/period.model.test');

let period;

let contract1; let contract2; let contract3; let contract4; let contract5;

let statement1; let statement2; let statement3; let statement4; let statement5;

// Skipping for now since we're testing the different period libs separately
describe('Period', () => {
  let clientId;

  before((done) => {
    clientId = testUtils.randomId();
    testUtils.cleanUp(clientId, done);
  });

  beforeEach((done) => {
    async.series([
      (cb) => {
        period = new Period({ clientId, name: 'Period 1' });
        period.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        contract1 = new Contract({ clientId, name: 'contract 1' });
        contract1.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        contract2 = new Contract({ clientId, name: 'contract 2', crossContracts: [{ contractId: contract1._id.toString() }] });
        contract2.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        contract3 = new Contract({ clientId, name: 'contract 3', crossContracts: [{ contractId: contract2._id.toString() }] });
        contract3.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        contract4 = new Contract({ clientId, name: 'contract 4' });
        contract4.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        contract5 = new Contract({ clientId, name: 'contract 5' });
        contract5.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        statement1 = new Statement({ clientId, name: 'Statement 1', contractId: contract1._id.toString(), periodId: period._id.toString() });
        statement1.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        statement2 = new Statement({ clientId, name: 'Statement 2', contractId: contract2._id.toString(), periodId: period._id.toString() });
        statement2.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        statement3 = new Statement({ clientId, name: 'Statement 3', contractId: contract3._id.toString(), periodId: period._id.toString() });
        statement3.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        statement4 = new Statement({ clientId, name: 'Statement 4', contractId: contract4._id.toString(), periodId: period._id.toString() });
        statement4.save()
          .then(() => cb())
          .catch(cb);
      },
      (cb) => {
        statement5 = new Statement({ clientId, name: 'Statement 5', contractId: contract5._id.toString(), periodId: period._id.toString() });
        statement5.save()
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

  describe('orderStatements', () => {
    describe('when passed an array', () => {
      it('should return an array', (done) => {
        PeriodTransactions.orderStatements([], (err, result) => {
          expect(Array.isArray(result)).to.be.true;
          done();
        });
      });
      describe('when a contract has an add to cross contract', () => {
        it('should appear before the statement it is related to', (done) => {
          PeriodTransactions.orderStatements([statement1, statement2], (err, result) => {
            expect(result[0].name).to.eq(statement2.name);
            done();
          });
        });
      });
      describe('when a contract should be subtracted from one, and the then other be added to another', () => {
        it('should order the statements in the order that they will affect each other', (done) => {
          PeriodTransactions.orderStatements([statement1, statement2, statement3, statement4, statement5], (err, result) => {
            const resultNames = result.map((item) => item.name);
            expect(resultNames).to.deep.eq([statement3.name, statement2.name, statement1.name, statement4.name, statement5.name]);
            done();
          });
        });
      });
    });
    describe('when not passed an array', () => {
      it('should return an error in the callback', (done) => {
        PeriodTransactions.orderStatements(null, (err, result) => {
          expect(err.message).to.eq('Requires an array to be passed');
          done();
        });
      });
    });
  });
});
