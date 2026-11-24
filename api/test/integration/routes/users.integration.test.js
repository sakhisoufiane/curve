process.env.NODE_ENV = 'test';

require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const supertest = require('supertest');
const sinon = require('sinon');
const sgMail = require('@sendgrid/mail');

const Client = require('../../../models/client');
const User = require('../../../models/user');
const Payee = require('../../../models/payee');

const config = require('../../../config.json');

const applicationToken = config.applicationTokens[0];
const { expect } = chai;

const server = supertest(require('../../../index'));

describe('/users', function () {
  logger.info('>>>file>>>> int/routes/users .....................');

  let client; let client2; let internalUser; let normalUser; let tokenInternalActingClient1; let tokenInternalActingClient2; let token; let tokenNoRights; let payee1; let jwtSignStub; let sendStub;

  beforeEach(function () {
    sendStub = sinon.stub(sgMail, 'send').callsFake((msg, callback) => {
      logger.debug('Fake email sent', msg);
      callback();
    });
  });

  afterEach(function () {
    sendStub.restore();
  });

  before(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    client2 = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client2.save();

    payee1 = new Payee({
      clientId: client2._id,
      name: testUtils.randomString(),
      alternateName: testUtils.randomString(),
      payeeCategories: testUtils.randomArray(),
      foreignId: testUtils.randomString(),
      projectId: testUtils.randomString(),
      contactEmail: testUtils.randomString(),
      address: testUtils.randomString(),
      country: 'GB',
      vatNo: testUtils.randomString(),
      bankName: testUtils.randomString(),
      bankAddress: testUtils.randomString(),
      accountNo: testUtils.randomString(),
      sortCode: testUtils.randomString(),
      iban: testUtils.randomString(),
      notes: testUtils.randomString(),
      duplicatedFrom: testUtils.randomString(),
      selfBillingTaxText: testUtils.randomString(),
      selfBillingTaxRate: testUtils.randomFloat(),
      feesInvoiceTaxRate: testUtils.randomFloat(),
      withholdingTaxRate: testUtils.randomFloat(),
      withholdingTaxWording: testUtils.randomString(),
      paymentEmail: testUtils.randomString(),
      paymentCurrency: testUtils.randomString(),
      createdBy: testUtils.randomId(),
      lastModifiedBy: testUtils.randomId(),
    });
    await payee1.save();

    internalUser = new User({ email: `${randomString()}@curve.com`, clientIds: [client._id.toString(), client2._id.toString()], internal: true, adminClientIds: [client._id.toString(), client2._id.toString()] });
    await internalUser.save();

    tokenInternalActingClient1 = jwt.sign({
      id: internalUser._id,
      internal: true,
      parentId: null,
      clientId: client._id.toString(),
      email: internalUser.email,
      adminClientIds: [client._id.toString()],
      rights: {},
    }, process.env.jsonSecretToken, { expiresIn: 86400 });

    tokenInternalActingClient2 = jwt.sign({
      id: internalUser._id,
      internal: true,
      parentId: null,
      clientId: client2._id.toString(),
      email: internalUser.email,
      adminClientIds: [client2._id.toString()],
      rights: {},
    }, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  after((done) => {
    testUtils.cleanUp(done);
  });

  describe('Make sure the rights don\'t get overwritten when a user is updated when assigned to both client and payee', function () {
    const newUserEmail = `${randomString()}@curve.com`;

    it('should add a new user to the client', async function () {
      const response = await server
        .post('/users')
        .set('applicationToken', applicationToken)
        .set('token', tokenInternalActingClient1)
        .send('adminType=Standard')
        .send('authenticationType=Email')
        .send(`rights[${client._id}][catalogue]=Edit`)
        .send(`rights[${client._id}][contracts]=Edit`)
        .send(`rights[${client._id}][sales]=Edit`)
        .send(`rights[${client._id}][periods]=Edit`)
        .send(`email=${newUserEmail}`)
        .send(`clientId=${client._id}`);

      expect(response.status).to.eql(200);
      expect(response.body).to.have.property('_id');
      expect(response.body._id).to.be.string;
      normalUser = await User.findById(response.body._id);
      sinon.assert.calledOnce(sendStub);
      expect(normalUser).to.exist;
    });

    it('will have the correct rights for the user', async function () {
      expect(normalUser.rights).to.deep.equal({
        [client._id.toString()]: {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        },
      });
    });

    it('should add a user to a payee', async function () {
      const response = await server
        .post('/users')
        .set('applicationToken', applicationToken)
        .set('token', tokenInternalActingClient2)
        .send('adminType=Standard')
        .send('authenticationType=Email')
        .send(`email=${normalUser.email}`)
        .send(`payeeIds[]=${payee1._id}`);

      expect(response.status).to.eql(200);
      expect(response.body).to.have.property('_id');
      expect(response.body._id).to.be.string;
      normalUser = await User.findById(response.body._id);

      expect(normalUser).to.exist;
    });

    it('will have the correct rights for the user', async function () {
      expect(normalUser.rights).to.deep.equal({
        [client._id.toString()]: {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        },
      });

      expect(normalUser.payeeIds).to.deep.equal([payee1._id.toString()]);
    });

    it('will update the user using the same payee', async function () {
      const response = await server
        .put(`/users/${normalUser._id}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenInternalActingClient2)
        .send({
          adminType: 'Standard',
          authenticationType: 'Email',
          email: internalUser.email,
          payeeIds: normalUser.payeeIds,
          _id: normalUser._id.toString(),
          multiFactorAuthenticationType: 'Email',
        });

      expect(response.status).to.eql(200);
      expect(response.body).to.have.property('_id');
      expect(response.body._id).to.be.string;
      normalUser = await User.findById(response.body._id);

      expect(normalUser).to.exist;
    });

    it('will have the correct rights for the new user', async function () {
      normalUser = await User.findById(normalUser._id.toString());
      expect(normalUser.rights).to.deep.equal({
        [client._id.toString()]: {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        },
      });

      expect(normalUser.payeeIds).to.deep.equal([payee1._id.toString()]);
    });
  });
});
