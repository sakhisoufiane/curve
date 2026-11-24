const os = require('os');

const mockStartCwrImport = jest.fn().mockResolvedValue();
jest.mock('../../controllers/import', () => ({
  ...jest.requireActual('../../controllers/import'),
  startCwrImport: (...args) => mockStartCwrImport(...args),
}));

const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');

const Client = require('../../models/client');
const Import = require('../../models/import');
const ImportPartner = require('../../models/importPartner');
const TerritoryGroup = require('../../models/territoryGroup');
const User = require('../../models/user');

const config = require('../../config.json');
const Contract = require('../../models/contract');

const [applicationToken] = config.applicationTokens;

const server = supertest(require('../../index'));

describe('/imports', () => {
  let client;
  let user;
  let territoryGroup;
  let importPartner;
  let contract;
  let importModelFields; let importModel; let importCatShip;
  let token; let tokenNoRights;
  let runCatalogueShipmentImportSpy;

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

    mockStartCwrImport.mockClear();
    runCatalogueShipmentImportSpy = jest.spyOn(Import.prototype, 'runCatalogueShipmentImport').mockImplementation();
  });

  afterEach(async () => {
    await testUtils.cleanUpAsync(client._id.toString());
  });

  const validateImport = ({ result, expected = importModel, ignoreId = false }) => {
    if (!ignoreId) expect(result._id).toBe(expected._id.toString());

    expect(result.name).toBe(expected.name);
    expect(result.clientId).toBe(expected.clientId);
    expect(result.setupStage).toBe(expected.setupStage);
    expect(result.transferringSystem).toBe(expected.transferringSystem);
    expect(result.transferringParty).toEqual(expected.transferringParty);
    expect(result.contractId).toBe(expected.contractId);
    expect(result.status).toBe(expected.status);
  };

  describe('/imports GET', () => {
    it('should return 401 authentication token missing when no token', async () => {
      const res = await server
        .get('/imports')
        .set('applicationToken', applicationToken);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 forbidden when user has not read access to catalogue', async () => {
      const res = await server
        .get('/imports')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 200 and expected CWR data', async () => {
      const expectedImportPartner = { _id: importPartner._id.toString(), name: importPartner.name };

      const res = await server
        .get('/imports?transferringSystem=CWR')
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.imports)).toBe(true);
      expect(res.body.imports).toHaveLength(1);

      const data = res.body.imports[0];
      validateImport({ result: data });
      expect(data.importPartnerId).toEqual(expectedImportPartner);
    });
  });

  describe('/imports/source_imports GET', () => {
    it('should return 401 when no token', async () => {
      const res = await server
        .get('/imports/source_imports')
        .set('applicationToken', applicationToken);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 when user has no read access to catalogue', async () => {
      const res = await server
        .get('/imports/source_imports')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 200 with filenames for imports that have a publishingCatalogueExport', async () => {
      const filename = `${randomString()}.xlsx`;
      const importWithFile = new Import({
        ...importModelFields,
        status: 'Complete',
        name: randomString(),
        counterpointFiles: { publishingCatalogueExport: `imports/some-id/publishingCatalogueExport/${filename}` },
      });
      await importWithFile.save();

      const res = await server
        .get('/imports/source_imports')
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      expect(res.body.sourceImports).toEqual(
        expect.arrayContaining([{ _id: importWithFile._id.toString(), filename }]),
      );
    });

    it('should return 200 with empty array when no imports have a publishingCatalogueExport', async () => {
      const res = await server
        .get('/imports/source_imports')
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      expect(res.body.sourceImports).toEqual([]);
    });

    it('should not return imports belonging to a different client', async () => {
      const otherClient = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
      await otherClient.save();

      const filename = `${randomString()}.xlsx`;
      const otherClientImport = new Import({
        ...importModelFields,
        clientId: otherClient._id.toString(),
        name: randomString(),
        counterpointFiles: { publishingCatalogueExport: `imports/other-id/publishingCatalogueExport/${filename}` },
      });
      await otherClientImport.save();

      const res = await server
        .get('/imports/source_imports')
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      const returnedIds = res.body.sourceImports.map((i) => i._id);
      expect(returnedIds).not.toContain(otherClientImport._id.toString());

      await testUtils.cleanUpAsync(otherClient._id.toString());
    });
  });

  describe('/imports/:id GET', () => {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have read access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 200 and expected data', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      const data = res.body;
      validateImport({ result: data });
      expect(data.importPartnerId._id).toBe(importPartner._id.toString());
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Could not find Import with ID ${importId}`);
    });

    it('should return 500 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .get(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal error, please try again');
    });
  });

  describe('/imports POST', () => {
    it('should return 401 authentication token missing when no token', async () => {
      const res = await server
        .post('/imports')
        .set('applicationToken', applicationToken)
        .send(importModelFields);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const res = await server
        .post('/imports')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send(importModelFields);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 422 when filename already exists', async () => {
      const existingFilename = `${randomString()}.xlsx`;
      const importWithFile = new Import({
        ...importModelFields,
        name: randomString(),
        counterpointFiles: { publishingCatalogueExport: `imports/existing-id/publishingCatalogueExport/${existingFilename}` },
      });
      await importWithFile.save();

      const res = await server
        .post('/imports')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ ...importModelFields, name: randomString(), pendingFilename: existingFilename });

      expect(res.status).toBe(422);
      expect(res.body.errors.filename).toBe('Filename already exists');
    });

    it('should return 201 and created import', async () => {
      const newImportFields = { ...importModelFields, name: randomString() };

      const res = await server
        .post('/imports')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(newImportFields);

      expect(res.status).toBe(200);
      const data = res.body;
      validateImport({ result: data, expected: newImportFields, ignoreId: true });
      expect(data.importPartnerId._id).toBe(importPartner._id.toString());
    });
  });

  describe('/imports/:id PUT', () => {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .send(importModelFields);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send(importModelFields);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(importModelFields);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Could not find Import with ID ${importId}`);
    });

    it('should return 422 when filename already exists on a different import', async () => {
      const existingFilename = `${randomString()}.xlsx`;
      const importWithFile = new Import({
        ...importModelFields,
        name: randomString(),
        counterpointFiles: { publishingCatalogueExport: `imports/existing-id/publishingCatalogueExport/${existingFilename}` },
      });
      await importWithFile.save();

      const importId = importModel._id.toString();
      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ ...importModelFields, pendingFilename: existingFilename });

      expect(res.status).toBe(422);
      expect(res.body.errors.filename).toBe('Filename already exists');
    });

    it('should return 200 and updated import', async () => {
      const importId = importModel._id.toString();
      const updatedImport = { ...importModelFields, name: randomString() };

      const res = await server
        .put(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send(updatedImport);

      expect(res.status).toBe(200);
      const data = res.body;
      validateImport({ result: data, expected: updatedImport, ignoreId: true });
      expect(data.importPartnerId._id).toBe(importPartner._id.toString());
    });
  });

  describe('/imports/:id DELETE', () => {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Could not find Import with ID ${importId}`);
    });

    it('should return 404 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Could not find Import with ID ${importId}`);
    });

    it('should return 400 when delete fails because import has related data', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Import can not be deleted as it has been used to import data');
    });

    it('should return 200 and delete import partner', async () => {
      const importId = importModel._id.toString();
      importModel.ingestedWorks = 0;
      await importModel.save();

      const res = await server
        .delete(`/imports/${importId}`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      const importExists = await Import.findById(importId);
      expect(importExists).toBeNull();
    });
  });

  describe('/imports/:id/start_ingestion PUT', () => {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have write access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Could not find Import with ID ${importId}`);
    });

    it('should return 404 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal error, please try again');
    });

    it('should return 200 and message CWR ingestion is running', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Your Ingestion Is Running');

      expect(mockStartCwrImport).toHaveBeenCalledTimes(1);
      expect(mockStartCwrImport.mock.calls[0][0]).toMatchObject({ clientId: client._id.toString() });

      const importExists = await Import.findById(importId);
      expect(importExists.status).toBe('Importing');
      expect(importExists.defaults.territories).toEqual(territoryGroup.territories);
      expect(importExists.defaults.contracts).toEqual(importPartner.defaults.contracts);
      expect(importExists.defaults.catalogueGroups).toEqual(importPartner.defaults.catalogueGroups);
    });

    it('should return 200 and message Catalogue Shipment ingestion is running', async () => {
      const importId = importCatShip._id.toString();

      const res = await server
        .put(`/imports/${importId}/start_ingestion`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Your Ingestion Is Running');

      expect(runCatalogueShipmentImportSpy).toHaveBeenCalledTimes(1);
      expect(runCatalogueShipmentImportSpy.mock.calls[0][0]).toMatchObject({ clientId: client._id.toString() });

      const importExists = await Import.findById(importId);
      expect(importExists.status).toBe('Importing');
      expect(importExists.defaults.contracts).toEqual(importPartner.defaults.contracts);
      expect(importExists.defaults.catalogueGroups).toEqual(importPartner.defaults.catalogueGroups);
    });
  });

  describe('/imports/:id/export_errors', () => {
    it('should return 401 authentication token missing when no token', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication token is missing');
    });

    it('should return 403 forbidden when user does not have read access to catalogue', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 200 and expected data', async () => {
      const importId = importModel._id.toString();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(200);
      const data = res.text;
      expect(data).toBe(`"Identifier","Title","Error"${os.EOL}"${importModelFields.errors[0].identifier}","${importModelFields.errors[0].title}","${importModelFields.errors[0].error}"`);
    });

    it('should return 404 when not found', async () => {
      const importId = randomId();

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Could not find Import with ID ${importId}`);
    });

    it('should return 500 when invalid id', async () => {
      const importId = 1;

      const res = await server
        .get(`/imports/${importId}/export_errors`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal error, please try again');
    });
  });
});
