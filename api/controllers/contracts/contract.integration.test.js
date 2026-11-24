const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const ContractController = require('./contract');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const PayeeTransaction = require('../../models/payeeTransaction');
const Transaction = require('../../models/transaction');

describe('ContractController', () => {
  let client;
  let clientId;
  let contractId;

  beforeEach(async () => {
    client = await Client.create({
      name: randomString(),
      features: { payeeBalances: true },
      clientType: 'Label',
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    clientId = client._id.toString();
    contractId = randomId();
  });

  const makeContract = (overrides = {}) => ({
    _id: contractId,
    clientId,
    openingBalance: 0,
    type: 'Fixed',
    ...overrides,
  });

  const createTransaction = (overrides = {}) => Transaction.create({
    clientId,
    contractId,
    type: 'Royalties',
    name: randomString(),
    userCreated: false,
    amount: 100,
    date: new Date('2024-01-01'),
    ...overrides,
  });

  const createPayeeTransaction = (payeeId, overrides = {}) => PayeeTransaction.create({
    clientId,
    payeeId,
    contractId,
    name: randomString(),
    amountInPayeeCurrency: 100,
    date: new Date('2024-01-01'),
    type: 'Royalties',
    currency: 'GBP',
    originalCurrency: 'GBP',
    userCreated: false,
    ...overrides,
  });

  describe('formatPayees', () => {
    describe('payeeBalanceCondition: Always', () => {
      it('valid payees with correct split are accepted and contract fields are updated', async () => {
        // Arrange
        const payee1 = await Payee.create({ clientId, name: randomString(), payeeBalanceCurrency: 'GBP' });
        const payee2 = await Payee.create({ clientId, name: randomString(), payeeBalanceCurrency: 'USD' });
        const contract = makeContract({
          payeeBalanceCondition: 'Always',
          payees: [
            { payeeId: payee1._id.toString(), percentage: 60 },
            { payeeId: payee2._id.toString(), percentage: 40 },
          ],
          selfBilling: true,
          feesInvoice: true,
          deductWithholding: true,
          autoPayment: true,
          autoPaymentConditions: [randomString()],
        });

        // Act
        await ContractController.formatPayees({ contract });

        // Assert
        expect(contract.selfBilling).toBe(false);
        expect(contract.feesInvoice).toBe(false);
        expect(contract.deductWithholding).toBe(false);
        expect(contract.autoPayment).toBe(false);
        expect(contract.autoPaymentConditions).toEqual([]);
      });

      it('should throw when payee does not belong to the contract client', async () => {
        // Arrange
        const otherClient = await Client.create({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
        const payee = await Payee.create({ clientId: otherClient._id, name: randomString(), payeeBalanceCurrency: 'GBP' });
        const contract = makeContract({
          payeeBalanceCondition: 'Always',
          payees: [{ payeeId: payee._id.toString(), percentage: 100 }],
        });

        // Assert
        await expect(ContractController.formatPayees({ contract })).rejects.toThrow('One or more payees do not exist');
      });

      it('should throw when some payee IDs do not exist in DB', async () => {
        // Arrange
        const payee1 = await Payee.create({ clientId, name: randomString(), payeeBalanceCurrency: 'GBP' });
        const contract = makeContract({
          payeeBalanceCondition: 'Always',
          payees: [
            { payeeId: payee1._id.toString(), percentage: 50 },
            { payeeId: randomId(), percentage: 50 }, // non-existent
          ],
        });

        // Assert
        await expect(ContractController.formatPayees({ contract })).rejects.toThrow('One or more payees do not exist');
      });
    });

    describe('payeeBalanceCondition: Never', () => {
      it('should throw when payee does not belong to the contract client', async () => {
        // Arrange
        const otherClient = await Client.create({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
        const payee = await Payee.create({ clientId: otherClient._id, name: randomString() });
        const contract = makeContract({
          payeeBalanceCondition: 'Never',
          payees: [{ payeeId: payee._id, percentage: 100 }],
        });

        // Assert
        await expect(ContractController.formatPayees({ contract })).rejects.toThrow('Payee does not exist');
      });

      it('should throw when payee has existing payee transactions on this contract', async () => {
        // Arrange
        const payee = await Payee.create({ clientId, name: randomString(), payeeBalanceCurrency: 'GBP' });
        await createPayeeTransaction(payee._id.toString());
        const contract = makeContract({
          payeeBalanceCondition: 'Never',
          payees: [{ payeeId: payee._id, percentage: 100 }],
        });

        // Act / Assert
        await expect(ContractController.formatPayees({ contract }))
          .rejects.toThrow('Payee has transactions associated, Payee Balance Condition cannot be "Never"');
      });
    });
  });

  describe('processPayeeBalances', () => {
    it('should add payee to payees array when found by name and clientId', async () => {
      // Arrange
      const newPayeeName = 'New payee';
      const contractName = randomString();
      const payee = await Payee.create({ clientId, name: newPayeeName, payeeBalanceCurrency: 'GBP' });
      const contract = { name: contractName, payees: [] };
      const importedPayees = [{ contractName, payeeName: newPayeeName, percentage: 75 }];

      // Act
      const result = await ContractController.processPayeeBalances({
        contract,
        importedPayees,
        overwriteBlanks: false,
        client,
        index: 0,
      });

      // Assert
      expect(result.payeeErrors).toHaveLength(0);
      expect(result.payees).toEqual([{ payeeId: payee._id.toString(), percentage: 75 }]);
    });

    it('should not find payee when clientId does not match', async () => {
      // Arrange
      const contractName = randomString();
      await Payee.create({ clientId, name: 'Payee Name', payeeBalanceCurrency: 'GBP' });
      const otherClient = await Client.create({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
      const contract = { name: contractName, payees: [] };
      const importedPayees = [{ contractName, payeeName: 'Payee Name', percentage: 75 }];

      // Act
      const result = await ContractController.processPayeeBalances({
        contract,
        importedPayees,
        overwriteBlanks: false,
        client: otherClient,
        index: 0,
      });

      // Assert
      expect(result.payeeErrors).toHaveLength(1);
      expect(result.payees).toHaveLength(0);
    });
  });

  describe('getPaginatedTransactions', () => {
    describe('Profit Share reserve transaction filtering', () => {
      it('should exclude isReserveRelease transactions for Profit Share contracts', async () => {
        // Arrange
        const contract = makeContract({ type: 'Profit Share' });
        await createTransaction({ amount: 100, date: new Date('2024-01-01') });
        await createTransaction({ amount: 200, date: new Date('2024-01-02'), isReserveRelease: true });

        // Act
        const result = await ContractController.getPaginatedTransactions({ contract, query: {} });

        // Assert
        expect(result.meta.total).toBe(1);
        expect(result.transactions[0].amount).toBe(100);
      });

      it('should exclude isReserveWithholding transactions for Profit Share contracts', async () => {
        // Arrange
        const contract = makeContract({ type: 'Profit Share' });
        await createTransaction({ amount: 100, date: new Date('2024-01-01') });
        await createTransaction({ amount: -50, date: new Date('2024-01-02'), isReserveWithholding: true });

        // Act
        const result = await ContractController.getPaginatedTransactions({ contract, query: {} });

        // Assert
        expect(result.meta.total).toBe(1);
        expect(result.transactions[0].amount).toBe(100);
      });

      it('should exclude reserve transactions for Profit Share - Flexible contracts', async () => {
        // Arrange
        const contract = makeContract({ type: 'Profit Share - Flexible' });
        await createTransaction({ amount: 100, date: new Date('2024-01-01') });
        await createTransaction({ amount: 200, date: new Date('2024-01-02'), isReserveRelease: true });
        await createTransaction({ amount: -50, date: new Date('2024-01-03'), isReserveWithholding: true });

        // Act
        const result = await ContractController.getPaginatedTransactions({ contract, query: {} });

        // Assert
        expect(result.meta.total).toBe(1);
      });

      it('should include reserve transactions for non profit share contracts', async () => {
        // Arrange
        const contract = makeContract({ type: 'Fixed' });
        await createTransaction({ amount: 100, date: new Date('2024-01-01') });
        await createTransaction({ amount: 200, date: new Date('2024-01-02'), isReserveRelease: true });
        await createTransaction({ amount: -50, date: new Date('2024-01-03'), isReserveWithholding: true });

        // Act
        const result = await ContractController.getPaginatedTransactions({ contract, query: {} });

        // Assert
        expect(result.meta.total).toBe(3);
      });
    });

    describe('date parameter filtering', () => {
      it('should only include transactions up to and including the given date', async () => {
        // Arrange
        const contract = makeContract();
        await createTransaction({ amount: 100, date: new Date('2024-01-01') });
        await createTransaction({ amount: 200, date: new Date('2024-01-15') });
        await createTransaction({ amount: 300, date: new Date('2024-02-01') });

        // Act
        const result = await ContractController.getPaginatedTransactions({
          contract,
          query: {},
          date: new Date('2024-01-15'),
        });

        // Assert
        expect(result.meta.total).toBe(2);
      });

      it('should return no transactions when date is before all transactions', async () => {
        // Arrange
        const contract = makeContract();
        await createTransaction({ amount: 100, date: new Date('2024-01-10') });
        await createTransaction({ amount: 200, date: new Date('2024-01-15') });

        // Act
        const result = await ContractController.getPaginatedTransactions({
          contract,
          query: {},
          date: new Date('2024-01-01'),
        });

        // Assert
        expect(result.meta.total).toBe(0);
        expect(result.transactions).toHaveLength(0);
      });
    });
  });
});
