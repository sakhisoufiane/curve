const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/payeeBalances/payeeBalanceController.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Client = require('../../../../../models/client');

const PayeeBalanceTax = require('../../../../../libs/calculation/payeeBalances/libs/tax');
const PayeeBalanceTransfers = require('../../../../../libs/calculation/payeeBalances/libs/transfers');
const PayeeBalanceAutoPayments = require('../../../../../libs/calculation/payeeBalances/libs/autoPayments');

describe('PayeeBalanceController Unit Tests', () => {
  let PayeeBalanceController;

  before(() => {
    sinon.restore();
  });

  beforeEach(() => {
    PayeeBalanceController = rewire('../../../../../libs/calculation/payeeBalances/index.js');

    sinon.stub(Client, 'findById').returns({ select: sinon.stub().resolves({ clientType: randomString() }) });
    sinon.stub(PayeeBalanceTransfers, 'create').resolves();
    sinon.stub(PayeeBalanceTax, 'create').resolves();
    sinon.stub(PayeeBalanceAutoPayments, 'create').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#run', () => {
    describe('when period and statement are not provided', () => {
      it('should throw an error', async () => {
        // Arrange
        try {
          // Act
          await PayeeBalanceController.createBalances({});
        } catch (error) {
          // Assert
          expect(error.message).to.equal('Period AND/OR Contract is required to run Payee Balances');
        }
      });
    });
    describe('when client is not found', () => {
      beforeEach(() => {
        Client.findById.returns({ select: sinon.stub().resolves({}) });
      });

      it('should throw an error', async () => {
        try {
          // Act
          await PayeeBalanceController.createBalances({ period: {} });
        } catch (error) {
          // Assert
          expect(error.message).to.equal('No clientType Found');
        }
      });
    });
    describe('When Client is NOT a Distributor', () => {
      it('should call PayeeBalanceTransfers.create', async () => {
        // Act
        await PayeeBalanceController.createBalances({ period: {}, contract: {} });

        // Assert
        expect(PayeeBalanceTransfers.create.called).to.be.true;
      });

      it('should call PayeeBalanceTax.create', async () => {
        // Act
        await PayeeBalanceController.createBalances({ period: {}, contract: {} });

        // Assert
        expect(PayeeBalanceTax.create.called).to.be.true;
      });

      it('should call PayeeBalanceAutoPayments.create', async () => {
        // Act
        await PayeeBalanceController.createBalances({ period: {}, contract: {} });

        // Assert
        expect(PayeeBalanceAutoPayments.create.called).to.be.true;
      });
    });

    describe('When Client IS a Distributor', () => {
      beforeEach(() => {
        Client.findById.returns({ select: sinon.stub().resolves({ clientType: 'Distributor' }) });
      });

      it('should call PayeeBalanceTransfers.create', async () => {
        // Act
        await PayeeBalanceController.createBalances({ period: {}, contract: {} });

        // Assert
        expect(PayeeBalanceTransfers.create.called).to.be.true;
      });

      it('should NOT call PayeeBalanceTax.create', async () => {
        // Act
        await PayeeBalanceController.createBalances({ period: {}, contract: {} });

        // Assert
        expect(PayeeBalanceTax.create.called).to.be.false;
      });

      it('should call PayeeBalanceAutoPayments.create', async () => {
        // Act
        await PayeeBalanceController.createBalances({ period: {}, contract: {} });

        // Assert
        expect(PayeeBalanceAutoPayments.create.called).to.be.true;
      });
    });
    describe('When PayeeBalanceTransfers.create throws an error', () => {
      beforeEach(() => {
        PayeeBalanceTransfers.create.rejects();
      });

      it('should throw an error', async () => {
        try {
          // Act
          await PayeeBalanceController.createBalances({ period: {}, contract: {} });
        } catch (error) {
          // Assert
          expect(error).to.exist;
        }
      });
    });
    describe('When PayeeBalanceTax.create throws an error', () => {
      beforeEach(() => {
        PayeeBalanceTax.create.rejects();
      });

      it('should throw an error', async () => {
        try {
          // Act
          await PayeeBalanceController.createBalances({ period: {}, contract: {} });
        } catch (error) {
          // Assert
          expect(error).to.exist;
        }
      });
    });
    describe('When PayeeBalanceAutoPayments.create throws an error', () => {
      beforeEach(() => {
        PayeeBalanceAutoPayments.create.rejects();
      });

      it('should throw an error', async () => {
        try {
          // Act
          await PayeeBalanceController.createBalances({ period: {}, contract: {} });
        } catch (error) {
          // Assert
          expect(error).to.exist;
        }
      });
    });
  });
});
