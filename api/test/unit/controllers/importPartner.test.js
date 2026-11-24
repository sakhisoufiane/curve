process.env.NODE_ENV = 'test';

const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');
const chai = require('chai');
const apiHelper = require('../../../libs/apiHelper');

chai.use(require('sinon-chai'));

const { expect } = chai;

const Import = require('../../../models/import');
const ImportPartner = require('../../../models/importPartner');
const ImportPartnerController = require('../../../controllers/importPartner');

describe('ImportPartnerController', () => {
  logger.info('\n\n**** .test/unit/controllers/importPartners.controller.test.js');

  const clientId = randomId();
  const mockImportPartner = {
    name: randomString(),
    clientId,
    transferringSystem: randomString(),
    notes: randomString(),
    defaults: {
      territoryGroupId: randomString(),
      territories: [],
      claimingParty: {
        publisherId: randomString(),
        contractType: randomString(),
      },
      setMainIdentifier: false,
      ingestionTerritory: randomString(),
      catalogueGroups: [],
      contracts: [],
    },
  };
  const curveUser = { clientId };
  const query = {};

  beforeEach(() => {
    sinon.stub(apiHelper, 'checkReadAccessToCatalogue');
    sinon.stub(apiHelper, 'checkWriteAccessToCatalogue');
    sinon.stub(ImportPartner, 'paginate');
    sinon.stub(ImportPartner, 'findById');
    sinon.stub(ImportPartner, 'findByIdAndUpdate');
    sinon.stub(ImportPartner, 'findByIdAndDelete');
    sinon.stub(ImportPartner.prototype, 'save');
    sinon.stub(Import, 'countDocuments');
  });

  afterEach(() => sinon.restore());

  describe('getImportPartners', () => {
    const select = '_id clientId name transferringSystem notes defaults setMainIdentifier ingestionTerritory createdAt';

    it('should throw error if user does not have read access to catalogue', async () => {
      apiHelper.checkReadAccessToCatalogue.throws({ code: 403, message: 'Forbidden' });

      try {
        await ImportPartnerController.getImportPartners({ curveUser, query });
      } catch (err) {
        expect(apiHelper.checkReadAccessToCatalogue).to.be.calledOnce;
        expect(apiHelper.checkReadAccessToCatalogue).to.be.calledWith({ curveUser });
        expect(ImportPartner.paginate).not.to.be.called;
        expect(err.code).to.eq(403);
        expect(err.message).to.eq('Forbidden');
      }
    });

    it('should return empty data', async () => {
      ImportPartner.paginate.resolves({ docs: [] });

      const response = await ImportPartnerController.getImportPartners({ curveUser, query });

      expect(ImportPartner.paginate).to.be.calledOnce;
      expect(ImportPartner.paginate).to.be.calledWith({ clientId }, { page: 1, limit: 25, sort: 'name', select, lean: true });
      expect(response).to.deep.eq({ importPartners: [], meta: { currentPage: 0, totalPages: 0, total: 0 } });
    });

    it('should return formatted response with metadata', async () => {
      const importPartners = [{ _id: randomId(), name: randomString() }, { _id: randomId(), name: randomString() }];
      ImportPartner.paginate.resolves({ docs: importPartners, totalDocs: importPartners.length, page: 1, totalPages: 1 });

      const response = await ImportPartnerController.getImportPartners({ curveUser, query });

      expect(ImportPartner.paginate).to.be.calledOnce;
      expect(ImportPartner.paginate).to.be.calledWith({ clientId }, { page: 1, limit: 25, sort: 'name', select, lean: true });
      expect(response).to.deep.eq({ importPartners, meta: { currentPage: 1, totalPages: 1, total: 2 } });
    });

    it('should filter transferring system by query params', async () => {
      const query = { transferringSystem: randomString() };
      const importPartners = [{ _id: randomId(), name: randomString() }, { _id: randomId(), name: randomString() }];
      ImportPartner.paginate.resolves({ docs: importPartners, total: importPartners.length, page: 1, pages: 1 });

      await ImportPartnerController.getImportPartners({ curveUser, query });

      expect(ImportPartner.paginate).to.be.calledWith({ clientId, transferringSystem: query.transferringSystem }, { page: 1, limit: 25, sort: 'name', select, lean: true });
    });
  });

  describe('getImportPartner', () => {
    it('should throw error if user does not have read access to catalogue', async () => {
      apiHelper.checkReadAccessToCatalogue.throws({ code: 403, message: 'Forbidden' });

      try {
        await ImportPartnerController.getImportPartner({ curveUser, importPartnerId: randomId() });
      } catch (err) {
        expect(apiHelper.checkReadAccessToCatalogue).to.be.calledOnce;
        expect(apiHelper.checkReadAccessToCatalogue).to.be.calledWith({ curveUser });
        expect(err.code).to.eq(403);
        expect(err.message).to.eq('Forbidden');
      }
    });

    it('should throw error if import partner id is invalid', async () => {
      const importPartnerId = randomInt();

      try {
        await ImportPartnerController.getImportPartner({ curveUser, importPartnerId });
      } catch (err) {
        expect(err.code).to.eq(404);
        expect(err.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
      }
    });

    it('should throw error if import partner not found', async () => {
      const importPartnerId = randomId();
      ImportPartner.findById.returns({ lean: () => null });

      try {
        await ImportPartnerController.getImportPartner({ curveUser, importPartnerId });
      } catch (err) {
        expect(ImportPartner.paginate).not.to.be.called;
        expect(err.code).to.eq(404);
        expect(err.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
      }
    });

    it('should return import partner', async () => {
      const importPartnerId = randomId();
      ImportPartner.findById.returns({ lean: () => mockImportPartner });

      const importPartner = await ImportPartnerController.getImportPartner({ curveUser, importPartnerId });
      expect(ImportPartner.findById).to.be.called;
      expect(ImportPartner.findById).to.be.calledWith(importPartnerId);
      expect(importPartner).to.deep.eq(mockImportPartner);
    });
  });

  describe('createImportPartner', () => {
    it('should throw error if user does not have write access to catalogue', async () => {
      apiHelper.checkWriteAccessToCatalogue.rejects({ code: 403, message: 'Forbidden' });

      try {
        await ImportPartnerController.createImportPartner({ curveUser, importPartner: mockImportPartner });
      } catch (err) {
        expect(apiHelper.checkWriteAccessToCatalogue).to.be.calledOnce;
        expect(apiHelper.checkWriteAccessToCatalogue.getCall(0).args[0].curveUser).to.deep.eq(curveUser);
        expect(apiHelper.checkWriteAccessToCatalogue.getCall(0).args[0].document).to.deep.contain(mockImportPartner);
        expect(err.code).to.eq(403);
        expect(err.message).to.eq('Forbidden');
      }
    });

    it('should return new import partner on create', async () => {
      ImportPartner.prototype.save.resolves(mockImportPartner);

      const importPartner = await ImportPartnerController.createImportPartner({ curveUser, importPartner: mockImportPartner });

      expect(apiHelper.checkWriteAccessToCatalogue).to.be.calledOnce;
      expect(ImportPartner.prototype.save).to.be.calledOnce;
      expect(importPartner).to.deep.eq(mockImportPartner);
    });
  });

  describe('updateImportPartner', () => {
    it('should throw error if user does not have write access to catalogue', async () => {
      apiHelper.checkWriteAccessToCatalogue.rejects({ code: 403, message: 'Forbidden' });
      const importPartnerId = randomId();

      try {
        await ImportPartnerController.updateImportPartner({ curveUser, importPartnerId, importPartner: mockImportPartner });
      } catch (err) {
        expect(apiHelper.checkWriteAccessToCatalogue).to.be.calledOnce;
        expect(apiHelper.checkWriteAccessToCatalogue.getCall(0).args[0].curveUser).to.deep.eq(curveUser);
        expect(apiHelper.checkWriteAccessToCatalogue.getCall(0).args[0].document).to.deep.contain(mockImportPartner);
        expect(err.code).to.eq(403);
        expect(err.message).to.eq('Forbidden');
      }
    });

    it('should throw error if import partner id is invalid', async () => {
      const importPartnerId = randomInt();

      try {
        await ImportPartnerController.updateImportPartner({ curveUser, importPartnerId, importPartner: mockImportPartner });
      } catch (err) {
        expect(err.code).to.eq(404);
        expect(err.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
      }
    });

    it('should throw error if import partner not found', async () => {
      const importPartnerId = randomId();
      ImportPartner.findById.returns({ lean: () => null });

      try {
        await ImportPartnerController.updateImportPartner({ curveUser, importPartnerId, importPartner: mockImportPartner });
      } catch (err) {
        expect(ImportPartner.paginate).not.to.be.called;
        expect(err.code).to.eq(404);
        expect(err.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
      }
    });

    it('should return updated import partner', async () => {
      const importPartnerId = randomId();
      ImportPartner.findById.returns({ lean: () => mockImportPartner });
      ImportPartner.findByIdAndUpdate.resolves(mockImportPartner);

      const importPartner = await ImportPartnerController.updateImportPartner({ curveUser, importPartnerId, importPartner: mockImportPartner });

      expect(apiHelper.checkWriteAccessToCatalogue).to.be.calledOnce;
      expect(ImportPartner.findByIdAndUpdate).to.be.calledOnce;
      expect(ImportPartner.findByIdAndUpdate).to.be.calledWith(importPartnerId, mockImportPartner, { new: true });
      expect(importPartner).to.deep.eq(mockImportPartner);
    });
  });

  describe('deleteImportPartner', () => {
    it('should throw error if user does not have write access to catalogue', async () => {
      const importPartnerId = randomId();
      ImportPartner.findById.returns({ lean: () => mockImportPartner });
      apiHelper.checkWriteAccessToCatalogue.rejects({ code: 403, message: 'Forbidden' });

      try {
        await ImportPartnerController.deleteImportPartner({ curveUser, importPartnerId });
      } catch (err) {
        expect(apiHelper.checkWriteAccessToCatalogue).to.be.calledOnce;
        expect(apiHelper.checkWriteAccessToCatalogue.getCall(0).args[0].curveUser).to.deep.eq(curveUser);
        expect(apiHelper.checkWriteAccessToCatalogue.getCall(0).args[0].document).to.deep.contain(mockImportPartner);
        expect(err.code).to.eq(403);
        expect(err.message).to.eq('Forbidden');
      }
    });

    it('should throw error if import partner id is invalid', async () => {
      const importPartnerId = randomInt();

      try {
        await ImportPartnerController.deleteImportPartner({ curveUser, importPartnerId });
      } catch (err) {
        expect(err.code).to.eq(404);
        expect(err.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
      }
    });

    it('should throw error if import partner not found', async () => {
      const importPartnerId = randomId();
      ImportPartner.findById.returns({ lean: () => null });

      try {
        await ImportPartnerController.deleteImportPartner({ curveUser, importPartnerId });
      } catch (err) {
        expect(err.code).to.eq(404);
        expect(err.message).to.eq(`Did not find an Import Partner matching this ID: ${importPartnerId}`);
      }
    });

    it('should throw error if import partner in use', async () => {
      const importPartnerId = randomId();
      Import.countDocuments.resolves(1);
      ImportPartner.findById.returns({ lean: () => mockImportPartner });

      try {
        await ImportPartnerController.deleteImportPartner({ curveUser, importPartnerId });
      } catch (err) {
        expect(err.code).to.eq(400);
        expect(err.message).to.eq('Import Partner can not be deleted as it has been used on Imports');
      }
    });

    it('should delete import partner', async () => {
      const importPartnerId = randomId();
      ImportPartner.findById.returns({ lean: () => mockImportPartner });

      await ImportPartnerController.deleteImportPartner({ curveUser, importPartnerId });

      expect(apiHelper.checkWriteAccessToCatalogue).to.be.calledOnce;
      expect(ImportPartner.findByIdAndDelete).to.be.calledOnce;
      expect(ImportPartner.findByIdAndDelete).to.be.calledWith(importPartnerId);
    });
  });
});
