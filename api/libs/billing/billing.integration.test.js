/* eslint-disable no-await-in-loop */
process.env.STRIPE_KEY = 'sk_test_51BksxMGEdIguBfryuwjrcC0WkHEXTnzkeLQpGD2fMNZk0yvXNE80jc2nWMiLvtMTcIOOqb2FuKh6HbqS2OhwFBmK00gXlzwECD';

const { testUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { cleanUpAsync } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');
const Billing = require('./index');
const Notification = require('../../models/notification');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Invoice = require('../../models/invoice');

const stripeCustomerId = 'cus_KBQyUYvJF2CRd4';
const stripePaymentMethod = 'card_1JcoqaGEdIguBfry4q8iyEYz';
const curveUser = { id: testUtils.randomId() };

let createdClientIds = [];

describe('Billing', () => {
  beforeEach(async () => {
    jest.spyOn(Notification, 'generate').mockReturnValue();
    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, localPath, callback) => callback(null, testUtils.randomString()));
  });

  afterEach(async () => {
    await Promise.all(createdClientIds.map((id) => cleanUpAsync(id)));
    createdClientIds = [];
  });

  describe('when the client has invoice as billing type', () => {
    let client;
    beforeEach(async () => {
      const billing = { billingType: 'Invoice' };
      const createdAt = moment().subtract(20, 'days').format();
      const contractsCount = 10;
      const catalogueCount = 10;

      client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
    });

    it('should not charge the client', async () => {
      // Arrange
      const ignoreLastPaymentFailure = false;
      const expectedError = 'Billing type is not Card';
      // Act
      try {
        await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
      } catch (err) {
        expect(err.message).toBe(expectedError);
      }
    });
  });

  describe('when no card on file', () => {
    let client;
    let contractsCount;
    let catalogueCount;
    beforeEach(async () => {
      const billing = { billingType: 'Card', stripeCustomerId };
      const createdAt = moment().subtract(20, 'days').format();
      contractsCount = 10;
      catalogueCount = 10;
      client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
    });

    it('should return an error', async () => {
      // Arrange
      const ignoreLastPaymentFailure = false;
      const expectedError = 'No Payment Method saved against the client.';
      // Act
      try {
        await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
      } catch (err) {
        expect(err.message).toBe(expectedError);
      }
    });
  });

  describe('when a card is on file', () => {
    describe('when client is already locked', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(20, 'days').format();
        billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
        client.lockedForNonPayment = true;
      });

      it('should not charge the client', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        try {
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        } catch (err) {
          expect(err.message).toBe('Client account already locked');
        }
      });
    });

    describe('when client has never been charged and they signed up less than 14 days ago', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(5, 'days').format();
        billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });

      it('should not charge the client', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        try {
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        } catch (err) {
          expect(err.message).toBe('Payment not due');
        }
      });
    });

    describe('when client has never been charged and they signed up more than 14 days ago', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(15, 'days').format();
        billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });
      it('should charge the client', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        try {
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        } catch {
          expect(Notification.generate.mock.calls[0][0]).toBe('Successful Payment');
        }
      });
    });

    describe('when client has been charged before and the last charge date is less than a month ago', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(150, 'days').format();
        billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(20, 'days').format() };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });

      it('should not charge the client', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        try {
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        } catch (err) {
          expect(err.message).toBe('Payment not due');
        }
      });
    });

    describe('when client has been charged before and the last charge date is more than a month ago', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(150, 'days').format();
        billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });

      it('should charge the client', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        expect(Notification.generate.mock.calls[0][0]).toBe('Successful Payment');
      });
    });

    describe('when client has a billing currency set', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(150, 'days').format();
        billing = { billingType: 'Card', currency: 'USD', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });

      it('should charge the client using the right currency', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        const invoice = await Invoice.findOne({ clientId: client._id.toString() });
        expect(invoice.billingInfo.currency).toBe(billing.currency);
      });
    });

    describe('when client has a billing amount set', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(150, 'days').format();
        billing = { billingType: 'Card', amount: testUtils.randomInt(), stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });

      it('should charge the client using the set amount', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        const invoice = await Invoice.findOne({ clientId: client._id.toString() });
        expect(invoice.usage.amount).toBe(billing.amount);
      });
    });

    describe('when client is already locked but ignoreLastPaymentFailure is set to true', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(150, 'days').format();
        billing = { billingType: 'Card', amount: testUtils.randomInt(), stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });

      it('should charge the client', async () => {
        // Arrange
        const ignoreLastPaymentFailure = true;
        // Act
        await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        expect(Notification.generate.mock.calls[0][0]).toBe('Successful Payment');
      });
    });

    describe('when client has cancelled the subscription', () => {
      let client;
      let billing;
      let contractsCount;
      let createdAt;
      let catalogueCount;
      beforeEach(async () => {
        createdAt = moment().subtract(150, 'days').format();
        billing = { billingType: 'Card', amount: testUtils.randomInt(), stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
        contractsCount = 10;
        catalogueCount = 10;
        client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
      });

      it('should charge not the client', async () => {
        // Arrange
        const ignoreLastPaymentFailure = false;
        // Act
        try {
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
        } catch (err) {
          expect(err.message).toBe('Subscription cancelled');
        }
      });
    });

    describe('when it\'s a \'pro\' client', () => {
      describe('case 1', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 50;
          catalogueCount = 1000;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Pro';
        });

        it('should charge the client 150', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(150);
        });
      });

      describe('case 2', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 87;
          catalogueCount = 1322;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Pro';
        });

        it('should charge the client 190', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(190);
        });
      });

      describe('case 3', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 312;
          catalogueCount = 2311;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Pro';
        });

        it('should charge the client 490', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(490);
        });
      });
    });

    describe('when it\'s a \'lite\' client (Label)', () => {
      describe('case 1', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 12;
          catalogueCount = 98;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Lite';
          client.clientType = 'Label';
        });

        it('should charge the client 20', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(20);
        });
      });

      describe('case 2', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 34;
          catalogueCount = 123;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Lite';
          client.clientType = 'Label';
        });

        it('should charge the client 60', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(60);
        });
      });

      describe('case 3', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 121;
          catalogueCount = 232;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Lite';
          client.clientType = 'Label';
        });

        it('should charge the client 180', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(180);
        });
      });
    });

    describe('when it\'s a \'lite\' client (Pubslishing)', () => {
      describe('case 1', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 12;
          catalogueCount = 280;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Lite';
          client.clientType = 'Publisher';
        });

        it('should charge the client 20', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(20);
        });
      });

      describe('case 2', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 34;
          catalogueCount = 350;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Lite';
          client.clientType = 'Publisher';
        });

        it('should charge the client 60', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(60);
        });
      });

      describe('case 3', () => {
        let client;
        let billing;
        let contractsCount;
        let createdAt;
        let catalogueCount;
        beforeEach(async () => {
          createdAt = moment().subtract(150, 'days').format();
          billing = { billingType: 'Card', stripeCustomerId, stripePaymentMethod, lastPaymentDate: moment().subtract(40, 'days').format() };
          contractsCount = 121;
          catalogueCount = 500;
          client = await generateClient(billing, createdAt, contractsCount, catalogueCount);
          client.paymentTier = 'Lite';
          client.clientType = 'Publisher';
        });

        it('should charge the client 180', async () => {
          // Arrange
          const ignoreLastPaymentFailure = false;
          // Act
          await Billing.chargeClient(client, curveUser, ignoreLastPaymentFailure);
          const invoice = await Invoice.findOne({ clientId: client._id.toString() });
          expect(invoice.usage.amount).toBe(180);
        });
      });
    });
  });
});

