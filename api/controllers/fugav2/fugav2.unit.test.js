const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');

const AppSettings = require('../../models/appSettings');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Period = require('../../models/period');
const Release = require('../../models/release');
const Statement = require('../../models/statement');
const Task = require('../../models/task');
const Track = require('../../models/track');
const User = require('../../models/user');

const sendEmail = require('../../libs/sendEmail');

const StatementController = require('../statement');
const { mainController: Controller } = require('./index');

describe('FugaController', () => {
  beforeEach(() => {
    jest.spyOn(Client, 'findById').mockResolvedValue({});
    jest.spyOn(Payee, 'findOne').mockReturnValue(undefined);
    jest.spyOn(Payee.prototype, 'save').mockResolvedValue();
    jest.spyOn(Track, 'findOne').mockReturnValue(undefined);
    jest.spyOn(Track, 'findById').mockReturnValue(undefined);
    jest.spyOn(Track, 'paginate').mockReturnValue(undefined);
    jest.spyOn(Release, 'findOne').mockReturnValue(undefined);
    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(false);
    jest.spyOn(Statement, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(Release, 'find').mockReturnValue({ lean: () => ({ exec: () => [] }) });
    jest.spyOn(Contract, 'findById').mockResolvedValue(undefined);
    jest.spyOn(Contract, 'findOne').mockResolvedValue(undefined);
    jest.spyOn(Payee, 'findById').mockResolvedValue(undefined);
    jest.spyOn(User, 'find').mockResolvedValue([]);
  });

  describe('formatRelease', () => {
    it('should return release with label', async () => {
      const _id = randomId();
      const title = randomString();
      const label = randomString();
      const mockRelease = { _id, title, salesReturnsRights: [], trackIds: [], label };
      const expectedRelease = { _id, title, label };

      const release = await Controller.formatRelease(mockRelease);

      expect(release).toMatchObject(expectedRelease);
    });

    it('should return release with defult label if none found', async () => {
      const _id = randomId();
      const title = randomString();
      const mockRelease = { _id, title, salesReturnsRights: [], trackIds: [] };
      const expectedRelease = { _id, title, label: '' };

      const release = await Controller.formatRelease(mockRelease);

      expect(release).toMatchObject(expectedRelease);
    });

    it('should skip track contracts with no payees', async () => {
      const contractId = randomId();
      const trackId = randomId();
      const mockTrack = { _id: trackId, clientId: randomId(), title: randomString(), salesReturnsRights: [{ contractId, percentage: 50 }] };
      const mockRelease = { _id: randomId(), title: randomString(), salesReturnsRights: [{ contractId, percentage: 50 }], trackIds: [trackId] };
      Contract.findById.mockResolvedValue({ _id: contractId, payees: [] });
      Track.findById.mockResolvedValue(mockTrack);

      const release = await Controller.formatRelease(mockRelease);

      expect(release.tracks).toHaveLength(1);
      expect(release.tracks[0].contracts).toEqual([]);
    });
  });

  describe('updateTrack', () => {
    it('should skip contract entries with no matching contract for the payee', async () => {
      const track = { clientId: randomId(), salesReturnsRights: [], save: jest.fn() };
      const params = { contracts: [{ payeeId: randomId(), percentage: 50 }] };
      Contract.findOne.mockResolvedValue(null);

      const result = await Controller.updateTrack({ track, params, clientId: track.clientId });

      expect(result.salesReturnsRights).toEqual([]);
      expect(track.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateRelease', () => {
    it('should update and return release with label', async () => {
      const mockRelease = { _id: randomString(), title: randomString(), salesReturnsRights: [], trackIds: [], save: jest.fn() };
      const params = {
        title: randomString(),
        version: randomString(),
        artist: randomString(),
        releaseDate: randomString(),
        label: randomString(),
      };
      const expectedRelease = { ...params };

      const release = await Controller.updateRelease(mockRelease, params);

      expect(release).toMatchObject(expectedRelease);
      expect(mockRelease.save).toHaveBeenCalledTimes(1);
    });

    it('should update return release with default label', async () => {
      const mockRelease = { _id: randomString(), title: randomString(), salesReturnsRights: [], trackIds: [], save: jest.fn() };
      const params = {
        title: randomString(),
        version: randomString(),
        artist: randomString(),
        releaseDate: randomString(),
      };
      const expectedRelease = { ...params, label: '' };

      const release = await Controller.updateRelease(mockRelease, params);

      expect(release).toMatchObject(expectedRelease);
      expect(mockRelease.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('createPayee', () => {
    it('should return payee if found', async () => {
      const clientId = randomId();
      const name = randomString();
      const _id = randomId();
      const email = randomString();
      const payeeMock = { _id, clientId, name, email, save: jest.fn() };
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Payee.findOne.mockReturnValue({ lean: () => ({ exec: () => payeeMock }) });

      const payee = await Controller.createPayee({ curveUser, newPayee });

      expect(payee).toMatchObject({ _id, clientId, name, email });
      expect(Payee.prototype.save).not.toHaveBeenCalledTimes(1);
    });

    it('should create new payee', async () => {
      const clientId = randomId();
      const name = randomString();
      const email = randomString();
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Payee.findOne.mockReturnValue({ lean: () => ({ exec: () => null }) });
      jest.spyOn(Contract.prototype, 'save').mockResolvedValue({});
      jest.spyOn(User, 'createUser').mockImplementation((...cbArgs) => cbArgs[cbArgs.length - 1](null, {}));

      const payee = await Controller.createPayee({ curveUser, newPayee });

      expect(payee).toMatchObject({ clientId, name, email });
      expect(UserAccess.isUserForbidden).toHaveBeenCalledTimes(1);
      expect(Payee.prototype.save).toHaveBeenCalledTimes(1);
      expect(Contract.prototype.save).toHaveBeenCalledTimes(1);
      expect(User.createUser).toHaveBeenCalledTimes(1);
    });

    it('should throw throw forbidden error if no permissions to create payee', async () => {
      const clientId = randomId();
      const name = randomString();
      const email = randomString();
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Payee.findOne.mockReturnValue({ lean: () => ({ exec: () => null }) });
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.createPayee({ curveUser, newPayee });
      } catch (error) {
        expect(UserAccess.isUserForbidden).toHaveBeenCalledTimes(1);
        expect(Payee.prototype.save).not.toHaveBeenCalledTimes(1);

        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
      }
    });

    it('should throw throw error if invalid client', async () => {
      const clientId = randomId();
      const name = randomString();
      const email = randomString();
      const newPayee = { name, email };
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue();
      Payee.findOne.mockReturnValue({ lean: () => ({ exec: () => null }) });
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.createPayee({ curveUser, newPayee });
      } catch (error) {
        expect(Payee.prototype.save).not.toHaveBeenCalledTimes(1);
        expect(error.code).toBe(404);
        expect(error.message).toBe('Organisation not found');
      }
    });
  });

  describe('getPeriods', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const query = {};
      Client.findById.mockResolvedValue();

      try {
        await Controller.getPeriods({ clientId, query });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const query = {};
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getPeriods({ clientId, query });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
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
      jest.spyOn(Period, 'paginate').mockResolvedValue({ docs: [] });

      await Controller.getPeriods({ clientId, query });
      expect(Period.paginate).toHaveBeenCalledWith({ clientId, status: 'Complete' }, paginationParams);
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
      jest.spyOn(Period, 'paginate').mockResolvedValue(periodMock);

      const result = await Controller.getPeriods({ clientId, query });
      expect(result).toEqual(expectedResult);
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
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getPeriod({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.getPeriod({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should return period', async () => {
      const periodMock = { _id: randomId(), name: randomString() };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: jest.fn().mockReturnValue(periodMock) });

      const result = await Controller.getPeriod({ clientId, periodId, curveUser });
      expect(result).toBe(periodMock);
    });

    it('should throw forbidden error if no rights found', async () => {
      const periodMock = { _id: randomId(), name: randomString() };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: jest.fn().mockReturnValue(periodMock) });
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.getPeriod({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should return period with Published status if all statements published', async () => {
      const periodMock = { _id: randomId(), name: randomString(), status: 'Complete' };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const expectedResult = { ...periodMock, status: 'Published' };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: jest.fn().mockReturnValue(periodMock) });
      jest.spyOn(Statement, 'countDocuments').mockResolvedValue(0);

      const result = await Controller.getPeriod({ clientId, periodId, curveUser });
      expect(result).toEqual(expectedResult);
    });

    it('should return period with Complete status if not all statements published', async () => {
      const periodMock = { _id: randomId(), name: randomString(), status: 'Complete' };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const expectedResult = { ...periodMock, status: 'Complete' };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: jest.fn().mockReturnValue(periodMock) });
      jest.spyOn(Statement, 'countDocuments').mockResolvedValue(1);

      const result = await Controller.getPeriod({ clientId, periodId, curveUser });
      expect(result).toEqual(expectedResult);
    });

    it('should return period with Complete status if all statements published but published check ignored', async () => {
      const periodMock = { _id: randomId(), name: randomString(), status: 'Complete' };
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const expectedResult = { ...periodMock, status: 'Complete' };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: jest.fn().mockReturnValue(periodMock) });
      jest.spyOn(Statement, 'countDocuments').mockResolvedValue(0);

      const result = await Controller.getPeriod({ clientId, periodId, curveUser, publishedCheck: false });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getPeriodStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const query = {};
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue();

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const query = {};
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown period id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const query = {};
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw error if invalid period id', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const query = {};
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).not.toHaveBeenCalled();
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
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue({ docs: [] });

      await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      expect(Statement.paginate).toHaveBeenCalledWith({ clientId, periodId }, paginationParams);
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
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(statementMock);

      const result = await Controller.getPeriodStatements({ clientId, periodId, query, curveUser });
      expect(result.statements[0]).toMatchObject(expectedResult.statements[0]);
      expect(result.meta).toEqual(expectedResult.meta);
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
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(statementMock);

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].payeeName).toContain(mockStatement.contractId.payees[0].payeeId.name);
    });

    it('should return null currency when statement currency is home currency and client home currency is undefined', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return null currency when statement currency is home currency and client home currency is null', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.mockResolvedValue({ homeCurrency: null });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return null when statement currency is null', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: null }] };
      Client.findById.mockResolvedValue({ homeCurrency: 'GBP' });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return null when statement currency is blank', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: '' }] };
      Client.findById.mockResolvedValue({ homeCurrency: 'GBP' });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return client currency when statement currency is home currency', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.mockResolvedValue({ homeCurrency: 'GBP' });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      const result = await Controller.getPeriodStatements({ clientId, periodId, query: {} });

      expect(result.statements).toHaveLength(1);
      expect(result.statements[0].currency).toEqual('GBP');
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
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => ({ clientId }) });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(statementMock);

      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.getPeriodStatements({ clientId, periodId, query: {} });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });
  });

  describe('getStatement', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const statementId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue();

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if statement not found', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Statement, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('STATEMENT_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Statement matching this ID: ${statementId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Statement.findById).toHaveBeenCalledWith(statementId);
      }
    });

    it('should throw error if statement invalid', async () => {
      const clientId = randomId();
      const statementId = 'invalidStatementId';
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Statement, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('STATEMENT_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Statement matching this ID: ${statementId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Statement.findById).not.toHaveBeenCalled();
      }
    });

    it('should throw error if statement client does not match selected client id', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const statementMock = { _id: randomId(), name: randomString(), clientId: 'different-id' };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Statement, 'findById').mockReturnValue({ select: jest.fn().mockResolvedValue(statementMock) });

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('STATEMENT_NOT_FOUND_FOR_CLIENT');
        expect(error.message).toBe(`Couldn't find a Statement for this Organisation ID: ${clientId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Statement.findById).toHaveBeenCalledWith(statementId);
      }
    });

    it('should return statement', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const statementMock = { _id: randomId(), name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Statement, 'findById').mockReturnValue({ select: jest.fn().mockResolvedValue(statementMock) });

      const result = await Controller.getStatement({ clientId, statementId, curveUser });
      expect(result).toEqual(statementMock);
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const statementId = randomId();
      const statementMock = { _id: randomId(), name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Statement, 'findById').mockReturnValue({ select: jest.fn().mockResolvedValue(statementMock) });
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.getStatement({ clientId, statementId, curveUser });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });
  });

  describe('publishAllStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue();

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).not.toHaveBeenCalled();
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

      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(StatementController, 'updateStatementStatus').mockReturnValue(undefined);
      StatementController.updateStatementStatus.mockImplementation(() => { throw new Error('Unknown error with statement controller'); });

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBeUndefined();
        expect(error.cause).toBeUndefined();
        expect(error.message).toBe('Unknown error with statement controller');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
        expect(StatementController.updateStatementStatus).toHaveBeenCalledWith(expectedUpdateStatusParams);
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(StatementController, 'updateStatementStatus').mockReturnValue(undefined);
      StatementController.updateStatementStatus.mockImplementation(() => { throw new Error('Unknown error with statement controller'); });

      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.publishAllStatements({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
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
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(StatementController, 'updateStatementStatus').mockReturnValue(undefined);
      StatementController.updateStatementStatus.mockResolvedValue();

      jest.spyOn(StatementController, 'sendStatements').mockReturnValue(undefined);
      StatementController.sendStatements.mockResolvedValue();

      await Controller.publishAllStatements({ clientId, periodId, curveUser });
      expect(Client.findById).toHaveBeenCalledWith(clientId);
      expect(Period.findById).toHaveBeenCalledWith(periodId);
      expect(StatementController.updateStatementStatus).toHaveBeenCalledWith(expectedUpdateStatusParams);
      expect(StatementController.sendStatements).toHaveBeenCalledWith(expectedSendStatementParams);
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
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_EMAIL');
        expect(error.message).toBe('Emails should be passed as an array of strings.');
      }
    });

    it('should throw error if any invalid email addresses in list', () => {
      try {
        Controller.validateEmailAddresses(['invalid-email', 'no-email', 'test@test.com', 'test2@other-test.com']);
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_EMAIL');
        expect(error.message).toBe('Emails should be passed as an array of strings.');
      }
    });
  });

  describe('emailAllStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const emailAddresses = [];
      Client.findById.mockResolvedValue();

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).not.toHaveBeenCalled();
      }
    });

    it('should throw error if email address list invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const emailAddresses = ['invalid', 1];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_EMAIL');
        expect(error.message).toBe('Emails should be passed as an array of strings.');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw error if task in progress', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = ['test@test.com'];
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(Task, 'countDocuments').mockReturnValue(undefined);
      Task.countDocuments.mockResolvedValue(1);

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('TASK_ALREADY_RUNNING');
        expect(error.message).toBe('This task is already running - please wait until it has completed before running again');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = ['test@test.com'];
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(Task, 'countDocuments').mockReturnValue(undefined);
      Task.countDocuments.mockResolvedValue(1);

      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should create new tasks to send email to email list', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = ['test@test.com'];
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(Task, 'countDocuments').mockReturnValue(undefined);
      Task.countDocuments.mockResolvedValue(0);

      jest.spyOn(Task.prototype, 'save').mockReturnValue(undefined);
      Task.prototype.save.mockResolvedValue({});

      jest.spyOn(Statement, 'countDocuments').mockResolvedValue(1);
      const sendTaskMessageStub = jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
      const createTaskAndSendMessageSpy = jest.spyOn(TaskHelpers, 'createTaskAndSendMessage');
      await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });

      expect(Task.prototype.save).toHaveBeenCalledTimes(6);
      expect(sendTaskMessageStub).toHaveBeenCalledTimes(6);
      expect(createTaskAndSendMessageSpy).toHaveBeenCalledTimes(6);

      const task = createTaskAndSendMessageSpy.mock.calls[0][1];
      expect(task.email).toEqual(emailAddresses[0]);
      expect(task.clientId).toEqual(clientId);
      expect(task.value.periodId).toEqual(periodId);
      expect(task.value.file).toEqual('pdf');

      expect(createTaskAndSendMessageSpy.mock.calls[0][1].value.file).toEqual('pdf');
      expect(createTaskAndSendMessageSpy.mock.calls[1][1].value.file).toEqual('salesCsv');
      expect(createTaskAndSendMessageSpy.mock.calls[2][1].value.file).toEqual('costsCsv');
      expect(createTaskAndSendMessageSpy.mock.calls[3][1].value.file).toEqual('statementOfAccount');
      expect(createTaskAndSendMessageSpy.mock.calls[4][1].value.file).toEqual('feesInvoice');
      expect(createTaskAndSendMessageSpy.mock.calls[5][1].value.file).toEqual('selfBillingInvoice');
    });

    it('should create new tasks to send email to fuga notify emails if no email list provided', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = null;
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const clientMock = { fugaIntegration: { fugaNotifyEmails: ['fuga1@test.com', 'fuga2@test.com'] } };
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue(clientMock);
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(Task, 'countDocuments').mockReturnValue(undefined);
      Task.countDocuments.mockResolvedValue(0);

      jest.spyOn(Task.prototype, 'save').mockReturnValue(undefined);
      Task.prototype.save.mockResolvedValue({});

      jest.spyOn(Statement, 'countDocuments').mockResolvedValue(1);
      const sendTaskMessageStub = jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
      const createTaskAndSendMessageSpy = jest.spyOn(TaskHelpers, 'createTaskAndSendMessage');
      await Controller.emailAllStatements({ clientId, periodId, emailAddresses, curveUser });

      expect(Task.prototype.save).toHaveBeenCalledTimes(6);
      expect(sendTaskMessageStub).toHaveBeenCalledTimes(6);
      expect(createTaskAndSendMessageSpy).toHaveBeenCalledTimes(6);

      const task = createTaskAndSendMessageSpy.mock.calls[0][1];
      expect(task.email).toEqual(clientMock.fugaIntegration.fugaNotifyEmails.join(', '));
      expect(task.clientId).toEqual(clientId);
      expect(task.value.periodId).toEqual(periodId);
      expect(task.value.file).toEqual('pdf');

      expect(createTaskAndSendMessageSpy.mock.calls[0][1].value.file).toEqual('pdf');
      expect(createTaskAndSendMessageSpy.mock.calls[1][1].value.file).toEqual('salesCsv');
      expect(createTaskAndSendMessageSpy.mock.calls[2][1].value.file).toEqual('costsCsv');
      expect(createTaskAndSendMessageSpy.mock.calls[3][1].value.file).toEqual('statementOfAccount');
      expect(createTaskAndSendMessageSpy.mock.calls[4][1].value.file).toEqual('feesInvoice');
      expect(createTaskAndSendMessageSpy.mock.calls[5][1].value.file).toEqual('selfBillingInvoice');
    });
  });

  describe('emailSummary', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue();

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).not.toHaveBeenCalled();
      }
    });

    it('should throw error if email address list invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const emailAddresses = ['invalid', 1];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_EMAIL');
        expect(error.message).toBe('Emails should be passed as an array of strings.');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should call period send statement export if successful', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: jest.fn() };
      const emailAddresses = ['test@test.com'];
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      expect(periodMock.sendStatementExport).toHaveBeenCalledTimes(1);
      // Jest matches the full argument list (sinon's calledWith only matched leading args);
      // the controller calls sendStatementExport(curveUser, emailList).
      expect(periodMock.sendStatementExport).toHaveBeenCalledWith({ id: clientId, clientId }, emailAddresses);
    });

    it('should throw error if email address list invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: jest.fn() };
      const emailAddresses = [1, 'invalid'];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
        expect(periodMock.sendStatementExport).not.toHaveBeenCalled();

        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_EMAIL');
        expect(error.message).toBe('Emails should be passed as an array of strings.');
      }
    });

    it('should throw error if email address list empty', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: jest.fn() };
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
        expect(periodMock.sendStatementExport).not.toHaveBeenCalled();

        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_EMAIL');
        expect(error.message).toBe('Emails should be passed as an array of strings.');
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: jest.fn() };
      const emailAddresses = [];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
        expect(periodMock.sendStatementExport).not.toHaveBeenCalled();
      }
    });

    it('should call send statement export with email addresses if provided', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: jest.fn() };
      const emailAddresses = ['test1@test.com', 'test2@test.com'];
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      expect(periodMock.sendStatementExport).toHaveBeenCalledWith({ id: clientId, clientId }, ['test1@test.com', 'test2@test.com']);
    });

    it('should call send statement export without email addresses param if not provided', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: jest.fn() };
      const curveUser = { clientId, id: clientId };
      Client.findById.mockReturnValue({});
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, curveUser });
      // emailList is undefined here (no addresses provided, client has none); full args matched.
      expect(periodMock.sendStatementExport).toHaveBeenCalledWith({ id: clientId, clientId }, undefined);
    });

    it('should call send statement export without email addresses param if null', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId, sendStatementExport: jest.fn() };
      const emailAddresses = null;
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      await Controller.emailSummary({ clientId, periodId, emailAddresses, curveUser });
      // emailAddresses is null so emailList resolves to undefined; full args matched.
      expect(periodMock.sendStatementExport).toHaveBeenCalledWith({ id: clientId, clientId }, undefined);
    });
  });

  describe('updateBlockedStatus', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      Client.findById.mockResolvedValue();

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if period not found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw error if period invalid', async () => {
      const clientId = randomId();
      const periodId = 'invalidPeriodId';
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => null });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('PERIOD_NOT_FOUND');
        expect(error.message).toBe(`Couldn't find a Period matching this ID: ${periodId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).not.toHaveBeenCalled();
      }
    });

    it('should throw error if blocked status is invalid', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = 'invalid';
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_STATUS');
        expect(error.message).toBe('Block status should only be Blocked or Unblocked.');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw error if blocked status is missing', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_STATUS');
        expect(error.message).toBe('Block status should only be Blocked or Unblocked.');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should throw forbidden error if no rights found', async () => {
      const clientId = randomId();
      const periodId = randomId();
      const periodMock = { _id: periodId, name: randomString(), clientId };
      const curveUser = { clientId, id: clientId };
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.updateBlockedStatus({ clientId, periodId, curveUser });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.cause).toBe('FORBIDDEN');
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Period.findById).toHaveBeenCalledWith(periodId);
      }
    });

    it('should update period fuga blocked status', async () => {
      const clientId = randomId();
      const clientName = randomString();
      const periodId = randomId();
      const periodName = randomString();
      const periodMock = { _id: periodId, name: periodName, clientId, status: 'Complete', fuga: { blockedStatus: false }, save: jest.fn().mockResolvedValue() };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = true;
      const message = 'sample email message body';
      const fugaOrgId = randomInt();
      const mockClient = { clientId, name: clientName, fugaIntegration: { fugaOrgId } };
      const fugaMock = { periodBlockedEmails: ['test@test.com', 'test1@test.com'] };
      Client.findById.mockResolvedValue(mockClient);
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(AppSettings, 'findOne').mockReturnValue(undefined);
      AppSettings.findOne.mockResolvedValue({ fuga: fugaMock });

      jest.spyOn(sendEmail, 'genericEmail').mockReturnValue(undefined);
      sendEmail.genericEmail.mockResolvedValue();

      const period = await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser, message });

      expect(periodMock.save).toHaveBeenCalledTimes(1);
      expect(period.fuga.blockedStatus).toBe(blockedStatus);
      expect(period.status).toBe('Complete');
    });

    it('should send email when period is blocked', async () => {
      const clientId = randomId();
      const clientName = randomString();
      const periodId = randomId();
      const periodName = randomString();
      const periodMock = { _id: periodId, name: periodName, clientId, fuga: { blockedStatus: false }, save: jest.fn().mockResolvedValue() };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = true;
      const message = randomString();
      const fugaOrgId = randomInt();
      const mockClient = { clientId, name: clientName, fugaIntegration: { fugaOrgId } };
      const fugaMock = { periodBlockedEmails: ['test@test.com', 'test1@test.com'] };
      Client.findById.mockResolvedValue(mockClient);
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(AppSettings, 'findOne').mockReturnValue(undefined);
      AppSettings.findOne.mockResolvedValue({ fuga: fugaMock });

      jest.spyOn(sendEmail, 'genericEmail').mockReturnValue(undefined);
      sendEmail.genericEmail.mockResolvedValue();

      await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser, message });

      expect(sendEmail.genericEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.genericEmail.mock.calls[0][0]).toEqual(fugaMock.periodBlockedEmails);
      expect(sendEmail.genericEmail.mock.calls[0][1]).toBe(mockClient);
      expect(sendEmail.genericEmail.mock.calls[0][2]).toBe(`FUGA Splits Client ${clientName} (${fugaOrgId}) has blocked the Period ${periodName} (${periodId})`);
    });

    it('should send email when period is unblocked', async () => {
      const clientId = randomId();
      const clientName = randomString();
      const periodId = randomId();
      const periodName = randomString();
      const periodMock = { _id: periodId, name: periodName, clientId, fuga: { blockedStatus: true }, save: jest.fn().mockResolvedValue() };
      const curveUser = { clientId, id: clientId };
      const blockedStatus = false;
      const message = randomString();
      const fugaOrgId = randomInt();
      const mockClient = { clientId, name: clientName, fugaIntegration: { fugaOrgId } };
      const fugaMock = { periodBlockedEmails: ['test@test.com', 'test1@test.com'] };
      Client.findById.mockResolvedValue(mockClient);
      jest.spyOn(Period, 'findById').mockReturnValue({ select: () => periodMock });

      jest.spyOn(AppSettings, 'findOne').mockReturnValue(undefined);
      AppSettings.findOne.mockResolvedValue({ fuga: fugaMock });

      jest.spyOn(sendEmail, 'genericEmail').mockReturnValue(undefined);
      sendEmail.genericEmail.mockResolvedValue();

      await Controller.updateBlockedStatus({ clientId, periodId, blockedStatus, curveUser, message });

      expect(sendEmail.genericEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail.genericEmail.mock.calls[0][0]).toEqual(fugaMock.periodBlockedEmails);
      expect(sendEmail.genericEmail.mock.calls[0][1]).toBe(mockClient);
      expect(sendEmail.genericEmail.mock.calls[0][2]).toBe(`FUGA Splits Client ${clientName} (${fugaOrgId}) has unblocked the Period ${periodName} (${periodId})`);
    });
  });

  describe('getClientStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const query = {};
      Client.findById.mockResolvedValue();

      try {
        await Controller.getClientStatements({ clientId, query });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const query = {};
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getClientStatements({ clientId, query });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
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

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue({ docs: [] });

      await Controller.getClientStatements({ clientId, query });
      expect(Statement.paginate).toHaveBeenCalledWith({ clientId }, paginationParams);
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

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query });

      expect(result.statements).toHaveLength(1);
      expect(result.statements[0]).toMatchObject(expectedStatements[0]);
      expect(result.meta).toEqual(expectedMeta);
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

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].payeeName).toContain(mockStatement.contractId.payees[0].payeeId.name);
    });

    it('should return null currency when statement currency is home currency and client home currency is undefined', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return null currency when statement currency is home currency and client home currency is null', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.mockResolvedValue({ homeCurrency: null });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return null when statement currency is null', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: null }] };
      Client.findById.mockResolvedValue({ homeCurrency: 'GBP' });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return null when statement currency is blank', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: '' }] };
      Client.findById.mockResolvedValue({ homeCurrency: 'GBP' });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements[0].currency).toBeNull();
    });

    it('should return client currency when statement currency is home currency', async () => {
      const clientId = randomId();
      const mockPaginate = { docs: [{ _id: randomId(), clientId, periodId: randomId(), currency: 'Home Currency' }] };
      Client.findById.mockResolvedValue({ homeCurrency: 'GBP' });

      jest.spyOn(Statement, 'paginate').mockReturnValue(undefined);
      Statement.paginate.mockResolvedValue(mockPaginate);

      const result = await Controller.getClientStatements({ clientId, query: {} });

      expect(result.statements).toHaveLength(1);
      expect(result.statements[0].currency).toEqual('GBP');
    });
  });

  describe('getWhiteLabelStatements', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const subOrgId = randomString();
      Client.findById.mockResolvedValue();

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('INVALID_CLIENT_ID');
        expect(error.message).toBe('Valid organisation ID required');
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('CLIENT_NOT_FOUND');
        expect(error.message).toBe('Organisation not found');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if sub organisation id not provided', async () => {
      const clientId = randomId();
      const subOrgId = null;

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).toBe(400);
        expect(error.cause).toBe('FIELDS_REQUIRED');
        expect(error.message).toBe('Sub Organisation ID required');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).not.toHaveBeenCalled();
      }
    });

    it('should throw error if sub organisation id not found', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      Payee.findOne.mockResolvedValue(null);

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).toBe(404);
        expect(error.cause).toBe('SUB_ORG_PAYEE_NOT_FOUND');
        expect(error.message).toBe(`Payee not found for Sub Org Id: ${subOrgId}`);
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).toHaveBeenCalledWith({ clientId, foreignId: subOrgId });
      }
    });

    it('should return statements', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const contractsMock = [{ _id: randomId() }, { _id: randomId() }];
      const statementDataMock = { id: randomId(), name: randomString(), allFilesZipPublicLink: randomString() };
      const statementMock = { skip: () => ({ sort: () => ({ limit: () => [statementDataMock] }) }) };
      const clientId = randomId();
      const subOrgId = randomString();

      Client.findById.mockResolvedValue({});

      Payee.findOne.mockResolvedValue(payeeMock);
      jest.spyOn(Contract, 'find').mockResolvedValue(contractsMock);
      jest.spyOn(Statement, 'find').mockReturnValue(statementMock);

      const result = await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });

      expect(result[0].id).toBe(statementDataMock.id);
      expect(result[0].name).toBe(statementDataMock.name);
      expect(result[0].packageLink).toBe(statementDataMock.allFilesZipPublicLink);
      expect(result[0].url).toContain(`curveroyaltysystems.com/#/statements/${statementDataMock.id}`);
    });

    it('should throw forbidden error if no rights found', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const clientId = randomId();
      const subOrgId = randomString();
      Payee.findOne.mockResolvedValue(payeeMock);
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.getWhiteLabelStatements({ clientId, subOrgId, query: {} });
      } catch (error) {
        expect(error.code).toBe(403);
        expect(error.message).toBe('Forbidden');
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).toHaveBeenCalledWith({ clientId, foreignId: subOrgId });
      }
    });
  });

  describe('getWhiteLabelStatement', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const subOrgId = randomString();
      const statementId = randomId();
      Client.findById.mockResolvedValue();

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).toMatchObject({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if sub organisation id not provided', async () => {
      const clientId = randomId();
      const subOrgId = null;
      const statementId = randomId();

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'FIELDS_REQUIRED', message: 'Sub Organisation ID required' });
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).not.toHaveBeenCalled();
      }
    });

    it('should throw error if sub organisation id not found', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      Payee.findOne.mockResolvedValue(null);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).toMatchObject({ code: 404, cause: 'SUB_ORG_PAYEE_NOT_FOUND', message: `Payee not found for Sub Org Id: ${subOrgId}` });
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).toHaveBeenCalledWith({ clientId, foreignId: subOrgId });
      }
    });

    it('should throw error if statement id not provided', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = null;
      Payee.findOne.mockResolvedValue({});

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'INVALID_STATEMENT_ID', message: 'Valid Statement ID required' });
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).toHaveBeenCalled();
      }
    });

    it('should throw error if statement id not found', async () => {
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      Payee.findOne.mockResolvedValue({});
      jest.spyOn(Statement, 'findById').mockResolvedValue(null);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).toMatchObject({ code: 404, cause: 'STATEMENT_NOT_FOUND', message: `Statement not found with ID ${statementId}` });
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).toHaveBeenCalled();
        expect(Statement.findById).toHaveBeenCalled();
      }
    });

    it('should return statement', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const contractMock = { _id: randomId(), currency: 'Home Currency' };
      const statementDataMock = { id: randomId(), name: randomString(), allFilesZipPublicLink: randomString() };
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();

      Client.findById.mockResolvedValue({ _id: clientId });

      jest.spyOn(Client, 'findOne').mockReturnValue(undefined);
      Client.findOne.mockResolvedValue({ _id: clientId, homeCurrency: 'GBP' });

      Payee.findOne.mockResolvedValue(payeeMock);
      jest.spyOn(Contract, 'findOne').mockResolvedValue(contractMock);
      jest.spyOn(Statement, 'findById').mockResolvedValue(statementDataMock);
      const expectedResult = {
        currency: 'GBP',
        packageLink: statementDataMock.allFilesZipPublicLink,
        totals: { streams: 0, downloads: 0, netRevenue: undefined, salesIncome: undefined, mutationsTotals: undefined },
        financialTotals: [{ salesIncome: undefined, companyRoyalty: undefined, mutationsTotals: undefined, royaltiesEarned: undefined, organizationName: undefined }],
        topNetRevenues: { assets: undefined, labels: [], stores: undefined, artists: [], products: undefined, countries: undefined },
      };

      const result = await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });

      expect(result).toEqual(expectedResult);
    });

    it('should throw forbidden error if no rights found', async () => {
      const payeeMock = { _id: randomId(), clientId: randomId() };
      const contractMock = { _id: randomId(), currency: 'Home Currency' };
      const clientId = randomId();
      const subOrgId = randomString();
      const statementId = randomId();
      jest.spyOn(Client, 'findOne').mockResolvedValue({ _id: clientId, homeCurrency: 'GBP' });
      Payee.findOne.mockResolvedValue(payeeMock);
      jest.spyOn(Contract, 'findOne').mockResolvedValue(contractMock);
      jest.spyOn(Statement, 'findById').mockResolvedValue({});
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.getWhiteLabelStatement({ clientId, subOrgId, statementId });
      } catch (error) {
        expect(error).toMatchObject({ code: 403, message: 'Forbidden' });
        expect(Client.findById).toHaveBeenCalledWith(clientId);
        expect(Payee.findOne).toHaveBeenCalledWith({ clientId, foreignId: subOrgId });
      }
    });
  });

  describe('getTrack', () => {
    it('should throw error if invalid client id', async () => {
      const clientId = 'invalid_id';
      const curveUser = { clientId };
      Client.findById.mockResolvedValue();

      try {
        await Controller.getTrack({ curveUser, trackId: randomId(), fugaId: null });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.toHaveBeenCalledWith(clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const clientId = randomId();
      const curveUser = { clientId };
      Client.findById.mockResolvedValue(null);

      try {
        await Controller.getTrack({ curveUser, trackId: randomId, fugaId: null });
      } catch (error) {
        expect(error).toMatchObject({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).toHaveBeenCalledWith(clientId);
      }
    });

    it('should return track with curve track id', async () => {
      const clientId = randomId();
      const curveUser = { clientId };
      Client.findById.mockResolvedValue({ _id: clientId });
      const mockTrack = { _id: randomId(), title: randomString(), version: randomString(), isrc: randomString(), artist: randomString(), salesReturnsRights: [], alternativeId: randomString(), tags: ['foo'] };
      Track.findOne.mockReturnValue({ lean: () => ({ exec: () => mockTrack }) });
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

      expect(result).toEqual(expectedTrack);
    });

    it('should return track with fuga id', async () => {
      const clientId = randomId();
      const fugaId = randomInt();
      const curveUser = { clientId };
      Client.findById.mockResolvedValue({ _id: clientId });
      const mockTrack = { _id: randomId(), title: randomString(), version: randomString(), isrc: randomString(), artist: randomString(), salesReturnsRights: [], alternativeId: randomString(), tags: ['foo'], fugaId };
      Track.findOne.mockReturnValue({ lean: () => ({ exec: () => mockTrack }) });
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

      expect(result).toEqual(expectedTrack);
    });

    it('should throw error if track not found', async () => {
      const curveUser = { clientId: randomId() };
      const trackId = randomId();
      Track.findOne.mockReturnValue({ lean: () => ({ exec: () => null }) });

      try {
        await Controller.getTrack({ curveUser, trackId, fugaId: null });
      } catch (error) {
        expect(error).toMatchObject({ code: 404, cause: 'TRACK_NOT_FOUND', message: `Track not found with ID ${trackId}` });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
      }
    });
  });

  describe('upsertTracks', () => {
    it('should throw error if invalid client id', async () => {
      const curveUser = { clientId: 'invalid_id', id: randomId() };
      const trackData = {};
      Client.findById.mockResolvedValue();

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = {};
      Client.findById.mockResolvedValue();

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).toMatchObject({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if no fugaId or trackId', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = {};

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'FIELDS_REQUIRED', message: 'FugaId or TrackId is required' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if total percentage greater than 100', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = { fugaId: randomString(), contracts: [{ percentage: 101 }] };

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'TOTAL_SHARES_LIMIT_EXCEEDED', message: 'Total shares must be between 0 and 100' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if access is forbidden', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const trackData = { fugaId: randomString(), contracts: [{ percentage: 100 }] };
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.upsertTracks({ curveUser, trackData });
      } catch (error) {
        expect(error).toMatchObject({ code: 403, message: 'Forbidden' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
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
      Track.findOne.mockResolvedValue({ ...mockTrack, _id: trackId, save: jest.fn().mockResolvedValue(), salesReturnsRights: [{ contractId }] });
      jest.spyOn(Track.prototype, 'save').mockResolvedValue({});
      jest.spyOn(Contract, 'findOne').mockResolvedValue({ _id: contractId });

      const track = await Controller.upsertTracks({ curveUser, trackData });
      expect(track).toEqual({ ...mockTrack, id: trackId, releases: [], payeeCount: 0 });
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
      jest.spyOn(Track.prototype, 'save').mockResolvedValue({});
      jest.spyOn(Contract, 'findById').mockResolvedValue({});

      const track = await Controller.upsertTracks({ curveUser, trackData });
      expect(track).toMatchObject(mockTrack);
    });
  });

  describe('upsertReleases', () => {
    it('should throw error if invalid client id', async () => {
      const curveUser = { clientId: 'invalid_id', id: randomId() };
      const releaseData = {};
      Client.findById.mockResolvedValue();

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'INVALID_CLIENT_ID', message: 'Valid organisation ID required' });
        expect(Client.findById).not.toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if unknown client id', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = {};
      Client.findById.mockResolvedValue();

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).toMatchObject({ code: 404, cause: 'CLIENT_NOT_FOUND', message: 'Organisation not found' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if no fugaId', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = {};

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'FIELDS_REQUIRED', message: 'FugaId is required' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if total percentage greater than 100', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = { fugaId: randomString(), contracts: [{ percentage: 101 }] };

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).toMatchObject({ code: 400, cause: 'TOTAL_SHARES_LIMIT_EXCEEDED', message: 'Total shares must be between 0 and 100' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
      }
    });

    it('should throw error if access is forbidden', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const releaseData = { fugaId: randomString(), contracts: [{ percentage: 100 }] };
      UserAccess.isUserForbidden.mockResolvedValue(true);

      try {
        await Controller.upsertReleases({ curveUser, releaseData });
      } catch (error) {
        expect(error).toMatchObject({ code: 403, message: 'Forbidden' });
        expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId);
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
      Release.findOne.mockResolvedValue({ ...mockRelease, save: jest.fn().mockResolvedValue(), salesReturnsRights: [{ contractId }] });
      jest.spyOn(Release.prototype, 'save').mockResolvedValue({});
      jest.spyOn(Contract, 'findOne').mockResolvedValue({ _id: contractId });

      const release = await Controller.upsertReleases({ curveUser, releaseData });
      expect(release).toEqual(mockRelease);
    });

    it('should return created release', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const contractId = randomId();
      const fugaId = randomString();
      const barcode = randomString();
      const releaseData = { fugaId, barcode, contracts: [{ contractId, percentage: 100 }], tracks: [], label: '' };
      const mockRelease = { ...releaseData, contracts: [] };
      jest.spyOn(Release.prototype, 'save').mockResolvedValue({});
      jest.spyOn(Contract, 'findById').mockResolvedValue({});

      const release = await Controller.upsertReleases({ curveUser, releaseData });
      expect(release).toMatchObject(mockRelease);
    });

    // SUP-3624: FUGA payload with no contracts failed when an existing track
    // referenced a contract whose payees array was empty
    it('should return release when an existing track references a contract with no payees', async () => {
      const curveUser = { clientId: randomId(), id: randomId() };
      const contractId = randomId();
      const releaseData = {
        fugaId: randomInt(),
        title: randomString(),
        barcode: randomString(),
        tracks: [{ fugaId: randomInt(), title: randomString(), isrc: randomString(), duration: randomInt() }],
      };
      const existingTrack = {
        _id: randomId(),
        clientId: curveUser.clientId,
        salesReturnsRights: [{ contractId, percentage: 100 }],
        save: jest.fn(),
      };
      Track.findOne.mockResolvedValue(existingTrack);
      Track.findById.mockResolvedValue(existingTrack);
      Contract.findById.mockResolvedValue({ _id: contractId, payees: [] });
      jest.spyOn(Release.prototype, 'save').mockResolvedValue({});

      const release = await Controller.upsertReleases({ curveUser, releaseData });

      expect(release.tracks).toHaveLength(1);
      expect(release.tracks[0].contracts).toEqual([]);
    });
  });
});
