const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');
const { expect } = require('chai');
const { mainTransaction, distributionFee } = require('../../../../../libs/calculation/statement/statementTransactions');

const Transaction = require('../../../../../models/transaction');

describe('StatementTransactions', function () {
  logger.info('\n\n**** test/unit/libs/calculation/statement/StatementTransactions.unit.test.js');

  let transactionSaveStub;
  let cbSpy;
  let client;
  let contract;
  let period;
  let statement;

  beforeEach(() => {
    transactionSaveStub = sinon.stub(Transaction.prototype, 'save').resolves();
    cbSpy = sinon.spy();
  });

  afterEach(() => sinon.restore());

  describe('mainTransaction', () => {
    beforeEach(() => {
      client = { _id: randomId(), name: 'Contract 1' };
      contract = { _id: randomId(), clientId: client._id };
      period = { _id: randomId(), name: randomString(), clientId: client._id };
      statement = { _id: randomId(), clientId: client._id, contractId: contract._id, date: new Date() };
    });

    it('should save a transaction with grossAmount for Distributor clientType', function () {
      statement = { ...statement, grossAmount: 1000, contractType: 'Standard' };
      client = { client, clientType: 'Distributor' };
      contract = { ...contract, statementDesign: 'Standard' };

      mainTransaction(statement, period, client, contract, cbSpy);

      expect(transactionSaveStub.calledOnce).to.be.true;
      const values = transactionSaveStub.getCall(0).thisValue;
      expect(values.amount).to.equal(1000);
    });

    it('should not save a transaction for Profit Share contract type for distributor clientType', function () {
      statement = { ...statement, grossAmount: 1000, contractType: 'Profit Share' };
      client = { client, clientType: 'Distributor' };
      contract = { ...contract, statementDesign: 'Standard' };

      mainTransaction(statement, period, client, contract, cbSpy);

      expect(transactionSaveStub.notCalled).to.be.true;
    });

    it('should not save a transaction for Profit Share contract type for non-distributor clientType', function () {
      statement = { ...statement, grossAmount: 1000, contractType: 'Profit Share' };
      client = { client, clientType: 'Label' };
      contract = { ...contract, statementDesign: 'Standard' };

      mainTransaction(statement, period, client, contract, cbSpy);

      expect(transactionSaveStub.notCalled).to.be.true;
    });

    it('should save a transaction for non Profit Share contract type for non-distributor clientType', function () {
      statement = { ...statement, netOutput: 500, contractType: 'Non Profit Share' };
      client = { client, clientType: 'Label' };
      contract = { ...contract, statementDesign: 'Standard' };

      mainTransaction(statement, period, client, contract, cbSpy);

      expect(transactionSaveStub.calledOnce).to.be.true;
      const values = transactionSaveStub.getCall(0).thisValue;
      expect(values.amount).to.equal(500);
    });
  });

  describe('distributionFee', () => {
    beforeEach(() => {
      client = { _id: randomId(), name: 'Contract 1' };
      period = { _id: randomId(), name: randomString(), clientId: client._id };
      statement = { _id: randomId(), clientId: client._id, contractId: contract._id, date: new Date() };
    });

    it('should set distribution fee name to default value when client customFeesInvoiceTitle property not set', () => {
      statement = { ...statement, grossAmount: 1000, contractType: 'Standard' };
      client = { client, clientType: 'Distributor' };

      distributionFee(statement, period, client, cbSpy);

      expect(transactionSaveStub.calledOnce).to.be.true;
      const values = transactionSaveStub.getCall(0).thisValue;
      expect(values.name).to.equal(`${period.name} Distribution Fees`);
    });

    it('should set distribution fee name to custom value when client customFeesInvoiceTitle property set', () => {
      statement = { ...statement, grossAmount: 1000, contractType: 'Standard' };
      client = { client, clientType: 'Distributor', customFeesInvoiceTitle: randomString() };

      distributionFee(statement, period, client, cbSpy);

      expect(transactionSaveStub.calledOnce).to.be.true;
      const values = transactionSaveStub.getCall(0).thisValue;
      expect(values.name).to.equal(`${period.name} ${client.customFeesInvoiceTitle}`);
    });
  });
});
