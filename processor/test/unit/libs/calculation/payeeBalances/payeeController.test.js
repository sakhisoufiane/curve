const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/payeeBalances/payeeController.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

// Models
const PayeeTransaction = require('../../../../../models/payeeTransaction');

describe('Payee Controller Unit Tests', () => {
  let PayeeController;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PayeeController = rewire('../../../../../controllers/payee');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#balanceAtDate', () => {
    let payee; let amount; let openingBalance;
    beforeEach((done) => {
      openingBalance = randomInt();
      amount = randomInt();

      payee = { clientId: randomId(), _id: randomId(), minPayout: 0, payeeBalanceCurrency: randomString(), name: randomString(), openingBalance };
      sinon.stub(PayeeTransaction, 'find').returns({ sort: sinon.stub().resolves([{ amountInPayeeCurrency: amount }]) });
      done();
    });
    it('should call PayeeTransaction.find', async () => {
      // Arrange
      const date = new Date();
      // Act
      await PayeeController.balanceAtDate({ payee, date });
      // Assert
      expect(PayeeTransaction.find.calledOnce).to.equal(true);
    });
    describe('when PayeeTransaction.find returns no transactions', () => {
      it('should return openingBalance or 0', async () => {
        // Arrange
        PayeeTransaction.find.returns({ sort: sinon.stub().resolves({ limit: sinon.stub().resolves([]) }) });
        const date = new Date();
        // Act
        const result = await PayeeController.balanceAtDate({ payee, date });
        // Assert
        expect(result).to.equal(openingBalance);
      });
    });
    describe('when PayeeTransaction.find returns transactions', () => {
      it('should return the sum of the transactions', async () => {
        // Arrange
        const total = openingBalance + amount;
        const date = new Date();
        // Act
        const result = await PayeeController.balanceAtDate({ payee, date });
        // Assert
        expect(result).to.equal(total);
      });
    });
    describe('when PayeeTransaction.find throws an error', () => {
      it('should return openingBalance or 0', async () => {
        // Arrange
        PayeeTransaction.find.returns({ sort: sinon.stub().rejects() });
        const date = new Date();
        // Act
        const result = await PayeeController.balanceAtDate({ payee, date });
        // Assert
        expect(result).to.equal(openingBalance);
      });
    });
  });
});
