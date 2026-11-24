process.env.NODE_ENV = 'test';
const os = require('os');

const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');
const chai = require('chai');

chai.use(require('sinon-chai'));

const { expect } = chai;

const Import = require('../../../models/import');
const ImportPartner = require('../../../models/importPartner');
const TerritoryGroup = require('../../../models/territoryGroup');
const ImportController = require('../../../controllers/import');

// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('ImportController', () => {
  logger.info('\n\n**** .test/unit/controllers/import.controller.test.js');

  const clientId = randomId();
  const curveUser = { clientId };
  const query = {};
  const defaults = {
    claimingParty: {
      contractType: randomString(),
      publisherId: randomString(),
    },
    ingestionTerritory: randomString(),
    setMainIdentifier: randomString(),
    setPublisherInterestedParty: randomString(),
    setComposerInterestedParty: randomString(),
    territories: [randomString()],
    territoryGroupId: null,
    contracts: [{ percentage: 100, contractId: randomId() }],
    catalogueGroups: [randomString()],
  };
  const territoryGroupTerritories = [randomString()];
  const importMock = { errors: [] };

  beforeEach(() => {
    sinon.stub(Import, 'findById').resolves(importMock);
    sinon.stub(ImportPartner, 'findById').resolves({ defaults });
    sinon.stub(TerritoryGroup, 'findById').resolves({ territories: territoryGroupTerritories });
  });

  afterEach(() => sinon.restore());

  describe('getImportFilter', () => {
    it('should return default filter', async () => {
      const filter = ImportController.getImportFilter({ query, curveUser });
      expect(filter).to.deep.eq({ clientId, transferringSystem: { $nin: ['CWR', 'Catalogue Shipment'] } });
    });

    it('should return filter with transferring system', async () => {
      const query = { transferringSystem: randomString() };
      const filter = ImportController.getImportFilter({ query, curveUser });
      expect(filter).to.deep.eq({ clientId, transferringSystem: query.transferringSystem });
    });

    it('should return filter with text regex', async () => {
      const query = { text: randomString() };
      const filter = ImportController.getImportFilter({ query, curveUser });
      const expectedRegex = new RegExp(query.text, 'i');

      expect(filter).to.deep.eq({
        clientId,
        transferringSystem: { $nin: ['CWR', 'Catalogue Shipment'] },
        name: { $regex: expectedRegex },
      });
    });

    it('should return filter with id and regex if lenght matches object id 24 chars', async () => {
      const query = { text: randomId().toString() };
      const filter = ImportController.getImportFilter({ query, curveUser });
      const expectedRegex = new RegExp(query.text, 'i');

      expect(filter).to.deep.eq({
        clientId,
        transferringSystem: { $nin: ['CWR', 'Catalogue Shipment'] },
        $or: [
          { _id: query.text },
          { name: { $regex: expectedRegex } },
        ],
      });
    });
  });

  describe('getImportPartnerSettings', () => {
    it('should return import partner settings', async () => {
      const importPartnerId = randomId();
      const settings = await ImportController.getImportPartnerSettings({ importPartnerId });
      expect(settings).to.deep.eq(defaults);
    });

    it('should return import partner settings including territory group lookup', async () => {
      const territoryGroupId = randomId();
      ImportPartner.findById.resolves({ defaults: { ...defaults, territoryGroupId } });

      const importPartnerId = randomId();
      const settings = await ImportController.getImportPartnerSettings({ importPartnerId });
      expect(settings).to.deep.eq({ ...defaults, territoryGroupId, territories: territoryGroupTerritories });
    });
  });

  describe('validateImportDelete', () => {
    it('should do nothing if delete is valid', () => {
      const foundImport = { _id: randomId() };
      ImportController.validateImportDelete({ foundImport });
    });

    it('should throw error if related works', () => {
      try {
        const foundImport = { _id: randomId(), ingestedWorks: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related payees', () => {
      try {
        const foundImport = { _id: randomId(), ingestedPayees: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related contracts', () => {
      try {
        const foundImport = { _id: randomId(), ingestedContracts: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related releases', () => {
      try {
        const foundImport = { _id: randomId(), ingestedReleases: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related tracks', () => {
      try {
        const foundImport = { _id: randomId(), ingestedTracks: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related composers', () => {
      try {
        const foundImport = { _id: randomId(), ingestedComposers: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related publishers', () => {
      try {
        const foundImport = { _id: randomId(), ingestedPublishers: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if multiple related data types', () => {
      try {
        const foundImport = { _id: randomId(), ingestedComposers: randomInt(), ingestedPublishers: randomInt(), ingestedWorks: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).to.eq(400);
        expect(error.message).to.eq('Import can not be deleted as it has been used to import data');
      }
    });
  });

  describe('exportErrors', () => {
    const importId = randomId();

    it('should throw forbidden error if no client id', async () => {
      try {
        await ImportController.exportErrors({ curveUser: {}, importId });
      } catch (error) {
        expect(error.code).to.eq(403);
        expect(error.message).to.eq('Forbidden');
      }
    });

    it('should throw not found error if no import', async () => {
      Import.findById.resolves(null);

      try {
        await ImportController.exportErrors({ curveUser, importId });
      } catch (error) {
        expect(error.code).to.eq(404);
        expect(error.message).to.eq(`Could not find Import with ID ${importId}`);
      }
    });

    it('should return csv with headers only if no errors', async () => {
      const csv = await ImportController.exportErrors({ curveUser, importId });
      expect(csv).to.eq('"Identifier","Title","Error"');
    });

    it('should return csv with error data', async () => {
      const importMockWithErrors = { errors: [{ identifier: randomString(), title: randomString(), error: randomString() }] };
      Import.findById.resolves(importMockWithErrors);
      const csv = await ImportController.exportErrors({ curveUser, importId });
      expect(csv).to.eq(`"Identifier","Title","Error"${os.EOL}"${importMockWithErrors.errors[0].identifier}","${importMockWithErrors.errors[0].title}","${importMockWithErrors.errors[0].error}"`);
    });
  });
});
