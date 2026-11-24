const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/payeeBalances/transfers.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const Payee = require('../../../../../models/payee');
const Client = require('../../../../../models/client');
const Contract = require('../../../../../models/contract');
const Statement = require('../../../../../models/statement');

const ContractController = require('../../../../../controllers/contract');
const PayeeBalanceHelpers = require('../../../../../libs/calculation/payeeBalances/libs/helpers');

describe('#PayeeBalanceTransfers', () => {
  let PayeeBalanceTransfers;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    PayeeBalanceTransfers = rewire('../../../../../libs/calculation/payeeBalances/libs/transfers.js');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#create', () => {
    let clientId; let contract; let period; let statement;
    beforeEach((done) => {
      // Vars
      clientId = randomId();

      contract = {
        clientId,
        _id: randomId(),
        payees: [
          {
            payeeId: randomId(),
            percentage: randomInt(1, 100),
          },
        ],
        currency: randomString(),
        payeeBalanceCondition: randomString(),
        active: true,
      };

      period = {
        clientId,
        _id: randomId(),
        endDate: moment().toISOString(),
        accountingPeriodType: randomString(),
      };

      statement = {
        clientId,
        _id: randomId(),
        periodId: period._id,
      };

      // Stubs
      sinon.stub(Contract, 'find');
      Contract.find.returns({
        select: sinon.stub().returns({
          sort: sinon.stub().returns({
            limit: sinon.stub().resolves([contract]),
          }),
        }),
      });

      sinon.stub(Client, 'findById');
      Client.findById.resolves({ homeCurrency: randomString() });
      sinon.stub(Statement, 'findOne').returns({ select: sinon.stub().resolves(statement) });
      sinon.stub(ContractController, 'getCurrentBalance').resolves({ advanceRemaining: randomInt(), closingBalance: randomInt() });
      sinon.stub(PayeeBalanceTransfers, 'setupTransfers').resolves();
      done();
    });

    it('Should call Contract.find with the correct query', async () => {
      // Arrange
      await PayeeBalanceTransfers.create({ period, statement: null });
      // Assert
      expect(Contract.find.called).to.be.true;
      expect(Contract.find.calledWith({
        clientId,
        'payees.payeeId[0]': { $exists: true },
        payeeBalanceCondition: { $ne: 'Never' },
        active: true,
        accountingPeriod: period.accountingPeriodType,
      })).to.be.true;
    });
    describe('When Statement is passed', () => {
      it('Should call Contract.find with the correct query', async () => {
        // Arrange
        await PayeeBalanceTransfers.create({ period, statement });
        // Assert
        expect(Contract.find.called).to.be.true;
        expect(Contract.find.calledWith({
          clientId,
          'payees.payeeId[0]': { $exists: true },
          payeeBalanceCondition: { $ne: 'Never' },
          active: true,
          accountingPeriod: period.accountingPeriodType,
          _id: statement.contractId,
        })).to.be.true;
      });
    });
    describe('When lastId is passed', () => {
      it('Should call Contract.find with the correct query', async () => {
        // Arrange
        const lastId = randomId();
        await PayeeBalanceTransfers.create({ period, lastId });
        // Assert
        expect(Contract.find.called).to.be.true;
        expect(Contract.find.calledWith({
          clientId,
          'payees.payeeId[0]': { $exists: true },
          payeeBalanceCondition: { $ne: 'Never' },
          active: true,
          accountingPeriod: period.accountingPeriodType,
          _id: { $gt: lastId },
        })).to.be.true;
      });
    });
    describe('When Contract.find returns no contracts', () => {
      it('Should return', async () => {
        // Arrange
        Contract.find.returns({
          select: sinon.stub().returns({
            sort: sinon.stub().returns({
              limit: sinon.stub().resolves([]),
            }),
          }),
        });
        // Act
        await PayeeBalanceTransfers.create({ period, statement: null });
        // Assert
        expect(Statement.findOne.called).to.be.false;
      });
    });
    describe('When Contract.find returns contracts', () => {
      it('Should call Client.findById with the correct clientId', async () => {
        // Arrange
        await PayeeBalanceTransfers.create({ period, statement: null });
        // Assert
        expect(Client.findById.called).to.be.true;
        expect(Client.findById.calledWith(clientId, 'homeCurrency')).to.be.true;
      });
    });
    it('Should call Statement.findOne with the correct query', async () => {
      // Arrange
      await PayeeBalanceTransfers.create({ period, statement: null });
      // Assert
      expect(Statement.findOne.called).to.be.true;
      expect(Statement.findOne.calledWith({
        clientId,
        contractId: contract._id.toString(),
        periodId: period._id.toString(),
      })).to.be.true;
    });
    describe('When Statement.findOne returns no statement', () => {
      it('Should not call ContractController.getCurrentBalance & PayeeBalanceTransfers.setupTransfers', async () => {
        // Arrange
        Statement.findOne.returns({ select: sinon.stub().resolves(null) });
        // Act
        await PayeeBalanceTransfers.create({ period, statement: null });
        // Assert
        expect(ContractController.getCurrentBalance.called).to.be.false;
        expect(PayeeBalanceTransfers.setupTransfers.called).to.be.false;
      });
    });
    it('Should call ContractController.getCurrentBalance with the correct contract & date', async () => {
      // Arrange
      await PayeeBalanceTransfers.create({ period, statement: null });
      // Assert
      expect(ContractController.getCurrentBalance.called).to.be.true;
      expect(ContractController.getCurrentBalance.calledWith({ contract, date: moment.utc(period.endDate).format() })).to.be.true;
    });
    it('Should call PayeeBalanceTransfers.setupTransfers with the correct params', async () => {
      // Arrange
      await PayeeBalanceTransfers.create({ period, statement: null });
      // Assert
      expect(PayeeBalanceTransfers.setupTransfers.called).to.be.true;
      expect(PayeeBalanceTransfers.setupTransfers.calledWith({
        payee: contract.payees[0],
        period,
        statement,
        clientType: undefined,
        homeCurrency: (await Client.findById(clientId, 'homeCurrency')).homeCurrency,
        contractBalances: await ContractController.getCurrentBalance({ contract, date: moment.utc(period.endDate).format() }),
        contract,
      })).to.be.true;
    });
  });
  describe('#setupTransfers', () => {
    let clientId; let contract; let payee; let contractBalances; let period; let statement; let homeCurrency; let clientType; let foundPayee; let payeeId;
    beforeEach((done) => {
      // Vars
      clientId = randomId();
      payeeId = randomId();

      contract = {
        clientId,
        _id: randomId(),
        payees: [
          {
            payeeId,
            percentage: randomInt(1, 100),
          },
        ],
        currency: randomString(),
        payeeBalanceCondition: randomString(),
        active: true,
      };

      payee = contract.payees[0];

      foundPayee = {
        _id: payeeId,
        payeeBalanceCurrency: randomString(),
      };

      contractBalances = {
        advanceRemaining: randomInt(),
        closingBalance: randomInt(),
      };

      period = {
        clientId,
        _id: randomId(),
        endDate: moment().toISOString(),
      };

      statement = {
        clientId,
        _id: randomId(),
        periodId: period._id,
      };

      homeCurrency = randomString();
      clientType = randomString();

      // Stubs
      sinon.stub(Payee, 'findById').resolves(foundPayee);
      sinon.stub(PayeeBalanceHelpers, 'addMissingCurrencyNote').resolves();
      sinon.stub(PayeeBalanceHelpers, 'createTransactions').resolves();
      done();
    });

    afterEach(() => sinon.restore());

    it('Should call Payee.findById with the correct payeeId', async () => {
      // Arrange
      await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
      // Assert
      expect(Payee.findById.called).to.be.true;
      expect(Payee.findById.calledWith(payeeId)).to.be.true;
    });
    describe('When Payee.findById returns no payee or Payee is missing Currency', () => {
      it('Should call PayeeBalanceHelpers.addMissingCurrencyNote with the correct params', async () => {
        // Arrange
        Payee.findById.resolves(null);
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.addMissingCurrencyNote.called).to.be.true;
        expect(PayeeBalanceHelpers.createTransactions.called).to.be.false;
      });
    });
    describe('If Payee Balance is 0', () => {
      it('Should not call PayeeBalanceHelpers.createTransactions', async () => {
        // Arrange
        contractBalances.closingBalance = 0;
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.createTransactions.called).to.be.false;
      });
    });
    describe('When Payee Balance is negative and contract.payeeBalanceCondition is "When Positive" and clientType is not "Distributor"', () => {
      it('Should not call PayeeBalanceHelpers.createTransactions', async () => {
        // Arrange
        contract.payeeBalanceCondition = 'When Positive';
        contractBalances.closingBalance = -1;
        clientType = 'Client';
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.createTransactions.called).to.be.false;
      });
    });
    describe('When Payee Balance is positive and contract.payeeBalanceCondition is "When Positive" and clientType is not "Distributor"', () => {
      it('Should call PayeeBalanceHelpers.createTransactions with the correct params', async () => {
        // Arrange
        payee.percentage = 50;
        contract.payeeBalanceCondition = 'When Positive';
        contractBalances.closingBalance = 100;
        clientType = 'Client';
        // Act
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.createTransactions.called).to.be.true;
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.payee).to.deep.equal(foundPayee);
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.contract).to.deep.equal(contract);
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.period).to.deep.equal(period);
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.statement).to.deep.equal(statement);
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.payeeBalance).to.equal(50);
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.contractCurrency).to.equal(contract.currency);
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.homeCurrency).to.equal(homeCurrency);
        expect(moment.utc(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.endDate).format()).to.equal(moment.utc(period.endDate).format());
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.clientType).to.equal(clientType);
        expect(PayeeBalanceHelpers.createTransactions.firstCall.firstArg.closingBalance).to.equal(100);
      });
    });
    describe('When Advance Remaining is positive and contract.payeeBalanceCondition is "Always" and contract.type is "Profit Share - Flexible"', () => {
      it('Should call PayeeBalanceHelpers.createTransactions with the correct params', async () => {
        // Arrange
        contract.type = 'Profit Share - Flexible';
        contract.payeeBalanceCondition = 'Always';
        contractBalances.advanceRemaining = 100;
        contractBalances.closingBalance = 100;
        payee.percentage = 50;
        // Act
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.createTransactions.called).to.be.true;
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.payee).to.deep.equal(foundPayee);
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.contract).to.deep.equal(contract);
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.period).to.deep.equal(period);
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.statement).to.deep.equal(statement);
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.payeeBalance).to.equal(50);
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.contractCurrency).to.equal(contract.currency);
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.homeCurrency).to.equal(homeCurrency);
        expect(moment.utc(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.endDate).format()).to.equal(moment.utc(period.endDate).format());
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.isAdvance).to.be.true;
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.clientType).to.equal(clientType);
        expect(PayeeBalanceHelpers.createTransactions.secondCall.firstArg.closingBalance).to.equal(100);
      });
    });
    describe('When Advance Remaining is 0 & Contract.type is Profile Share Flexible', () => {
      it('Should not call PayeeBalanceHelpers.createTransactions the second time round', async () => {
        // Arrange
        contract.type = 'Profit Share - Flexible';
        contractBalances.advanceRemaining = 0;
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.createTransactions.calledTwice).to.be.false;
      });
    });
    describe('When Advance Remaining is Negative & Contract.type is Profile Share Flexible & Condition is "Always"', () => {
      it('Should not call PayeeBalanceHelpers.createTransactions the second time round', async () => {
        // Arrange
        contract.type = 'Profit Share - Flexible';
        contractBalances.advanceRemaining = -1;
        contract.payeeBalanceCondition = 'Always';
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.createTransactions.calledTwice).to.be.true;
      });
    });
    describe('When Advance Remaining exists and Contract.type is not Profile Share Flexible', () => {
      it('Should not call PayeeBalanceHelpers.createTransactions the second time round', async () => {
        // Arrange
        contract.type = 'Profit Share';
        contractBalances.advanceRemaining = 100;
        await PayeeBalanceTransfers.setupTransfers({ contract, payee, contractBalances, period, statement, homeCurrency, clientType });
        // Assert
        expect(PayeeBalanceHelpers.createTransactions.calledTwice).to.be.false;
      });
    });
  });
});
