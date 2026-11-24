jest.mock('stripe', () => {
  const stripeInstance = {
    customers: { create: jest.fn() },
    setupIntents: { create: jest.fn() },
    paymentMethods: { retrieve: jest.fn() },
    paymentIntents: { create: jest.fn() },
  };
  const stripeFactory = jest.fn(() => stripeInstance);
  stripeFactory.__stripeInstance = stripeInstance;
  return stripeFactory;
});

const supertest = require('supertest');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, cleanUpAsync } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const stripeMock = require('stripe').__stripeInstance;
const config = require('../../config.json');
const Client = require('../../models/client');
const Invoice = require('../../models/invoice');
const Notification = require('../../models/notification');

const server = supertest(require('../../index'));

const applicationToken = config.applicationTokens[0];

const stripeError = (overrides) => Object.assign(new Error(overrides.message), {
  raw: { message: overrides.message },
  ...overrides,
});

let createdClientIds = [];

const buildClient = async ({ billing = {}, ...overrides } = {}) => {
  const client = new Client({
    name: randomString(),
    createdBigQueryTables: true,
    createdBigQueryBackups: true,
    createdAt: moment().subtract(150, 'days').format(),
    clientType: 'Label',
    paymentTier: 'Lite',
    lockedForNonPayment: false,
    cancelledSubscription: false,
    billing: {
      billingType: 'Card',
      stripeCustomerId: 'cus_mock123',
      stripePaymentMethod: 'pm_mock123',
      lastPaymentDate: moment().subtract(40, 'days').format(),
      currency: 'GBP',
      country: 'GB',
      amount: 100,
      ...billing,
    },
    ...overrides,
  });
  await client.save();
  createdClientIds.push(client._id.toString());
  return client;
};

const buildToken = (client, { admin = true, internal = false, withClientId = true } = {}) => {
  const payload = {
    id: new ObjectId().toString(),
    internal,
    email: 'charge-tests@curve.com',
    ...(withClientId ? { clientId: client._id.toString(), rights: { [client._id.toString()]: { admin } } } : { rights: {} }),
  };
  return jwt.sign(payload, process.env.jsonSecretToken, { expiresIn: 86400 });
};

const chargeRequest = (token) => server.get('/clients/charge').set('applicationToken', applicationToken).set('token', token);

