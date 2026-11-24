process.env.NODE_ENV = 'test';

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const chai = require('chai');
const sinon = require('sinon');

const { expect } = chai;
chai.use(require('sinon-chai'));

const { getPaginationParams,
  getFormattedMetadata,
  checkReadAccessToCatalogue,
  checkWriteAccessToCatalogue,
  errorHandler,
} = require('../../../../libs/apiHelper');

describe('apiHelper', function () {
  logger.info('>>>file>>>> unit/libs/apiHelper.....................');

  beforeEach(() => {
    sinon.stub(UserAccess, 'allowReadAccessToAll');
    sinon.stub(UserAccess, 'isUserForbidden');
  });

  afterEach(() => sinon.restore());

  describe('getPaginationParams', () => {
    it('should return default pagination params', () => {
      const result = getPaginationParams({});
      expect(result).to.deep.eq({ page: 1, limit: 25, sort: 'name', lean: true });
    });

    it('should return pagination params based on query', () => {
      const query = {
        page: 2,
        limit: 50,
        orderBy: 'name',
        orderDir: 'desc',
      };
      const result = getPaginationParams({ query });
      expect(result).to.deep.eq({ page: 2, limit: 50, sort: '-name', lean: true });
    });

    it('should return pagination params with field selection if specified', () => {
      const selectFields = '_id name';
      const result = getPaginationParams({ selectFields });
      expect(result).to.deep.eq({ page: 1, limit: 25, sort: 'name', select: '_id name', lean: true });
    });

    it('should return pagination params with populate config if specified', () => {
      const populate = { path: 'published' };
      const result = getPaginationParams({ populate });
      expect(result).to.deep.eq({ page: 1, limit: 25, sort: 'name', populate, lean: true });
    });
  });

  describe('getFormattedMetadata', async () => {
    it('should return default formatted metadata', () => {
      const result = getFormattedMetadata({});
      expect(result).to.deep.eq({ docs: [], meta: { currentPage: 0, totalPages: 0, total: 0 } });
    });

    it('should return formatted metadata', () => {
      const data = {
        docs: [{ _id: randomId(), name: randomString() }],
        page: 1,
        pages: 1,
        total: 1,
      };
      const result = getFormattedMetadata({ data, dataName: 'data' });
      expect(result).to.deep.eq({ data: data.docs, meta: { currentPage: 1, totalPages: 1, total: 1 } });
    });
  });

  describe('checkReadAccessToCatalogue', () => {
    it('should throw an error if no read access to catalogue', () => {
      const curveUser = { clientId: randomId() };
      UserAccess.allowReadAccessToAll.returns(false);

      try {
        checkReadAccessToCatalogue({ curveUser });
      } catch (err) {
        expect(UserAccess.allowReadAccessToAll).to.be.calledOnce;
        expect(err.code).to.eq(403);
        expect(err.message).to.eq('Forbidden');
      }
    });

    it('should not throw an error if no read access to catalogue', () => {
      const curveUser = { clientId: randomId() };
      UserAccess.allowReadAccessToAll.returns(true);

      checkReadAccessToCatalogue({ curveUser });
      expect(UserAccess.allowReadAccessToAll).to.be.calledOnce;
      expect(UserAccess.allowReadAccessToAll).not.to.throw;
    });
  });

  describe('checkWriteAccessToCatalogue', () => {
    it('should throw an error if no write access to catalogue', async () => {
      const curveUser = { clientId: randomId() };
      UserAccess.isUserForbidden.resolves(true);

      try {
        await checkWriteAccessToCatalogue({ curveUser, document: {} });
      } catch (err) {
        expect(UserAccess.isUserForbidden).to.be.calledOnce;
        expect(err.code).to.eq(403);
        expect(err.message).to.eq('Forbidden');
      }
    });

    it('should not throw an error if no write access to catalogue', async () => {
      const curveUser = { clientId: randomId() };
      UserAccess.isUserForbidden.resolves(false);

      await checkWriteAccessToCatalogue({ curveUser });
      expect(UserAccess.isUserForbidden).to.be.calledOnce;
      expect(UserAccess.isUserForbidden).not.to.throw;
    });
  });

  describe('errorHandler', () => {
    beforeEach(() => {
      sinon.stub(logger, 'error');
    });

    afterEach(() => sinon.restore());

    it('should log internal server error and return response', () => {
      const res = { status: sinon.stub().returns({ json: sinon.stub() }) };
      const message = randomString();

      errorHandler({ message }, res);
      expect(logger.error).to.be.calledOnce;
      expect(logger.error).to.be.calledWith({ message });
      expect(res.status).to.be.calledOnce;
      expect(res.status).to.be.calledWith(500);
    });

    it('should log expected code and return response', () => {
      const res = { status: sinon.stub().returns({ json: sinon.stub() }) };
      const message = randomString();
      const code = 400;

      errorHandler({ code, message }, res);
      expect(logger.error).to.be.calledOnce;
      expect(logger.error).to.be.calledWith({ code, message });
      expect(res.status).to.be.calledOnce;
      expect(res.status).to.be.calledWith(code);
    });

    it('should log expected cause and return response', () => {
      const res = { status: sinon.stub().returns({ json: sinon.stub() }) };
      const message = randomString();
      const code = 400;
      const cause = randomString();

      errorHandler({ code, cause, message }, res);
      expect(logger.error).to.be.calledOnce;
      expect(logger.error).to.be.calledWith({ code, cause, message });
      expect(res.status).to.be.calledOnce;
      expect(res.status).to.be.calledWith(code);
    });

    it('should return internal server error when 500 but log error', () => {
      const res = { status: sinon.stub().returns({ json: sinon.stub() }) };
      const message = randomString();

      errorHandler({ message, code: 500 }, res);
      expect(logger.error).to.be.calledOnce;
      expect(logger.error).to.be.calledWith({ message, code: 500 });
      expect(res.status).to.be.calledOnce;
      expect(res.status).to.be.calledWith(500);
    });
  });
});
