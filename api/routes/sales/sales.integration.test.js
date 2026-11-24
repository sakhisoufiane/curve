jest.mock('../../libs/helpers/salesHelpers');
jest.mock('../../libs/validateSales');
jest.mock('../../models/salesFile');
jest.mock('../../libs/importXlsx');
jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  BigQuery: jest.fn().mockReturnValue({
    inputTable: 'inputTable',
    getDataQuery: jest.fn(),
    getDistinct: jest.fn(),
    deleteData: jest.fn(),
    queryJobPromise: jest.fn(),
    updateData: jest.fn(),
  }),
}));

const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const util = require('util');
const { ObjectId } = require('mongodb');
const { BigQuery, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomArray, randomError, randomId, randomJsDate, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { FORBIDDEN_ERROR, INTERNAL_ERROR } = require('../constants');
const ImportXlsx = require('../../libs/importXlsx');
const { SalesLineExport } = require('../../libs/salesLineExport');
const { salesHelpers } = require('../../libs/helpers/salesHelpers');
const ValidateSales = require('../../libs/validateSales');
const config = require('../../config.json');
const Client = require('../../models/client');
const User = require('../../models/user');
const SalesFile = require('../../models/salesFile');

const server = supertest(require('../../index'));

describe('/sales', () => {
  logger.info('>>>file>>>> routes/sales/sales.integration.test .....................');

  const applicationToken = config.applicationTokens[0];

  const RealDate = global.Date;
  let mockDate;

  let client; let user;
  let clientUserFull; let clientUserEdit; let clientUserView; let clientUserNone; let internalClientUser; let internalUser; let parentUser; let payeeUser;

  const bigQuery = new BigQuery(); let bqSales;

  let bqFilter; let filterParams; let mockGetBigQueryFilterResult;
  let paramsToFilterFieldResponse; let processUpdatesResponse;
  let updateParamsResponse; let updateSaleObjectWithParamsResponse;

  const selectValues = [
    'id', 'status', 'catType', 'distributionChannel', 'configuration', 'priceCategory', 'source', 'subSource', 'territory', 'barcode', 'catNo',
    'isrc', 'units', 'retailPrice', 'perUnitRate', 'grossAmount', 'netAmount', 'exchangeRate', 'mechanicalAtSource', 'discountAmount', 'originalCurrency',
    'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'homeCurrencyMechanicalAtSource', 'homeCurrencyDiscountAmount', 'originalReleaseTitle',
    'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'originalWorkTitle', 'originalComposers', 'originalIdentifier', 'iswc',
    'tunecode', 'songCode', 'contractIdentifier', 'production', 'episode', 'dateFrom', 'dateTo', 'party1', 'party2', 'party3', 'party4', 'party5',
    'saleDate', 'transactionDate', 'releaseId', 'trackId', 'workId', 'contractId', 'description', 'alternativeId'];

  beforeEach(async () => {
    // stop logger from logging each api request
    jest.spyOn(logger, 'info').mockReturnValue();
    jest.spyOn(logger, 'error').mockReturnValue();
    jest.spyOn(logger, 'debug').mockReturnValue();

    // mocking global.Date as jest.useFakeTimers seems to break supertest
    mockDate = randomJsDate();
    global.Date = class extends RealDate {
      // eslint-disable-next-line no-constructor-return
      constructor() { return mockDate; }
    };

    bqFilter = randomString();
    filterParams = randomArray();

    mockGetBigQueryFilterResult = {
      filter: bqFilter,
      filterParams,
    };
    paramsToFilterFieldResponse = randomString();
    processUpdatesResponse = {
      status: 200,
      message: randomString(),
    };
    updateParamsResponse = randomString();
    updateSaleObjectWithParamsResponse = {
      [randomString()]: randomString(),
      [randomString()]: randomString(),
      [randomString()]: randomString(),
    };

    bqSales = randomArray(25);

    client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ email: randomString() });
    await user.save();

    const baseUser = { id: user._id, email: randomString(), internal: false, clientId: client._id, parentId: null, rights: {} };
    clientUserFull = jwt.sign({ ...baseUser, rights: { [client._id]: { admin: true, sales: 'Edit' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserEdit = jwt.sign({ ...baseUser, rights: { [client._id]: { sales: 'Edit' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserView = jwt.sign({ ...baseUser, rights: { [client._id]: { sales: 'View' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserNone = jwt.sign({ ...baseUser, rights: { [client._id]: { sales: 'None' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    internalClientUser = jwt.sign({ ...baseUser, internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });
    internalUser = jwt.sign({ ...baseUser, internal: true, clientId: null }, process.env.jsonSecretToken, { expiresIn: 86400 });
    parentUser = jwt.sign({ ...baseUser, clientId: null, parentId: randomId() }, process.env.jsonSecretToken, { expiresIn: 86400 });
    payeeUser = jwt.sign({ ...baseUser, clientId: null, payeeId: randomId() }, process.env.jsonSecretToken, { expiresIn: 86400 });

    jest.spyOn(bigQuery, 'queryJobPromise').mockResolvedValue();
    jest.spyOn(bigQuery, 'getDistinct').mockImplementation((...args) => args[args.length - 1](null));
    jest.spyOn(bigQuery, 'deleteData').mockImplementation((...args) => args[args.length - 1](null));
    jest.spyOn(salesHelpers, 'getBigQueryFilter').mockReturnValue(mockGetBigQueryFilterResult);
    jest.spyOn(salesHelpers, 'getSales').mockResolvedValue(bqSales);
    jest.spyOn(salesHelpers, 'getCount').mockReturnValue(bqSales.length);
    jest.spyOn(salesHelpers, 'paramsToFilterField').mockReturnValue(paramsToFilterFieldResponse);
    jest.spyOn(salesHelpers, 'processUpdates').mockReturnValue(processUpdatesResponse);
    jest.spyOn(salesHelpers, 'updateParams').mockReturnValue(updateParamsResponse);
    jest.spyOn(salesHelpers, 'updateSaleObjectWithParams').mockReturnValue(updateSaleObjectWithParamsResponse);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    global.Date = RealDate;
    await Client.findByIdAndDelete(client._id);
    await User.deleteMany({ clientId: client._id });
  });

  describe('/ GET', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a list of sales', async () => {
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sales).toEqual(bqSales);
        });
        it('should return metadata of sales index on / GET', async () => {
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(typeof res.body.meta).toEqual('object');
        });
        it('should pass pagination options on to BigQuery query', async () => {
          // Arrange
          const expectedOptions = {
            limit: 50,
            offset: 0,
            orderBy: 'id',
            orderDir: 'ASC',
          };
          // Act
          await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getSales).toHaveBeenCalledWith({ bigQuery, select: selectValues, bqFilter, filterParams, clientId: client._id.toString(), options: expectedOptions });
        });
        it('should send the correct pagination options when passed the page parameter', async () => {
          // Arrange
          const expectedOptions = {
            limit: 50,
            offset: 100,
            orderBy: 'id',
            orderDir: 'ASC',
          };
          // Act
          await server
            .get('/sales?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getSales).toHaveBeenCalledWith({ bigQuery, select: selectValues, bqFilter, filterParams, clientId: client._id.toString(), options: expectedOptions });
        });
        it('should send the correct pagination options when passed the limit parameter', async () => {
          // Arrange
          const expectedOptions = {
            limit: '10',
            offset: 0,
            orderBy: 'id',
            orderDir: 'ASC',
          };
          // Act
          await server
            .get('/sales?limit=10')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getSales).toHaveBeenCalledWith({ bigQuery, select: selectValues, bqFilter, filterParams, clientId: client._id.toString(), options: expectedOptions });
        });
        it('should send the correct pagination options when passed the orderBy parameter', async () => {
          // Arrange
          const expectedOptions = {
            limit: 50,
            offset: 0,
            orderBy: 'status',
            orderDir: 'ASC',
          };
          // Act
          await server
            .get('/sales?orderBy=status')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getSales).toHaveBeenCalledWith({ bigQuery, select: selectValues, bqFilter, filterParams, clientId: client._id.toString(), options: expectedOptions });
        });
        it('should send the correct pagination options when passed the orderDir parameter', async () => {
          // Arrange
          const expectedOptions = {
            limit: 50,
            offset: 0,
            orderBy: 'status',
            orderDir: 'DESC',
          };
          // Act
          await server
            .get('/sales?orderDir=DESC&orderBy=status')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getSales).toHaveBeenCalledWith({ bigQuery, select: selectValues, bqFilter, filterParams, clientId: client._id.toString(), options: expectedOptions });
        });
        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.totalPages).toEqual(1);
        });
        it('should return correct number of pages when passed a limit option', async () => {
          // Act
          const res = await server
            .get('/sales?limit=10')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.totalPages).toEqual(3);
        });
        it('should return the current page number', async () => {
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual(1);
        });
        it('should return correct page number when passed a page option', async () => {
          // Act
          const res = await server
            .get('/sales?page=2')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual('2');
        });
        it('should return 500 status if error thrown in try/catch', async () => {
          // Arrange
          const error = randomError();
          salesHelpers.paramsToFilterField.mockRejectedValue(error);
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(`${client._id.toString()} GET /sales Error getting sales:`, error);
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(`${client._id.toString()} GET /sales Error getting client:`, error);
          Client.findById.mockRestore();
        });
        it('should call salesHelpers.paramsToFilterField with the correct parameters', async () => {
          // Act
          await server
            .get('/sales?status=complete')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.paramsToFilterField).toHaveBeenCalledWith(client._id.toString(), { status: 'complete' }, expect.objectContaining({ _id: client._id }));
        });
        it('should call salesHelpers.getBigQueryFilter with the correct parameters', async () => {
          const filter = { text: randomString() };
          salesHelpers.paramsToFilterField.mockReturnValue(filter);
          // Act
          await server
            .get('/sales?status=complete')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getBigQueryFilter).toHaveBeenCalledWith({ filter, bigQuery, clientName: client.name, clientId: client._id.toString() });
        });
        it('should call salesHelpers.getCount with the correct parameters', async () => {
          // Act
          await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getCount).toHaveBeenCalledWith({ bigQuery, bqFilter, filterParams, clientId: client._id.toString() });
        });
        it('should call salesHelpers.addGroupInfoToSales if suspense feature is enabled for client', async () => {
          // Arrange
          await Client.findByIdAndUpdate(client._id, { features: { suspense: true } });
          // Act
          await server
            .get('/sales?status=complete')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.addGroupInfoToSales).toHaveBeenCalledWith({ clientId: client._id.toString(), sales: expect.any(Array) });
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a list of sales', async () => {
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sales).toEqual(bqSales);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a list of sales', async () => {
          // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sales).toEqual(bqSales);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
        // Act
          const res = await server
            .get('/sales')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a list of sales', async () => {
        // Act
        const res = await server
          .get('/sales')
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(res.body.sales).toEqual(bqSales);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 404 response', async () => {
        // Act
        const res = await server
          .get('/sales')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual('Client not found');
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get('/sales')
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get('/sales')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });
  describe('/export_to_csv POST', () => {
    const message200 = 'Your report will be sent to you via email shortly';
    beforeEach(() => {
      jest.spyOn(SalesLineExport, 'byFilter').mockResolvedValue();
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a 200 response with CSV data', async () => {
          // Act
          const res = await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual(message200);
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(`${client._id.toString()} POST /export_to_csv Error getting client:`, error);
          Client.findById.mockRestore();
        });
        it('should call salesHelpers.paramsToFilterField with the correct parameters', async () => {
          // Arrange
          const body = { filter: { [randomString()]: randomString() } };
          // Act
          await server
            .post('/sales/export_to_csv')
            .send(body)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.paramsToFilterField).toHaveBeenCalledWith(client._id.toString(), { ...body.filter, csv: true }, expect.objectContaining({ _id: client._id }));
        });
        it('should call salesHelpers.getBigQueryFilter with the correct parameters', async () => {
          const filter = { text: randomString() };
          salesHelpers.paramsToFilterField.mockReturnValue(filter);
          // Act
          await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(salesHelpers.getBigQueryFilter).toHaveBeenCalledWith({ filter, bigQuery, clientName: client.name, clientId: client._id.toString() });
        });
        it('should call SalesLineExport.byFilter with the correct parameters', async () => {
          // Arrange
          const curveUser = await util.promisify(jwt.verify)(clientUserFull, process.env.jsonSecretToken);
          const foundClient = await Client.findById(client._id);
          // Act
          await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(SalesLineExport.byFilter).toHaveBeenCalledWith({ bqFilter, filterParams, bigQuery, curveUser, client: foundClient });
        });
        describe('if ids are supplied', () => {
          it('should NOT call salesHelpers.paramsToFilterField with the correct parameters', async () => {
            // Arrange
            const body = { ids: randomArray() };
            // Act
            await server
              .post('/sales/export_to_csv')
              .send(body)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull);
            // Assert
            expect(salesHelpers.paramsToFilterField).toHaveBeenCalledTimes(0);
          });
          it('should call salesHelpers.getBigQueryFilter with the correct parameters', async () => {
            // Arrange
            const body = { ids: randomArray() };
            const expectedFilter = { id: { $in: body.ids } };
            // Act
            await server
              .post('/sales/export_to_csv')
              .send(body)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull);
            // Assert
            expect(salesHelpers.getBigQueryFilter).toHaveBeenCalledWith({ filter: expectedFilter, bigQuery, clientName: client.name, clientId: client._id.toString() });
          });
          it('should call SalesLineExport.byFilter with the correct parameters', async () => {
            // Arrange
            const body = { ids: randomArray() };
            const curveUser = await util.promisify(jwt.verify)(clientUserFull, process.env.jsonSecretToken);
            const foundClient = await Client.findById(client._id);
            // Act
            await server
              .post('/sales/export_to_csv')
              .send(body)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull);
            // Assert
            expect(SalesLineExport.byFilter).toHaveBeenCalledWith({ bqFilter, filterParams, bigQuery, curveUser, client: foundClient });
          });
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a 200 response with CSV data', async () => {
          // Act
          const res = await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual(message200);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 200 response with CSV data', async () => {
          // Act
          const res = await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual(message200);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .post('/sales/export_to_csv')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a 200 response with CSV data', async () => {
        // Act
        const res = await server
          .post('/sales/export_to_csv')
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual(message200);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 404 response', async () => {
        // Act
        const res = await server
          .post('/sales/export_to_csv')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual('Client not found');
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/sales/export_to_csv')
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/sales/export_to_csv')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });
  describe('/:id GET', () => {
    let salesId; let salesData;
    beforeEach(() => {
      salesId = randomId();
      salesData = randomString();
      bigQuery.queryJobPromise.mockResolvedValue(salesData);
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a 200 response and sales data', async () => {
          // Act
          const res = await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sales).toEqual(salesData);
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
          Client.findById.mockRestore();
        });
        it('should call bigQuery.getDataQuery with the correct parameters', async () => {
          // Act
          await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(bigQuery.getDataQuery).toHaveBeenCalledWith(bigQuery.inputTable, selectValues, { id: salesId }, {});
        });
        it('should return 500 status if bigQuery.queryJobPromise returns an error', async () => {
          // Arrange
          const error = randomError();
          bigQuery.queryJobPromise.mockRejectedValue(error);
          // Act
          const res = await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a 200 response with sales data', async () => {
          // Act
          const res = await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sales).toEqual(salesData);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 200 response with sales data', async () => {
          // Act
          const res = await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sales).toEqual(salesData);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a 200 response with sales data', async () => {
        // Act
        const res = await server
          .get(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(res.body.sales).toEqual(salesData);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 404 response', async () => {
        // Act
        const res = await server
          .get(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual('Client not found');
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });
  describe('/multiple_ids PUT', () => {
    let ids;
    let body;
    beforeEach(() => {
      ids = randomArray();
      body = {
        ids,
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        [randomString()]: randomString(),
      };
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return the status and message from salesHelpers.processUpdates', async () => {
          // Act
          const res = await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(processUpdatesResponse.status);
          expect(res.body.message).toEqual(processUpdatesResponse.message);
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
          Client.findById.mockRestore();
        });
        it('should call salesHelpers.updateParams with the correct parameters', async () => {
          // Arrange
          const expectedBody = {
            ...body,
            lastModifiedBy: user._id.toString(),
          };
          // Act
          await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(salesHelpers.updateParams).toHaveBeenCalledWith(expectedBody);
        });
        it('should call salesHelpers.processUpdates with the correct parameters', async () => {
          // Arrange
          const filter = { id: { $in: body.ids } };
          const foundClient = await Client.findById(client._id);
          // Act
          await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(salesHelpers.processUpdates).toHaveBeenCalledWith(foundClient, filter, updateParamsResponse);
        });
        it('should return 404 status if no ids provided', async () => {
          // Arrange
          body.ids = undefined;
          // Act
          const res = await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('No sales lines selected');
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return the status and message from salesHelpers.processUpdates', async () => {
          // Act
          const res = await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(body);
          // Assert
          expect(res.status).toEqual(processUpdatesResponse.status);
          expect(res.body.message).toEqual(processUpdatesResponse.message);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .put('/sales/multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return the status and message from salesHelpers.processUpdates', async () => {
        // Act
        const res = await server
          .put('/sales/multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(processUpdatesResponse.status);
        expect(res.body.message).toEqual(processUpdatesResponse.message);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/filtered PUT', () => {
    let query; let body;
    beforeEach(() => {
      query = {
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        [randomString()]: randomString(),
      };
      body = {
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        [randomString()]: randomString(),
      };
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return the status and message from salesHelpers.processUpdates', async () => {
          // Act
          const res = await server
            .put('/sales/filtered')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .query(query)
            .send(body);
          // Assert
          expect(res.status).toEqual(processUpdatesResponse.status);
          expect(res.body.message).toEqual(processUpdatesResponse.message);
        });
        it('should return 400 status if empty query provided', async () => {
          // Act
          const res = await server
            .put('/sales/filtered')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(400);
          expect(res.body.message).toEqual('No filters were selected, please select one');
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)

            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)

            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
          Client.findById.mockRestore();
        });
        it('should call salesHelpers.paramsToFilterField with the correct parameters', async () => {
          // Act
          await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(salesHelpers.paramsToFilterField).toHaveBeenCalledWith(client._id.toString(), query, expect.objectContaining({ _id: client._id }));
        });
        it('should call salesHelpers.updateParams with the correct parameters', async () => {
          // Arrange
          const expectedBody = {
            ...body,
            lastModifiedBy: user._id.toString(),
          };
          // Act
          await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(salesHelpers.updateParams).toHaveBeenCalledWith(expectedBody);
        });
        it('should call salesHelpers.processUpdates with the correct parameters', async () => {
          // Arrange
          const foundClient = await Client.findById(client._id);
          // Act
          await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(salesHelpers.processUpdates).toHaveBeenCalledWith(foundClient, paramsToFilterFieldResponse, updateParamsResponse);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return the status and message from salesHelpers.processUpdates', async () => {
          // Act
          const res = await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(body);
          // Assert
          expect(res.status).toEqual(processUpdatesResponse.status);
          expect(res.body.message).toEqual(processUpdatesResponse.message);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .put('/sales/filtered')
            .query(query)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return the status and message from salesHelpers.processUpdates', async () => {
        // Act
        const res = await server
          .put('/sales/filtered')
          .query(query)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(processUpdatesResponse.status);
        expect(res.body.message).toEqual(processUpdatesResponse.message);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/filtered')
          .query(query)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/filtered')
          .query(query)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/filtered')
          .query(query)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/delete_multiple_ids PUT', () => {
    let body;
    let salesFileIds;
    const message200 = 'Successfully updated';
    beforeEach(() => {
      body = {
        ids: randomArray(),
      };
      salesFileIds = randomArray();
      bigQuery.getDistinct.mockImplementation((...args) => args[args.length - 1](null, salesFileIds));
      jest.spyOn(SalesFile, 'updateMany').mockResolvedValue();
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return the status and message from salesHelpers.processUpdates', async () => {
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual(message200);
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
          Client.findById.mockRestore();
        });
        it('should return 404 status if no ids provided', async () => {
          // Arrange
          body.ids = undefined;
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('No sales lines selected');
        });
        it('should return 404 status if empty ids array provided', async () => {
          // Arrange
          body.ids = [];
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('No sales lines selected');
        });
        it('should call bigQuery.getDistinct with the correct parameters', async () => {
          // Arrange
          const filter = { id: { $in: body.ids } };
          // Act
          await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(bigQuery.getDistinct).toHaveBeenCalledWith(bigQuery.inputTable, 'salesFileId', filter, expect.any(Function));
        });
        it('should return 500 status if bigQuery.getDistinct returns an error', async () => {
          // Arrange
          const error = randomError();
          bigQuery.getDistinct.mockImplementation((...args) => args[args.length - 1](error));
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
        it('should return 500 status if bigQuery.getDistinct returns nothing', async () => {
          // Arrange
          bigQuery.getDistinct.mockImplementation((...args) => args[args.length - 1](null, null));
          const expectedError = new Error(`${client._id}: Failed to update salesFile updated dates for affected sales lines: ${body.ids}. Multiple Deletion Aborted`);
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(expectedError);
        });
        it('should return 500 status if bigQuery.getDistinct returns an empty array', async () => {
          // Arrange
          bigQuery.getDistinct.mockImplementation((...args) => args[args.length - 1](null, []));
          const expectedError = new Error(`${client._id}: Failed to update salesFile updated dates for affected sales lines: ${body.ids}. Multiple Deletion Aborted`);
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(expectedError);
        });
        it('should call SalesFile.updateMany with the correct parameters', async () => {
          // Act
          await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(SalesFile.updateMany).toHaveBeenCalledWith({ _id: { $in: salesFileIds } }, { $set: { updatedAt: new Date() } });
        });
        it('should return 500 status if SalesFile.updateMany throws an error', async () => {
          // Arrange
          const error = randomError();
          SalesFile.updateMany.mockRejectedValue(error);
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
        it('should call bigQuery.deleteData with the correct parameters', async () => {
          // Arrange
          const filter = { id: { $in: body.ids } };
          // Act
          await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(bigQuery.deleteData).toHaveBeenCalledWith(bigQuery.inputTable, filter, expect.any(Function));
        });
        it('should return 500 status if bigQuery.deleteData returns an error', async () => {
          // Arrange
          const error = randomError();
          bigQuery.deleteData.mockImplementation((...args) => args[args.length - 1](error));
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return the status and message from salesHelpers.processUpdates', async () => {
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(body);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual(message200);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .put('/sales/delete_multiple_ids')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return the status and message from salesHelpers.processUpdates', async () => {
        // Act
        const res = await server
          .put('/sales/delete_multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual(message200);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/delete_multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/delete_multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put('/sales/delete_multiple_ids')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id PUT', () => {
    let salesId; let body;
    let salesFileId; let salesData; let validatedLine;
    beforeEach(() => {
      salesId = randomId();
      body = {
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        [randomString()]: randomString(),
      };
      salesFileId = randomId();
      salesData = [{
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        salesFileId,
      }];
      validatedLine = { [randomString()]: randomString(), [randomString()]: randomString() };
      bigQuery.queryJobPromise.mockResolvedValue(salesData);
      jest.spyOn(bigQuery, 'updateData').mockImplementation((...args) => args[args.length - 1](null));
      jest.spyOn(ValidateSales, 'line').mockImplementation((sale, callback) => callback(null, validatedLine));
      jest.spyOn(SalesFile, 'updateOne').mockResolvedValue();
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a 200 response and validated sales line', async () => {
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sale).toEqual(validatedLine);
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
          Client.findById.mockRestore();
        });
        it('should call bigQuery.getDataQuery with the correct parameters', async () => {
          // Arrange
          const updatedSelectValues = [...selectValues, 'salesFileId'];
          // Act
          await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(bigQuery.getDataQuery).toHaveBeenCalledWith(bigQuery.inputTable, updatedSelectValues, { id: salesId }, {});
        });
        it('should return 500 status if bigQuery.queryJobPromise returns an error', async () => {
          // Arrange
          const error = randomError();
          bigQuery.queryJobPromise.mockRejectedValue(error);
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
        it('should return 404 status if bigQuery.queryJobPromise returns nothing', async () => {
          // Arrange
          bigQuery.queryJobPromise.mockResolvedValue(null);
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Could not find sales line');
        });
        it('should return 404 status if bigQuery.queryJobPromise returns an empty array', async () => {
          // Arrange
          bigQuery.queryJobPromise.mockResolvedValue([]);
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Could not find sales line');
        });
        it('should remove salesFileId from queryJobPromise result', async () => {
          // Arrange
          const expectedBody = {
            ...body,
            lastModifiedBy: user._id.toString(),
          };
          const salesCopy = { ...salesData[0] };
          // Act
          await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(salesHelpers.updateSaleObjectWithParams).toHaveBeenCalledWith({ ...salesCopy, salesFileId: undefined }, expectedBody);
        });
        it('should call ValidateSales.line with the correct parameters', async () => {
          // Act
          await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(ValidateSales.line).toHaveBeenCalledWith(updateSaleObjectWithParamsResponse, expect.any(Function));
        });
        it('should return 500 status if ValidateSales.line returns an error', async () => {
          // Arrange
          const error = randomError();
          ValidateSales.line.mockImplementation((...args) => args[args.length - 1](error));
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
        it('should call SalesFile.updateOne with the correct parameters', async () => {
          // Act
          await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(SalesFile.updateOne).toHaveBeenCalledWith({ _id: new ObjectId(salesFileId) }, { $set: { updatedAt: new Date() } });
        });
        it('should return 500 status if SalesFile.updateOne throws an error', async () => {
          // Arrange
          const error = randomError();
          SalesFile.updateOne.mockRejectedValue(error);
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
        it('should call bigQuery.updateData with the correct parameters', async () => {
          // Act
          await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(bigQuery.updateData).toHaveBeenCalledWith(bigQuery.inputTable, { id: salesId }, validatedLine, expect.any(Function));
        });
        it('should return 500 status if bigQuery.updateData returns an error', async () => {
          // Arrange
          const error = randomError();
          bigQuery.updateData.mockImplementation((...args) => args[args.length - 1](error));
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(body);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a 200 response and validated sales line', async () => {
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(body);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.sale).toEqual(validatedLine);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
        // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .put(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(body);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a 200 response and validated sales line', async () => {
        // Act
        const res = await server
          .put(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser)
          .send(body);
          // Assert
        expect(res.status).toEqual(200);
        expect(res.body.sale).toEqual(validatedLine);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send(body);
          // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .put(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send(body);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id DELETE', () => {
    let salesId;
    let salesFileId; let salesData; let filter;
    beforeEach(() => {
      salesId = randomId();
      salesFileId = randomId();
      salesData = [{
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        [randomString()]: randomString(),
        salesFileId,
      }];
      filter = { id: salesId };
      bigQuery.queryJobPromise.mockResolvedValue(salesData);
      jest.spyOn(SalesFile, 'updateOne').mockResolvedValue();
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a 200 response and success message', async () => {
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual('Sale successfully deleted');
        });
        it('should return 404 status if client is not found', async () => {
          // Arrange
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockResolvedValueOnce(null);
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Client not found');
          Client.findById.mockRestore();
        });
        it('should return 500 status if Client.findById throws an error', async () => {
          // Arrange
          const error = randomError();
          jest.spyOn(Client, 'findById')
            .mockResolvedValueOnce(client)
            .mockRejectedValueOnce(error);
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
          Client.findById.mockRestore();
        });
        it('should call bigQuery.getDataQuery with the correct parameters', async () => {
          // Act
          await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(bigQuery.getDataQuery).toHaveBeenCalledWith(bigQuery.inputTable, 'salesFileId', filter, {});
        });
        it('should return 500 status if bigQuery.queryJobPromise returns an error', async () => {
          // Arrange
          const error = randomError();
          bigQuery.queryJobPromise.mockRejectedValue(error);
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
        it('should return 404 status if bigQuery.queryJobPromise returns nothing', async () => {
          // Arrange
          bigQuery.queryJobPromise.mockResolvedValue(null);
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Could not find sales line to delete');
        });
        it('should return 404 status if bigQuery.queryJobPromise returns an empty array', async () => {
          // Arrange
          bigQuery.queryJobPromise.mockResolvedValue([]);
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual('Could not find sales line to delete');
        });
        it('should call SalesFile.updateOne with the correct parameters', async () => {
          // Act
          await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(SalesFile.updateOne).toHaveBeenCalledWith({ _id: new ObjectId(salesFileId) }, { $set: { updatedAt: new Date() } });
        });
        it('should return 500 status if SalesFile.updateOne throws an error', async () => {
          // Arrange
          const error = randomError();
          SalesFile.updateOne.mockRejectedValue(error);
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
        it('should call bigQuery.deleteData with the correct parameters', async () => {
          // Act
          await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(bigQuery.deleteData).toHaveBeenCalledWith(bigQuery.inputTable, filter, expect.any(Function));
        });
        it('should return 500 status if bigQuery.deleteData returns an error', async () => {
          // Arrange
          const error = randomError();
          bigQuery.deleteData.mockImplementation((...args) => args[args.length - 1](error));
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual(INTERNAL_ERROR);
          expect(logger.error).toHaveBeenCalledWith(error);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a 200 response and success message', async () => {
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual('Sale successfully deleted');
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
        // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .delete(`/sales/${salesId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a 200 response and success message', async () => {
        // Act
        const res = await server
          .delete(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
          // Assert
        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual('Sale successfully deleted');
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .delete(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .delete(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .delete(`/sales/${salesId}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id PUT', () => {
    let query;
    let dummyFileBuffer;
    beforeEach(() => {
      query = {
        catalogueType: randomString(),
        templateType: randomString(),
      };
      dummyFileBuffer = Buffer.from(randomString());
      jest.spyOn(ImportXlsx, 'importMappings').mockResolvedValue();
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a 200 response and validated sales line', async () => {
          // Act
          const res = await server
            .post('/sales/import_mappings')
            .set('applicationToken', applicationToken)
            .attach('file', dummyFileBuffer, randomString())
            .query(query)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual('Alias mappings are importing, and a report will be sent to you shortly.');
        });
        it('should call ImportXlsx.importMappings with the correct parameters', async () => {
          // Arrange
          const curveUser = await util.promisify(jwt.verify)(clientUserFull, process.env.jsonSecretToken);
          const fileName = randomString();
          // Act
          await server
            .post('/sales/import_mappings')
            .set('applicationToken', applicationToken)
            .attach('file', dummyFileBuffer, fileName)
            .query(query)
            .set('token', clientUserFull);
          // Assert
          expect(ImportXlsx.importMappings).toHaveBeenCalledWith(
            expect.objectContaining({
              originalname: fileName,
            }),
            query.catalogueType,
            query.templateType,
            curveUser,
          );
        });
        it('should return 400 status if no file is attached', async () => {
          // Arrange
          bigQuery.queryJobPromise.mockResolvedValue(null);
          // Act
          const res = await server
            .post('/sales/import_mappings')
            .set('applicationToken', applicationToken)
            .query(query)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(400);
          expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a 200 response and validated sales line', async () => {
          // Act
          const res = await server
            .post('/sales/import_mappings')
            .set('applicationToken', applicationToken)
            .attach('file', dummyFileBuffer, randomString())
            .query(query)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body.message).toEqual('Alias mappings are importing, and a report will be sent to you shortly.');
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
        // Act
          const res = await server
            .post('/sales/import_mappings')
            .set('applicationToken', applicationToken)
            .attach('file', dummyFileBuffer, randomString())
            .query(query)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .post('/sales/import_mappings')
            .set('applicationToken', applicationToken)
            .attach('file', dummyFileBuffer, randomString())
            .query(query)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a 200 response and validated sales line', async () => {
        // Act
        const res = await server
          .post('/sales/import_mappings')
          .set('applicationToken', applicationToken)
          .attach('file', dummyFileBuffer, randomString())
          .query(query)
          .set('token', internalClientUser);
          // Assert
        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual('Alias mappings are importing, and a report will be sent to you shortly.');
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/sales/import_mappings')
          .set('applicationToken', applicationToken)
          .attach('file', dummyFileBuffer, randomString())
          .query(query)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/sales/import_mappings')
          .set('applicationToken', applicationToken)
          .attach('file', dummyFileBuffer, randomString())
          .query(query)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post('/sales/import_mappings')
          .set('applicationToken', applicationToken)
          .attach('file', dummyFileBuffer, randomString())
          .query(query)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });
});
