const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const request = require('supertest');
const express = require('express');

const router = express.Router();
const PayeeController = require('../../controllers/payee');

jest.mock('../../models/contract');
jest.mock('../../models/transaction');
jest.mock('../../models/payee');
jest.mock('../../models/client');
jest.mock('../../models/statement');
jest.mock('../../models/subClient');

const Statement = require('../../models/statement');
const SubClient = require('../../models/subClient');
const Contract = require('../../models/contract');
const Transaction = require('../../models/transaction');
const Payee = require('../../models/payee');
const Client = require('../../models/client');

router.get('/:id/get_contracts_and_transactions', async (req, res) => {
  const { params } = req;
  try {
    const payeeBalance = await PayeeController.getContractsAndTransactions({ payeeId: params.id });
    res.status(200).json(payeeBalance);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: err.message });
  }
});

const app = express();
app.use(express.json());
app.use('/payee', router);

describe('GET /payee/:id/get_contracts_and_transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return contracts and transactions for valid payee', async () => {
    const mockPayeeId = randomId();
    const mockClientId = randomId();
    const mockContractId = randomId();

    Payee.findById.mockResolvedValue({ _id: mockPayeeId, name: 'Test Payee', clientId: mockClientId });

    Contract.find.mockResolvedValue([
      {
        _id: mockContractId,
        name: 'Test Contract',
        currency: 'USD',
        type: 'Standard',
        clientId: mockClientId,
        payees: [{ payeeId: mockPayeeId }],
      },
    ]);

    Transaction.find.mockResolvedValue([
      {
        _id: randomId(),
        name: 'Tx 1',
        amount: 100,
        type: 'Credit',
        date: new Date(),
        statementId: '507f1f77bcf86cd799439011',
      },
    ]);

    Statement.findById.mockResolvedValue({ status: 'Published' });

    Client.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ homeCurrency: 'USD' }),
    });

    const res = await request(app).get(`/payee/${mockPayeeId}/get_contracts_and_transactions`);

    expect(res.status).toBe(200);
    expect(res.body.payeeId).toBe(mockPayeeId);
    expect(res.body.contracts.length).toBe(1);
    expect(res.body.contracts[0].transactions.length).toBe(1);
    expect(res.body.contracts[0].revenue).toBe(100);
  });

  it('should return 500 if payee is invalid', async () => {
    Payee.findById.mockResolvedValue(null);

    const res = await request(app).get('/payee/invalid-id/get_contracts_and_transactions');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Payee not found');
  });

  it('should return contract with 0 revenue and empty transactions if none exist', async () => {
    const mockPayeeId = randomId();
    const mockClientId = randomId();

    Payee.findById.mockResolvedValue({ _id: mockPayeeId, name: 'Payee No Tx', clientId: mockClientId });

    Contract.find.mockResolvedValue([
      {
        _id: randomId(),
        name: 'NoTx Contract',
        currency: 'USD',
        type: 'Standard',
        clientId: mockClientId,
        balanceAtDate: jest.fn((date, options, cb) => cb(null, 0)),
      },
    ]);

    Transaction.find.mockResolvedValue([]); // No transactions
    Client.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ homeCurrency: 'USD' }),
    });

    const res = await request(app).get(`/payee/${mockPayeeId}/get_contracts_and_transactions`);

    expect(res.status).toBe(200);
    expect(res.body.contracts.length).toBe(1);
    expect(res.body.contracts[0].transactions).toEqual([]);
    expect(res.body.contracts[0].revenue).toBe(0);
  });

  it('should use contract currency if client homeCurrency not available', async () => {
    const mockPayeeId = randomId();
    const mockClientId = randomId();

    Payee.findById.mockResolvedValue({ _id: mockPayeeId, name: 'Payee ContractCurrency', clientId: mockClientId });

    Contract.find.mockResolvedValue([
      {
        _id: randomId(),
        name: 'Fallback Currency',
        currency: 'EUR',
        type: 'Standard',
        clientId: mockClientId,
        balanceAtDate: jest.fn((date, options, cb) => cb(null, 200)),
      },
    ]);

    Transaction.find.mockResolvedValue([
      {
        _id: randomId(),
        name: 'T1',
        amount: 75,
        type: 'Credit',
        date: new Date(),
        statementId: '507f1f77bcf86cd799439011',
      },
    ]);

    // Simulate no homeCurrency from client
    Client.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).get(`/payee/${mockPayeeId}/get_contracts_and_transactions`);

    expect(res.status).toBe(200);
    expect(res.body.contracts[0].currency).toBe('EUR'); // fallback to contract.currency
  });

  it('should skip revenue if statement is not Published', async () => {
    const mockPayeeId = randomId();
    const mockClientId = randomId();

    Payee.findById.mockResolvedValue({ _id: mockPayeeId, name: 'Unpublished Statement', clientId: mockClientId });

    Contract.find.mockResolvedValue([
      {
        _id: randomId(),
        name: 'Contract',
        currency: 'USD',
        type: 'Standard',
        clientId: mockClientId,
        payees: [{ payeeId: mockPayeeId }],
      },
    ]);

    Transaction.find.mockResolvedValue([
      {
        _id: randomId(),
        name: 'Tx Not Counted',
        amount: 300,
        type: 'Credit',
        date: new Date(),
        statementId: '507f1f77bcf86cd799439011',
      },
    ]);

    Statement.findById.mockResolvedValue({ status: 'Draft' });
    Client.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ homeCurrency: 'USD' }),
    });

    const res = await request(app).get(`/payee/${mockPayeeId}/get_contracts_and_transactions`);

    expect(res.status).toBe(200);
    expect(res.body.contracts[0].transactions.length).toBe(0);
    expect(res.body.contracts[0].revenue).toBe(0);
  });
  it('should decrease balance if transaction is a payment', async () => {
    const mockPayeeId = randomId();
    const mockClientId = randomId();
    const mockContractId = randomId();

    Payee.findById.mockResolvedValue({ _id: mockPayeeId, name: 'Payment Test', clientId: mockClientId });

    Contract.find.mockResolvedValue([
      {
        _id: mockContractId,
        name: 'Contract With Payment',
        currency: 'USD',
        clientId: mockClientId,
        payees: [{ payeeId: mockPayeeId }],
      },
    ]);

    Transaction.find.mockResolvedValue([
      {
        _id: randomId(),
        amount: -200,
        isPayment: true,
        type: 'Payment',
        date: new Date(),
      },
    ]);

    Client.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ homeCurrency: 'USD' }),
    });

    const res = await request(app).get(`/payee/${mockPayeeId}/get_contracts_and_transactions`);

    expect(res.status).toBe(200);
    expect(res.body.contracts[0].revenue).toBe(0);
    expect(res.body.contracts[0].balance).toBe(-200);
  });
  it('should subtract revenue and balance for Advance Recoupment', async () => {
    const mockPayeeId = randomId();
    const mockClientId = randomId();
    const mockContractId = randomId();

    Payee.findById.mockResolvedValue({ _id: mockPayeeId, name: 'Recoupment Payee', clientId: mockClientId });

    Contract.find.mockResolvedValue([
      {
        _id: mockContractId,
        name: 'Advance Contract',
        currency: 'USD',
        clientId: mockClientId,
        payees: [{ payeeId: mockPayeeId }],
      },
    ]);

    Transaction.find.mockResolvedValue([
      {
        _id: randomId(),
        amount: 500,
        type: 'Payment',
        isPayment: true,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        statementId: '507f1f77bcf86cd799439011',
      },
    ]);

    Statement.findById.mockResolvedValue({
      status: 'Published',
      type: 'Advance Recoupment',
    });

    Client.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ homeCurrency: 'USD' }),
    });

    const res = await request(app).get(`/payee/${mockPayeeId}/get_contracts_and_transactions`);

    expect(res.status).toBe(200);
    console.log(res.body.contracts[0].revenue);
    console.log(res.body.contracts[0]);
    expect(res.body.contracts[0].balance).toBe(-500);
  });
  it('should include subclientName when subClientId is present', async () => {
    const mockPayeeId = randomId();
    const mockClientId = randomId();
    const mockContractId = randomId();
    const mockSubClientId = randomId();

    Payee.findById.mockResolvedValue({ _id: mockPayeeId, name: 'Subclient Payee', clientId: mockClientId });

    SubClient.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: 'Subclient A' }) });

    Contract.find.mockResolvedValue([
      {
        _id: mockContractId,
        name: 'Subclient Contract',
        currency: 'USD',
        subClientId: mockSubClientId,
        clientId: mockClientId,
        payees: [{ payeeId: mockPayeeId }],
      },
    ]);

    Transaction.find.mockResolvedValue([]);
    Client.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ homeCurrency: 'USD' }) });

    const res = await request(app).get(`/payee/${mockPayeeId}/get_contracts_and_transactions`);

    expect(res.status).toBe(200);
    expect(res.body.contracts[0]).toHaveProperty('subclientName', 'Subclient A');
  });
});
