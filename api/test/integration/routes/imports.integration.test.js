process.env.NODE_ENV = 'test';
const os = require('os');

require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const supertest = require('supertest');

const Client = require('../../../models/client');
const Import = require('../../../models/import');
const ImportPartner = require('../../../models/importPartner');
const TerritoryGroup = require('../../../models/territoryGroup');
const User = require('../../../models/user');

const config = require('../../../config.json');
const Contract = require('../../../models/contract');

const applicationToken = config.applicationTokens[0];
const { expect } = chai;

const server = supertest(require('../../../index'));

// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('/imports', function () {
  logger.info('>>>file>>>> int/routes/imports .....................');

  let client;
  let user;
  let territoryGroup;
  let importPartner;
  let contract;
  let importModelFields; let importModel; let importCatShip;
  let token; let tokenNoRights;

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    user = new User({ email: `${randomString()}@curve.com` });
    await user.save();

    territoryGroup = new TerritoryGroup({ name: randomString(), clientId: client._id.toString(), territories: [randomString()] });
    await territoryGroup.save();

    contract = new Contract({
      name: randomString(),
      clientId: client._id.toString(),
      contractType: 'Artist',
      active: true,
      currency: 'Home Currency',
      type: 'Royalty',
      reserveBasis: 'Post-Calculation',
      payeeBalanceCondition: 'Never',
    });

    await territoryGroup.save();

    importPartner = new ImportPartner({
      name: randomString(),
      clientId: client._id.toString(),
      transferringSystem: randomString(),
      notes: randomString(),
      defaults: {
        territoryGroupId: territoryGroup._id.toString(),
        territories: [randomString()],
        claimingParty: {
          publisherId: randomString(),
          contractType: randomString(),
        },
        setMainIdentifier: false,
        setPublisherInterestedParty: false,
        setComposerInterestedParty: false,
        ingestionTerritory: randomString(),
        catalogueGroups: ['Cat group 1'],
        contracts: [{
          percentage: 100,
          contractId: contract._id.toString(),
        }],
      },
    });
    await importPartner.save();

    importModelFields = {
      name: randomString(),
      clientId: client._id.toString(),
      setupStage: randomString(),
      transferringSystem: 'CWR',
      transferringParty: randomString(),
      contractId: randomId().toString(),
      status: 'Setup',
      importPartnerId: importPartner._id,
      ingestedWorks: randomInt(),
      errors: [
        { identifier: randomString(), title: randomString(), error: randomString() },
      ],
    };
    importModel = new Import(importModelFields);
    await importModel.save();

    importCatShip = new Import({ ...importModelFields, transferringSystem: 'Catalogue Shipment' });
    await importCatShip.save();

    const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const userTokenNoRights = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    tokenNoRights = jwt.sign(userTokenNoRights, process.env.jsonSecretToken, { expiresIn: 86400 });

    sinon.stub(Import.prototype, 'runCwrImport');
    sinon.stub(Import.prototype, 'runCatalogueShipmentImport');
  });

  afterEach((done) => {
    testUtils.cleanUp(done);
    sinon.restore();
  });

  const validateImport = ({ result, expected = importModel, ignoreId = false }) => {
    if (!ignoreId) expect(result._id).to.eq(expected._id.toString());

    expect(result.name).to.eq(expected.name);
    expect(result.clientId).to.eq(expected.clientId);
    expect(result.setupStage).to.eq(expected.setupStage);
    expect(result.transferringSystem).to.eq(expected.transferringSystem);
    expect(result.transferringParty).to.deep.eq(expected.transferringParty);
    expect(result.contractId).to.eq(expected.contractId);
    expect(result.status).to.eq(expected.status);
  };

  describe('/imports GET', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const res = await server
        .get('/imports')
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user has not read access to catalogue', async () => {
      const res = await server
        .get('/imports')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 200 and expected CWR data', async () => {
      const expectedImportPartner = { _id: importPartner._id.toString(), name: importPartner.name };

      const res = await server
        .get('/imports?transferringSystem=CWR')
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      expect(res.body.imports).to.be.an('array').with.length(1);

      const data = res.body.imports[0];
      validateImport({ result: data });
      expect(data.importPartnerId).to.deep.eq(expectedImportPartner);
    });
  });

  describe('/imports/:id GET', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have read access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 200 and expected data', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      const data = res.body;
      validateImport({ result: data });
      expect(data.importPartnerId._id).to.eq(importPartner._id.toString());
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Could not find Import with ID ${importId}`);
    });

    it('should return 500 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(500);
      expect(res.body.message).to.eq('Internal error, please try again');
    });
  });

  describe('/imports POST', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const res = await server
        .post('/imports')
        .set('applicationToken', applicationToken)
        .send(importModelFields);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const res = await server
        .post('/imports')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send(importModelFields);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 201 and created import', async () => {
      const res = await server
        .post('/imports')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(importModelFields);

      expect(res.status).to.eq(200);
      const data = res.body;
      validateImport({ result: data, ignoreId: true });
      expect(data.importPartnerId._id).to.eq(importPartner._id.toString());
    });
  });

  describe('/imports/:id PUT', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .send(importModelFields);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send(importModelFields);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(importModelFields);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Could not find Import with ID ${importId}`);
    });

    it('should return 200 and updated import', async () => {
      const importId = importModel._id.toString();
      const updatedImport = { ...importModelFields, name: randomString() };

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(updatedImport);

      expect(res.status).to.eq(200);
      const data = res.body;
      validateImport({ result: data, expected: updatedImport, ignoreId: true });
      expect(data.importPartnerId._id).to.eq(importPartner._id.toString());
    });
  });

  describe('/imports/:id DELETE', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Could not find Import with ID ${importId}`);
    });

    it('should return 404 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Could not find Import with ID ${importId}`);
    });

    it('should return 400 when delete fails because import has related data', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(400);
      expect(res.body.message).to.eq('Import can not be deleted as it has been used to import data');
    });

    it('should return 200 and delete import partner', async () => {
      const importId = importModel._id.toString();
      importModel.ingestedWorks = 0;
      await importModel.save();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      const importExists = await Import.findById(importId);
      expect(importExists).to.be.null;
    });
  });

  describe('/imports/:id/start_ingestion PUT', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Could not find Import with ID ${importId}`);
    });

    it('should return 404 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(500);
      expect(res.body.message).to.eq('Internal error, please try again');
    });

    it('should return 200 and message CWR ingestion is running', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      expect(res.body.message).to.eq('Your Ingestion Is Running');

      expect(Import.prototype.runCwrImport.calledOnce).to.be.true;
      expect(Import.prototype.runCwrImport.getCall(0).args[0]).to.include({ clientId: client._id.toString() });

      const importExists = await Import.findById(importId);
      expect(importExists.status).to.eq('Importing');
      expect(importExists.defaults.territories).to.deep.eq(territoryGroup.territories);
      expect(importExists.defaults.contracts).to.deep.eq(importPartner.defaults.contracts);
      expect(importExists.defaults.catalogueGroups).to.deep.eq(importPartner.defaults.catalogueGroups);
    });

    it('should return 200 and message Catalogue Shipment ingestion is running', async () => {
      const importId = importCatShip._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      expect(res.body.message).to.eq('Your Ingestion Is Running');

      expect(Import.prototype.runCatalogueShipmentImport.calledOnce).to.be.true;
      expect(Import.prototype.runCatalogueShipmentImport.getCall(0).args[0]).to.include({ clientId: client._id.toString() });

      const importExists = await Import.findById(importId);
      expect(importExists.status).to.eq('Importing');
      expect(importExists.defaults.contracts).to.deep.eq(importPartner.defaults.contracts);
      expect(importExists.defaults.catalogueGroups).to.deep.eq(importPartner.defaults.catalogueGroups);
    });
  });

  describe('/imports/:id/export_errors', function () {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken);

      expect(res.status).to.eq(401);
      expect(res.body.message).to.eq('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have read access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).to.eq(403);
      expect(res.body.message).to.eq('Forbidden');
    });

    it('should return 200 and expected data', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(200);
      const data = res.text;
      expect(data).to.eq(`"Identifier","Title","Error"${os.EOL}"${importModelFields.errors[0].identifier}","${importModelFields.errors[0].title}","${importModelFields.errors[0].error}"`);
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq(`Could not find Import with ID ${importId}`);
    });

    it('should return 500 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).to.eq(500);
      expect(res.body.message).to.eq('Internal error, please try again');
    });
  });
});
