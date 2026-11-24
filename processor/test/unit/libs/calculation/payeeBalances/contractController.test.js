const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/payeeBalances/contractController.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

// Models
const Transaction = require('../../../../../models/transaction');

describe('Contract Controller Unit Tests', () => {
  let ContractController;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    ContractController = rewire('../../../../../controllers/contract');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#getCurrentBalance', () => {
    let contract; let date;
    beforeEach((done) => {
      contract = { clientId: randomId(), _id: randomId(), minPayout: 0, payeeBalanceCurrency: randomString(), name: randomString() };
      date = new Date();
      sinon.stub(ContractController, 'balanceAtDate').resolves(0);
      done();
    });
    it('should call ContractController.balanceAtDate', async () => {
      // Arrange
      const contract = { clientId: randomId(), _id: randomId(), minPayout: 0, payeeBalanceCurrency: randomString(), name: randomString() };
      // Act
      await ContractController.getCurrentBalance({ contract, date });
      // Assert
      // Should balanceAtDate twice
      expect(ContractController.balanceAtDate.calledTwice).to.equal(true);
    });
    describe('When Contract is a profile share', () => {
      it('should call ContractController.balanceAtDate with isProfitShare', async () => {
        // Arrange
        contract.type = 'Profit Share';
        // Act
        await ContractController.getCurrentBalance({ contract, date });
        // Assert
        expect(ContractController.balanceAtDate.calledWith({ contract, options: { isProfitShare: true }, date })).to.equal(true);
      });
    });
    describe('When Contract is not a profile share', () => {
      it('should call ContractController.balanceAtDate without isProfitShare', async () => {
        // Arrange
        contract.type = 'Standard';
        // Act
        await ContractController.getCurrentBalance({ contract, date });
        // Assert
        expect(ContractController.balanceAtDate.calledWith({ contract, options: {}, date })).to.equal(true);
      });
    });
    describe('When balanceAtDate is called the second time round', () => {
      it('should call ContractController.balanceAtDate with getAdvanceRemaining', async () => {
        // Arrange
        contract.type = 'Profit Share';
        // Act
        await ContractController.getCurrentBalance({ contract, date });
        // Assert
        expect(ContractController.balanceAtDate.calledWith({ contract, options: { getAdvanceRemaining: true }, date })).to.equal(true);
      });
    });
    describe('When the first balanceAtDate Errors', () => {
      it('should return an error', async () => {
        // Arrange
        ContractController.balanceAtDate.rejects(new Error('Test Error'));
        try {
          // Act
          await ContractController.getCurrentBalance({ contract, date });
        } catch (err) {
          // Assert
          expect(ContractController.balanceAtDate.calledOnce).to.equal(true);
          expect(err.message).to.equal('Test Error');
        }
      });
    });
  });

  describe('#balanceAtDate', () => {
    let date; let contract;
    beforeEach((done) => {
      date = new Date();
      contract = { _id: randomId(), openingBalance: randomInt() };
      sinon.stub(Transaction, 'find').resolves([]);
      done();
    });

    afterEach(() => sinon.stub());

    it('should call Transaction.find', async () => {
      // Act
      await ContractController.balanceAtDate({ contract, date });
      // Assert
      expect(Transaction.find.called).to.be.true;
    });
    it('should call Transaction.find with the correct filter', async () => {
      // Act
      await ContractController.balanceAtDate({ contract, date });
      const filter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: date } };
      // Assert
      expect(Transaction.find.calledWith(filter)).to.be.true;
    });
    describe('When options.getAdvanceRemaining is true', () => {
      it('should call Transaction.find with the correct filter', async () => {
        // Arrange
        const filter = {
          clientId: contract.clientId,
          contractId: contract._id,
          date: { $lte: date },
          type: { $in: ['Advance', 'Advance Recoupment'] },
        };
        // Act
        await ContractController.balanceAtDate({ contract, date, options: { getAdvanceRemaining: true } });
        // Assert
        expect(Transaction.find.calledWith(filter)).to.be.true;
      });
      it('should set openingBalance to 0', async () => {
        // Act
        const balance = await ContractController.balanceAtDate({ contract, date, options: { getAdvanceRemaining: true } });
        // Assert
        expect(balance).to.equal(0);
      });
    });
    describe('When options.isProfitShare is true', () => {
      it('should call Transaction.find with the correct filter', async () => {
        // Arrange
        const filter = {
          clientId: contract.clientId,
          contractId: contract._id,
          date: { $lte: date },
          type: { $nin: ['Advance', 'Advance Recoupment'] },
          isReserveWithholding: { $ne: true },
          isReserveRelease: { $ne: true },
        };
        // Act
        await ContractController.balanceAtDate({ contract, date, options: { isProfitShare: true } });
        // Assert
        expect(Transaction.find.calledWith(filter)).to.be.true;
      });
    });
    describe('When no transactions are found', () => {
      it('should return the opening balance', async () => {
        // Act
        const balance = await ContractController.balanceAtDate({ contract, date });
        // Assert
        expect(balance).to.equal(contract.openingBalance);
      });
    });
    describe('When transactions are found', () => {
      it('should return the sum of the transactions and opening balance', async () => {
        // Arrange
        const transactions = [{ amount: randomInt() }, { amount: randomInt() }, { amount: randomInt() }];
        Transaction.find.resolves(transactions);

        const closingBalance = transactions.reduce((acc, transaction) => transaction.amount + acc, contract.openingBalance);
        // Act
        const balance = await ContractController.balanceAtDate({ contract, date });
        // Assert
        expect(balance).to.equal(closingBalance);
      });
    });
    describe('When Transaction.find Errors', () => {
      it('should return openingBalance', async () => {
        // Arrange
        Transaction.find.rejects(new Error('Test Error'));
        // Act
        const balance = await ContractController.balanceAtDate({ contract, date });
        // Assert
        expect(balance).to.equal(contract.openingBalance);
      });
    });
  });
});
