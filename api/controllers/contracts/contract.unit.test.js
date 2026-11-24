const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { formatPayees, processPayeeBalances, getEscalations, calculateUnrecoupedAdvances } = require('./contract');
const PayeeTransaction = require('../../models/payeeTransaction');
const Escalation = require('../../models/escalation');
const Client = require('../../models/client');
const Payee = require('../../models/payee');

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../models/payeeTransaction', () => ({ countDocuments: jest.fn() }));
jest.mock('../../models/payee', () => ({ findOne: jest.fn(), find: jest.fn() }));
jest.mock('../../models/client', () => ({ findById: jest.fn() }));
jest.mock('../../models/escalation', () => ({ find: jest.fn() }));

describe('formatPayees', () => {
  const clientId = randomId();
  const payeeIdOne = randomId();
  const payeeIdTwo = randomId();

  const mockClient = { features: { payeeBalances: true }, clientType: 'Label' };
  const mockPayeeOne = { _id: payeeIdOne, payeeBalanceCurrency: randomString() };
  const mockPayeeTwo = { _id: payeeIdTwo, payeeBalanceCurrency: randomString() };
  const contract = {};

  Client.findById.mockResolvedValue(mockClient);
  Payee.findOne.mockResolvedValue(mockPayeeOne);
  Payee.find.mockResolvedValue([mockPayeeOne, mockPayeeTwo]);
  PayeeTransaction.countDocuments.mockResolvedValue(0);

  beforeEach(() => {
    Object.assign(contract, {
      _id: randomId(),
      clientId,
      payeeId: randomId(),
      type: 'Fixed',
      payeeBalanceCondition: 'Never',
      payees: [
        { payeeId: payeeIdOne, percentage: 50 },
        { payeeId: payeeIdTwo, percentage: 50 },
      ],
      selfBilling: true,
      feesInvoice: true,
      deductWithholding: true,
    });
  });

  it('should modify contract by deleting its payeeId field', async () => {
    await formatPayees({ contract });

    expect(contract.hasOwnProperty('payeeId')).toBe(false);
  });

  it('should log error when client is not found', async () => {
    Client.findById.mockRejectedValueOnce(new Error('not found'));

    await formatPayees({ contract });

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  describe('when payeeBalances feature is disabled', () => {
    beforeEach(() => {
      Client.findById.mockResolvedValueOnce({ ...mockClient, features: { payeeBalances: false } });
    });

    it('should force Never and normalize to single payee with 100%', async () => {
      contract.payees = [{ payeeId: payeeIdOne, percentage: 50 }];
      contract.payeeBalanceCondition = 'Always';

      await formatPayees({ contract });

      expect(contract.payeeBalanceCondition).toBe('Never');
      expect(contract.payees).toEqual([{ payeeId: payeeIdOne, percentage: 100 }]);
    });

    it('should set payees to single payee with 100% when contract has more than one payee', async () => {
      contract.payees = [{ payeeId: payeeIdOne, percentage: 50 }, { payeeId: payeeIdTwo, percentage: 50 }];

      await formatPayees({ contract });

      expect(contract.payees).toEqual([{ payeeId: payeeIdOne, percentage: 100 }]);
    });

    it('should set payees to empty array when no payees exist', async () => {
      contract.payees = [];

      await formatPayees({ contract });

      expect(contract.payees).toEqual([]);
    });

    it('should throw when payee does not exist', async () => {
      contract.payees = [{ payeeId: payeeIdOne, percentage: 50 }];
      Payee.findOne.mockResolvedValueOnce(null);

      await expect(formatPayees({ contract })).rejects.toThrow('Payee does not exist');
    });

    it('should throw when payee has associated transactions', async () => {
      contract.payees = [{ payeeId: payeeIdOne, percentage: 50 }];
      PayeeTransaction.countDocuments.mockResolvedValueOnce(1);

      await expect(formatPayees({ contract })).rejects.toThrow('Payee has transactions associated, Payee Balance Condition cannot be "Never"');
    });
  });

  describe('when payeeBalances feature is enabled', () => {
    describe('when payeeBalanceCondition is Never', () => {
      it('should validate payee and normalize to single payee with 100%', async () => {
        contract.payees = [{ payeeId: payeeIdOne, percentage: 50 }];

        await formatPayees({ contract });

        expect(contract.payees).toEqual([{ payeeId: payeeIdOne, percentage: 100 }]);
      });

      it('should set payees to empty for a contract with no payees', async () => {
        contract.payees = [];

        await formatPayees({ contract });

        expect(contract.payees).toEqual([]);
      });

      it('should throw when payee does not exist', async () => {
        contract.payees = [{ payeeId: payeeIdOne, percentage: 50 }];
        Payee.findOne.mockResolvedValueOnce(null);

        await expect(formatPayees({ contract })).rejects.toThrow('Payee does not exist');
      });

      it('should throw when payee has associated transactions', async () => {
        contract.payees = [{ payeeId: payeeIdOne, percentage: 50 }];
        PayeeTransaction.countDocuments.mockResolvedValueOnce(1);

        await expect(formatPayees({ contract })).rejects.toThrow('Payee has transactions associated, Payee Balance Condition cannot be "Never"');
      });
    });

    describe('when payeeBalanceCondition is Always', () => {
      beforeEach(() => {
        contract.payeeBalanceCondition = 'Always';
      });

      it('should validate payees, disable billing fields and autoPayment', async () => {
        await formatPayees({ contract });

        expect(contract.selfBilling).toBe(false);
        expect(contract.feesInvoice).toBe(false);
        expect(contract.deductWithholding).toBe(false);
        expect(contract.autoPayment).toBe(false);
        expect(contract.autoPaymentConditions).toEqual([]);
      });

      it('should throw for Profit Share contracts', async () => {
        contract.type = 'Profit Share';

        await expect(formatPayees({ contract })).rejects.toThrow('Payee Balance Condition cannot be "Always" for Profit Share Classic contracts');
      });

      it('should throw when duplicate payeeIds exist', async () => {
        contract.payees = [
          { payeeId: payeeIdOne, percentage: 50 },
          { payeeId: payeeIdOne, percentage: 50 },
        ];

        await expect(formatPayees({ contract })).rejects.toThrow('Duplicate Payee IDs found in Payee Split');
      });

      it('should throw when total percentage is not 100', async () => {
        contract.payees = [
          { payeeId: payeeIdOne, percentage: 30 },
          { payeeId: payeeIdTwo, percentage: 30 },
        ];

        await expect(formatPayees({ contract })).rejects.toThrow('Total Payee Split Percentage must be 100%');
      });

      it('should throw when one or more payees do not exist', async () => {
        Payee.find.mockResolvedValueOnce([mockPayeeOne]);

        await expect(formatPayees({ contract })).rejects.toThrow('One or more payees do not exist');
      });

      it('should throw when a payee has no payeeBalanceCurrency', async () => {
        Payee.find.mockResolvedValueOnce([
          mockPayeeOne,
          { ...mockPayeeTwo, payeeBalanceCurrency: null },
        ]);

        await expect(formatPayees({ contract })).rejects.toThrow('One or more payees do not have a Payee Balance Currency set');
      });

      it('should disable selfBilling, feesInvoice, deductWithholding for non-Distributor clients', async () => {
        await formatPayees({ contract });

        expect(contract.selfBilling).toBe(false);
        expect(contract.feesInvoice).toBe(false);
        expect(contract.deductWithholding).toBe(false);
      });

      it('should not disable selfBilling, feesInvoice, deductWithholding for Distributor clients', async () => {
        Client.findById.mockResolvedValueOnce({ ...mockClient, clientType: 'Distributor' });

        await formatPayees({ contract });

        expect(contract.selfBilling).toBe(true);
        expect(contract.feesInvoice).toBe(true);
        expect(contract.deductWithholding).toBe(true);
      });

      it('should disable autoPayment and clear autoPaymentConditions', async () => {
        contract.autoPayment = true;
        contract.autoPaymentConditions = [randomString()];

        await formatPayees({ contract });

        expect(contract.autoPayment).toBe(false);
        expect(contract.autoPaymentConditions).toEqual([]);
      });
    });

    describe('when payeeBalanceCondition is When Positive', () => {
      beforeEach(() => {
        contract.payeeBalanceCondition = 'When Positive';
      });

      it('should pass validation with valid payees and adjust contract fields', async () => {
        await formatPayees({ contract });

        expect(contract.selfBilling).toBe(false);
        expect(contract.feesInvoice).toBe(false);
        expect(contract.deductWithholding).toBe(false);
        expect(contract.autoPayment).toBe(false);
        expect(contract.autoPaymentConditions).toEqual([]);
      });
    });
  });
});

describe('processPayeeBalances', () => {
  const clientId = randomId();
  const payeeIdOne = 'contractPayeeIdOne';
  const payeeIdTwo = 'contractPayeeIdTwo';
  const contractName = 'test contract';

  const mockFoundPayeeOne = { _id: { toString: () => payeeIdOne } };
  const mockFoundPayeeTwo = { _id: { toString: () => payeeIdTwo } };
  const client = { _id: { toString: () => clientId } };

  let contract;
  let importedPayees;

  Payee.findOne.mockResolvedValue(mockFoundPayeeOne);

  beforeEach(() => {
    contract = {
      name: contractName,
      clientId,
      payees: [{ payeeId: payeeIdOne, percentage: 50 }],
    };
    importedPayees = [
      { contractName, payeeName: 'newPayeeOne', percentage: 60 },
    ];
  });

  it('should skip imported payees that do not match contract name', async () => {
    importedPayees = [
      { contractName: randomString(), payeeName: 'newPayeeTwo', percentage: 60 },
      { contractName: randomString(), payeeName: 'newPayeeThree', percentage: 30 },
    ];

    const result = await processPayeeBalances({ contract, importedPayees, client, index: 0, overwriteBlanks: false });

    expect(result.payees).toEqual(contract.payees);
    expect(Payee.findOne).not.toHaveBeenCalled();
  });

  it('should add error when payee is not found in DB', async () => {
    Payee.findOne.mockResolvedValueOnce(null);

    const result = await processPayeeBalances({ contract, importedPayees, client, index: 5, overwriteBlanks: false });

    expect(result.payeeErrors).toEqual(['Payees - Line 8: Payee newPayeeOne does not exist']);
  });

  it('should update existing payee percentage when payee already exists in contract', async () => {
    const result = await processPayeeBalances({ contract, importedPayees, client, index: 0, overwriteBlanks: false });

    expect(result.payees).toEqual([{ payeeId: payeeIdOne, percentage: 60 }]);
  });

  it('should add new payee when not already in contract payees', async () => {
    Payee.findOne.mockResolvedValueOnce(mockFoundPayeeTwo);
    importedPayees = [{ contractName, payeeName: 'newPayee', percentage: 40 }];

    const result = await processPayeeBalances({ contract, importedPayees, client, index: 0, overwriteBlanks: false });

    expect(result.payees).toEqual([
      { payeeId: payeeIdOne, percentage: 50 },
      { payeeId: payeeIdTwo, percentage: 40 },
    ]);
  });

  it('should start with empty payees when overwriteBlanks is true', async () => {
    const result = await processPayeeBalances({ contract, importedPayees, client, index: 0, overwriteBlanks: true });

    expect(result.payees).toEqual([{ payeeId: payeeIdOne, percentage: 60 }]);
  });

  it('should preserve existing contract payees when overwriteBlanks is false', async () => {
    importedPayees = [];

    const result = await processPayeeBalances({ contract, importedPayees, client, index: 0, overwriteBlanks: false });

    expect(result.payees).toEqual([{ payeeId: payeeIdOne, percentage: 50 }]);
  });
});

describe('getEscalations', () => {
  const clientId = randomId();
  const contractId = randomId();
  const trackerOne = randomString();
  const trackerTwo = randomString();

  let contract;

  beforeEach(() => {
    contract = {
      _id: contractId,
      clientId,
      escalationTracking: {
        [trackerOne]: { startingUnits: 10, startingGross: 100, startingNet: 80 },
        [trackerTwo]: { startingUnits: 5, startingGross: 50, startingNet: 40 },
      },
    };
  });

  Escalation.find.mockResolvedValue([]);

  it('should throw when contract is not provided', async () => {
    await expect(getEscalations({})).rejects.toThrow('A contract is required');
  });

  it('should return contract unchanged when escalationTracking is not set', async () => {
    delete contract.escalationTracking;

    const result = await getEscalations({ contract });

    expect(result).toBe(contract);
    expect(Escalation.find).not.toHaveBeenCalled();
  });

  it('should keep starting values when no escalations exist', async () => {
    await getEscalations({ contract });

    expect(contract.escalationTracking[trackerOne]).toMatchObject({
      units: 10,
      gross: 100,
      net: 80,
      startingUnits: 10,
      startingGross: 100,
      startingNet: 80,
      escalationsAddedByPeriods: false,
    });
    expect(contract.escalationTracking[trackerTwo]).toMatchObject({
      units: 5,
      gross: 50,
      net: 40,
      startingUnits: 5,
      startingGross: 50,
      startingNet: 40,
      escalationsAddedByPeriods: false,
    });
  });

  it('should accumulate escalation values onto starting values when escalation trackers are matched with contract trackers', async () => {
    Escalation.find.mockResolvedValueOnce([
      { trackers: { [trackerOne]: { units: 3, gross: 30, net: 20 } } },
      { trackers: { [trackerOne]: { units: 7, gross: 70, net: 60 } } },
    ]);

    await getEscalations({ contract });

    expect(contract.escalationTracking[trackerOne]).toMatchObject({
      units: 20,
      gross: 200,
      net: 160,
      startingUnits: 10,
      startingGross: 100,
      startingNet: 80,
      escalationsAddedByPeriods: true,
    });
  });

  it('should not affect trackers that have no matching escalation data', async () => {
    Escalation.find.mockResolvedValueOnce([
      { trackers: { [trackerOne]: { units: 5, gross: 50, net: 40 } } },
    ]);

    await getEscalations({ contract });

    expect(contract.escalationTracking[trackerTwo]).toMatchObject({
      units: 5,
      gross: 50,
      net: 40,
      escalationsAddedByPeriods: false,
    });
  });

  it('should treat missing escalation fields as zero', async () => {
    Escalation.find.mockResolvedValueOnce([
      { trackers: { [trackerOne]: { units: 2 } } },
    ]);

    await getEscalations({ contract });

    expect(contract.escalationTracking[trackerOne]).toMatchObject({
      units: 12,
      gross: 100,
      net: 80,
      escalationsAddedByPeriods: true,
    });
  });
});

describe('calculateUnrecoupedAdvances', () => {
  test('with no transactions, returns zero values', () => {
    const transactions = [];

    const result = calculateUnrecoupedAdvances(0, transactions);

    expect(result).toEqual({
      overallBalance: 0,
      completedRecoupments: 0,
      recoupment: {
        advancesIssued: 0,
        amountRecouped: 0,
        outstanding: 0,
      },
    });
  });

  test('after first advance, shows active advance with no recoupment', () => {
    const transactions = [
      { type: 'Advance', amount: -1000, date: '2026-01-02' },
    ];

    const result = calculateUnrecoupedAdvances(0, transactions);

    expect(result).toEqual({
      overallBalance: -1000,
      completedRecoupments: 0,
      recoupment: {
        advancesIssued: 1000,
        amountRecouped: 0,
        outstanding: 1000,
      },
    });
  });

  test('after partial royalty payment, shows partial recoupment', () => {
    const transactions = [
      { type: 'Advance', amount: -1000, date: '2026-01-02' },
      { type: 'Royalties', amount: 500, date: '2026-01-04' },
    ];

    const result = calculateUnrecoupedAdvances(0, transactions);

    expect(result).toEqual({
      overallBalance: -500,
      completedRecoupments: 0,
      recoupment: {
        advancesIssued: 1000,
        amountRecouped: 500,
        outstanding: 500,
      },
    });
  });

  test('when advance is fully recouped, completedRecoupments increments', () => {
    const transactions = [
      { type: 'Advance', amount: -1000, date: '2026-01-02' },
      { type: 'Royalties', amount: 500, date: '2026-01-04' },
      { type: 'Royalties', amount: 1000, date: '2026-01-06' },
    ];

    const result = calculateUnrecoupedAdvances(0, transactions);

    expect(result).toEqual({
      overallBalance: 500,
      completedRecoupments: 1,
      recoupment: {
        advancesIssued: 1000,
        amountRecouped: 1000,
        outstanding: 0,
      },
    });
  });

  test('new advance after full recoupment starts new cycle', () => {
    const transactions = [
      { type: 'Advance', amount: -1000, date: '2026-01-02' },
      { type: 'Royalties', amount: 500, date: '2026-01-04' },
      { type: 'Royalties', amount: 1000, date: '2026-01-06' },
      { type: 'Advance', amount: -1000, date: '2026-01-08' },
    ];

    const result = calculateUnrecoupedAdvances(0, transactions);

    expect(result).toEqual({
      overallBalance: -500,
      completedRecoupments: 1,
      recoupment: {
        advancesIssued: 1000,
        amountRecouped: 0,
        outstanding: 1000,
      },
    });
  });

  test('opening balance is included in overall balance', () => {
    const transactions = [
      { type: 'Advance', amount: -1000, date: '2026-01-02' },
      { type: 'Royalties', amount: 2000, date: '2026-01-04' },
    ];

    const result = calculateUnrecoupedAdvances(-5000, transactions);

    expect(result).toEqual({
      overallBalance: -4000,
      completedRecoupments: 1,
      recoupment: {
        advancesIssued: 1000,
        amountRecouped: 1000,
        outstanding: 0,
      },
    });
  });

  test('positive advance adjusts (reduces) the issued advance amount', () => {
    const transactions = [
      { type: 'Advance', amount: -1000, date: '2026-01-02' },
      { type: 'Advance', amount: 200, date: '2026-01-03' },
      { type: 'Royalties', amount: 300, date: '2026-01-04' },
    ];

    const result = calculateUnrecoupedAdvances(0, transactions);

    expect(result).toEqual({
      overallBalance: -500,
      completedRecoupments: 0,
      recoupment: {
        advancesIssued: 800,
        amountRecouped: 300,
        outstanding: 500,
      },
    });
  });
});
