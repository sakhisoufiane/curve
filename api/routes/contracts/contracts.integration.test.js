const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const jwt = require('jsonwebtoken');
const { randomString, randomId, randomBoolean } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const supertest = require('supertest');
const config = require('../../config.json');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: (...args) => mockCSVRawExport(...args),
}));

const Client = require('../../models/client');
const Payee = require('../../models/payee');
const User = require('../../models/user');
const Contract = require('../../models/contract');
const Transaction = require('../../models/transaction');
const { createUserWithNoRights } = require('../../test/test-utils/user.generator');

const server = supertest(require('../../index'));

const applicationToken = config.applicationTokens[0];

describe('/contracts', () => {
  logger.info('>>>file>>>> routes/contracts .....................');

  let testClient;
  let testPayee;
  let authToken;
  // Helper function to create a contract
  const createTestContract = (overrides = {}) => ({
    name: randomString(),
    contractType: 'Standard',
    clientId: testClient._id,
    active: true,
    valid: true,
    payees: [],
    salesTerms: [],
    deductionsTerms: [],
    mechanicalTerms: [],
    withholdingTaxTerms: [],
    costsTerms: [],
    reserves: [],
    ...overrides,
  });

  beforeAll(async () => {
    // Create test client
    testClient = await Client.create({
      name: randomString(),
      active: true,
      createdBigQueryBackups: true,
      createdBigQueryTables: true,
    });

    // Create test payee
    testPayee = await Payee.create({
      name: randomString(),
      clientId: testClient._id,
      active: true,
    });

    // Create user with full rights for main tests
    const testUser = await User.create({
      email: `${randomString()}@test.com`,
      password: randomString(),
    });

    // Generate auth token
    authToken = jwt.sign(
      {
        id: testUser._id,
        email: testUser.email,
        clientId: testClient._id,
        rights: {
          [testClient._id.toString()]: {
            contracts: 'Edit',
          },
        },
      },
      process.env.jsonSecretToken,
      { expiresIn: 86400 },
    );

    // Create test contracts
    await Contract.create([
      createTestContract({ name: 'Test Contract 1' }),
      createTestContract({ name: 'Test Contract 2', contractType: 'Mechanical' }),
      createTestContract({
        name: 'Test Contract with Payee',
        payees: [{ payeeId: testPayee._id }],
      }),
    ]);
  });

  describe('GET /contracts', () => {
    describe('access control', () => {
      it('should return 403 when user has no rights and no payeeId', async () => {
        // Create user with no rights and no payeeId
        const noAccessUser = await User.create({
          email: `${randomString()}@test.com`,
          password: randomString(),
        });

        const noAccessToken = jwt.sign(
          { id: noAccessUser._id, email: noAccessUser.email },
          process.env.jsonSecretToken,
          { expiresIn: 86400 },
        );

        const response = await server
          .get('/contracts')
          .set('Token', noAccessToken)
          .set('applicationToken', applicationToken)
          .expect(403);

        expect(response.body.message).toBe('Forbidden');
      });
    });

    describe('payee access', () => {
      let payeeToken;

      beforeAll(async () => {
        const payeeUser = await User.create({
          email: `${randomString()}@test.com`,
          password: randomString(),
          payeeId: testPayee._id,
        });

        payeeToken = jwt.sign(
          { id: payeeUser._id, email: payeeUser.email, payeeId: testPayee._id },
          process.env.jsonSecretToken,
          { expiresIn: 86400 },
        );
      });

      it('should only return contracts associated with the payee', async () => {
        const response = await server
          .get('/contracts')
          .set('Token', payeeToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.contracts).toHaveLength(1);
        expect(response.body.contracts[0].name).toBe('Test Contract with Payee');
        expect(response.body.contracts[0].payees[0].payeeId._id.toString()).toBe(testPayee._id.toString());
      });

      it('should respect pagination for payee contracts', async () => {
        const response = await server
          .get('/contracts')
          .query({ page: 1, limit: 1 })
          .set('Token', payeeToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.contracts).toHaveLength(1);
        expect(response.body.meta.totalPages).toBe(1);
        expect(response.body.meta.total).toBe(1);
      });
    });

    describe('full access', () => {
      describe('atlas search', () => {
        // Atlas Search tests cannot be run in the test environment as they require MongoDB Atlas.
      });

      describe('normal search', () => {
        it('should return all contracts (exclduing the mechanical ones) when no filters are applied', async () => {
          const response = await server
            .get('/contracts')
            .set('Token', authToken)
            .set('applicationToken', applicationToken)
            .expect(200);

          expect(response.body.contracts).toBeDefined();
          expect(response.body.meta.currentPage).toBe(1);
          expect(response.body.contracts.length).toBe(2);
        });

        it('should filter by contract type', async () => {
          const response = await server
            .get('/contracts')
            .query({ contractType: 'Mechanical' })
            .set('Token', authToken)
            .set('applicationToken', applicationToken)
            .expect(200);

          expect(response.body.contracts).toHaveLength(1);
          expect(response.body.contracts[0].contractType).toBe('Mechanical');
        });

        it('should handle pagination', async () => {
          const response = await server
            .get('/contracts')
            .query({ page: 1, limit: 1 })
            .set('Token', authToken)
            .set('applicationToken', applicationToken)
            .expect(200);

          expect(response.body.contracts).toHaveLength(1);
          expect(response.body.meta.currentPage).toBe(1);
          expect(response.body.meta.totalPages).toBe(2);
        });

        describe('status filtering', () => {
          beforeAll(async () => {
            const now = new Date();

            // Active contract - all dates in future
            await Contract.create(createTestContract({
              name: 'Active Contract',
              endDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days in future
              retentionPeriodEndDate: new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000)), // 60 days in future
              collectionEndDate: new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)), // 90 days in future
            }));

            // Retention - endDate passed, within retention period

            await Contract.create(createTestContract({
              name: 'Retention Contract',
              endDate: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
              retentionPeriodEndDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days in future
              collectionEndDate: new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000)), // 60 days in future
            }));

            // Collection - retention period passed, within collection period
            await Contract.create(createTestContract({
              name: 'Collection Contract',
              endDate: new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000)), // 60 days ago
              retentionPeriodEndDate: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
              collectionEndDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days in future
            }));

            // Expired - all dates passed
            await Contract.create(createTestContract({
              name: 'Expired Contract',
              endDate: new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)), // 90 days ago
              retentionPeriodEndDate: new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000)), // 60 days ago
              collectionEndDate: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
            }));
          });

          it('should return correct contract status for each contract', async () => {
            const response = await server
              .get('/contracts')
              .set('Token', authToken)
              .set('applicationToken', applicationToken)
              .expect(200);

            const { contracts } = response.body;

            const active = contracts.find((c) => c.name === 'Active Contract');
            const retention = contracts.find((c) => c.name === 'Retention Contract');
            const collection = contracts.find((c) => c.name === 'Collection Contract');
            const expired = contracts.find((c) => c.name === 'Expired Contract');

            expect(active.status).toBeUndefined();
            expect(retention.status).toBe('Retention');
            expect(collection.status).toBe('Collection');
            expect(expired.status).toBe('Expired');
          });

          it('should filter contracts by status', async () => {
            const statuses = ['Retention', 'Collection', 'Expired'];
            const responses = await Promise.all(statuses.map((status) => server
              .get('/contracts')
              .query({ status })
              .set('Token', authToken)
              .set('applicationToken', applicationToken)
              .expect(200)));

            responses.forEach((response, i) => {
              expect(response.body.contracts).toHaveLength(1);
              expect(response.body.contracts[0].status).toBe(statuses[i]);
            });
          });
        });
      });
    });
  });

  describe('/raw-export POST', () => {
    beforeEach(() => {
      mockCSVRawExport.mockReset();
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
    });

    it('should return 200 with async message when sync is not set', async () => {
      const res = await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
    });

    it('should return 200 with csvPublicLink when sync=true', async () => {
      const res = await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
    });

    it('should call CSVRawExport with sync=true when body param set', async () => {
      await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          sync: true,
        }),
      );
    });

    it('should return 500 when CSVRawExport throws in sync mode', async () => {
      mockCSVRawExport.mockRejectedValue(new Error('Export failed'));
      const res = await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(500);
      expect(res.body.message).toEqual('Export failed');
    });

    it('should apply updatedAfter filter to updatedAt.$gte', async () => {
      await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ filter: { updatedAfter: '2025-01-15' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            updatedAt: { $gte: new Date('2025-01-15T00:00:00.000Z') },
          }),
        }),
      );
    });

    it('should apply updatedBefore filter to updatedAt.$lte', async () => {
      await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ filter: { updatedBefore: '2025-01-20' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            updatedAt: { $lte: new Date('2025-01-20T23:59:59.999Z') },
          }),
        }),
      );
    });

    it('should apply createdAfter filter to createdAt.$gte', async () => {
      await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ filter: { createdAfter: '2025-01-10' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            createdAt: { $gte: new Date('2025-01-10T00:00:00.000Z') },
          }),
        }),
      );
    });

    it('should apply createdBefore filter to createdAt.$lte', async () => {
      await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ filter: { createdBefore: '2025-01-25' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            createdAt: { $lte: new Date('2025-01-25T23:59:59.999Z') },
          }),
        }),
      );
    });

    it('should apply combined updatedAfter and updatedBefore as date range', async () => {
      await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ filter: { updatedAfter: '2025-01-01', updatedBefore: '2025-01-31' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            updatedAt: {
              $gte: new Date('2025-01-01T00:00:00.000Z'),
              $lte: new Date('2025-01-31T23:59:59.999Z'),
            },
          }),
        }),
      );
    });

    it('should return csvPublicLink when sync=true with updatedAfter filter', async () => {
      const res = await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: { updatedAfter: '2025-01-15' } });
      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          sync: true,
          filter: expect.objectContaining({
            updatedAt: { $gte: new Date('2025-01-15T00:00:00.000Z') },
          }),
        }),
      );
    });

    it('should return csvPublicLink when sync=true with createdAfter filter', async () => {
      const res = await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: { createdAfter: '2025-01-10' } });
      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          sync: true,
          filter: expect.objectContaining({
            createdAt: { $gte: new Date('2025-01-10T00:00:00.000Z') },
          }),
        }),
      );
    });

    it('should return csvPublicLink when sync=true with date range filter', async () => {
      const res = await server
        .post('/contracts/raw-export')
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: { updatedAfter: '2025-01-01', updatedBefore: '2025-01-31' } });
      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          sync: true,
          filter: expect.objectContaining({
            updatedAt: {
              $gte: new Date('2025-01-01T00:00:00.000Z'),
              $lte: new Date('2025-01-31T23:59:59.999Z'),
            },
          }),
        }),
      );
    });

    it('should return 403 when user has no contracts rights', async () => {
      const noRightsUser = await User.create({
        email: `${randomString()}@test.com`,
        password: randomString(),
      });
      const noRightsToken = jwt.sign(
        {
          id: noRightsUser._id,
          email: noRightsUser.email,
          clientId: testClient._id,
          rights: {
            [testClient._id.toString()]: {
              contracts: 'None',
            },
          },
        },
        process.env.jsonSecretToken,
        { expiresIn: 86400 },
      );

      const res = await server
        .post('/contracts/raw-export')
        .set('Token', noRightsToken)
        .set('applicationToken', applicationToken)
        .send({ filter: {} });
      expect(res.status).toBe(403);
    });
  });

  describe('Date filtering', () => {
    let oldContract;
    let midContract;
    let newContract;

    beforeEach(async () => {
      oldContract = new Contract({
        ...createTestContract(),
        name: `Old Contract ${randomString()}`,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        updatedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await oldContract.save();

      midContract = new Contract({
        ...createTestContract(),
        name: `Mid Contract ${randomString()}`,
        createdAt: new Date('2022-06-15T12:00:00.000Z'),
        updatedAt: new Date('2022-06-15T12:00:00.000Z'),
      });
      await midContract.save();

      newContract = new Contract({
        ...createTestContract(),
        name: `New Contract ${randomString()}`,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      await newContract.save();
    });

    describe('createdAfter filter', () => {
      it('should filter contracts created on or after the specified date', async () => {
        const response = await server
          .get('/contracts?createdAfter=2022-01-01')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(midContract._id.toString());
        expect(contractIds).toContain(newContract._id.toString());
        expect(contractIds).not.toContain(oldContract._id.toString());
      });

      it('should include contracts created exactly on the filter date', async () => {
        const response = await server
          .get('/contracts?createdAfter=2022-06-15')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(midContract._id.toString());
      });
    });

    describe('createdBefore filter', () => {
      it('should filter contracts created on or before the specified date', async () => {
        const response = await server
          .get('/contracts?createdBefore=2022-06-15')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(oldContract._id.toString());
        expect(contractIds).toContain(midContract._id.toString());
        expect(contractIds).not.toContain(newContract._id.toString());
      });

      it('should include contracts created exactly on the filter date', async () => {
        const response = await server
          .get('/contracts?createdBefore=2020-01-01')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(oldContract._id.toString());
      });
    });

    describe('updatedAfter filter', () => {
      it('should filter contracts updated on or after the specified date', async () => {
        const response = await server
          .get('/contracts?updatedAfter=2022-01-01')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(midContract._id.toString());
        expect(contractIds).toContain(newContract._id.toString());
        expect(contractIds).not.toContain(oldContract._id.toString());
      });

      it('should include contracts updated exactly on the filter date', async () => {
        const response = await server
          .get('/contracts?updatedAfter=2024-01-01')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(newContract._id.toString());
      });
    });

    describe('updatedBefore filter', () => {
      it('should filter contracts updated on or before the specified date', async () => {
        const response = await server
          .get('/contracts?updatedBefore=2022-06-15')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(oldContract._id.toString());
        expect(contractIds).toContain(midContract._id.toString());
        expect(contractIds).not.toContain(newContract._id.toString());
      });

      it('should include contracts updated exactly on the filter date', async () => {
        const response = await server
          .get('/contracts?updatedBefore=2022-06-15')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(midContract._id.toString());
      });
    });

    describe('date range combinations', () => {
      it('should apply createdAfter and createdBefore together', async () => {
        const response = await server
          .get('/contracts?createdAfter=2021-01-01&createdBefore=2023-01-01')
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        const contractIds = response.body.contracts.map((c) => c._id.toString());
        expect(contractIds).toContain(midContract._id.toString());
        expect(contractIds).not.toContain(oldContract._id.toString());
        expect(contractIds).not.toContain(newContract._id.toString());
      });
    });
  });

  describe('GET /contracts/:id/transactions', () => {
    let contractWithTransactions;
    let transactions;

    beforeAll(async () => {
      contractWithTransactions = await Contract.create(
        createTestContract({ name: 'Contract With Transactions', openingBalance: 100 }),
      );

      const transactionData = [
        { amount: 10, date: new Date('2024-01-01') },
        { amount: 20, date: new Date('2024-01-02') },
        { amount: 30, date: new Date('2024-01-03') },
        { amount: 40, date: new Date('2024-01-04') },
        { amount: 50, date: new Date('2024-01-05') },
      ];

      transactions = await Transaction.create(
        transactionData.map((t) => ({
          ...t,
          clientId: testClient._id,
          contractId: contractWithTransactions._id,
          type: 'Royalty',
          name: `Transaction ${t.amount}`,
          userCreated: false,
        })),
      );
    });

    describe('non-paginated (legacy)', () => {
      it('should return all transactions with running balance when no page param', async () => {
        const response = await server
          .get(`/contracts/${contractWithTransactions._id}/transactions`)
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.meta).toBeUndefined();

        expect(response.body.transactions[0].balance).toBe(110);
        expect(response.body.transactions[1].balance).toBe(130);
        expect(response.body.transactions[2].balance).toBe(160);
        expect(response.body.transactions[3].balance).toBe(200);
        expect(response.body.transactions[4].balance).toBe(250);
      });

      it('should return 404 for non-existent contract', async () => {
        const response = await server
          .get(`/contracts/${randomId()}/transactions`)
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(404);

        expect(response.body.message).toMatch(/Could not find Contract/);
      });
    });

    describe('paginated', () => {
      it('should return paginated transactions with meta when page param provided', async () => {
        const response = await server
          .get(`/contracts/${contractWithTransactions._id}/transactions`)
          .query({ page: 1, limit: 2 })
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.transactions).toHaveLength(2);
        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.currentPage).toBe(1);
        expect(response.body.meta.totalPages).toBe(3);
        expect(response.body.meta.total).toBe(5);
      });

      it('should return newest transactions first (page 1 = newest)', async () => {
        const response = await server
          .get(`/contracts/${contractWithTransactions._id}/transactions`)
          .query({ page: 1, limit: 2 })
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.transactions[0].amount).toBe(50);
        expect(response.body.transactions[1].amount).toBe(40);
      });

      it('should calculate correct running balance for page 1', async () => {
        const response = await server
          .get(`/contracts/${contractWithTransactions._id}/transactions`)
          .query({ page: 1, limit: 2 })
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.transactions[0].balance).toBe(250);
        expect(response.body.transactions[1].balance).toBe(200);
      });

      it('should calculate correct running balance for page 2', async () => {
        const response = await server
          .get(`/contracts/${contractWithTransactions._id}/transactions`)
          .query({ page: 2, limit: 2 })
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.transactions[0].amount).toBe(30);
        expect(response.body.transactions[1].amount).toBe(20);
        expect(response.body.transactions[0].balance).toBe(160);
        expect(response.body.transactions[1].balance).toBe(130);
      });

      it('should calculate correct running balance for last page', async () => {
        const response = await server
          .get(`/contracts/${contractWithTransactions._id}/transactions`)
          .query({ page: 3, limit: 2 })
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(200);

        expect(response.body.transactions).toHaveLength(1);
        expect(response.body.transactions[0].amount).toBe(10);
        expect(response.body.transactions[0].balance).toBe(110);
      });

      it('should return 404 for non-existent contract', async () => {
        const response = await server
          .get(`/contracts/${randomId()}/transactions`)
          .query({ page: 1 })
          .set('Token', authToken)
          .set('applicationToken', applicationToken)
          .expect(404);

        expect(response.body.message).toMatch(/Could not find Contract/);
      });
    });
  });

  describe('GET /contracts/:id/active_advances', () => {
    let advancesContract;
    let profitShareContract;

    beforeAll(async () => {
      advancesContract = await Contract.create(createTestContract({
        name: 'Advances Test Contract',
        openingBalance: 0,
      }));

      profitShareContract = await Contract.create(createTestContract({
        name: 'Profit Share Test Contract',
        type: 'Profit Share',
        openingBalance: 0,
      }));

      await Transaction.create([
        {
          clientId: testClient._id,
          contractId: advancesContract._id,
          type: 'Advance',
          amount: -1000,
          date: new Date('2026-01-02'),
          name: 'Test Advance',
          userCreated: false,
        },
        {
          clientId: testClient._id,
          contractId: advancesContract._id,
          type: 'Royalties',
          amount: 400,
          date: new Date('2026-01-05'),
          name: 'Test Royalties',
          userCreated: false,
        },
      ]);
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await server
        .get(`/contracts/${randomId()}/active_advances`)
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .expect(404);

      expect(response.body.message).toMatch(/Could not find Contract/);
    });

    it('should return 403 when user lacks contracts read access', async () => {
      // GIVEN
      const { token: limitedToken } = await createUserWithNoRights({ clientId: testClient._id });

      // WHEN
      const response = await server
        .get(`/contracts/${advancesContract._id}/active_advances`)
        .set('Token', limitedToken)
        .set('applicationToken', applicationToken);

      // THEN
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: 'Forbidden' });
    });

    it('should return 400 for invalid date format', async () => {
      const response = await server
        .get(`/contracts/${advancesContract._id}/active_advances`)
        .query({ date: 'invalid-date' })
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .expect(400);

      expect(response.body.message).toBe('Invalid date format');
    });

    it('should return 400 for Profit Share contracts', async () => {
      const response = await server
        .get(`/contracts/${profitShareContract._id}/active_advances`)
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .expect(400);

      expect(response.body).toEqual({
        message: 'Profit Share contracts do not track advance recoupment',
      });
    });

    it('should return active advances with recoupment data', async () => {
      const response = await server
        .get(`/contracts/${advancesContract._id}/active_advances`)
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .expect(200);

      expect(response.body.overallBalance).toBe(-600);
      expect(response.body.completedRecoupments).toBe(0);
      expect(response.body.recoupment).toEqual({
        advancesIssued: 1000,
        amountRecouped: 400,
        outstanding: 600,
      });
    });

    it('should filter transactions by date query parameter', async () => {
      const response = await server
        .get(`/contracts/${advancesContract._id}/active_advances`)
        .query({ date: '2026-01-03' })
        .set('Token', authToken)
        .set('applicationToken', applicationToken)
        .expect(200);

      // Only advance transaction should be accounted for:
      expect(response.body.overallBalance).toBe(-1000);
      expect(response.body.recoupment).toEqual({
        advancesIssued: 1000,
        amountRecouped: 0,
        outstanding: 1000,
      });
    });
  });
});
