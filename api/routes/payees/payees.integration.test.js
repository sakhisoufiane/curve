const { logger, configShared } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');
const payeeSelectFields = require('../../libs/payeeSelectFields');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: mockCSVRawExport,
}));

const Client = require('../../models/client');
const Payee = require('../../models/payee');
const Notification = require('../../models/notification');
const PayeeTransaction = require('../../models/payeeTransaction');
const User = require('../../models/user');

const server = supertest(require('../../index'));

describe('/payees', () => {
  logger.info('>>>file>>>> routes/payees/payees.integration.test .....................');

  const applicationToken = config.applicationTokens[0];
  let client;
  let user;
  let clientUser;

  beforeEach(async () => {
    client = new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: `${randomString()}@curve.com` });
    await user.save();

    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email: user.email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { contracts: 'Edit' };
    clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  describe('Date filtering - createdAfter', () => {
    let oldPayee;
    let recentPayee;

    beforeEach(async () => {
      oldPayee = new Payee({
        clientId: client._id,
        name: 'Old Payee',
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldPayee.save();

      recentPayee = new Payee({
        clientId: client._id,
        name: 'Recent Payee',
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentPayee.save();
    });

    it('should return only payees created on or after the specified date', async () => {
      const res = await server
        .get('/payees?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(recentPayee._id.toString());
      expect(returnedIds).not.toContain(oldPayee._id.toString());
    });

    it('should include payees created exactly on the specified date', async () => {
      const exactDatePayee = new Payee({
        clientId: client._id,
        name: 'Exact Date Payee',
        createdAt: new Date('2024-01-01T23:59:59Z'),
        updatedAt: new Date('2024-01-01T23:59:59Z'),
      });
      await exactDatePayee.save();

      const res = await server
        .get('/payees?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(exactDatePayee._id.toString());
    });
  });

  describe('Date filtering - createdBefore', () => {
    let oldPayee;
    let recentPayee;

    beforeEach(async () => {
      oldPayee = new Payee({
        clientId: client._id,
        name: 'Old Payee',
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldPayee.save();

      recentPayee = new Payee({
        clientId: client._id,
        name: 'Recent Payee',
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentPayee.save();
    });

    it('should return only payees created before the specified date', async () => {
      const res = await server
        .get('/payees?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(oldPayee._id.toString());
      expect(returnedIds).not.toContain(recentPayee._id.toString());
    });

    it('should include payees created exactly on the specified date', async () => {
      const exactDatePayee = new Payee({
        clientId: client._id,
        name: 'Exact Date Payee',
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      });
      await exactDatePayee.save();

      const res = await server
        .get('/payees?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(exactDatePayee._id.toString());
    });
  });

  describe('Date filtering - updatedAfter', () => {
    let oldUpdatePayee;
    let recentUpdatePayee;

    beforeEach(async () => {
      oldUpdatePayee = new Payee({
        clientId: client._id,
        name: 'Old Update Payee',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdatePayee.save();
      await Payee.updateOne({ _id: oldUpdatePayee._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdatePayee = new Payee({
        clientId: client._id,
        name: 'Recent Update Payee',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdatePayee.save();
      await Payee.updateOne({ _id: recentUpdatePayee._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only payees updated on or after the specified date', async () => {
      const res = await server
        .get('/payees?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(recentUpdatePayee._id.toString());
      expect(returnedIds).not.toContain(oldUpdatePayee._id.toString());
    });

    it('should include payees updated exactly on the specified date', async () => {
      const exactDatePayee = new Payee({
        clientId: client._id,
        name: 'Exact Update Payee',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDatePayee.save();
      await Payee.updateOne({ _id: exactDatePayee._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/payees?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(exactDatePayee._id.toString());
    });
  });

  describe('Date filtering - updatedBefore', () => {
    let oldUpdatePayee;
    let recentUpdatePayee;

    beforeEach(async () => {
      oldUpdatePayee = new Payee({
        clientId: client._id,
        name: 'Old Update Payee',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdatePayee.save();
      await Payee.updateOne({ _id: oldUpdatePayee._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdatePayee = new Payee({
        clientId: client._id,
        name: 'Recent Update Payee',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdatePayee.save();
      await Payee.updateOne({ _id: recentUpdatePayee._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only payees updated before the specified date', async () => {
      const res = await server
        .get('/payees?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(oldUpdatePayee._id.toString());
      expect(returnedIds).not.toContain(recentUpdatePayee._id.toString());
    });

    it('should include payees updated exactly on the specified date', async () => {
      const exactDatePayee = new Payee({
        clientId: client._id,
        name: 'Exact Update Payee',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDatePayee.save();
      await Payee.updateOne({ _id: exactDatePayee._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/payees?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(exactDatePayee._id.toString());
    });
  });

  describe('Date filtering - combinations', () => {
    let earlyPayee;
    let midPayee;
    let latePayee;

    beforeEach(async () => {
      earlyPayee = new Payee({
        clientId: client._id,
        name: 'Early Payee',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });
      await earlyPayee.save();

      midPayee = new Payee({
        clientId: client._id,
        name: 'Mid Payee',
        createdAt: new Date('2024-06-15T10:00:00Z'),
        updatedAt: new Date('2024-06-15T10:00:00Z'),
      });
      await midPayee.save();

      latePayee = new Payee({
        clientId: client._id,
        name: 'Late Payee',
        createdAt: new Date('2024-12-15T10:00:00Z'),
        updatedAt: new Date('2024-12-15T10:00:00Z'),
      });
      await latePayee.save();
    });

    it('should apply createdAfter and createdBefore together for a date range', async () => {
      const res = await server
        .get('/payees?createdAfter=2024-03-01&createdBefore=2024-09-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(midPayee._id.toString());
      expect(returnedIds).not.toContain(earlyPayee._id.toString());
      expect(returnedIds).not.toContain(latePayee._id.toString());
    });

    it('should combine date filters with text search', async () => {
      const matchingPayee = new Payee({
        clientId: client._id,
        name: 'Searchable Payee',
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await matchingPayee.save();

      const nonMatchingPayee = new Payee({
        clientId: client._id,
        name: 'Different Name',
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await nonMatchingPayee.save();

      const res = await server
        .get('/payees?createdAfter=2024-03-01&text=Searchable')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIds = res.body.payees.map((p) => p._id.toString());
      expect(returnedIds).toContain(matchingPayee._id.toString());
      expect(returnedIds).not.toContain(nonMatchingPayee._id.toString());
    });
  });

  describe('CRUD operations', () => {
    let payeeId;
    let adminUser;
    let adminToken;

    beforeEach(async () => {
      // Ensure client has payeeBalances feature enabled
      await Client.findByIdAndUpdate(client._id, {
        features: { payeeBalances: true },
        dateFormat: 'DD/MM/YYYY',
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      });

      // Create a test payee
      const payee = await Payee.create({
        clientId: client._id,
        name: 'Test Payee',
        contactEmail: 'test-payee@example.com',
        payeeBalanceCurrency: 'USD',
        openingBalance: 1000,
        statements: [],
      });
      payeeId = payee._id;

      // Update the existing user with payeeIds
      await User.findByIdAndUpdate(user._id, {
        payeeIds: [payeeId.toString()],
      });

      // Create a client admin user
      adminUser = new User({
        _id: randomId(),
        email: `${randomString()}@curve.com`,
        clientId: client._id,
        internal: false,
        adminClientIds: [client._id.toString()],
        adminType: 'Admin',
      });
      await adminUser.save();

      const adminUserToken = {
        id: adminUser._id,
        clientId: client._id,
        email: adminUser.email,
        rights: {},
        adminType: 'Admin',
      };
      adminUserToken.rights[client._id.toString()] = { contracts: 'Edit' };
      adminToken = jwt.sign(adminUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      jest.spyOn(Payee, 'importFromExcel').mockImplementation(() => 'Hello');
      Notification.generate = jest.fn().mockResolvedValue();
    });

    describe('GET /payees', () => {
      it('should return all payees for the client', async () => {
        await Payee.create([
          { clientId: client._id, name: 'Payee 1', email: 'payee1@example.com', payeeBalanceCurrency: 'USD' },
          { clientId: client._id, name: 'Payee 2', email: 'payee2@example.com', payeeBalanceCurrency: 'EUR' },
        ]);

        const res = await server
          .get('/payees')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body.payees).toBeInstanceOf(Array);
        expect(res.body.payees.length).toBe(3);
        expect(res.body.meta).toHaveProperty('currentPage');
        expect(res.body.meta).toHaveProperty('totalPages');
        expect(res.body.meta).toHaveProperty('total');
      });

      it('should filter payees by text search', async () => {
        await Payee.create([
          { clientId: client._id, name: 'John Doe', email: 'john@example.com', payeeBalanceCurrency: 'USD' },
          { clientId: client._id, name: 'Jane Smith', email: 'jane@example.com', payeeBalanceCurrency: 'EUR' },
        ]);

        const res = await server
          .get('/payees?text=John')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body.payees.length).toBe(1);
        expect(res.body.payees[0].name).toBe('John Doe');
      });

      it('should return 403 for unauthorized access', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'None' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .get('/payees')
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('GET /payees/:id', () => {
      it('should return a single payee by ID for regular user without payeeBalances', async () => {
        await Client.findByIdAndUpdate(client._id, { 'features.payeeBalances': false });

        const res = await server
          .get(`/payees/${payeeId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(payeeId.toString());
        expect(res.body.name).toBe('Test Payee');
        // Should not include encrypted fields for regular user
        expect(res.body.contactEmail).toBeUndefined();
        // Should not include payeeBalances fields
        expect(res.body.openingBalance).toBeUndefined();
        expect(res.body.payeeBalanceCurrency).toBeUndefined();
        expect(res.body.minPayout).toBeUndefined();
        expect(res.body.selfBilling).toBeUndefined();
        expect(res.body.autoPayment).toBeUndefined();
      });

      it('should return a single payee by ID for client admin user with payeeBalances', async () => {
        const res = await server
          .get(`/payees/${payeeId}`)
          .set('applicationToken', applicationToken)
          .set('token', adminToken);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(payeeId.toString());
        expect(res.body.name).toBe('Test Payee');
        // Client admin should have access to encrypted fields
        expect(res.body.contactEmail).toBe('test-payee@example.com');

        // Should include payeeBalances fields
        expect(res.body).toHaveProperty('openingBalance');
        expect(res.body).toHaveProperty('payeeBalanceCurrency');
        expect(res.body).toHaveProperty('minPayout');
        expect(res.body).toHaveProperty('selfBilling');
        expect(res.body).toHaveProperty('autoPayment');
        expect(res.body.openingBalance).toBe(1000);
        expect(res.body.payeeBalanceCurrency).toBe('USD');
      });

      it('should add validation error when payeeBalances enabled but no currency set', async () => {
        // Create a payee with currency first (to pass validation)
        const payeeWithoutCurrency = await Payee.create({
          clientId: client._id,
          name: 'Payee Without Currency',
          email: 'no-currency@example.com',
          payeeBalanceCurrency: 'USD',
        });

        // update it to remove the currency
        await Payee.findByIdAndUpdate(payeeWithoutCurrency._id, {
          $unset: { payeeBalanceCurrency: 1 },
        });

        const res = await server
          .get(`/payees/${payeeWithoutCurrency._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(payeeWithoutCurrency._id.toString());
        expect(res.body.name).toBe('Payee Without Currency');
        // Should include validation error
        expect(res.body.validationErrors).toBeInstanceOf(Array);
        expect(res.body.validationErrors).toContain('When Payee Balances is enabled: Currency should be set');
      });

      it('should return 404 for non-existent payee', async () => {
        const nonExistentId = randomId();
        const res = await server
          .get(`/payees/${nonExistentId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Payee with ID ${nonExistentId}`);
      });

      it('should return 403 for forbidden access', async () => {
        const payeeUserToken = {
          id: randomId(),
          clientId: null,
          payeeId: randomId().toString(),
          email: `${randomString()}@curve.com`,
          rights: {},
        };
        const payeeToken = jwt.sign(payeeUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .get(`/payees/${payeeId}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('POST /payees', () => {
      it('should create a new payee', async () => {
        const payeeData = {
          name: 'New Payee',
          email: 'new-payee@example.com',
          payeeBalanceCurrency: 'EUR',
          openingBalance: 500,
        };

        const res = await server
          .post('/payees')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(payeeData);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(payeeData.name);
        expect(res.body.email).toBe(payeeData.email);
        expect(res.body.clientId).toBe(client._id.toString());

        // Verify payee was saved to database
        const savedPayee = await Payee.findOne({ name: payeeData.name });
        expect(savedPayee).not.toBeNull();
        expect(savedPayee.name).toBe(payeeData.name);
      });

      it('should return 403 for unauthorized creation', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'View' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const payeeData = { name: 'Unauthorized Payee' };

        const res = await server
          .post('/payees')
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken)
          .send(payeeData);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('PUT /payees/:id', () => {
      it('should update an existing payee', async () => {
        const updateData = {
          name: 'Updated Payee Name',
          email: 'updated@example.com',
        };

        const res = await server
          .put(`/payees/${payeeId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(updateData.name);
        expect(res.body.email).toBe(updateData.email);

        // Verify payee was updated in database
        const updatedPayee = await Payee.findById(payeeId);
        expect(updatedPayee.name).toBe(updateData.name);
        expect(updatedPayee.email).toBe(updateData.email);
      });

      it('should return 404 for non-existent payee', async () => {
        const nonExistentId = randomId();
        const updateData = { name: 'Updated Name' };

        const res = await server
          .put(`/payees/${nonExistentId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(updateData);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Payee with ID ${nonExistentId}`);
      });
    });

    describe('DELETE /payees/:id', () => {
      it('should delete a payee', async () => {
        const res = await server
          .delete(`/payees/${payeeId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(payeeId.toString());

        // Verify payee was deleted from database
        const deletedPayee = await Payee.findById(payeeId);
        expect(deletedPayee).toBeNull();
      });

      it('should return 404 for non-existent payee', async () => {
        const nonExistentId = randomId();

        const res = await server
          .delete(`/payees/${nonExistentId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Payee with ID ${nonExistentId}`);
      });
    });

    describe('Payee Transactions', () => {
      let transactionPayeeId;

      beforeEach(async () => {
        // Ensure client has payeeBalances feature enabled
        await Client.findByIdAndUpdate(client._id, { features: { payeeBalances: true } });

        // Create a test payee with transactions
        const transactionPayee = await Payee.create({
          clientId: client._id,
          name: 'Transaction Test Payee',
          contactEmail: 'transaction-payee@example.com',
          payeeBalanceCurrency: 'USD',
          openingBalance: 1000,
        });
        transactionPayeeId = transactionPayee._id;

        // Create some test transactions
        await PayeeTransaction.create([
          {
            clientId: client._id,
            payeeId: transactionPayeeId,
            name: 'Transaction 1',
            amountInPayeeCurrency: 100,
            date: new Date('2024-01-01'),
            type: 'Royalties',
            currency: 'USD',
            originalCurrency: 'USD',
            userCreated: true,
          },
          {
            clientId: client._id,
            payeeId: transactionPayeeId,
            name: 'Transaction 2',
            amountInPayeeCurrency: 200,
            date: new Date('2024-01-15'),
            type: 'Advance',
            currency: 'USD',
            originalCurrency: 'USD',
            userCreated: true,
          },
        ]);
      });

      it('should return payee transactions', async () => {
        const res = await server
          .get(`/payees/${transactionPayeeId}/transactions`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
        expect(res.body[0]).toHaveProperty('balance');
      });

      it('should return 403 when client does not have payeeBalances feature', async () => {
        await Client.findByIdAndUpdate(client._id, { 'features.payeeBalances': false });

        const res = await server
          .get(`/payees/${transactionPayeeId}/transactions`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('This client is not allowed to create payee transactions');
      });
    });

    describe('POST /payees/:id/transaction', () => {
      let transactionPayeeId;

      beforeEach(async () => {
        await Client.findByIdAndUpdate(client._id, { features: { payeeBalances: true } });
        const transactionPayee = await Payee.create({
          clientId: client._id,
          name: 'Transaction Payee',
          payeeBalanceCurrency: 'USD',
          openingBalance: 500,
        });
        transactionPayeeId = transactionPayee._id;
      });

      it('should create a new transaction for a payee', async () => {
        const transactionData = {
          name: 'New Transaction',
          amountInPayeeCurrency: 150,
          date: '2024-01-15',
          type: 'Royalties',
        };

        const res = await server
          .post(`/payees/${transactionPayeeId}/transaction`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(transactionData);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(transactionData.name);
        expect(res.body.amountInPayeeCurrency).toBe(transactionData.amountInPayeeCurrency);
        expect(res.body.payeeId).toBe(transactionPayeeId.toString());
        expect(res.body.clientId).toBe(client._id.toString());

        // Verify transaction was saved to database
        const savedTransaction = await PayeeTransaction.findOne({ name: transactionData.name });
        expect(savedTransaction).not.toBeNull();
        expect(savedTransaction.name).toBe(transactionData.name);
      });

      it('should return 400 when payee has no balance currency', async () => {
        await Payee.findByIdAndUpdate(transactionPayeeId, { $unset: { payeeBalanceCurrency: 1 } });

        const transactionData = {
          name: 'New Transaction',
          amountInPayeeCurrency: 150,
          date: '2024-01-15',
          type: 'Royalties',
        };

        const res = await server
          .post(`/payees/${transactionPayeeId}/transaction`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(transactionData);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Payee Balance currency must be set before creating transactions');
      });
    });

    describe('PUT /payees/:id/transaction', () => {
      let transactionPayeeId;
      let transactionId;

      beforeEach(async () => {
        await Client.findByIdAndUpdate(client._id, { features: { payeeBalances: true } });
        const transactionPayee = await Payee.create({
          clientId: client._id,
          name: 'Update Transaction Payee',
          payeeBalanceCurrency: 'USD',
          openingBalance: 500,
        });
        transactionPayeeId = transactionPayee._id;

        const transaction = await PayeeTransaction.create({
          clientId: client._id,
          payeeId: transactionPayeeId,
          name: 'Original Transaction',
          amountInPayeeCurrency: 100,
          date: new Date('2024-01-01'),
          type: 'Royalties',
          currency: 'USD',
          originalCurrency: 'USD',
          userCreated: true,
        });
        transactionId = transaction._id;
      });

      it('should update an existing transaction', async () => {
        const updateData = {
          _id: transactionId.toString(),
          name: 'Updated Transaction',
          amountInPayeeCurrency: 200,
        };

        const res = await server
          .put(`/payees/${transactionPayeeId}/transaction`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(updateData);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(updateData.name);
        expect(res.body.amountInPayeeCurrency).toBe(updateData.amountInPayeeCurrency);

        // Verify transaction was updated in database
        const updatedTransaction = await PayeeTransaction.findById(transactionId);
        expect(updatedTransaction.name).toBe(updateData.name);
        expect(updatedTransaction.amountInPayeeCurrency).toBe(updateData.amountInPayeeCurrency);
      });
    });

    describe('DELETE /payees/:id/transaction/:id', () => {
      let transactionPayeeId;
      let transactionId;

      beforeEach(async () => {
        await Client.findByIdAndUpdate(client._id, { features: { payeeBalances: true } });
        const transactionPayee = await Payee.create({
          clientId: client._id,
          name: 'Delete Transaction Payee',
          payeeBalanceCurrency: 'USD',
          openingBalance: 500,
        });
        transactionPayeeId = transactionPayee._id;

        const transaction = await PayeeTransaction.create({
          clientId: client._id,
          payeeId: transactionPayeeId,
          name: 'Transaction to Delete',
          amountInPayeeCurrency: 100,
          date: new Date('2024-01-01'),
          type: 'Royalties',
          currency: 'USD',
          originalCurrency: 'USD',
          userCreated: true,
        });
        transactionId = transaction._id;
      });

      it('should delete a transaction', async () => {
        const res = await server
          .delete(`/payees/${transactionPayeeId}/transaction/${transactionId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Transaction deleted');

        // Verify transaction was deleted from database
        const deletedTransaction = await PayeeTransaction.findById(transactionId);
        expect(deletedTransaction).toBeNull();
      });
    });

    describe('POST /payees/transactions/import', () => {
      beforeEach(async () => {
        await Client.findByIdAndUpdate(client._id, { features: { payeeBalances: true } });
      });

      it('should return 400 when no file is uploaded', async () => {
        const res = await server
          .post('/payees/transactions/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('Requires a file to be uploaded');
      });

      it('should return 403 when client does not have payeeBalances feature', async () => {
        await Client.findByIdAndUpdate(client._id, { 'features.payeeBalances': false });

        const res = await server
          .post('/payees/transactions/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .attach('file', Buffer.from('test'), 'transactions.csv');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('This client is not allowed to import payee transactions');
      });

      it('should return 403 for unauthorized import', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'View' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .post('/payees/transactions/import')
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken)
          .attach('file', Buffer.from('test'), 'transactions.csv');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('POST /payees/transactions/export', () => {
      beforeEach(async () => {
        await Client.findByIdAndUpdate(client._id, { features: { payeeBalances: true } });
      });

      it('should return 403 when client does not have payeeBalances feature', async () => {
        await Client.findByIdAndUpdate(client._id, { 'features.payeeBalances': false });

        const res = await server
          .post('/payees/transactions/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [payeeId.toString()] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('This client is not allowed to export payee transactions');
      });

      it('should return 403 for unauthorized export', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'None' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .post('/payees/transactions/export')
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken)
          .send({ ids: [payeeId.toString()] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should accept export request with specific IDs', async () => {
        const res = await server
          .post('/payees/transactions/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [payeeId.toString()] });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Your payee transactions export will be sent to you via email shortly');
      });

      it('should accept export request with filter', async () => {
        const res = await server
          .post('/payees/transactions/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { name: 'Test Payee' } });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Your payee transactions export will be sent to you via email shortly');
      });
    });

    describe('GET /payees/:id/history', () => {
      it('should return payee history', async () => {
        const res = await server
          .get(`/payees/${payeeId}/history`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('modelHistory');
        expect(res.body.modelHistory).toBeInstanceOf(Array);
      });

      it('should return 404 for non-existent payee', async () => {
        const nonExistentId = randomId();

        const res = await server
          .get(`/payees/${nonExistentId}/history`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Payee with ID ${nonExistentId}`);
      });
    });

    describe('GET /payees/:id/summary', () => {
      it('should return payee summary', async () => {
        const res = await server
          .get(`/payees/${payeeId}/summary`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('_id');
        expect(res.body).toHaveProperty('name');
      });

      it('should return 404 for non-existent payee', async () => {
        const nonExistentId = randomId();

        const res = await server
          .get(`/payees/${nonExistentId}/summary`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Payee with ID ${nonExistentId}`);
      });
    });

    describe('GET /payees/:id/detail', () => {
      it('should return payee analytics', async () => {
        const res = await server
          .get(`/payees/${payeeId}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('net');
        expect(res.body).toHaveProperty('overTime');
      });

      it('should return 404 for non-existent payee', async () => {
        const nonExistentId = randomId();

        const res = await server
          .get(`/payees/${nonExistentId}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Payee with ID ${nonExistentId}`);
      });
    });

    describe('GET /payees/:id/statements', () => {
      it('should return payee statements', async () => {
        const res = await server
          .get(`/payees/${payeeId}/statements`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
      });

      it('should return 403 for unauthorized access', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'None' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .get(`/payees/${payeeId}/statements`)
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('GET /payees/:id/users', () => {
      it('should return users linked to the payee', async () => {
        const res = await server
          .get(`/payees/${payeeId}/users`)
          .set('applicationToken', applicationToken)
          .set('token', adminToken);

        expect(res.status).toBe(200);
        expect(res.body.users).toBeInstanceOf(Array);
        expect(res.body.meta).toHaveProperty('currentPage');
        expect(res.body.meta).toHaveProperty('totalPages');
        expect(res.body.meta).toHaveProperty('total');
      });

      it('should return 403 for unauthorized access', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'None' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .get(`/payees/${payeeId}/users`)
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('POST /payees/import', () => {
      it('should return 400 when no file is uploaded', async () => {
        const res = await server
          .post('/payees/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain('Requires a file to be uploaded');
      });

      it('should return 403 for unauthorized import', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'View' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .post('/payees/import')
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken)
          .attach('file', Buffer.from('test'), 'payees.csv');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('POST /payees/export', () => {
      it('should accept export request with specific IDs', async () => {
        const res = await server
          .post('/payees/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [payeeId.toString()] });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Your report will be sent to you via email shortly');
      });

      it('should accept export request with filter', async () => {
        const res = await server
          .post('/payees/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { name: 'Test Payee' } });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Your report will be sent to you via email shortly');
      });

      it('should return 403 for unauthorized export', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'None' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .post('/payees/export')
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken)
          .send({ ids: [payeeId.toString()] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('DELETE /payees/bulk', () => {
      it('should delete multiple payees', async () => {
        const payee2 = await Payee.create({
          clientId: client._id,
          name: 'Payee 2',
          email: 'payee2@example.com',
          payeeBalanceCurrency: 'EUR',
        });

        const res = await server
          .delete('/payees/bulk')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [payeeId.toString(), payee2._id.toString()] });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('deletedCount');
        expect(res.body.deletedCount).toBe(2);

        // Verify payees were deleted
        const deletedPayee1 = await Payee.findById(payeeId);
        const deletedPayee2 = await Payee.findById(payee2._id);
        expect(deletedPayee1).toBeNull();
        expect(deletedPayee2).toBeNull();
      });

      it('should return 404 when no IDs provided', async () => {
        const res = await server
          .delete('/payees/bulk')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [] });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Could not find Payees');
      });

      it('should return 403 for unauthorized bulk delete', async () => {
        const unauthorizedUserToken = {
          id: user._id,
          clientId: client._id,
          email: user.email,
          rights: {},
        };
        unauthorizedUserToken.rights[client._id.toString()] = { contracts: 'View' };
        const unauthorizedToken = jwt.sign(unauthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await server
          .delete('/payees/bulk')
          .set('applicationToken', applicationToken)
          .set('token', unauthorizedToken)
          .send({ ids: [payeeId.toString()] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('POST /payees/raw-export', () => {
    beforeEach(() => {
      mockCSVRawExport.mockReset();
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
    });

    it('should return 200 with async message when sync is not set', async () => {
      const res = await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
    });

    it('should return 200 with csvPublicLink when sync=true', async () => {
      const res = await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
    });

    it('should call CSVRawExport with sync=true when body param set', async () => {
      await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
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
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(500);
      expect(res.body.message).toEqual('Export failed');
    });

    it('should apply updatedAfter filter to updatedAt.$gte', async () => {
      await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
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
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
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
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
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
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
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
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
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

    it('should pass text filter to CSVRawExport', async () => {
      await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { text: 'searchterm' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(Object) }),
          ]),
        }),
      }));
    });

    it('should include clientId in filter', async () => {
      await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          clientId: expect.anything(),
        }),
      }));
    });

    it('should return 403 when user has no contracts rights', async () => {
      const noRightsToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { contracts: 'None' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', noRightsToken)
        .send({ filter: {} });

      expect(res.status).toBe(403);
    });

    it('should always pass excludeFields with encrypted fields', async () => {
      await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      const callArgs = mockCSVRawExport.mock.calls[0][0];
      expect(callArgs.excludeFields).toBeDefined();
      // Should include encrypted fields
      for (const field of configShared.encryptedFields.payee) {
        expect(callArgs.excludeFields).toContain(field);
      }
    });

    it('should always exclude client admin only fields for all users', async () => {
      await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      const callArgs = mockCSVRawExport.mock.calls[0][0];
      // Should include client admin only fields for all users
      for (const field of payeeSelectFields.getClientAdminOnlyFields()) {
        expect(callArgs.excludeFields).toContain(field);
      }
    });

    it('should exclude all sensitive fields even for client admin users', async () => {
      // Admin user token (adminType: 'Admin')
      const adminToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        adminType: 'Admin',
        rights: { [client._id.toString()]: { contracts: 'Edit' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', adminToken)
        .send({ filter: {} });

      const callArgs = mockCSVRawExport.mock.calls[0][0];
      // Encrypted fields should be excluded
      for (const field of configShared.encryptedFields.payee) {
        expect(callArgs.excludeFields).toContain(field);
      }
      // Client admin only fields should also be excluded for admin users
      expect(callArgs.excludeFields).toContain('paymentCurrency');
    });

    it('should allow View rights users to export', async () => {
      const viewRightsToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { contracts: 'View' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/payees/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', viewRightsToken)
        .send({ filter: {} });

      expect(res.status).toBe(200);
    });
  });
});
