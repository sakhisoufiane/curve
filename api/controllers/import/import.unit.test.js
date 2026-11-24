const os = require('os');

const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const Import = require('../../models/import');
const ImportPartner = require('../../models/importPartner');
const TerritoryGroup = require('../../models/territoryGroup');
const Client = require('../../models/client');
const User = require('../../models/user');
const ImportController = require('./import');
const Task = require('../../models/task');

describe('ImportController', () => {
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
    jest.spyOn(Import, 'findById').mockResolvedValue(importMock);
    jest.spyOn(ImportPartner, 'findById').mockResolvedValue({ defaults });
    jest.spyOn(TerritoryGroup, 'findById').mockResolvedValue({ territories: territoryGroupTerritories });
  });

  describe('getImportFilter', () => {
    it('should return default filter', async () => {
      const filter = ImportController.getImportFilter({ query, curveUser });
      expect(filter).toEqual({ clientId, transferringSystem: { $nin: ['CWR', 'Catalogue Shipment'] } });
    });

    it('should return filter with transferring system', async () => {
      const query = { transferringSystem: randomString() };
      const filter = ImportController.getImportFilter({ query, curveUser });
      expect(filter).toEqual({ clientId, transferringSystem: query.transferringSystem });
    });

    it('should return filter with text regex', async () => {
      const query = { text: randomString() };
      const filter = ImportController.getImportFilter({ query, curveUser });
      const expectedRegex = new RegExp(query.text, 'i');

      expect(filter).toEqual({
        clientId,
        transferringSystem: { $nin: ['CWR', 'Catalogue Shipment'] },
        name: { $regex: expectedRegex },
      });
    });

    it('should return filter with id and regex if lenght matches object id 24 chars', async () => {
      const query = { text: randomId().toString() };
      const filter = ImportController.getImportFilter({ query, curveUser });
      const expectedRegex = new RegExp(query.text, 'i');

      expect(filter).toEqual({
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
      expect(settings).toEqual(defaults);
    });

    it('should return import partner settings including territory group lookup', async () => {
      const territoryGroupId = randomId();
      ImportPartner.findById.mockResolvedValue({ defaults: { ...defaults, territoryGroupId } });

      const importPartnerId = randomId();
      const settings = await ImportController.getImportPartnerSettings({ importPartnerId });
      expect(settings).toEqual({ ...defaults, territoryGroupId, territories: territoryGroupTerritories });
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
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related payees', () => {
      try {
        const foundImport = { _id: randomId(), ingestedPayees: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related contracts', () => {
      try {
        const foundImport = { _id: randomId(), ingestedContracts: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related releases', () => {
      try {
        const foundImport = { _id: randomId(), ingestedReleases: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related tracks', () => {
      try {
        const foundImport = { _id: randomId(), ingestedTracks: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related composers', () => {
      try {
        const foundImport = { _id: randomId(), ingestedComposers: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if related publishers', () => {
      try {
        const foundImport = { _id: randomId(), ingestedPublishers: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });

    it('should throw error if multiple related data types', () => {
      try {
        const foundImport = { _id: randomId(), ingestedComposers: randomInt(), ingestedPublishers: randomInt(), ingestedWorks: randomInt() };
        ImportController.validateImportDelete({ foundImport });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.message).toBe('Import can not be deleted as it has been used to import data');
      }
    });
  });

  describe('startCwrImport', () => {
    const importId = randomId();
    const userId = randomId();
    const clientName = randomString();
    const userEmail = randomString();

    beforeEach(() => {
      jest.spyOn(Client, 'findById').mockReturnValue({ lean: () => Promise.resolve({ name: clientName }) });
      jest.spyOn(User, 'findById').mockReturnValue({ lean: () => Promise.resolve({ email: userEmail }) });
      jest.spyOn(TaskHelpers, 'createTaskAndSendMessage').mockResolvedValue();
    });

    it('should create a task with the correct fields and send SQS message', async () => {
      await ImportController.startCwrImport({ importId, clientId, userId });

      expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(
        Task,
        {
          name: 'CWR Import',
          clientId,
          clientName,
          email: userEmail,
          value: { importId },
        },
      );
    });

    it('should throw an error if the client could not be found', async () => {
      const id = randomId();
      jest.spyOn(Client, 'findById').mockReturnValueOnce({ lean: () => Promise.resolve(null) });
      await expect(ImportController.startCwrImport({ importId, clientId: id, userId }))
        .rejects
        .toThrow(`Client not found: ${id}`);
    });

    it('should throw an error if the user could not be found', async () => {
      const id = randomId();
      jest.spyOn(User, 'findById').mockReturnValueOnce({ lean: () => Promise.resolve(null) });
      await expect(ImportController.startCwrImport({ importId, clientId, userId: id }))
        .rejects
        .toThrow(`User not found: ${id}`);
    });
  });

  describe('exportErrors', () => {
    const importId = randomId();

    it('should throw forbidden error if no client id', async () => {
      try {
        await ImportController.exportErrors({ curveUser: {}, importId });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.message).toBe('Forbidden');
      }
    });

    it('should throw not found error if no import', async () => {
      Import.findById.mockResolvedValue(null);

      try {
        await ImportController.exportErrors({ curveUser, importId });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.message).toBe(`Could not find Import with ID ${importId}`);
      }
    });

    it('should return csv with headers only if no errors', async () => {
      const csv = await ImportController.exportErrors({ curveUser, importId });
      expect(csv).toBe('"Identifier","Title","Error"');
    });

    it('should return csv with error data', async () => {
      const importMockWithErrors = { errors: [{ identifier: randomString(), title: randomString(), error: randomString() }] };
      Import.findById.mockResolvedValue(importMockWithErrors);
      const csv = await ImportController.exportErrors({ curveUser, importId });
      expect(csv).toBe(`"Identifier","Title","Error"${os.EOL}"${importMockWithErrors.errors[0].identifier}","${importMockWithErrors.errors[0].title}","${importMockWithErrors.errors[0].error}"`);
    });
  });
});
