/* eslint-disable max-len */
const { logger, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const jwt = require('jsonwebtoken');
const { randomString, randomId, randomBoolean, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const supertest = require('supertest');
const config = require('../../config.json');
const PaymentController = require('../../controllers/payment/payment');

const Client = require('../../models/client');
const Contract = require('../../models/contract');
const DeliveryProfile = require('../../models/deliveryProfile');
const Import = require('../../models/import');
const ImportPartner = require('../../models/importPartner');
const Notification = require('../../models/notification');
const Payee = require('../../models/payee');
const Payment = require('../../models/payment');
const PaymentGroup = require('../../models/paymentGroup');
const Release = require('../../models/release');
const Statement = require('../../models/statement');
const Task = require('../../models/task');
const Track = require('../../models/track');
const User = require('../../models/user');
const Work = require('../../models/work');

const server = supertest(require('../../index'));

describe('/clients', function () {
  logger.info('>>>file>>>> routes/clients .....................');

  const applicationToken = config.applicationTokens[0];
  const unknownObjectId = '5ff35cdd382af5001071ffee';
  const payeeId = randomId();
  const contractId = randomId();
  const contractIds = [contractId, randomId()];

  let client; let user; let userAdded; let userUpdated; let payee; let payeeNoUser; let contract; let statement; let paymentGroup; let payment;
  let paymentGroupValidationFailed; let paymentGroupSubmissionFailed;
  let paymentValidationFailed; let paymentSubmissionFailed;
  let baseUser; let userFull; let clientUserFull; let userNone; let clientUserNone; let userView; let clientUserView; let userEdit; let clientUserEdit;
  let clientUserFull2; let userInternal; let clientUserInternal; let userParent; let clientUserParent; let userPayee; let clientUserPayee; let paymentUUID;
  let clientUserAdminInternal;
  const mockEmailAdded = randomString();
  const mockEmailUpdated = randomString();

  beforeAll(async () => {
    client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
      suppressZeroTaxLine: randomBoolean(),
      feesInvoiceCustomText: randomString(),
      customFeesInvoiceTitle: randomString(),
      catalogueGroups: ['cat group'],
      cancelledSubscription: false,
      eventTriggeredNotifications: {
        payeePaymentDetailsAdded: [mockEmailAdded],
        payeePaymentDetailsUpdated: [mockEmailUpdated],
        paymentFailed: [mockEmailUpdated],
        fundsAdded: [mockEmailUpdated],
      },
      ackFtpIngestions: [{ fileKey: null, host: 'test.com' }],
    });
    await client.save();

    payee = new Payee({ clientId: client._id, name: 'Payee 1', iban: 'AB22689556566666' });
    await payee.save();

    payeeNoUser = new Payee({ clientId: client._id, name: randomString(), iban: 'AB22689556566666' });
    await payeeNoUser.save();

    user = new User({ email: randomString(), payeeIds: [payee._id.toString()] });
    await user.save();

    userAdded = new User({ email: mockEmailAdded });
    await userAdded.save();

    userUpdated = new User({ email: mockEmailUpdated });
    await userUpdated.save();

    contract = new Contract({ clientId: client._id, payeeId: payee._id, name: 'Contract 1', currency: 'GBP' });
    await contract.save();

    statement = new Statement({ clientId: client._id, name: 'Statement 1', contractId: contract._id, analysis: 'analysis' });
    await statement.save();

    paymentGroup = new PaymentGroup({ clientId: client._id, name: 'Payment Group 1' });
    await paymentGroup.save();

    payment = new Payment({
      clientId: client._id,
      name: 'Payment 1',
      contractId: contract._id,
      statementId: statement._id,
      payeeId: payee._id,
      paymentGroupId: paymentGroup._id,
      amount: randomInt(),
      currency: 'GBP',
      status: '',
      error: randomString(),
      uuid: randomId().toString(),
    });
    await payment.save();
    paymentUUID = payment.uuid;

    paymentGroupSubmissionFailed = new PaymentGroup({ clientId: client._id, name: 'Payment Group 1' });
    await paymentGroupSubmissionFailed.save();

    paymentSubmissionFailed = new Payment({
      clientId: client._id,
      name: 'Payment 1',
      contractId: contract._id,
      statementId: statement._id,
      payeeId: payee._id,
      paymentGroupId: paymentGroupSubmissionFailed._id,
      amount: randomInt(),
      currency: 'GBP',
      status: '',
      error: randomString(),
      uuid: randomId().toString(),
    });
    await paymentSubmissionFailed.save();

    paymentGroupValidationFailed = new PaymentGroup({ clientId: client._id, name: 'Payment Group 1' });
    await paymentGroupValidationFailed.save();

    paymentValidationFailed = new Payment({
      clientId: client._id,
      name: 'Payment 1',
      contractId: contract._id,
      statementId: statement._id,
      payeeId: payee._id,
      paymentGroupId: paymentGroupValidationFailed._id,
      amount: randomInt(),
      currency: 'GBP',
      status: '',
      error: randomString(),
      uuid: randomId().toString(),
    });
    await paymentValidationFailed.save();

    baseUser = { id: user._id, internal: false, parentId: null, clientId: client._id, email: 'test-upload@curve.com', rights: {} };
    userFull = { ...baseUser, rights: { [client._id]: { periods: 'Edit' } } };
    clientUserFull = jwt.sign(userFull, process.env.jsonSecretToken, { expiresIn: 86400 });
    userNone = { ...baseUser, rights: { [client._id]: { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' } } };
    clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
    userView = { ...baseUser, rights: { [client._id]: { periods: 'View' } } };
    clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
    userEdit = { ...baseUser, rights: { [client._id]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' } } };
    clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserFull2 = jwt.sign({ ...userEdit, rights: { [client._id]: { ...userEdit.rights[client._id], admin: true } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    userInternal = { ...baseUser, internal: true, rights: {} };
    clientUserInternal = jwt.sign(userInternal, process.env.jsonSecretToken, { expiresIn: 86400 });
    userParent = { ...baseUser, internal: false, parentId: 'parentId', rights: {} };
    clientUserParent = jwt.sign(userParent, process.env.jsonSecretToken, { expiresIn: 86400 });
    userPayee = { ...baseUser, internal: false, payeeId: payee._id, contractIds, rights: {} };
    clientUserPayee = jwt.sign({ ...userPayee, payeeId }, process.env.jsonSecretToken, { expiresIn: 86400 });
    const userAdminInternal = { ...baseUser, internal: true, rights: { [client._id]: { admin: true } } };
    clientUserAdminInternal = jwt.sign(userAdminInternal, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  describe('as a client user with full rights', () => {
    describe('/:id GET', () => {
      it('should return data and 200 status', async () => {
        const res = await server
          .get(`/clients/${client._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body._id).toBe(client._id.toString());
        expect(res.body.name).toBe(client.name);
        expect(res.body.suppressZeroTaxLine).toBe(client.suppressZeroTaxLine);
        expect(res.body.feesInvoiceCustomText).toBe(client.feesInvoiceCustomText);
        expect(res.body.customFeesInvoiceTitle).toBe(client.customFeesInvoiceTitle);
      });

      it('should return a 404 status when not found', async () => {
        const res = await server
          .get(`/clients/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });

    describe('/:id/ftp_key_file POST', () => {
      it('should return data and 200 status for catalogue', async () => {
        fileManager.uploadToS3 = jest.fn().mockImplementation((file, key, callback) => callback(null, file));
        const dummyFileBuffer = Buffer.from('dummy file content');
        const res = await server
          .post(`/clients/${client._id}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .attach('file', dummyFileBuffer, 'testfile.txt');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File upload done');
        expect(res.body.client._id).toBeDefined();
        expect(res.body.client.ftpFileKey).toBe(`clients/${client._id.toString()}/catalogue/testfile.txt`);
      });

      it('should return data and 200 status for ack ingestion', async () => {
        fileManager.uploadToS3 = jest.fn().mockImplementation((file, key, callback) => callback(null, file));
        const dummyFileBuffer = Buffer.from('dummy file content');
        const res = await server
          .post(`/clients/${client._id}/ftp_key_file?ackFtpIngestionIndex=0`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .attach('file', dummyFileBuffer, 'testfile.txt');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File upload done');
        expect(res.body.client._id).toBeDefined();
        expect(res.body.client.ackFtpIngestions[0].fileKey).toBe(`clients/${client._id.toString()}/ackFtpIngestions/0/testfile.txt`);
      });

      it('should return a 404 status when client not found', async () => {
        const dummyFileBuffer = Buffer.from('dummy file content');
        const res = await server
          .post(`/clients/${unknownObjectId}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .attach('file', dummyFileBuffer, 'testfile.txt');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });

      it('should return a 400 status when when no file found', async () => {
        const res = await server
          .post(`/clients/${unknownObjectId}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Requires a file to be uploaded');
      });
    });

    describe('/:id/ftp_key_file DELETE', () => {
      it('should return data and 200 status', async () => {
        fileManager.deleteFromS3 = jest.fn().mockImplementation((key, callback) => callback(null));
        const res = await server
          .delete(`/clients/${client._id}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File delete done');
      });

      it('should return data and 200 status', async () => {
        fileManager.deleteFromS3 = jest.fn().mockImplementation((key, callback) => callback(null));
        const res = await server
          .delete(`/clients/${client._id}/ftp_key_file?ackFtpIngestionIndex=0`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File delete done');
      });

      it('should return a 404 status when client not found', async () => {
        const res = await server
          .delete(`/clients/${unknownObjectId}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });
  });

  describe('as a user with None rights', () => {
    describe('/:id GET', () => {
      it('should return data and 200 status', async () => {
        const res = await server
          .get(`/clients/${client._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body._id).toBe(client._id.toString());
        expect(res.body.name).toBe(client.name);
        expect(res.body.suppressZeroTaxLine).toBe(client.suppressZeroTaxLine);
        expect(res.body.feesInvoiceCustomText).toBe(client.feesInvoiceCustomText);
        expect(res.body.customFeesInvoiceTitle).toBe(client.customFeesInvoiceTitle);
      });

      it('should return a 404 status when not found', async () => {
        const res = await server
          .get(`/clients/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });
  });

  describe('as a user with View rights', function () {
    describe('/:id GET', () => {
      it('should return data and 200 status', async () => {
        const res = await server
          .get(`/clients/${client._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body._id).toBe(client._id.toString());
        expect(res.body.name).toBe(client.name);
        expect(res.body.suppressZeroTaxLine).toBe(client.suppressZeroTaxLine);
        expect(res.body.feesInvoiceCustomText).toBe(client.feesInvoiceCustomText);
        expect(res.body.customFeesInvoiceTitle).toBe(client.customFeesInvoiceTitle);
      });

      it('should return a 404 status when not found', async () => {
        const res = await server
          .get(`/clients/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });
  });

  describe('as a user with Edit rights', function () {
    describe('/:id GET', () => {
      it('should return data and 200 status', async () => {
        const res = await server
          .get(`/clients/${client._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body._id).toBe(client._id.toString());
        expect(res.body.name).toBe(client.name);
        expect(res.body.suppressZeroTaxLine).toBe(client.suppressZeroTaxLine);
        expect(res.body.feesInvoiceCustomText).toBe(client.feesInvoiceCustomText);
        expect(res.body.customFeesInvoiceTitle).toBe(client.customFeesInvoiceTitle);
      });

      it('should return a 404 status when not found', async () => {
        const res = await server
          .get(`/clients/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });

    describe('/:id PUT', () => {
      describe('update category groups', () => {
        it('should add a new category group to the client', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });

          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');
        });

        it('should remove catalogue group if it\'s unused', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });

          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).not.toContain('Cat group 1');
        });

        it('should error when removing a catalogue group that\'s being used in contracts', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const contract = new Contract({
            clientId: client._id,
            name: randomString(),
            active: randomBoolean(),
            foreignId: randomString(),
            projectId: randomString(),
            licenseNo: randomString(),
            currency: randomString(),
            type: randomString(),
            salesTerms: [{
              catType: 'All',
              catalogueGroup: 'Cat group 1',
              territory: 'WW',
              channel: 'All',
              configuration: 'All',
              priceCategory: 'All',
              source: 'All',
              escalationTrackers: [],
              type: 'Net Receipts',
              rate: 20,
              escalations: [],
            }],
          });

          await contract.save();
          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Contract(s)');
          await Contract.findByIdAndDelete(contract._id);
        });

        it('should error when removing a catalogue group that\'s being used in Delivery Profile', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const deliveryProfile = new DeliveryProfile({
            clientId: client._id,
            name: randomString(),
            territory: 'WW',
            catalogueGroups: ['Cat group 1'],
          });
          await deliveryProfile.save();

          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Delivery Profile(s)');
          await DeliveryProfile.findByIdAndDelete(deliveryProfile._id);
        });

        it('should error when removing a catalogue group that\'s being used in Imports', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const imp = new Import({
            clientId: client._id,
            name: randomString(),
            defaults: { catalogueGroups: ['Cat group 1'] },
          });
          await imp.save();

          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Import(s)');
          await Import.findByIdAndDelete(imp._id);
        });

        it('should error when removing a catalogue group that\'s being used in Import Partners', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const importPartner = new ImportPartner({
            clientId: client._id,
            name: randomString(),
            defaults: { catalogueGroups: ['Cat group 1'] },
          });
          await importPartner.save();

          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Import Partner(s)');
          await ImportPartner.findByIdAndDelete(importPartner._id);
        });

        it('should error when removing a catalogue group that\'s being used in Releases', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const release = new Release({
            clientId: client._id,
            title: randomString(),
            catalogueGroups: ['Cat group 1'],
          });
          await release.save();

          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Release(s)');
          await Release.findByIdAndDelete(release._id);
        });

        it('should error when removing a catalogue group that\'s being used in Tracks', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const track = new Track({
            clientId: client._id,
            title: randomString(),
            catalogueGroups: ['Cat group 1'],
          });
          await track.save();

          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Track(s)');
          await Track.findByIdAndDelete(track._id);
        });

        it('should error when removing a catalogue group that\'s being used in Tracks', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const work = new Work({
            clientId: client._id,
            title: randomString(),
            catalogueGroups: ['Cat group 1'],
          });
          await work.save();

          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Work(s)');
          await Work.findByIdAndDelete(work._id);
        });

        it('should error when removing a catalogue group that\'s being used in multiple places', async () => {
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: ['Cat group 1'] });
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(client._id.toString());
          expect(res.body.name).toBe(client.name);
          expect(res.body.catalogueGroups).toContain('Cat group 1');

          const work = new Work({
            clientId: client._id,
            title: randomString(),
            catalogueGroups: ['Cat group 1'],
          });
          await work.save();

          const release = new Release({
            clientId: client._id,
            title: randomString(),
            catalogueGroups: ['Cat group 1'],
          });
          await release.save();

          const importPartner = new ImportPartner({
            clientId: client._id,
            name: randomString(),
            defaults: {
              catalogueGroups: ['Cat group 1'],
            },
          });
          await importPartner.save();

          const res2 = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ catalogueGroups: [''] });
          expect(res2.status).toBe(400);
          expect(res2.body.message).toBe('The Catalogue Group cannot be deleted as its used in existing Import Partner(s), Release(s), Work(s)');
          await Work.findByIdAndDelete(work._id);
          await Release.findByIdAndDelete(release._id);
          await ImportPartner.findByIdAndDelete(importPartner._id);
        });
      });

      describe('field access control', () => {
        it('should set companyName when it was previously undefined on the client', async () => {
          const companyName = randomString();
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ companyName });

          expect(res.status).toBe(200);
          expect(res.body.companyName).toBe(companyName);

          const updated = await Client.findById(client._id);
          expect(updated.companyName).toBe(companyName);
        });

        it('should update companyName when it already has a value', async () => {
          await Client.findByIdAndUpdate(client._id, { companyName: 'Old Name' });

          const newName = randomString();
          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ companyName: newName });

          expect(res.status).toBe(200);
          expect(res.body.companyName).toBe(newName);
        });

        it('should not update a restricted field (bigQueryDataset)', async () => {
          const original = await Client.findById(client._id);

          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserInternal)
            .send({ bigQueryDataset: 'hacked-dataset' });

          expect(res.status).toBe(200);
          const updated = await Client.findById(client._id);
          expect(updated.bigQueryDataset).toBe(original.bigQueryDataset);
        });

        it('should not update an internal-only field (features) when not internal', async () => {
          await Client.findByIdAndUpdate(client._id, { 'features.payments': false });

          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ features: { payments: true } });

          expect(res.status).toBe(200);
          const updated = await Client.findById(client._id);
          expect(updated.features.payments).toBe(false);
        });

        it('should update an internal-only field (features) when internal', async () => {
          await Client.findByIdAndUpdate(client._id, { 'features.payments': false });

          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserInternal)
            .send({ features: { payments: true } });

          expect(res.status).toBe(200);
          const updated = await Client.findById(client._id);
          expect(updated.features.payments).toBe(true);

          // reset
          await Client.findByIdAndUpdate(client._id, { 'features.payments': false });
        });

        it('should update configurations', async () => {
          const newConfigurations = ['Download', 'Stream', 'Performance'];

          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ configurations: newConfigurations });

          expect(res.status).toBe(200);
          const updated = await Client.findById(client._id);
          expect(updated.configurations).toEqual(newConfigurations);
        });

        it('should update accountingPeriodTypes', async () => {
          const newAccountingPeriodTypes = ['Yearly', 'Quarterly'];

          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull2)
            .send({ accountingPeriodTypes: newAccountingPeriodTypes });

          expect(res.status).toBe(200);
          const updated = await Client.findById(client._id);
          expect(updated.accountingPeriodTypes).toEqual(newAccountingPeriodTypes);
        });

        it('should return 403 when user only has catalogue Edit right (missing contracts, periods, sales)', async () => {
          const catalogueOnlyToken = jwt.sign(
            { ...baseUser, clientId: client._id, rights: { [client._id]: { catalogue: 'Edit' } } },
            process.env.jsonSecretToken,
            { expiresIn: 86400 },
          );

          const res = await server
            .put(`/clients/${client._id}`)
            .set('applicationToken', applicationToken)
            .set('token', catalogueOnlyToken)
            .send({ configurations: ['Download', 'Stream'] });

          expect(res.status).toBe(403);
        });
      });
    });

    describe('/:id/ftp_key_file POST', () => {
      it('should return data and 200 status for catalogue', async () => {
        fileManager.uploadToS3 = jest.fn().mockImplementation((file, key, callback) => callback(null, file));
        const dummyFileBuffer = Buffer.from('dummy file content');
        const res = await server
          .post(`/clients/${client._id}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .attach('file', dummyFileBuffer, 'testfile.txt');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File upload done');
        expect(res.body.client._id).toBeDefined();
        expect(res.body.client.ftpFileKey).toBe(`clients/${client._id.toString()}/catalogue/testfile.txt`);
      });

      it('should return data and 200 status for ack ingestion', async () => {
        fileManager.uploadToS3 = jest.fn().mockImplementation((file, key, callback) => callback(null, file));
        const dummyFileBuffer = Buffer.from('dummy file content');
        const res = await server
          .post(`/clients/${client._id}/ftp_key_file?ackFtpIngestionIndex=0`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .attach('file', dummyFileBuffer, 'testfile.txt');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File upload done');
        expect(res.body.client._id).toBeDefined();
        expect(res.body.client.ackFtpIngestions[0].fileKey).toBe(`clients/${client._id.toString()}/ackFtpIngestions/0/testfile.txt`);
      });

      it('should return a 404 status when client not found', async () => {
        const dummyFileBuffer = Buffer.from('dummy file content');
        const res = await server
          .post(`/clients/${unknownObjectId}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .attach('file', dummyFileBuffer, 'testfile.txt');

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });

      it('should return a 400 status when when no file found', async () => {
        const res = await server
          .post(`/clients/${unknownObjectId}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Requires a file to be uploaded');
      });
    });

    describe('/:id/ftp_key_file DELETE', () => {
      it('should return data and 200 status', async () => {
        fileManager.deleteFromS3 = jest.fn().mockImplementation((key, callback) => callback(null));
        const res = await server
          .delete(`/clients/${client._id}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File delete done');
      });

      it('should return data and 200 status', async () => {
        fileManager.deleteFromS3 = jest.fn().mockImplementation((key, callback) => callback(null));
        const res = await server
          .delete(`/clients/${client._id}/ftp_key_file?ackFtpIngestionIndex=0`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('File delete done');
      });

      it('should return a 404 status when client not found', async () => {
        const res = await server
          .delete(`/clients/${unknownObjectId}/ftp_key_file`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });
  });

  describe('as an internal user', function () {
    describe('/:id GET', () => {
      it('should return data and 200 status', async () => {
        const res = await server
          .get(`/clients/${client._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body._id).toBe(client._id.toString());
        expect(res.body.name).toBe(client.name);
        expect(res.body.suppressZeroTaxLine).toBe(client.suppressZeroTaxLine);
        expect(res.body.feesInvoiceCustomText).toBe(client.feesInvoiceCustomText);
        expect(res.body.customFeesInvoiceTitle).toBe(client.customFeesInvoiceTitle);
      });

      it('should return a 404 status when not found', async () => {
        const res = await server
          .get(`/clients/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });

    describe('/:id PUT', () => {
      describe('Cancel subscription', () => {
        let work1;

        beforeEach(async () => {
          work1 = new Work({ clientId: client._id, title: 'Work 1', invoiceNo: 'InvoiceNo1', file: 'File1', catalogueGroups: ['cat group'] });
          await work1.save();
        });

        it('should return data and 200 status when cancelling subscription', async () => {
          const res = await server
            .put(`/clients/${client._id}?clientBilling=true`)
            .send({ cancelledSubscription: true })
            .set('applicationToken', applicationToken)
            .set('token', clientUserInternal);

          expect(res.status).toBe(200);
          const updatedClient = await Client.findOne(client._id);
          expect(updatedClient.cancelledSubscription).toBeTruthy();
        });
      });
    });
  });

  describe('as a parent user without a client', function () {
    describe('/:id GET', () => {
      it('should return data and 200 status', async () => {
        const res = await server
          .get(`/clients/${client._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body._id).toBe(client._id.toString());
        expect(res.body.name).toBe(client.name);
        expect(res.body.suppressZeroTaxLine).toBe(client.suppressZeroTaxLine);
        expect(res.body.feesInvoiceCustomText).toBe(client.feesInvoiceCustomText);
        expect(res.body.customFeesInvoiceTitle).toBe(client.customFeesInvoiceTitle);
      });

      it('should return a 404 status when not found', async () => {
        const res = await server
          .get(`/clients/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });
    });
  });

  describe('as a payee user', () => {
    describe('/:id GET', () => {
      it('should return a 403 status and forbidden', async () => {
        const res = await server
          .get(`/clients/${client._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('as a payments webhook user', function () {
    beforeEach(() => {
      PaymentController.validCurvePayHmac = jest.fn(() => false);
    });

    it('should return 403 on hmac header validation failure', async () => {
      const hmacHeader = randomString();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader);

      expect(res.status).toBe(403);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 500 payment not found if unique request id is invalid', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1/payment-failed',
        source: 'webhook',
        detail: {
          referrer_client_id: randomId().toString(),
          unique_request_id: randomId().toString(),
        },
      };

      PaymentController.validCurvePayHmac = jest.fn(() => true);
      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(500);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe(`Payment not found: UUID ${webhookBody.detail.unique_request_id}`);
    });

    it('old payment success event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1/payment-success',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentUpdated = await Payment.findById(payment._id);
      expect(paymentUpdated.status).toBe('Paid');

      const paymentGroupUpdated = await PaymentGroup.findById(paymentUpdated.paymentGroupId);
      expect(paymentGroupUpdated.status).toBe('Fully Paid');
    });

    it('old payment failed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1/payment-failed',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
          failure_reason: 'Insufficient Funds',
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentUpdated = await Payment.findById(payment._id);
      expect(paymentUpdated.status).toBe('Payment Error');
      expect(paymentUpdated.error).toBe('Insufficient Funds');
      paymentUUID = paymentUpdated.uuid;

      const paymentGroupUpdated = await PaymentGroup.findById(paymentUpdated.paymentGroupId);
      expect(paymentGroupUpdated.status).toBe('Unpaid');
    });

    it('payment failed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.failed',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
          failure: { code: 'insufficient_funds' },
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentUpdated = await Payment.findById(payment._id);
      expect(paymentUpdated.status).toBe('Payment Error');
      expect(paymentUpdated.error).toBe('Insufficient Funds');
      paymentUUID = paymentUpdated.uuid;

      const paymentGroupUpdated = await PaymentGroup.findById(paymentUpdated.paymentGroupId);
      expect(paymentGroupUpdated.status).toBe('Unpaid');
    });

    it('validation failed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.validation.failed',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
          failure: { code: 'INVALID_CARD' },
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentUpdated = await Payment.findById(payment._id);
      expect(paymentUpdated.status).toBe('Payment Error');
      expect(paymentUpdated.error).toBe('Invalid Card');
      paymentUUID = paymentUpdated.uuid;

      const paymentGroupUpdated = await PaymentGroup.findById(paymentUpdated.paymentGroupId);
      expect(paymentGroupUpdated.status).toBe('Unpaid');
    });

    it('submitted payment event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.submitted',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
          destination_amount: 100,
          destination_currency: 'USD',
          exchange_rate: 1.1,
          client_exchange_rate: 1.09,
          payment_method: 'Credit Card',
          fee_amount: 2.5,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentUpdated = await Payment.findById(payment._id);
      expect(paymentUpdated.paymentDetails).toEqual({
        destinationAmount: 100,
        destinationCurrency: 'USD',
        conversionRate: 1.1,
        clientExchangeRate: 1.09,
        paymentMethod: 'Credit Card',
        fees: 2.5,
      });

      const paymentGroupUpdated = await PaymentGroup.findById(paymentUpdated.paymentGroupId);
      expect(paymentGroupUpdated.status).toBe('Unpaid');
    });

    it('submissionFailed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.submission.failed',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
          failure: { code: 'network_issue' },
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentUpdated = await Payment.findById(payment._id);
      expect(paymentUpdated.status).toBe('Payment Error');
      expect(paymentUpdated.error).toBe('Network Issue');
      paymentUUID = paymentUpdated.uuid;
      const paymentGroupUpdated = await PaymentGroup.findById(paymentUpdated.paymentGroupId);
      expect(paymentGroupUpdated.status).toBe('Unpaid');
    });

    it('payment completed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.completed',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentUpdated = await Payment.findById(payment._id);
      expect(paymentUpdated.status).toBe('Paid');
      expect(paymentUpdated.error).toBe('');

      const paymentGroupUpdated = await PaymentGroup.findById(paymentUpdated.paymentGroupId);
      expect(paymentGroupUpdated.status).toBe('Fully Paid');
    });

    it('should update PaymentGroup to Partially Paid when some payments are paid', async () => {
      // Create a second unpaid payment in the same PaymentGroup
      const unpaidPayment = new Payment({
        clientId: client._id,
        name: 'Payment 2',
        contractId: contract._id,
        statementId: statement._id,
        payeeId: payee._id,
        paymentGroupId: paymentGroup._id,
        amount: randomInt(),
        currency: 'GBP',
        status: 'Pending',
        uuid: randomId().toString(),
      });

      await unpaidPayment.save();

      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1/payment-success',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          unique_request_id: paymentUUID,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const paymentGroupUpdated = await PaymentGroup.findById(paymentGroup._id);
      expect(paymentGroupUpdated.status).toBe('Partially Paid');
    });

    it('should send payee notification on payee details created event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payee.created',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          referrer_payee_id: payee._id.toString(),
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(2);
      expect(Notification.generate.mock.calls[0][0]).toBe('Payment details updated');
      expect(Notification.generate.mock.calls[0][1]).toBe(`Your Payout Details were added for ${client.name}`);
      expect(Notification.generate.mock.calls[0][2]).toBe('#/paymentDetails');
      expect(Notification.generate.mock.calls[0][3]).toEqual({ clientId: client._id.toString(), email: user.email, id: user._id.toString() });

      const notifyCall = Notification.generate.mock.calls[0][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(user.email);
      expect(notifyCall.curveUser).toEqual({ id: user._id.toString(), clientId: client._id.toString(), email: user.email });
      expect(notifyCall.subject).toBe(`Your Payout Details were added for ${client.name}`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${payee.name},</div>
        <div>Your payment details have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${client.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`);
    });

    it('should only send client notification on payee details created event if payee user not found', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payee.created',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          referrer_payee_id: payeeNoUser._id.toString(),
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(1);

      expect(Notification.generate.mock.calls[0][0]).toBe('Payment details updated');
      expect(Notification.generate.mock.calls[0][1]).toBe(`Payout Details were added for ${payeeNoUser.name}`);
      expect(Notification.generate.mock.calls[0][2]).toBe(`#/payees/${payeeNoUser._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[0][3]).toEqual({ clientId: client._id.toString(), email: userAdded.email, id: userAdded._id.toString() });

      const notifyCall = Notification.generate.mock.calls[0][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(userAdded.email);
      expect(notifyCall.curveUser).toEqual({ id: userAdded._id.toString(), clientId: client._id.toString(), email: userAdded.email });
      expect(notifyCall.subject).toBe(`Payout Details were added for ${payeeNoUser.name}`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${client.name},</div>
        <div>The payout details for ${payeeNoUser.name} have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change and confirm the change with your payee if the recipient’s account name does not match what you are expecting.</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payeeNoUser._id.toString()}/edit">View Payee's Details</a></div>
        <br />`);
    });

    it('should send payee notification on payee details updated event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payee.updated',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          referrer_payee_id: payee._id.toString(),
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(2);
      expect(Notification.generate.mock.calls[0][0]).toBe('Payment details updated');
      expect(Notification.generate.mock.calls[0][1]).toBe(`Your Payout Details were updated for ${client.name}`);
      expect(Notification.generate.mock.calls[0][2]).toBe('#/paymentDetails');
      expect(Notification.generate.mock.calls[0][3]).toEqual({ clientId: client._id.toString(), email: user.email, id: user._id.toString() });

      const notifyCall = Notification.generate.mock.calls[0][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(user.email);
      expect(notifyCall.curveUser).toEqual({ id: user._id.toString(), clientId: client._id.toString(), email: user.email });
      expect(notifyCall.subject).toBe(`Your Payout Details were updated for ${client.name}`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${payee.name},</div>
        <div>Your payment details have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${client.name}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`);
    });

    it('should send client admin notification on payee details created event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payee.created',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          referrer_payee_id: payee._id.toString(),
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(2);
      expect(Notification.generate.mock.calls[1][0]).toBe('Payment details updated');
      expect(Notification.generate.mock.calls[1][1]).toBe(`Payout Details were added for ${payee.name}`);
      expect(Notification.generate.mock.calls[1][2]).toBe(`#/payees/${payee._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[1][3]).toEqual({ clientId: client._id.toString(), email: userAdded.email, id: userAdded._id.toString() });

      const notifyCall = Notification.generate.mock.calls[1][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(userAdded.email);
      expect(notifyCall.curveUser).toEqual({ id: userAdded._id.toString(), clientId: client._id.toString(), email: userAdded.email });
      expect(notifyCall.subject).toBe(`Payout Details were added for ${payee.name}`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${client.name},</div>
        <div>The payout details for ${payee.name} have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change and confirm the change with your payee if the recipient’s account name does not match what you are expecting.</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payee._id.toString()}/edit">View Payee's Details</a></div>
        <br />`);
    });

    it('should send client admin notification on payee details updated event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payee.updated',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          referrer_payee_id: payee._id.toString(),
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(2);
      expect(Notification.generate.mock.calls[1][0]).toBe('Payment details updated');
      expect(Notification.generate.mock.calls[1][1]).toBe(`Payout Details were updated for ${payee.name}`);
      expect(Notification.generate.mock.calls[1][2]).toBe(`#/payees/${payee._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[1][3]).toEqual({ clientId: client._id.toString(), email: userUpdated.email, id: userUpdated._id.toString() });

      const notifyCall = Notification.generate.mock.calls[1][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(userUpdated.email);
      expect(notifyCall.curveUser).toEqual({ id: userUpdated._id.toString(), clientId: client._id.toString(), email: userUpdated.email });
      expect(notifyCall.subject).toBe(`Payout Details were updated for ${payee.name}`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${client.name},</div>
        <div>The payout details for ${payee.name} have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change and confirm the change with your payee if the recipient’s account name does not match what you are expecting.</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payee._id.toString()}/edit">View Payee's Details</a></div>
        <br />`);
    });

    it('should not enable payments for client when kyc decision declined', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.kyc.decision',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          approved: false,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const clientUpdated = await Client.findById(client._id);
      expect(clientUpdated.features.payments).toBeFalsy();
      expect(clientUpdated.features.paymentDetails).toBeFalsy();
    });

    it('should enable payments for client when kyc decision approved', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.kyc.decision',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          approved: true,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const clientUpdated = await Client.findById(client._id);
      expect(clientUpdated.features.payments).toBeTruthy();
      expect(clientUpdated.features.paymentDetails).toBeTruthy();
    });

    it('should not enable payments for unknown client when kyc decision approved', async () => {
      const hmacHeader = randomString();
      const unknownClientId = randomId().toString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.kyc.decision',
        source: 'webhook',
        detail: {
          referrer_client_id: unknownClientId,
          approved: true,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      const clientUpdated = await Client.findById(unknownClientId);
      expect(clientUpdated).toBeNull();
    });

    it('should send payee and client admin notification on payment failed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.failed',
        source: 'webhook',
        detail: {
          unique_request_id: payment.uuid,
          referrer_client_id: client._id.toString(),
          failure: { message: 'Insufficient Funds' },
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();
      Payment.findOne = jest.fn().mockResolvedValue(payment);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(2);

      expect(Notification.generate.mock.calls[0][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[0][1]).toBe(`A Payment Attempt from ${client.name} has Failed`);
      expect(Notification.generate.mock.calls[0][2]).toBe('#/paymentDetails');
      expect(Notification.generate.mock.calls[0][3]).toEqual({ clientId: client._id.toString(), email: user.email, id: user._id.toString() });

      const notifyCallPayee = Notification.generate.mock.calls[0][4];
      expect(notifyCallPayee.identifier).toBe('genericEmail');
      expect(notifyCallPayee.email).toBe(user.email);
      expect(notifyCallPayee.curveUser).toEqual({ id: user._id.toString(), clientId: client._id.toString(), email: user.email });
      expect(notifyCallPayee.subject).toBe(`A Payment Attempt from ${client.name} has Failed`);
      expect(notifyCallPayee.mainText).toBe(`<div>Hi ${payee.name},</div>
        <div>A payment attempt of ${payment.currency}${payment.amount} to you for ${payment.name} from ${client.name} recently failed.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div>Please review and update your details so that you continue to receive future royalty payments successfully.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View your payment details</a></div>
        <br />
        <div>Why did the payment fail? In most cases, a payment might fail because:</div>
        <div>1. Your bank account has been closed</div>
        <div>2. Your payment details were entered incorrectly</div>
        <div>3. Your bank account or address is based in a restricted territory</div>
        <div>4. The currency sent was not supported by your bank account</div>
        <br />`);

      expect(Notification.generate.mock.calls[1][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[1][1]).toBe(`A Payment to ${payee.name} has Failed`);
      expect(Notification.generate.mock.calls[1][2]).toBe(`#/payees/${payee._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[1][3]).toEqual({ clientId: client._id.toString(), email: userUpdated.email, id: userUpdated._id.toString() });

      const notifyCallClient = Notification.generate.mock.calls[1][4];
      expect(notifyCallClient.identifier).toBe('genericEmail');
      expect(notifyCallClient.email).toBe(userUpdated.email);
      expect(notifyCallClient.curveUser).toEqual({ id: userUpdated._id.toString(), clientId: client._id.toString(), email: userUpdated.email });
      expect(notifyCallClient.subject).toBe(`A Payment to ${payee.name} has Failed`);
      expect(notifyCallClient.mainText).toBe(`<div>Hi ${client.name},</div>
        <div>We could not process your payment of ${payment.currency}${payment.amount} to ${payee.name} for ${payment.name}.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payee._id.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail? In most cases, a payment might fail because:</div>
        <div>1. The payee's bank account has been closed</div>
        <div>2. The payee's payout details were incorrect</div>
        <div>3. The payee’s account or address is in a restricted territory</div>
        <div>4. The currency sent was not supported by the payee's bank account</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${payment._id.toString()}/edit?paymentGroupId=${paymentGroup._id.toString()}">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`);
    });

    it('should send client admin notification on payment validation failed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.validation.failed',
        source: 'webhook',
        detail: {
          unique_request_id: payment.uuid,
          payment_id: payment._id.toString(),
          referrer_client_id: client._id.toString(),
          failure: { message: 'Insufficient Funds' },
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();
      Payment.findOne = jest.fn().mockResolvedValue(paymentValidationFailed);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(Notification.generate.mock.calls[0][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[0][1]).toBe(`A Payment to ${payee.name} has Failed Validation`);
      expect(Notification.generate.mock.calls[0][2]).toBe(`#/payees/${payee._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[0][3]).toEqual({ clientId: client._id.toString(), email: userUpdated.email, id: userUpdated._id.toString() });

      const notifyCall = Notification.generate.mock.calls[0][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(userUpdated.email);
      expect(notifyCall.curveUser).toEqual({ id: userUpdated._id.toString(), clientId: client._id.toString(), email: userUpdated.email });
      expect(notifyCall.subject).toBe(`A Payment to ${payee.name} has Failed Validation`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${client.name},</div>
        <div>We could not process your payment of ${paymentValidationFailed.currency}${paymentValidationFailed.amount} to Payee 1 for ${paymentValidationFailed.name}.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payee._id.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail? In most cases, a payment might fail because:</div>
        <div>1. A payee’s payment details are missing.</div>
        <div>2. A payee needs admin verification.</div>
        <div>3. The payment appears to be a duplicate request.</div>
        <div>4. Your payment account has not been configured correctly.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${paymentValidationFailed._id.toString()}/edit?paymentGroupId=${paymentGroupValidationFailed._id.toString()}">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`);
    });

    it('should send client admin notification on payment submission failed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.payment.submission.failed',
        source: 'webhook',
        detail: {
          unique_request_id: payment.uuid,
          payment_id: payment._id.toString(),
          referrer_client_id: client._id.toString(),
          failure: { message: 'Insufficient Funds' },
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();
      Payment.findOne = jest.fn().mockResolvedValue(paymentSubmissionFailed);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(Notification.generate.mock.calls[0][0]).toBe('Payment failed');
      expect(Notification.generate.mock.calls[0][1]).toBe(`A Payment to ${payee.name} has Failed Submission`);
      expect(Notification.generate.mock.calls[0][2]).toBe(`#/payees/${payee._id.toString()}/edit`);
      expect(Notification.generate.mock.calls[0][3]).toEqual({ clientId: client._id.toString(), email: userUpdated.email, id: userUpdated._id.toString() });

      const notifyCall = Notification.generate.mock.calls[0][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(userUpdated.email);
      expect(notifyCall.curveUser).toEqual({ id: userUpdated._id.toString(), clientId: client._id.toString(), email: userUpdated.email });
      expect(notifyCall.subject).toBe(`A Payment to ${payee.name} has Failed Submission`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${client.name},</div>
        <div>We could not process your payment of ${paymentSubmissionFailed.currency}${paymentSubmissionFailed.amount} to Payee 1 for ${paymentSubmissionFailed.name}.</div>
        <div>The error received is as follows: Insufficient Funds</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payee._id.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail during submission? In most cases, a payment might fail because:</div>
        <div>1. You have insufficient balance to cover the payment, conversion, or fee.</div>
        <div>2. A payment partner is experiencing a temporary outage.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${paymentSubmissionFailed._id.toString()}/edit?paymentGroupId=${paymentGroupSubmissionFailed._id.toString()}">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`);
    });

    it('should send client admin notification on transaction completed event', async () => {
      const hmacHeader = randomString();
      const webhookBody = {
        id: randomId(),
        type: 'v1.transaction.completed',
        source: 'webhook',
        detail: {
          referrer_client_id: client._id.toString(),
          currency: 'USD',
          amount: 100,
          balance_amount: 1000,
        },
      };
      PaymentController.validCurvePayHmac = jest.fn(() => true);
      Notification.generate = jest.fn();
      Payment.findOne = jest.fn().mockResolvedValue(null);

      const res = await server
        .post('/clients/curvepay_webhook')
        .set('x-hmac-digest-sha-256', hmacHeader)
        .send(webhookBody);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Object);
      expect(res.body.message).toBe('Webhook request received');

      expect(Notification.generate).toHaveBeenCalledTimes(1);
      expect(Notification.generate.mock.calls[0][0]).toBe('Funds added');
      expect(Notification.generate.mock.calls[0][1]).toBe(`Funds Added to ${client.name} ${webhookBody.detail.currency} Balance`);
      expect(Notification.generate.mock.calls[0][2]).toBe('#/curvePay/balances');
      expect(Notification.generate.mock.calls[0][3]).toEqual({ id: userUpdated._id.toString(), clientId: client._id.toString(), email: userUpdated.email });

      const notifyCall = Notification.generate.mock.calls[0][4];
      expect(notifyCall.identifier).toBe('genericEmail');
      expect(notifyCall.email).toBe(userUpdated.email);
      expect(notifyCall.curveUser).toEqual({ id: userUpdated._id.toString(), clientId: client._id.toString(), email: userUpdated.email });
      expect(notifyCall.subject).toBe(`Funds Added to ${client.name} ${webhookBody.detail.currency} Balance`);
      expect(notifyCall.mainText).toBe(`<div>Hi ${client.name},</div>
        <div>Your account has been topped up with ${webhookBody.detail.currency}${webhookBody.detail.amount}, leaving you with a balance of ${webhookBody.detail.currency}${webhookBody.detail.balance_amount}.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/curvePay/balances">View Your Account Balances</a></div>
        <br />`);
    });
  });

  describe('/:id PUT - field access controls', () => {
    let putClient;
    let putClientUserAdminInternal;
    let putClientUserInternal;
    let putClientUserFull2;
    let putClientUserFull;
    let putClientUserStandardAccess;

    beforeAll(async () => {
      putClient = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true, cancelledSubscription: false });
      await putClient.save();

      putClientUserAdminInternal = jwt.sign(
        { ...baseUser, clientId: putClient._id, internal: true, rights: { [putClient._id]: { admin: true } } },
        process.env.jsonSecretToken,
        { expiresIn: 86400 },
      );
      putClientUserInternal = jwt.sign(
        { ...baseUser, clientId: putClient._id, internal: true, rights: {} },
        process.env.jsonSecretToken,
        { expiresIn: 86400 },
      );
      putClientUserFull2 = jwt.sign(
        { ...baseUser, clientId: putClient._id, rights: { [putClient._id]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit', admin: true } } },
        process.env.jsonSecretToken,
        { expiresIn: 86400 },
      );
      putClientUserFull = jwt.sign(
        { ...baseUser, clientId: putClient._id, rights: { [putClient._id]: { periods: 'Edit' } } },
        process.env.jsonSecretToken,
        { expiresIn: 86400 },
      );
      // All four edit rights but no admin flag — exercises hasStandardAccess
      putClientUserStandardAccess = jwt.sign(
        { ...baseUser, clientId: putClient._id, rights: { [putClient._id]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' } } },
        process.env.jsonSecretToken,
        { expiresIn: 86400 },
      );
    });

    describe('as an admin+internal user', () => {
      it('should update a regular field (name)', async () => {
        const newName = randomString();

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ name: newName });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.name).toBe(newName);
      });

      it('should NOT update RESTRICTED_FIELDS (createdBigQueryTables)', async () => {
        const before = await Client.findById(putClient._id);
        const originalValue = before.createdBigQueryTables;

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ createdBigQueryTables: !originalValue });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.createdBigQueryTables).toBe(originalValue);
      });

      it('should NOT update RESTRICTED_FIELDS (createdBigQueryBackups)', async () => {
        const before = await Client.findById(putClient._id);
        const originalValue = before.createdBigQueryBackups;

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ createdBigQueryBackups: !originalValue });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.createdBigQueryBackups).toBe(originalValue);
      });

      it('should NOT update RESTRICTED_FIELDS even when sending multiple fields', async () => {
        const newName = randomString();
        const before = await Client.findById(putClient._id);
        const originalBigQuery = before.createdBigQueryTables;

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ name: newName, createdBigQueryTables: !originalBigQuery });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.name).toBe(newName);
        expect(updated.createdBigQueryTables).toBe(originalBigQuery);
      });

      it('should update INTERNAL_ONLY_FIELDS (features)', async () => {
        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ features: { payments: true } });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.features.payments).toBe(true);
      });

      it('should update ADMIN_FIELDS (cancelledSubscription)', async () => {
        const res = await server
          .put(`/clients/${putClient._id}?clientBilling=true`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ cancelledSubscription: true });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.cancelledSubscription).toBe(true);

        // Reset
        await Client.findByIdAndUpdate(putClient._id, { cancelledSubscription: false });
      });
    });

    describe('INTERNAL_ONLY_FIELDS', () => {
      // Picks a random field from the INTERNAL_ONLY list each test run
      const SAMPLES = [
        { field: 'batchWorkers', nextValue: (v) => (v ?? 0) + 1 },
        { field: 'preventDeletion', nextValue: (v) => !v },
        { field: 'allowPeriodFilters', nextValue: (v) => !v },
      ];
      const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];

      it(`should allow an internal-only user (no admin) to update ${sample.field}`, async () => {
        const before = await Client.findById(putClient._id);
        const newValue = sample.nextValue(before[sample.field]);

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserInternal)
          .send({ [sample.field]: newValue });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated[sample.field]).toEqual(newValue);
      });

      it(`should NOT allow an admin-only user (no internal) to update ${sample.field}`, async () => {
        const before = await Client.findById(putClient._id);
        const newValue = sample.nextValue(before[sample.field]);

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserFull2)
          .send({ [sample.field]: newValue });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated[sample.field]).toEqual(before[sample.field]);
      });
    });

    describe('ADMIN_FIELDS', () => {
      // Picks a random field from the ADMIN list each test run
      const SAMPLES = [
        { field: 'cancelledSubscription', nextValue: (v) => !v },
      ];
      const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];

      it(`should allow an internal-only user (no admin) to update ${sample.field}`, async () => {
        const before = await Client.findById(putClient._id);
        const newValue = sample.nextValue(before[sample.field]);

        const res = await server
          .put(`/clients/${putClient._id}?clientBilling=true`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserInternal)
          .send({ [sample.field]: newValue });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated[sample.field]).toEqual(newValue);
      });

      it(`should allow an admin-only user (no internal) to update ${sample.field}`, async () => {
        const before = await Client.findById(putClient._id);
        const newValue = sample.nextValue(before[sample.field]);

        const res = await server
          .put(`/clients/${putClient._id}?clientBilling=true`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserFull2)
          .send({ [sample.field]: newValue });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated[sample.field]).toEqual(newValue);
      });
    });

    describe('RESTRICTED_FIELDS (additional tokens)', () => {
      // Picks a random field from the RESTRICTED list each test run
      const SAMPLES = [
        { field: 'createdBigQueryTables', nextValue: (v) => !v },
        { field: 'createdBigQueryBackups', nextValue: (v) => !v },
        { field: 'trialDays', nextValue: (v) => (v ?? 14) + 1 },
      ];
      const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];

      it(`should NOT allow an internal-only user to update ${sample.field}`, async () => {
        const before = await Client.findById(putClient._id);
        const originalValue = before[sample.field];

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserInternal)
          .send({ [sample.field]: sample.nextValue(originalValue) });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated[sample.field]).toEqual(originalValue);
      });

      it(`should NOT allow an admin-only user to update ${sample.field}`, async () => {
        const before = await Client.findById(putClient._id);
        const originalValue = before[sample.field];

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserFull2)
          .send({ [sample.field]: sample.nextValue(originalValue) });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated[sample.field]).toEqual(originalValue);
      });
    });

    describe('access control', () => {
      it('should allow an internal-only user (no admin rights) to update', async () => {
        const newName = randomString();
        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserInternal)
          .send({ name: newName });

        expect(res.status).toBe(200);
      });

      it('should return 403 for a user with no internal, no admin, and no standard-admin rights', async () => {
        // putClientUserFull has no adminType, is not internal, has no .admin right
        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserFull)
          .send({ name: randomString() });

        expect(res.status).toBe(403);
      });

      // TODO: Re-enable once Zod param validation is restored on the client PUT endpoint.
      it.skip('should return 400 for an invalid client ObjectId', async () => {
        const res = await server
          .put('/clients/not-a-valid-id')
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ name: randomString() });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Invalid Request');
      });

      it('should return 403 for an unknown (but valid) client id', async () => {
        const res = await server
          .put(`/clients/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserAdminInternal)
          .send({ name: randomString() });

        expect(res.status).toBe(403);
      });
    });

    describe('hasStandardAccess — user with all four Edit rights and no admin flag', () => {
      it('should allow update and return 200', async () => {
        const newName = randomString();
        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserStandardAccess)
          .send({ name: newName });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.name).toBe(newName);
      });

      it('should return 403 when only some edit rights are present (not all four)', async () => {
        const partialRightsToken = jwt.sign(
          { ...baseUser, clientId: putClient._id, rights: { [putClient._id]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit' } } },
          process.env.jsonSecretToken,
          { expiresIn: 86400 },
        );
        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', partialRightsToken)
          .send({ name: randomString() });

        expect(res.status).toBe(403);
      });

      it('should NOT update INTERNAL_ONLY_FIELDS (batchWorkers)', async () => {
        const before = await Client.findById(putClient._id);
        const originalValue = before.batchWorkers;

        const res = await server
          .put(`/clients/${putClient._id}`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserStandardAccess)
          .send({ batchWorkers: (originalValue ?? 0) + 1 });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.batchWorkers).toEqual(originalValue);
      });

      it('should NOT update ADMIN_FIELDS (cancelledSubscription)', async () => {
        const before = await Client.findById(putClient._id);
        const originalValue = before.cancelledSubscription;

        const res = await server
          .put(`/clients/${putClient._id}?clientBilling=true`)
          .set('applicationToken', applicationToken)
          .set('token', putClientUserStandardAccess)
          .send({ cancelledSubscription: !originalValue });

        expect(res.status).toBe(200);
        const updated = await Client.findById(putClient._id);
        expect(updated.cancelledSubscription).toEqual(originalValue);
      });
    });
  });

  // TODO: Re-enable once Zod validation is restored on the client PUT endpoint.
  describe.skip('/:id PUT - zod validation', () => {
    it('should return 400 with a field error when a number field is sent as a string', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ batchWorkers: 'five' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('batchWorkers'));
      expect(res.body.message).toEqual(expect.stringContaining('number'));
    });

    it('should return 400 with a field error when a boolean field is sent as a string', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ cancelledSubscription: 'yes' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('cancelledSubscription'));
      expect(res.body.message).toEqual(expect.stringContaining('boolean'));
    });

    it('should return 400 with a field error when a string field is sent as a number', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ name: 123 });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('name'));
      expect(res.body.message).toEqual(expect.stringContaining('string'));
    });

    it('should return 400 with a field error when an enum field receives an invalid value', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ ftpProtocol: 'TELNET' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('ftpProtocol'));
    });

    it('should return 400 with a nested field path when a nested field is invalid', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ features: { payments: 'yes' } });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('features.payments'));
      expect(res.body.message).toEqual(expect.stringContaining('boolean'));
    });

    it('should return 400 with a nested billing field path when billing is invalid', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ billing: { amount: 'free' } });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('billing.amount'));
      expect(res.body.message).toEqual(expect.stringContaining('number'));
    });

    it('should return 400 with a nested paymentProviders field path when paymentProviders is invalid', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ paymentProviders: { wise: { autoPayment: 'yes' } } });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('paymentProviders.wise.autoPayment'));
      expect(res.body.message).toEqual(expect.stringContaining('boolean'));
    });

    it('should return 400 and collect errors from multiple invalid fields at once', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ batchWorkers: 'five', cancelledSubscription: 'yes', name: 123 });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(expect.stringContaining('batchWorkers'));
      expect(res.body.message).toEqual(expect.stringContaining('cancelledSubscription'));
      expect(res.body.message).toEqual(expect.stringContaining('name'));
    });

    it('should accept null for nullable fields', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ salesReportTemplate: null, statementDesign: null, currency2: null });

      expect(res.status).toBe(200);
    });

    it('should pass through unknown fields without a validation error', async () => {
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ someUnknownField: 'anything' });

      expect(res.status).toBe(200);
    });
  });

  describe('/:id PUT - catalogue group deletion guard', () => {
    it('should return 400 when removing a catalogue group that is in use', async () => {
      const catalogueGroup = randomString();
      await Client.findByIdAndUpdate(client._id, { $push: { catalogueGroups: catalogueGroup } });

      const work = new Work({ clientId: client._id, title: randomString(), catalogueGroups: [catalogueGroup] });
      await work.save();

      const currentGroups = (await Client.findById(client._id)).catalogueGroups.toObject();
      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ catalogueGroups: currentGroups.filter((g) => g !== catalogueGroup) });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/The Catalogue Group cannot be deleted/);

      await Work.findByIdAndDelete(work._id);
      await Client.findByIdAndUpdate(client._id, { $pull: { catalogueGroups: catalogueGroup } });
    });

    it('should bypass the deletion check when ?clientBilling=true', async () => {
      const catalogueGroup = randomString();
      await Client.findByIdAndUpdate(client._id, { $push: { catalogueGroups: catalogueGroup } });

      const work = new Work({ clientId: client._id, title: randomString(), catalogueGroups: [catalogueGroup] });
      await work.save();

      const currentGroups = (await Client.findById(client._id)).catalogueGroups.toObject();
      const res = await server
        .put(`/clients/${client._id}?clientBilling=true`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ catalogueGroups: currentGroups.filter((g) => g !== catalogueGroup) });

      expect(res.status).toBe(200);

      await Work.findByIdAndDelete(work._id);
      await Client.findByIdAndUpdate(client._id, { $pull: { catalogueGroups: catalogueGroup } });
    });
  });

  describe('/:id PUT - encrypted fields', () => {
    // A user with adminType 'Admin' is allowed to write encrypted fields (ftpPassword,
    // paymentProviders.tipalti.apiKey, paymentProviders.wise.apiKey).
    // All other users have those fields silently stripped before the document is saved.
    let clientUserEncryptionAdmin;

    beforeAll(async () => {
      const userEncryptionAdmin = {
        ...baseUser,
        adminType: 'Admin',
        rights: { [client._id]: { admin: true } },
      };
      clientUserEncryptionAdmin = jwt.sign(userEncryptionAdmin, process.env.jsonSecretToken, { expiresIn: 86400 });

      // ftpPassword is undefined on a fresh client document so applyFieldUpdates skips it.
      // Seed via findById + save so the encryption plugin properly encrypts the value —
      // findByIdAndUpdate bypasses pre-save hooks and would store plain text, causing
      // the decryption hook to return undefined when the controller later calls findById.
      const seedClient = await Client.findById(client._id);
      seedClient.ftpPassword = randomString();
      await seedClient.save();
    });

    it('should persist ftpPassword when updated by a user with adminType Admin', async () => {
      const newPassword = randomString();

      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserEncryptionAdmin)
        .send({ ftpPassword: newPassword });

      expect(res.status).toBe(200);
      const updated = await Client.findById(client._id);
      expect(updated.ftpPassword).toBe(newPassword);
    });

    it('should strip ftpPassword and leave it unchanged when the user does not have adminType Admin', async () => {
      const before = await Client.findById(client._id);
      const originalPassword = before.ftpPassword;
      const attemptedPassword = randomString();

      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ ftpPassword: attemptedPassword });

      expect(res.status).toBe(200);
      const updated = await Client.findById(client._id);
      expect(updated.ftpPassword).toBe(originalPassword);
      expect(updated.ftpPassword).not.toBe(attemptedPassword);
    });

    it('should persist paymentProviders.tipalti.apiKey when updated by a user with adminType Admin', async () => {
      const newApiKey = randomString();

      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserEncryptionAdmin)
        .send({ paymentProviders: { tipalti: { apiKey: newApiKey } } });

      expect(res.status).toBe(200);
      const updated = await Client.findById(client._id);
      expect(updated.paymentProviders?.tipalti?.apiKey).toBe(newApiKey);
    });

    it('should strip paymentProviders.tipalti.apiKey when the user does not have adminType Admin', async () => {
      // The entire paymentProviders object is replaced by applyFieldUpdates, so we cannot
      // assert the original apiKey is preserved — instead verify the attempted value was rejected.
      const attemptedApiKey = randomString();

      const res = await server
        .put(`/clients/${client._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUserAdminInternal)
        .send({ paymentProviders: { tipalti: { apiKey: attemptedApiKey } } });

      expect(res.status).toBe(200);
      const updated = await Client.findById(client._id);
      expect(updated.paymentProviders?.tipalti?.apiKey).not.toBe(attemptedApiKey);
    });
  });

  describe('/:id/sync_fuga_catalogue GET', () => {
    beforeAll(() => {
      jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
    });

    afterEach(async () => {
      await Task.deleteMany({ name: 'Fuga Cat Sync', clientId: client._id });
    });

    describe('as a user with catalogue edit rights', () => {
      it('should return 200 and create a task when userEmail is provided', async () => {
        // GIVEN
        const testEmail = 'internal@example.com';

        // WHEN
        const res = await server
          .get(`/clients/${client._id}/sync_fuga_catalogue?userEmail=${testEmail}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);

        const task = await Task.findOne({
          name: 'Fuga Cat Sync',
          clientId: client._id.toString(),
        });

        // THEN
        expect(task).toBeDefined();
        expect(task.status).toBe('Pending');
        expect(task.value.syncClientId).toBe(client._id.toString());
        expect(task.value.userEmail).toBe(testEmail);
        expect(task.clientName).toBe(client.name);
      });

      it('should return 400 when userEmail is not provided', async () => {
        // GIVEN NO USER EMAIL IS PROVIDED

        // WHEN
        const res = await server
          .get(`/clients/${client._id}/sync_fuga_catalogue`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        // THEN
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('User email parameter missing.');
      });

      it('should return 404 when client not found', async () => {
        // GIVEN NON-EXISTENT CLIENT ID IS PROVIDED

        // WHEN
        const res = await server
          .get(`/clients/${unknownObjectId}/sync_fuga_catalogue?userEmail=test@example.com`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        // THEN
        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Client with ID ${unknownObjectId}`);
      });

      it('should return 500 when sync task is already Pending', async () => {
        // GIVEN
        const testEmail = 'test@example.com';
        const existingTask = new Task({
          name: 'Fuga Cat Sync',
          clientId: client._id,
          clientName: client.name,
          value: {
            syncClientId: client._id.toString(),
            userEmail: testEmail,
          },
        });
        await existingTask.save();

        // WHEN
        const res = await server
          .get(`/clients/${client._id}/sync_fuga_catalogue?userEmail=${testEmail}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        // THEN
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('This task is already running - please wait until it has completed before running again');
      });

      it('should allow creating new task when previous task is Complete', async () => {
        // GIVEN
        const testEmail = 'test@example.com';
        const completedTask = new Task({
          name: 'Fuga Cat Sync',
          clientId: client._id,
          clientName: client.name,
          status: 'Complete',
          value: {
            syncClientId: client._id.toString(),
            userEmail: testEmail,
          },
        });
        await completedTask.save();

        // WHEN
        const res = await server
          .get(`/clients/${client._id}/sync_fuga_catalogue?userEmail=${testEmail}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toBe(200);

        const tasks = await Task.find({
          name: 'Fuga Cat Sync',
          clientId: client._id.toString(),
          status: 'Pending',
        });

        // THEN
        expect(tasks.length).toBe(1);
      });
    });

    describe('as a user with view catalogue rights', function () {
      it('should return 403 when user lacks write access', async () => {
        // GIVEN User has view catalogue rights

        // WHEN
        const res = await server
          .get(`/clients/${client._id}/sync_fuga_catalogue?userEmail=test@example.com`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        // THEN
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('as payee user', function () {
      it('should return 403 when user is an payee user', async () => {
        // GIVEN User is a payee user

        // WHEN
        const res = await server
          .get(`/clients/${client._id}/sync_fuga_catalogue?userEmail=test@example.com`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        // THEN
        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });
});
