process.env.NODE_ENV = 'test';
require('../../../models/db');

const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));

const { expect } = chai;

const AppSettings = require('../../../models/appSettings');
const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Payee = require('../../../models/payee');
const Period = require('../../../models/period');
const Release = require('../../../models/release');
const Statement = require('../../../models/statement');
const Task = require('../../../models/task');
const Track = require('../../../models/track');
const User = require('../../../models/user');

const sendEmail = require('../../../libs/sendEmail');

const StatementController = require('../../../controllers/statement');
const { mainController: Controller } = require('../../../controllers/fugav2');

// This test has been migrated to Jest (controllers/fugav2/fugav2.unit.test.js) and is being
// kept here for reference. It will be deleted at a later point.
describe.skip('FugaController', () => {
  logger.info('\n\n**** .test/unit/controllers/fugav2.controller.test.js');

  beforeEach(() => {
    sinon.stub(Client, 'findById').resolves({});
    sinon.stub(Payee, 'findOne');
    sinon.stub(Payee.prototype, 'save').resolves();
    sinon.stub(Track, 'findOne');
    sinon.stub(Track, 'findById');
    sinon.stub(Track, 'paginate');
    sinon.stub(Release, 'findOne');
    sinon.stub(UserAccess, 'isUserForbidden').resolves(false);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('formatRelease', () => {
    it('should return release with label', async () => {
      const _id = randomId();
      const title = randomString();
      const label = randomString();
      const mockRelease = { _id, title, salesReturnsRights: [], trackIds: [], label };
      const expectedRelease = { _id, title, label };

      const release = await Controller.formatRelease(mockRelease);

      expect(release).to.contain(expectedRelease);
    });

    it('should return release with defult label if none found', async () => {
      const _id = randomId();
      const title = randomString();
      const mockRelease = { _id, title, salesReturnsRights: [], trackIds: [] };
      const expectedRelease = { _id, title, label: '' };

      const release = await Controller.formatRelease(mockRelease);

      expect(release).to.contain(expectedRelease);
    });
  });

  describe('updateRelease', () => {
    it('should update and return release with label', async () => {
      const mockRelease = { _id: randomString(), title: randomString(), salesReturnsRights: [], trackIds: [], save: sinon.stub() };
      const params = {
        title: randomString(),
        version: randomString(),
        artist: randomString(),
        releaseDate: randomString(),
        label: randomString(),
      };
      const expectedRelease = { ...params };

      const release = await Controller.updateRelease(mockRelease, params);

      expect(release).to.contain(expectedRelease);
      expect(mockRelease.save).to.have.been.calledOnce;
    });

    it('should update return release with default label', async () => {
      const mockRelease = { _id: randomString(), title: randomString(), salesReturnsRights: [], trackIds: [], save: sinon.stub() };
      const params = {
        title: randomString(),
        version: randomString(),
        artist: randomString(),
        releaseDate: randomString(),
      };
      const expectedRelease = { ...params, label: '' };

      const release = await Controller.updateRelease(mockRelease, params);

      expect(release).to.contain(expectedRelease);
      expect(mockRelease.save).to.have.been.calledOnce;
    });
  });

  describe('createPayee', () => {
    it('should return payee if found', async () => {
      const clientId = randomId();
      const name = randomString();
      const _id = randomId();
      const email = randomString();
      const payeeMock = { _id, clientId, name, email, save: sinon.stub() };
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Payee.findOne.returns({ lean: () => ({ exec: () => payeeMock }) });

      const payee = await Controller.createPayee({ curveUser, newPayee });

      expect(payee).to.contain({ _id, clientId, name, email });
      expect(Payee.prototype.save).not.to.have.been.calledOnce;
    });

    it('should create new payee', async () => {
      const clientId = randomId();
      const name = randomString();
      const email = randomString();
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Payee.findOne.returns({ lean: () => ({ exec: () => null }) });
      sinon.stub(Contract.prototype, 'save').resolves({});
      sinon.stub(User, 'createUser').yields(null, {});

      const payee = await Controller.createPayee({ curveUser, newPayee });

      expect(payee).to.contain({ clientId, name, email });
      expect(UserAccess.isUserForbidden).to.have.been.calledOnce;
      expect(Payee.prototype.save).to.have.been.calledOnce;
      expect(Contract.prototype.save).to.have.been.calledOnce;
      expect(User.createUser).to.have.been.calledOnce;
    });

    it('should throw throw forbidden error if no permissions to create payee', async () => {
      const clientId = randomId();
      const name = randomString();
      const email = randomString();
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Payee.findOne.returns({ lean: () => ({ exec: () => null }) });
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.createPayee({ curveUser, newPayee });
      } catch (error) {
        expect(UserAccess.isUserForbidden).to.have.been.calledOnce;
        expect(Payee.prototype.save).not.to.have.been.calledOnce;

        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
      }
    });

    it('should throw throw error if invalid client', async () => {
      const clientId = randomId();
      const name = randomString();
      const email = randomString();
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves();
      Payee.findOne.returns({ lean: () => ({ exec: () => null }) });
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.createPayee({ curveUser, newPayee });
      } catch (error) {
        expect(Payee.prototype.save).not.to.have.been.calledOnce;
        expect(error.code).to.equal(404);
        expect(error.message).to.equal('Organisation not found');
      }
    });
  });

  describe('getPeriods', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const query = {};
      Client.findById.resolves();

      try {
        await Controller.getPeriods({ clientId, query });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const query = {};
      Client.findById.resolves(null);

      try {
        await Controller.getPeriods({ clientId, query });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should call Period.paginate with expected params and status complete filter', async () => {
      const filter = { page: randomInt(), limit: randomInt(), orderBy: '', orderDir: '' };
      const paginationParams = {
        page: Page.valueOrDefault(filter.page, 1),
        limit: Page.valueOrDefault(filter.limit, 25),
        sort: '-createdAt',
        select: '_id clientId name setupStage year accountingPeriod accountingPeriodType startDate endDate accountingDate status contractType '
          + 'runNo locked createdAt calculationStatus grossAmount grossCosts netAmount netCosts totalContractsForCalculation processEndTime fuga',
        lean: true,
        populate: { path: 'notpublished' },
      };
      const clientId = randomId();
      const query = { ...paginationParams };
      sinon.stub(Period, 'paginate').resolves({ docs: [] });

      await Controller.getPeriods({ clientId, query });
      expect(Period.paginate).to.be.calledWith({ clientId, status: 'Complete' }, paginationParams);
    });

    it('should return periods', async () => {
      const periodMock = {
        docs: [{ _id: randomId(), name: randomString() }],
        totalDocs: randomInt(),
        limit: randomInt(),
        page: randomInt(),
        totalPages: randomInt(),
      };
      const expectedResult = {
        periods: periodMock.docs,
        meta: {
          currentPage: periodMock.page,
          totalPages: periodMock.totalPages,
          total: periodMock.totalDocs,
        },
      };
      const clientId = randomId();
      const query = {};
      sinon.stub(Period, 'paginate').resolves(periodMock);

      const result = await Controller.getPeriods({ clientId, query });
      expect(result).to.deep.eq(expectedResult);
    });
  });

  describe('getPeriod', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };

      try {
        await Controller.getPeriod({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves(null);

      try {
        await Controller.getPeriod({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.getPeriod({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should return period', async () => {
      const periodMock = { _id: randomId(), name: randomString() };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: sinon.stub().returns(periodMock) });

      const result = await Controller.getPeriod({ clientId, periodId, curveUser });
      expect(result).to.equal(periodMock);
    });

    it('should throw forbidden error if no rights found', async () => {
      const periodMock = { _id: randomId(), name: randomString() };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: sinon.stub().returns(periodMock) });
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.getPeriod({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should return period with Published status if all statements published', async () => {
      const periodMock = { _id: randomId(), name: randomString(), status: 'Complete' };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const expectedResult = { ...periodMock, status: 'Published' };
      sinon.stub(Period, 'findById').returns({ select: sinon.stub().returns(periodMock) });
      sinon.stub(Statement, 'countDocuments').resolves(0);

      const result = await Controller.getPeriod({ clientId, periodId, curveUser });
      expect(result).to.eql(expectedResult);
    });

    it('should return period with Complete status if not all statements published', async () => {
      const periodMock = { _id: randomId(), name: randomString(), status: 'Complete' };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const expectedResult = { ...periodMock, status: 'Complete' };
      sinon.stub(Period, 'findById').returns({ select: sinon.stub().returns(periodMock) });
      sinon.stub(Statement, 'countDocuments').resolves(1);

      const result = await Controller.getPeriod({ clientId, periodId, curveUser });
      expect(result).to.eql(expectedResult);
    });

    it('should return period with Complete status if all statements published but published check ignored', async () => {
      const periodMock = { _id: randomId(), name: randomString(), status: 'Complete' };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const expectedResult = { ...periodMock, status: 'Complete' };
      sinon.stub(Period, 'findById').returns({ select: sinon.stub().returns(periodMock) });
      sinon.stub(Statement, 'countDocuments').resolves(0);

      const result = await Controller.getPeriod({ clientId, periodId, curveUser, publishedCheck: false });
      expect(result).to.eql(expectedResult);
    });
  });

  describe('getPeriodStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const query = {};
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves();

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const query = {};
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves(null);

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown period id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const query = {};
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw error if invalid period id', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const query = {};
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).not.to.have.been.called;
      }
    });

    it('should call Statements.paginate with correct params', async () => {
      const filter = { page: randomInt(), limit: randomInt(), orderBy: 'date name', orderDir: 'desc' };
      const paginationParams = {
        page: Page.valueOrDefault(filter.page, 1),
        limit: Page.valueOrDefault(filter.limit, 25),
        sort: Page.sortOrDefault(filter.orderBy, filter.orderDir),
        populate: {
          path: 'contractId',
          model: 'Contract',
          select: 'payees',
          populate: { path: 'payees.payeeId', model: 'Payee', select: 'name' },
        },
        select: 'sendings locked _id clientId periodId contractId name date year accountingPeriod periodType status salesFilesIds costIds '
          + 'releaseIds trackIds workIds openingBalance units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased '
          + 'netOutput closingBalance lines invalidLines profitShareRate profitShareNetAmount currency createdAt contractType pdf statementOfAccount '
          + 'salesCsv costsCsv allFilesZip salesCsvPublicLink costsCsvPublicLink pdfPublicLink statementOfAccountPublicLink allFilesZipPublicLink',
      };
      const clientId = randomId();
      const periodId = randomId();
      const query = { ...paginationParams };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves({ docs: [] });

      await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      expect(Statement.paginate).to.be.calledWith({ clientId, periodId }, paginationParams);
    });

    it('should return statements', async () => {
      const mockStatement = {
        _id: randomId(),
        clientId: randomId(),
        periodId: randomId(),
        currency: randomString(),
        contractId: {
          _id: randomId(),
          payees: [{ payeeId: { name: randomString() } }],
        },
        name: randomString(),
      };
      const statementMock = {
        docs: [mockStatement],
        totalDocs: randomInt(),
        limit: randomInt(),
        page: randomInt(),
        totalPages: randomInt(),
      };
      const expectedResult = {
        statements: [{
          ...statementMock.docs[0],
          contractId: statementMock.docs[0].contractId._id,
          payeeName: mockStatement.contractId.payees[0].payeeId.name,
        }],
        meta: {
          currentPage: statementMock.page,
          totalPages: statementMock.totalPages,
          total: statementMock.totalDocs,
        },
      };
      const clientId = randomId();
      const periodId = randomId();
      const query = {};
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(statementMock);

      const result = await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      expect(result.statements[0]).to.contain(expectedResult.statements[0]);
      expect(result.meta).to.eql(expectedResult.meta);
    });

    it('should return statements with payeeName', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockStatement = {
        _id: randomId(),
        clientId,
        periodId,
        currency: randomString(),
        contractId: { _id: randomId(), payees: [{ payeeId: { name: randomString() } }] },
        name: randomString(),
      };
      const statementMock = { docs: [mockStatement] };
      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(statementMock);

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].payeeName).to.contain(mockStatement.contractId.payees[0].payeeId.name);
    });

    it('should return null currency when statement currency is home currency and client home currency is undefined', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return null currency when statement currency is home currency and client home currency is null', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.resolves({ homeCurrency: null });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return null when statement currency is null', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: null }] };
      Client.findById.resolves({ homeCurrency: 'GBP' });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return null when statement currency is blank', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: '' }] };
      Client.findById.resolves({ homeCurrency: 'GBP' });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return client currency when statement currency is home currency', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.resolves({ homeCurrency: 'GBP' });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements).to.have.length(1);
      expect(result.statements[0].currency).to.eql('GBP');
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockStatement = {
        _id: randomId(),
        clientId,
        periodId,
        currency: randomString(),
        contractId: { _id: randomId(), payees: [{ payeeId: { name: randomString() } }] },
        name: randomString(),
      };
      const statementMock = { docs: [mockStatement] };
      sinon.stub(Period, 'findById').returns({ select: () => ({ clientId }) });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(statementMock);

      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query: {} });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });
  });

  describe('getStatement', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const statementId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves();

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves(null);

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if statement not found', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const curveUser = { clientId, id: clientId };
      sinon.stub(Statement, 'findById').returns({ select: () => null });

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('STATEMENT_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Statement matching this ID: ${statementId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Statement.findById).to.have.been.calledWith(statementId);
      }
    });

    it('should throw error if statement invalid', async () => {
      const clientId = randomId();
      const statementId = 'invalidStatementId';
      const curveUser = { clientId, id: clientId };
      sinon.stub(Statement, 'findById').returns({ select: () => null });

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('STATEMENT_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Statement matching this ID: ${statementId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Statement.findById).not.to.have.been.called;
      }
    });

    it('should throw error if statement client does not match selected client id', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const statementMock = { _id: randomId(), name: randomString(), clientId: 'different-id' };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Statement, 'findById').returns({ select: sinon.stub().resolves(statementMock) });

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('STATEMENT_NOT_FOUND_FOR_CLIENT');
        expect(error.message).to.equal(`Couldn't find a Statement for this Organisation ID: ${clientId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Statement.findById).to.have.been.calledWith(statementId);
      }
    });

    it('should return statement', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const statementMock = { _id: randomId(), name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Statement, 'findById').returns({ select: sinon.stub().resolves(statementMock) });

      const result = await Controller.getStatement({ clientId, statementId, curveUser });
      expect(result).to.deep.eq(statementMock);
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const statementMock = { _id: randomId(), name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Statement, 'findById').returns({ select: sinon.stub().resolves(statementMock) });
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });
  });

  describe('publishAllStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves();

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves(null);

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).not.to.have.been.called;
      }
    });

    it('should throw error if publish all fails', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, status: 'Published' };
      const curveUser = { clientId, id: clientId };
      const expectedUpdateStatusParams = {
        period: { _id: periodMock._id, name: periodMock.name, clientId, status: 'Published' },
        curveUser,
        status: 'Published',
      };

      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(StatementController, 'updateStatementStatus');
      StatementController.updateStatementStatus.throws({ message: 'Unknown error with statement controller' });

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.be.undefined;
        expect(error.cause).to.be.undefined;
        expect(error.message).to.equal('Unknown error with statement controller');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
        expect(StatementController.updateStatementStatus).to.have.been.calledWith(expectedUpdateStatusParams);
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(StatementController, 'updateStatementStatus');
      StatementController.updateStatementStatus.throws({ message: 'Unknown error with statement controller' });

      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should publish and send all statements', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const periodMock = { _id: periodId, name: randomString(), clientId, status: 'Published' };
      const expectedUpdateStatusParams = {
        period: { _id: periodMock._id, name: periodMock.name, clientId, status: 'Published' },
        curveUser,
        status: 'Published',
      };
      const expectedSendStatementParams = {
        period: { _id: periodMock._id, name: periodMock.name, clientId: periodMock.clientId, status: 'Published' },
        curveUser,
        sendAll: true,
      };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(StatementController, 'updateStatementStatus');
      StatementController.updateStatementStatus.resolves();

      sinon.stub(StatementController, 'sendStatements');
      StatementController.sendStatements.resolves();

      await Controller.publishAllStatements({ clientId, periodId, curveUser });
      expect(Client.findById).to.have.been.calledWith(clientId);
      expect(Period.findById).to.have.been.calledWith(periodId);
      expect(StatementController.updateStatementStatus).to.have.been.calledWith(expectedUpdateStatusParams);
      expect(StatementController.sendStatements).to.have.been.calledWith(expectedSendStatementParams);
    });
  });

  describe('validateEmailAddresses', () => {
    it('should not throw error if no email address list', () => {
      Controller.validateEmailAddresses();
    });

    it('should throw error if empty email address list', () => {
      try {
        Controller.validateEmailAddresses([]);
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_EMAIL');
        expect(error.message).to.equal('Emails should be passed as an array of strings.');
      }
    });

    it('should throw error if any invalid email addresses in list', () => {
      try {
        Controller.validateEmailAddresses(['invalid-email', 'no-email', 'test@test.com', 'test2@other-test.com']);
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_EMAIL');
        expect(error.message).to.equal('Emails should be passed as an array of strings.');
      }
    });
  });

  describe('emailAllStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const emailAddresses = [];
      Client.findById.resolves();

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves(null);

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).not.to.have.been.called;
      }
    });

    it('should throw error if email address list invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const emailAddresses = ['invalid', 1];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_EMAIL');
        expect(error.message).to.equal('Emails should be passed as an array of strings.');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw error if task in progress', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = ['test@test.com'];
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(Task, 'countDocuments');
      Task.countDocuments.resolves(1);

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('TASK_ALREADY_RUNNING');
        expect(error.message).to.equal('This task is already running - please wait until it has completed before running again');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = ['test@test.com'];
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(Task, 'countDocuments');
      Task.countDocuments.resolves(1);

      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should create new tasks to send email to email list', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = ['test@test.com'];
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(Task, 'countDocuments');
      Task.countDocuments.resolves(0);

      sinon.stub(Task.prototype, 'save');
      Task.prototype.save.resolves({ _id: randomId() });

      sinon.stub(Statement, 'countDocuments').resolves(1);
      const sendTaskMessageStub = sinon.stub(TaskHelpers, 'sendTaskMessage').resolves();
      const createTaskAndSendMessageSpy = sinon.spy(TaskHelpers, 'createTaskAndSendMessage');
      await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });

      expect(Task.prototype.save.callCount).to.eq(6);
      expect(sendTaskMessageStub.callCount).to.eq(6);
      expect(createTaskAndSendMessageSpy.callCount).to.eq(6);
      const task = createTaskAndSendMessageSpy.getCall(0).args[1];
      expect(task.email).to.eql(emailAddresses[0]);
      expect(task.clientId).to.eql(clientId);
      expect(task.value.periodId).to.eql(periodId);
      expect(task.value.file).to.eql('pdf');

      expect(createTaskAndSendMessageSpy.getCall(0).args[1].value.file).to.eql('pdf');
      expect(createTaskAndSendMessageSpy.getCall(1).args[1].value.file).to.eql('salesCsv');
      expect(createTaskAndSendMessageSpy.getCall(2).args[1].value.file).to.eql('costsCsv');
      expect(createTaskAndSendMessageSpy.getCall(3).args[1].value.file).to.eql('statementOfAccount');
      expect(createTaskAndSendMessageSpy.getCall(4).args[1].value.file).to.eql('feesInvoice');
      expect(createTaskAndSendMessageSpy.getCall(5).args[1].value.file).to.eql('selfBillingInvoice');
    });

    it('should create new tasks to send email to fuga notify emails if no email list provided', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = null;
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const clientMock = { fugaIntegration: { fugaNotifyEmails: ['fuga1@test.com', 'fuga2@test.com'] } };
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves(clientMock);
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(Task, 'countDocuments');
      Task.countDocuments.resolves(0);

      sinon.stub(Task.prototype, 'save');
      Task.prototype.save.resolves({ _id: randomId() });

      sinon.stub(Statement, 'countDocuments').resolves(1);
      const sendTaskMessageStub = sinon.stub(TaskHelpers, 'sendTaskMessage').resolves();
      const createTaskAndSendMessageSpy = sinon.spy(TaskHelpers, 'createTaskAndSendMessage');

      await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });

      expect(Task.prototype.save.callCount).to.eq(6);
      expect(sendTaskMessageStub.callCount).to.eq(6);
      expect(createTaskAndSendMessageSpy.callCount).to.eq(6);

      const task = createTaskAndSendMessageSpy.getCall(0).args[1];
      expect(task.email).to.eql(clientMock.fugaIntegration.fugaNotifyEmails.join(', '));
      expect(task.clientId).to.eql(clientId);
      expect(task.value.periodId).to.eql(periodId);
      expect(task.value.file).to.eql('pdf');

      expect(createTaskAndSendMessageSpy.getCall(0).args[1].value.file).to.eql('pdf');
      expect(createTaskAndSendMessageSpy.getCall(1).args[1].value.file).to.eql('salesCsv');
      expect(createTaskAndSendMessageSpy.getCall(2).args[1].value.file).to.eql('costsCsv');
      expect(createTaskAndSendMessageSpy.getCall(3).args[1].value.file).to.eql('statementOfAccount');
      expect(createTaskAndSendMessageSpy.getCall(4).args[1].value.file).to.eql('feesInvoice');
      expect(createTaskAndSendMessageSpy.getCall(5).args[1].value.file).to.eql('selfBillingInvoice');
    });
  });

  describe('emailSummary', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves();

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      Client.findById.resolves(null);

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).not.to.have.been.called;
      }
    });

    it('should throw error if email address list invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const emailAddresses = ['invalid', 1];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_EMAIL');
        expect(error.message).to.equal('Emails should be passed as an array of strings.');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should call period send statement export if successful', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: sinon.stub() };
      const emailAddresses = ['test@test.com'];
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      expect(periodMock.sendStatementExport).to.have.been.calledOnce;
      expect(periodMock.sendStatementExport).to.have.been.calledWith({ id: clientId, clientId });
    });

    it('should throw error if email address list invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: sinon.stub() };
      const emailAddresses = [1, 'invalid'];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
        expect(periodMock.sendStatementExport).not.to.have.been.called;

        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_EMAIL');
        expect(error.message).to.equal('Emails should be passed as an array of strings.');
      }
    });

    it('should throw error if email address list empty', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: sinon.stub() };
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
        expect(periodMock.sendStatementExport).not.to.have.been.called;

        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_EMAIL');
        expect(error.message).to.equal('Emails should be passed as an array of strings.');
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: sinon.stub() };
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
        expect(periodMock.sendStatementExport).not.to.have.been.called;
      }
    });

    it('should call send statement export with email addresses if provided', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: sinon.stub() };
      const emailAddresses = ['test1@test.com', 'test2@test.com'];
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      expect(periodMock.sendStatementExport).to.have.been.calledWith({ id: clientId, clientId }, ['test1@test.com', 'test2@test.com']);
    });

    it('should call send statement export without email addresses param if not provided', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: sinon.stub() };
      const curveUser = { clientId, id: clientId };
      Client.findById.returns({});
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, curveUser });
      expect(periodMock.sendStatementExport).to.have.been.calledWith({ id: clientId, clientId });
    });

    it('should call send statement export without email addresses param if null', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: sinon.stub() };
      const emailAddresses = null;
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      expect(periodMock.sendStatementExport).to.have.been.calledWith({ id: clientId, clientId });
    });
  });

  describe('updateBlockedStatus', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      Client.findById.resolves();

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      Client.findById.resolves(null);

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      sinon.stub(Period, 'findById').returns({ select: () => null });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('PERIOD_NOT_FOUND');
        expect(error.message).to.equal(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).not.to.have.been.called;
      }
    });

    it('should throw error if blocked status is invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = 'invalid';
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_STATUS');
        expect(error.message).to.equal('Block status should only be Blocked or Unblocked.');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw error if blocked status is missing', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_STATUS');
        expect(error.message).to.equal('Block status should only be Blocked or Unblocked.');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.cause).to.equal('FORBIDDEN');
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Period.findById).to.have.been.calledWith(periodId);
      }
    });

    it('should update period fuga blocked status', async () => {
      const clientId = randomId();
      const clientName = randomString();
      const periodId = randomId();
      const periodName = randomString();
      const periodMock = { _id: periodId, name: periodName, clientId, status: 'Complete', fuga: { blockedStatus: false }, save: sinon.stub().resolves() };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = true;
      const message = 'sample email message body';
      const fugaOrgId = randomInt();
      const mockClient = { clientId, name: clientName, fugaIntegration: { fugaOrgId } };
      const fugaMock = { periodBlockedEmails: ['test@test.com', 'test1@test.com'] };
      Client.findById.resolves(mockClient);
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(AppSettings, 'findOne');
      AppSettings.findOne.resolves({ fuga: fugaMock });

      sinon.stub(sendEmail, 'genericEmail');
      sendEmail.genericEmail.resolves();

      const period = await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser, message });

      expect(periodMock.save).to.have.been.calledOnce;
      expect(period.fuga.blockedStatus).to.equal(blockedStatus);
      expect(period.status).to.equal('Complete');
    });

    it('should send email when period is blocked', async () => {
      const clientId = randomId();
      const clientName = randomString();
      const periodId = randomId();
      const periodName = randomString();
      const periodMock = { _id: periodId, name: periodName, clientId, fuga: { blockedStatus: false }, save: sinon.stub().resolves() };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = true;
      const message = randomString();
      const fugaOrgId = randomInt();
      const mockClient = { clientId, name: clientName, fugaIntegration: { fugaOrgId } };
      const fugaMock = { periodBlockedEmails: ['test@test.com', 'test1@test.com'] };
      Client.findById.resolves(mockClient);
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(AppSettings, 'findOne');
      AppSettings.findOne.resolves({ fuga: fugaMock });

      sinon.stub(sendEmail, 'genericEmail');
      sendEmail.genericEmail.resolves();

      await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser, message });

      expect(sendEmail.genericEmail).to.have.been.calledOnce;
      expect(sendEmail.genericEmail.getCall(0).args[0]).to.eql(fugaMock.periodBlockedEmails);
      expect(sendEmail.genericEmail.getCall(0).args[1]).to.eq(mockClient);
      expect(sendEmail.genericEmail.getCall(0).args[2]).to.eq(`FUGA Splits Client ${clientName} (${fugaOrgId}) has blocked the Period ${periodName} (${periodId})`);
    });

    it('should send email when period is unblocked', async () => {
      const clientId = randomId();
      const clientName = randomString();
      const periodId = randomId();
      const periodName = randomString();
      const periodMock = { _id: periodId, name: periodName, clientId, fuga: { blockedStatus: true }, save: sinon.stub().resolves() };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      const message = randomString();
      const fugaOrgId = randomInt();
      const mockClient = { clientId, name: clientName, fugaIntegration: { fugaOrgId } };
      const fugaMock = { periodBlockedEmails: ['test@test.com', 'test1@test.com'] };
      Client.findById.resolves(mockClient);
      sinon.stub(Period, 'findById').returns({ select: () => periodMock });

      sinon.stub(AppSettings, 'findOne');
      AppSettings.findOne.resolves({ fuga: fugaMock });

      sinon.stub(sendEmail, 'genericEmail');
      sendEmail.genericEmail.resolves();

      await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser, message });

      expect(sendEmail.genericEmail).to.have.been.calledOnce;
      expect(sendEmail.genericEmail.getCall(0).args[0]).to.eql(fugaMock.periodBlockedEmails);
      expect(sendEmail.genericEmail.getCall(0).args[1]).to.eq(mockClient);
      expect(sendEmail.genericEmail.getCall(0).args[2]).to.eq(`FUGA Splits Client ${clientName} (${fugaOrgId}) has unblocked the Period ${periodName} (${periodId})`);
    });
  });

  describe('getClientStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const query = {};
      Client.findById.resolves();

      try {
        await Controller.getClientStatements({ clientId, query });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const query = {};
      Client.findById.resolves(null);

      try {
        await Controller.getClientStatements({ clientId, query });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should call Statement.paginate with correct params', async () => {
      const filter = { page: randomInt(), limit: randomInt(), orderBy: 'date name', orderDir: 'desc' };
      const paginationParams = {
        page: Page.valueOrDefault(filter.page, 1),
        limit: Page.valueOrDefault(filter.limit, 25),
        sort: Page.sortOrDefault(filter.orderBy, filter.orderDir),
        populate: {
          path: 'contractId',
          model: 'Contract',
          select: 'payees',
          populate: { path: 'payees.payeeId', model: 'Payee', select: 'name' },
        },
        select: 'sendings locked _id clientId periodId contractId name date year accountingPeriod periodType status salesFilesIds costIds '
          + 'releaseIds trackIds workIds openingBalance units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased '
          + 'netOutput closingBalance lines invalidLines profitShareRate profitShareNetAmount currency createdAt contractType pdf statementOfAccount '
          + 'salesCsv costsCsv allFilesZip salesCsvPublicLink costsCsvPublicLink pdfPublicLink statementOfAccountPublicLink allFilesZipPublicLink',
      };
      const clientId = randomId();
      const query = { ...paginationParams };

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves({ docs: [] });

      await Controller.getClientStatements({ clientId, query });
      expect(Statement.paginate).to.be.calledWith({ clientId }, paginationParams);
    });

    it('should return statements', async () => {
      const mockStatement = {
        _id: randomId(),
        clientId: randomId(),
        periodId: randomId(),
        contractId: { _id: randomId(), payees: [{ payeeId: { name: randomString() } }] },
        name: randomString(),
      };
      const mockPaginate = {
        docs: [mockStatement],
        totalDocs: randomInt(),
        limit: randomInt(),
        page: randomInt(),
        totalPages: randomInt(),
      };

      const expectedStatements = [{
        ...mockStatement,
        contractId: mockStatement.contractId._id,
        payeeName: mockStatement.contractId.payees[0].payeeId.name,
      }];
      const expectedMeta = {
        currentPage: mockPaginate.page,
        totalPages: mockPaginate.totalPages,
        total: mockPaginate.totalDocs,
      };
      const clientId = randomId();
      const query = {};

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query });

      expect(result.statements).to.have.length(1);
      expect(result.statements[0]).to.contain(expectedStatements[0]);
      expect(result.meta).to.eql(expectedMeta);
    });

    it('should return statements with payee name', async () => {
      const clientId = randomId();
      const mockStatement = {
        _id: randomId(),
        clientId,
        periodId: randomId(),
        contractId: { _id: randomId(), payees: [{ payeeId: { name: randomString() } }] },
        name: randomString(),
      };
      const mockPaginate = { docs: [mockStatement] };

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].payeeName).to.contain(mockStatement.contractId.payees[0].payeeId.name);
    });

    it('should return null currency when statement currency is home currency and client home currency is undefined', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return null currency when statement currency is home currency and client home currency is null', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.resolves({ homeCurrency: null });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return null when statement currency is null', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: null }] };
      Client.findById.resolves({ homeCurrency: 'GBP' });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return null when statement currency is blank', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: '' }] };
      Client.findById.resolves({ homeCurrency: 'GBP' });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).to.be.null;
    });

    it('should return client currency when statement currency is home currency', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.resolves({ homeCurrency: 'GBP' });

      sinon.stub(Statement, 'paginate');
      Statement.paginate.resolves(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements).to.have.length(1);
      expect(result.statements[0].currency).to.eql('GBP');
    });
  });

  describe('getWhiteLabelStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const subOrgId = randomString();
      Client.findById.resolves();

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('INVALID_CLIENT_ID');
        expect(error.message).to.equal('Valid organisation ID required');
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      Client.findById.resolves(null);

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('CLIENT_NOT_FOUND');
        expect(error.message).to.equal('Organisation not found');
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if sub organisation id not provided', async () => {
      const clientId = randomId();
      const subOrgId = null;

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).to.equal(400);
        expect(error.cause).to.equal('FIELDS_REQUIRED');
        expect(error.message).to.equal('Sub Organisation ID required');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).not.to.have.been.called;
      }
    });

    it('should throw error if sub organisation id not found', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      Payee.findOne.resolves(null);

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).to.equal(404);
        expect(error.cause).to.equal('SUB_ORG_PAYEE_NOT_FOUND');
        expect(error.message).to.equal(`Payee not found for Sub Org Id: ${subOrgId}`);
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).to.have.been.calledWith({ clientId, foreignId: subOrgId });
      }
    });

    it('should return statements', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const contractsMock = [{ _id: randomId() }, { _id: randomId() }];
      const statementDataMock = { id: randomId(), name: randomString(), allFilesZipPublicLink: randomString() };
      const statementMock = { skip: () => ({ sort: () => ({ limit: () => [statementDataMock] }) }) };
      const clientId = randomId();
      const subOrgId = randomString();

      Client.findById.resolves({});

      Payee.findOne.resolves(payeeMock);
      sinon.stub(Contract, 'find').resolves(contractsMock);
      sinon.stub(Statement, 'find').returns(statementMock);

      const result = await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });

      expect(result[0].id).to.equal(statementDataMock.id);
      expect(result[0].name).to.eq(statementDataMock.name);
      expect(result[0].packageLink).to.eq(statementDataMock.allFilesZipPublicLink);
      expect(result[0].url).to.include(`curveroyaltysystems.com/#/statements/${statementDataMock.id}`);
    });

    it('should throw forbidden error if no rights found', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const clientId = randomId();
      const subOrgId = randomString();
      Payee.findOne.resolves(payeeMock);
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).to.equal(403);
        expect(error.message).to.equal('Forbidden');
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).to.have.been.calledWith({ clientId, foreignId: subOrgId });
      }
    });
  });

  describe('getWhiteLabelStatement', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const subOrgId = randomString();
      const statementId = randomId();
      Client.findById.resolves();

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      Client.findById.resolves(null);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).to.contain({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if sub organisation id not provided', async () => {
      const clientId = randomId();
      const subOrgId = null;
      const statementId = randomId();

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'FIELDS_REQUIRED', message: 'Sub Organisation ID required' });
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).not.to.have.been.called;
      }
    });

    it('should throw error if sub organisation id not found', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      Payee.findOne.resolves(null);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).to.contain({ code: 404, cause: 'SUB_ORG_PAYEE_NOT_FOUND', message: `Payee not found for Sub Org Id: ${subOrgId}` });
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).to.have.been.calledWith({ clientId, foreignId: subOrgId });
      }
    });

    it('should throw error if statement id not provided', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = null;
      Payee.findOne.resolves({});

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'INVALID_STATEMENT_ID', message: 'Valid Statement ID required' });
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).to.have.been.called;
      }
    });

    it('should throw error if statement id not found', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      Payee.findOne.resolves({});
      sinon.stub(Statement, 'findById').resolves(null);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).to.contain({ code: 404, cause: 'STATEMENT_NOT_FOUND', message: `Statement not found with ID ${statementId}` });
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).to.have.been.called;
        expect(Statement.findById).to.have.been.called;
      }
    });

    it('should return statement', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const contractMock = { _id: randomId(), currency: 'Home Currency' };
      const statementDataMock = { id: randomId(), name: randomString(), allFilesZipPublicLink: randomString() };
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();

      Client.findById.resolves({ _id: clientId });

      sinon.stub(Client, 'findOne');
      Client.findOne.resolves({ _id: clientId, homeCurrency: 'GBP' });

      Payee.findOne.resolves(payeeMock);
      sinon.stub(Contract, 'findOne').resolves(contractMock);
      sinon.stub(Statement, 'findById').resolves(statementDataMock);
      const expectedResult = {
        currency: 'GBP',
        packageLink: statementDataMock.allFilesZipPublicLink,
        totals: { streams: 0, downloads: 0, netRevenue: undefined, salesIncome: undefined, mutationsTotals: undefined },
        financialTotals: [{ salesIncome: undefined, companyRoyalty: undefined, mutationsTotals: undefined, royaltiesEarned: undefined, organizationName: undefined }],
        topNetRevenues: { assets: undefined, labels: [], stores: undefined, artists: [], products: undefined, countries: undefined },
      };

      const result = await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });

      expect(result).to.deep.equal(expectedResult);
    });

    it('should throw forbidden error if no rights found', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const contractMock = { _id: randomId(), currency: 'Home Currency' };
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      sinon.stub(Client, 'findOne').resolves({ _id: clientId, homeCurrency: 'GBP' });
      Payee.findOne.resolves(payeeMock);
      sinon.stub(Contract, 'findOne').resolves(contractMock);
      sinon.stub(Statement, 'findById').resolves({});
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).to.contain({ code: 403, message: 'Forbidden' });
        expect(Client.findById).to.have.been.calledWith(clientId);
        expect(Payee.findOne).to.have.been.calledWith({ clientId, foreignId: subOrgId });
      }
    });
  });

  describe('getTrack', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const curveUser = { clientId };
      Client.findById.resolves();

      try {
        await Controller.getTrack({ curveUser, trackId: randomId(), fugaId: null });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.to.have.been.calledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const curveUser = { clientId };
      Client.findById.resolves(null);

      try {
        await Controller.getTrack({ curveUser, trackId: randomId, fugaId: null });
      } catch (error) {
        expect(error).to.contain({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).to.have.been.calledWith(clientId);
      }
    });

    it('should return track with curve track id', async () => {
      const clientId = randomId();
      const curveUser = { clientId };
      Client.findById.resolves({ _id: clientId });
      const mockTrack = { _id: randomId(), title: randomString(), version: randomString(), isrc: randomString(), artist: randomString(), salesReturnsRights: [], alternativeId: randomString(), tags: ['foo'] };
      Track.findOne.returns({ lean: () => ({ exec: () => mockTrack }) });
      const expectedTrack = {
        id: mockTrack._id,
        fugaId: null,
        title: mockTrack.title,
        version: mockTrack.version,
        isrc: mockTrack.isrc,
        artist: mockTrack.artist,
        alternativeId: mockTrack.alternativeId,
        tags: mockTrack.tags,
        duration: null,
        payeeCount: 0,
        releases: [],
        contracts: [],
      };

      const result = await Controller.getTrack({ curveUser, trackId: randomId(), fugaId: null });

      expect(result).to.deep.equal(expectedTrack);
    });

    it('should return track with fuga id', async () => {
      const clientId = randomId();
      const fugaId = randomInt();
      const curveUser = { clientId };
      Client.findById.resolves({ _id: clientId });
      const mockTrack = { _id: randomId(), title: randomString(), version: randomString(), isrc: randomString(), artist: randomString(), salesReturnsRights: [], alternativeId: randomString(), tags: ['foo'], fugaId };
      Track.findOne.returns({ lean: () => ({ exec: () => mockTrack }) });
      const expectedTrack = {
        id: mockTrack._id,
        fugaId,
        title: mockTrack.title,
        version: mockTrack.version,
        isrc: mockTrack.isrc,
        artist: mockTrack.artist,
        alternativeId: mockTrack.alternativeId,
        tags: mockTrack.tags,
        duration: null,
        payeeCount: 0,
        releases: [],
        contracts: [],
      };

      const result = await Controller.getTrack({ curveUser, trackId: null, fugaId });

      expect(result).to.deep.equal(expectedTrack);
    });

    it('should throw error if track not found', async () => {
      const curveUser = { clientId: randomId() };
      const trackId = randomId();
      Track.findOne.returns({ lean: () => ({ exec: () => null }) });

      try {
        await Controller.getTrack({ curveUser, trackId, fugaId: null });
      } catch (error) {
        expect(error).to.contain({ code: 404, cause: 'TRACK_NOT_FOUND', message: `Track not found with ID ${trackId}` });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });
  });

  describe('upsertTracks', () => {
    it('should throw error if invalid client id', async () => {
      const curveUser = { clientId: 'invalid_id', id: randomId() };
      const trackData = {};
      Client.findById.resolves();

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = {};
      Client.findById.resolves();

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).to.contain({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if no fugaId or trackId', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = {};

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'FIELDS_REQUIRED', message: 'FugaId or TrackId is required' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if total percentage greater than 100', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = { fugaId: randomString(), contracts: [{ percentage: 101 }] };

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'TOTAL_SHARES_LIMIT_EXCEEDED', message: 'Total shares must be between 0 and 100' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if access is forbidden', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = { fugaId: randomString(), contracts: [{ percentage: 100 }] };
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).to.contain({ code: 403, message: 'Forbidden' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should return updated track', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const contractId = randomId();
      const fugaId = randomString();
      const trackData = { fugaId, contracts: [{ contractId, percentage: 100 }] };
      const trackId = randomId();
      const mockTrack = {
        fugaId,
        contracts: [],
        artist: randomString(),
        duration: randomInt(),
        isrc: randomString(),
        title: randomString(),
        version: randomString(),
        alternativeId: randomString(),
        tags: ['foo'],
      };
      Track.findOne.resolves({ ...mockTrack, _id: trackId, save: sinon.stub().resolves(), salesReturnsRights: [{ contractId }] });
      sinon.stub(Track.prototype, 'save').resolves({});
      sinon.stub(Contract, 'findOne').resolves({ _id: contractId });

      const track = await Controller.upsertTracks({ curveUser, trackData });
      expect(track).to.deep.equal({ ...mockTrack, id: trackId, releases: [], payeeCount: 0 });
    });

    it('should return created track', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = {
        fugaId: randomString(),
        contracts: [{ percentage: 100 }],
        artist: randomString(),
        duration: randomInt(),
        isrc: randomString(),
        title: randomString(),
        version: randomString(),
      };
      const mockTrack = { ...trackData, contracts: [] };
      sinon.stub(Track.prototype, 'save').resolves({});
      sinon.stub(Contract, 'findById').resolves({});

      const track = await Controller.upsertTracks({ curveUser, trackData });
      expect(track).to.deep.contain(mockTrack);
    });
  });

  describe('upsertReleases', () => {
    it('should throw error if invalid client id', async () => {
      const curveUser = { clientId: 'invalid_id', id: randomId() };
      const releaseData = {};
      Client.findById.resolves();

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = {};
      Client.findById.resolves();

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).to.contain({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if no fugaId', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = {};

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'FIELDS_REQUIRED', message: 'FugaId is required' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if total percentage greater than 100', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = { fugaId: randomString(), contracts: [{ percentage: 101 }] };

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).to.contain({ code: 400, cause: 'TOTAL_SHARES_LIMIT_EXCEEDED', message: 'Total shares must be between 0 and 100' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should throw error if access is forbidden', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = { fugaId: randomString(), contracts: [{ percentage: 100 }] };
      UserAccess.isUserForbidden.resolves(true);

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).to.contain({ code: 403, message: 'Forbidden' });
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
      }
    });

    it('should return updated release', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const contractId = randomId();
      const fugaId = randomString();
      const barcode = randomString();
      const releaseData = { fugaId, barcode, contracts: [{ contractId, percentage: 100 }], tracks: [], label: '', releaseDate: '' };
      const mockRelease = {
        _id: randomId(),
        fugaId,
        barcode,
        catNo: randomString(),
        contracts: [{}],
        tracks: [],
        label: '',
        releaseDate: '',
        artist: randomString(),
        title: randomString(),
        version: randomString(),
      };
      Release.findOne.resolves({ ...mockRelease, save: sinon.stub().resolves(), salesReturnsRights: [{ contractId }] });
      sinon.stub(Release.prototype, 'save').resolves({});
      sinon.stub(Contract, 'findOne').resolves({ _id: contractId });

      const release = await Controller.upsertReleases({ curveUser, releaseData });
      expect(release).to.deep.equal(mockRelease);
    });

    it('should return created release', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const contractId = randomId();
      const fugaId = randomString();
      const barcode = randomString();
      const releaseData = { fugaId, barcode, contracts: [{ contractId, percentage: 100 }], tracks: [], label: '' };
      const mockRelease = { ...releaseData, contracts: [] };
      sinon.stub(Release.prototype, 'save').resolves({});
      sinon.stub(Contract, 'findById').resolves({});

      const release = await Controller.upsertReleases({ curveUser, releaseData });
      expect(release).to.deep.contain(mockRelease);
    });
  });
});