describe('/clients/charge', () => {
  beforeEach(() => {
    jest.spyOn(Notification, 'generate').mockReturnValue(undefined);
    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, filePath, cb) => cb(null, 'mock-invoice-key.pdf'));
    stripeMock.paymentIntents.create.mockReset();
    stripeMock.customers.create.mockReset();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await Promise.all(createdClientIds.map((id) => cleanUpAsync(id)));
    createdClientIds = [];
  });

  describe('authentication and authorization', () => {
    it('returns 401 when the application token is missing', async () => {
      const client = await buildClient();
      const token = buildToken(client);
      const res = await server.get('/clients/charge').set('token', token);
      expect(res.status).toBe(401);
    });

    it('returns 403 when the user token has no clientId', async () => {
      const client = await buildClient();
      const token = buildToken(client, { withClientId: false });
      const res = await chargeRequest(token);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('returns 403 when the user is not an admin for the client', async () => {
      const client = await buildClient();
      const token = buildToken(client, { admin: false });
      const res = await chargeRequest(token);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the client referenced by the token no longer exists', async () => {
      const client = await buildClient();
      const token = buildToken(client);
      await Client.findByIdAndDelete(client._id);
      const res = await chargeRequest(token);
      expect(res.status).toBe(404);
    });
  });

  describe('eligibility validation (no Stripe call should be made)', () => {
    it('rejects clients billed by Invoice instead of Card', async () => {
      const client = await buildClient({ billing: { billingType: 'Invoice' } });
      const token = buildToken(client);
      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Billing type is not Card');
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(false);
    });

    it('rejects a charge attempt when payment is not yet due', async () => {
      const client = await buildClient({ billing: { lastPaymentDate: moment().subtract(5, 'days').format() } });
      const token = buildToken(client);
      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Payment not due');
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(false);
    });

    it('locks the client and blocks the charge when the subscription is cancelled', async () => {
      const client = await buildClient({ cancelledSubscription: true });
      const token = buildToken(client);
      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Subscription cancelled');
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(true);
    });

    it('locks the client and skips the charge when there is no Stripe customer on file', async () => {
      const client = await buildClient({ billing: { stripeCustomerId: undefined } });
      const token = buildToken(client);
      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('No Customer ID saved against the client.');
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(true);
      expect(updated.billing.lastPaymentFailure).toBe('No Customer ID saved against the client.');
      expect(await Invoice.findOne({ clientId: client._id.toString() })).toBeNull();
    });

    it('locks the client and skips the charge when there is no payment method on file', async () => {
      const client = await buildClient({ billing: { stripePaymentMethod: undefined } });
      const token = buildToken(client);
      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('No Payment Method saved against the client.');
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(true);
      expect(updated.billing.lastPaymentFailure).toBe('No Payment Method saved against the client.');
      expect(await Invoice.findOne({ clientId: client._id.toString() })).toBeNull();
    });
  });

  describe('successful charges', () => {
    it('charges the client, unlocks the account, and creates an invoice (GB VAT applied)', async () => {
      stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_mock_1', status: 'succeeded' });
      const client = await buildClient({ billing: { amount: 100, currency: 'GBP', country: 'GB' } });
      const token = buildToken(client);

      const res = await chargeRequest(token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Charged successfully');
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
        amount: 12000, // (100 + 20% VAT) * 100
        currency: 'GBP',
        customer: 'cus_mock123',
        payment_method: 'pm_mock123',
        off_session: true,
        confirm: true,
      });

      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(false);
      expect(updated.billing.lastPaymentFailure).toBeFalsy();
      expect(moment(updated.billing.lastPaymentDate).isAfter(moment().subtract(1, 'minute'))).toBe(true);

      const invoice = await Invoice.findOne({ clientId: client._id.toString() });
      expect(invoice).not.toBeNull();
      expect(invoice.usage.amount).toBe(100);
      expect(invoice.usage.vat).toBe(20);
      expect(invoice.file).toBe('mock-invoice-key.pdf');
    });

    it('charges non-GB clients with no VAT, in their own currency', async () => {
      stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_mock_2', status: 'succeeded' });
      const client = await buildClient({ billing: { amount: 100, currency: 'USD', country: 'US' } });
      const token = buildToken(client);

      const res = await chargeRequest(token);

      expect(res.status).toBe(200);
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 10000, currency: 'USD' }));

      const invoice = await Invoice.findOne({ clientId: client._id.toString() });
      expect(invoice.usage.vat).toBe(0);
      expect(invoice.billingInfo.currency).toBe('USD');
    });

    it('bypasses an existing non-payment lock and successfully recharges the client', async () => {
      stripeMock.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_mock_3', status: 'succeeded' });
      const client = await buildClient({ lockedForNonPayment: true, billing: { lastPaymentFailure: 'Previous attempt failed' } });
      const token = buildToken(client);

      const res = await chargeRequest(token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Charged successfully');
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(false);
      expect(updated.billing.lastPaymentFailure).toBeFalsy();
      expect(await Invoice.findOne({ clientId: client._id.toString() })).not.toBeNull();
    });
  });

  describe('Stripe failures', () => {
    it('locks the client and creates no invoice when the card is declined', async () => {
      stripeMock.paymentIntents.create.mockRejectedValueOnce(stripeError({
        message: 'Your card was declined.',
        type: 'StripeCardError',
        code: 'card_declined',
        statusCode: 402,
      }));
      const client = await buildClient();
      const token = buildToken(client);

      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Your card was declined.');
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(true);
      expect(updated.billing.lastPaymentFailure).toBe('Your card was declined.');
      expect(await Invoice.findOne({ clientId: client._id.toString() })).toBeNull();
    });

    it('locks the client and creates no invoice on an expired/invalid Stripe API key (the May incident scenario)', async () => {
      stripeMock.paymentIntents.create.mockRejectedValueOnce(stripeError({
        message: 'Expired API Key provided: rk_live_****************************YbfC',
        type: 'StripeAuthenticationError',
        code: 'api_key_expired',
        statusCode: 401,
      }));
      const client = await buildClient();
      const token = buildToken(client);

      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Expired API Key provided: rk_live_****************************YbfC');
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(true);
      expect(updated.billing.lastPaymentFailure).toBe('Expired API Key provided: rk_live_****************************YbfC');
      expect(await Invoice.findOne({ clientId: client._id.toString() })).toBeNull();
    });

    it('treats a Stripe connection/network error the same as a declined charge, even though the request may not have reached Stripe', async () => {
      stripeMock.paymentIntents.create.mockRejectedValueOnce(stripeError({
        message: 'An error occurred with our connection to Stripe.',
        type: 'StripeConnectionError',
      }));
      const client = await buildClient();
      const token = buildToken(client);

      const res = await chargeRequest(token);

      expect(res.status).toBe(201);
      const updated = await Client.findById(client._id);
      expect(updated.lockedForNonPayment).toBe(true);
      expect(await Invoice.findOne({ clientId: client._id.toString() })).toBeNull();
    });
  });
});