const generateClient = async (billing, createdAt, contractsCount, catalogueCount) => {
  const client = new Client({ name: testUtils.randomString(), billing, createdAt, createdBigQueryTables: true, createdBigQueryBackups: true, issueIdentifier: false });
  await client.save();
  createdClientIds.push(client._id.toString());
  const randomCatalogueCount = generateRandomCatalogueCount(catalogueCount);
  const releases = []; const tracks = []; const works = []; const contracts = [];
  for (let index = 0; index < randomCatalogueCount[0]; index += 1) { releases.push({ clientId: client._id.toString() }); }
  for (let index = 0; index < randomCatalogueCount[1]; index += 1) { tracks.push({ clientId: client._id.toString(), isrc: testUtils.randomString() }); }
  for (let index = 0; index < randomCatalogueCount[2]; index += 1) { works.push({ clientId: client._id.toString(), title: testUtils.randomString() }); }
  for (let index = 0; index < contractsCount; index += 1) { contracts.push({ clientId: client._id.toString(), name: testUtils.randomString() }); }

  await Release.insertMany(releases);
  await Track.insertMany(tracks);
  await Work.insertMany(works);
  await Contract.insertMany(contracts);

  return client;
};

function generateRandomCatalogueCount(total) {
  let arr = new Array(3);
  let sum = 0;
  do {
    for (let i = 0; i < 3; i += 1) { arr[i] = Math.random(); }
    sum = arr.reduce((acc, val) => acc + val, 0);
    const scale = (total - 3) / sum;
    arr = arr.map((val) => Math.min(1000, Math.round(val * scale) + 1));
    sum = arr.reduce((acc, val) => acc + val, 0);
  } while (sum - total);
  return arr;
}
