process.env.NODE_ENV = 'test';

require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const supertest = require('supertest');

const Client = require('../../../models/client');
const Import = require('../../../models/import');
const ImportPartner = require('../../../models/importPartner');
const User = require('../../../models/user');

const config = require('../../../config.json');

const applicationToken = config.applicationTokens[0];
const { expect } = chai;

const server = supertest(require('../../../index'));

describe('/importPartners', function () {
  logger.info('>>>file>>>> int/routes/importPartners .....................');

  let client;
  let user;
  let importPartnerFields; let importPartner;
  let token; let tokenNoRights;

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    user = new User({ email: `${randomString()}@curve.com` });
    await user.save();

    importPartnerFields = {
      name: randomString(),
      clientId: client._id.toString(),
      transferringSystem: randomString(),
      notes: randomString(),
      defaults: {
        territoryGroupId: randomString(),
        territories: [randomString()],
        claimingParty: {
          publisherId: randomString(),
          contractType: randomString(),
        },
        setMainIdentifier: false,
        ingestionTerritory: randomString(),
      },
    };

    importPartner = new ImportPartner(importPartnerFields);
    await importPartner.save();

    const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const userTokenNoRights = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    tokenNoRights = jwt.sign(userTokenNoRights, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  afterEach((done) => {
    testUtils.cleanUp(done);
  });

  const validateImportPartner = ({ result, expected = importPartner, ignoreId = false }) => {
    if (!ignoreId) expect(result._id).to.eq(expected._id.toString());

    expect(result.clientId).to.eq(expected.clientId);
    expect(result.transferringSystem).to.eq(expected.transferringSystem);
    expect(result.notes).to.eq(expected.notes);
    expect(result.defaults.territoryGroupId).to.eq(expected.defaults.territoryGroupId);
    expect(result.defaults.territories).to.deep.eq(expected.defaults.territories);
    expect(result.defaults.claimingParty.publisherId).to.eq(expected.defaults.claimingParty.publisherId);
    expect(result.defaults.claimingParty.contractType).to.eq(expected.defaults.claimingParty.contractType);
    expect(result.defaults.setMainIdentifier).to.eq(expected.defaults.setMainIdentifier);
    expect(result.defaults.ingestionTerritory).to.eq(expected.defaults.ingestionTerritory);
    expect(result.createdAt).not.to.be.empty;
  };

  describe('/importPartners GET', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const res = await server
        .get('/importPartners')
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user has not read access to catalogue', async () => {
      const res = await server
        .get('/importPartners')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 200 and expected data', async () => {
      const res = await server
        .get('/importPartners')
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      expect(res.body.importPartners).to.be.an('array').with.length(1);

      const data = res.body.importPartners[0];
      validateImportPartner({ result: data });
    });
  });

  describe('/importPartners/:id GET', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .get(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have read access to catalogue', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .get(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 200 and expected data', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .get(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      const data = res.body;
      validateImportPartner({ result: data });
    });

    it('should return 404 when not found', async () => {
      const importPartnerId = randomId();

      const res = await server
        .get(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
    });

    it('should return 404 when invalid id', async () => {
      const importPartnerId = 1;

      const res = await server
        .get(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
    });
  });

  describe('/importPartners POST', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const res = await server
        .post('/importPartners')
        .set('applicationToken', applicationToken)
        .send(importPartnerFields);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const res = await server
        .post('/importPartners')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send(importPartnerFields);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 201 and created import partner', async () => {
      const res = await server
        .post('/importPartners')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(importPartnerFields);

      expect(res.status).to.eq(201);
      const data = res.body;
      validateImportPartner({ result: data, ignoreId: true });
    });
  });

  describe('/importPartners/:id PUT', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .put(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .send(importPartnerFields);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .put(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send(importPartnerFields);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importPartnerId = randomId();

      const res = await server
        .put(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(importPartnerFields);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
    });

    it('should return 404 when invalid id', async () => {
      const importPartnerId = 1;

      const res = await server
        .put(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(importPartnerFields);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
    });

    it('should return 200 and updated import partner', async () => {
      const importPartnerId = importPartner._id.toString();
      const updatedImportPartner = { ...importPartnerFields, name: randomString() };

      const res = await server
        .put(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(importPartnerFields);

      expect(res.status).to.eq(200);
      const data = res.body;
      validateImportPartner({ result: data, expected: updatedImportPartner, ignoreId: true });
    });
  });

  describe('/importPartners/:id DELETE', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .delete(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .delete(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importPartnerId = randomId();

      const res = await server
        .delete(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
    });

    it('should return 404 when invalid id', async () => {
      const importPartnerId = 1;

      const res = await server
        .delete(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
    });

    it('should return 400 when delete fails because import partner in use', async () => {
      const importPartnerId = importPartner._id.toString();

      const importUsingImportPartner = new Import({ importPartnerId });
      await importUsingImportPartner.save();

      const res = await server
        .delete(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(400);
      expect(res.body.message).to.eq('Import Partner can not be deleted as it has been used on Imports');
    });

    it('should return 200 and delete import partner', async () => {
      const importPartnerId = importPartner._id.toString();

      const res = await server
        .delete(`/importPartners/${importPartnerId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      expect(res.body).to.be.empty;
      const importPartnerExists = await ImportPartner.findById(importPartnerId);
      expect(importPartnerExists).to.be.null;
    });
  });
});
