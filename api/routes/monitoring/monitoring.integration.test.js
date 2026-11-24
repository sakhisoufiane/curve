const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');

const Client = require('../../models/client');
const User = require('../../models/user');
const Task = require('../../models/task');
const AppSettings = require('../../models/appSettings');
const MonitoringController = require('../../controllers/monitoring');
const { clientSpecificFeeds } = require('../../processes/xmlIngestion/xmlRunnerTypes');
const Notification = require('../../models/notification');

jest.mock('../../processes/xmlIngestion/xmlRunnerTypes', () => ({
  clientSpecificFeeds: jest.fn((clientId, callback) => callback()),
}));

const server = supertest(require('../../index'));

describe('/monitoring', () => {
  logger.info('>>>file>>>> routes/monitoring/monitoring.integration.test .....................');

  const applicationToken = config.applicationTokens[0];
  let client;
  let user;
  let internalToken;
  let monitoringToken;
  let superInternalToken;
  let nonAuthorizedToken;
  let runSalesFtpIngestion;
  let runAckFtpIngestion;
  let runIswcFtpIngestions;

  beforeAll(() => {
    process.env = { ...process.env, environmentName: 'test' };

    runSalesFtpIngestion = require('../../processes/ftpIngestion/ftpRunner');
    runAckFtpIngestion = require('../../processes/ftpIngestion/ackRunner');
    runIswcFtpIngestions = require('../../processes/ftpIswcAckCheck/ftpIswcAckRunner');
  });

  beforeEach(async () => {
    jest.spyOn(Client.prototype, 'createBigQueryTables').mockImplementation((callback) => callback());
    jest.spyOn(Client.prototype, 'createBigQueryBackups').mockImplementation((callback) => callback());
    jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
    jest.spyOn(MonitoringController, 'rerunTask').mockResolvedValue();
    jest.spyOn(MonitoringController, 'terminateTask').mockResolvedValue();
    jest.spyOn(runSalesFtpIngestion, 'toString').mockReturnValue('[Function: runSalesFtpIngestion]');
    jest.spyOn(runAckFtpIngestion, 'toString').mockReturnValue('[Function: runAckFtpIngestion]');
    jest.spyOn(runIswcFtpIngestions, 'toString').mockReturnValue('[Function: runIswcFtpIngestions]');
    jest.spyOn(clientSpecificFeeds, 'toString').mockReturnValue('[Function: clientSpecificFeeds]');

    client = new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({
      _id: randomId(),
      email: `${randomString()}@curve.com`,
      internal: false,
      monitoring: false,
      superInternal: false,
    });
    await user.save();

    const internalUserToken = {
      id: user._id,
      internal: true,
      parentId: null,
      clientId: client._id,
      email: user.email,
      rights: {},
    };
    internalToken = jwt.sign(internalUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const monitoringUserToken = {
      id: user._id,
      internal: false,
      monitoring: true,
      parentId: null,
      clientId: client._id,
      email: user.email,
      rights: {},
    };
    monitoringToken = jwt.sign(monitoringUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const superInternalUserToken = {
      id: user._id,
      internal: false,
      monitoring: false,
      superInternal: true,
      parentId: null,
      clientId: client._id,
      email: user.email,
      rights: {},
    };
    superInternalToken = jwt.sign(superInternalUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const nonAuthorizedUserToken = {
      id: randomId(),
      internal: false,
      monitoring: false,
      superInternal: false,
      parentId: null,
      clientId: client._id,
      email: `${randomString()}@curve.com`,
      rights: {},
    };
    nonAuthorizedToken = jwt.sign(nonAuthorizedUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('/copyClient GET', () => {
    describe('with internal or monitoring user', () => {
      it('should return 200 and copy client task when authorized and user exists', async () => {
        const res = await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('is now copying to testing environment');
        expect(TaskHelpers.sendTaskMessage).toHaveBeenCalled();
      });

      it('should return 200 when using monitoring token', async () => {
        const res = await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('is now copying to testing environment');
      });

      it('should return 404 when client is not found', async () => {
        const invalidClientId = randomId();
        const res = await server
          .get(`/monitoring/copyClient?id=${invalidClientId}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Could not find Client with ID');
      });

      it('should return 404 when user is not found', async () => {
        // Create a token with a non-existent user ID
        const invalidUserToken = jwt.sign(
          {
            id: randomId(),
            internal: true,
            parentId: null,
            clientId: client._id,
            email: 'test@example.com',
            rights: {},
          },
          process.env.jsonSecretToken,
          { expiresIn: 86400 },
        );

        const res = await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', invalidUserToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Could not find user.');
      });

      it('should return 500 when copy client task is already running', async () => {
        // Create an existing copy client task
        await Task.create({
          name: 'Copy Client',
          clientId: client._id,
          clientName: client.name,
          status: 'Pending',
          value: {
            clientId: client._id.toString(),
            user: user.email,
          },
        });

        const res = await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(500);
        expect(res.body.message).toContain('This task is already running');
      });

      it('should return 500 when SQS message fails', async () => {
        TaskHelpers.sendTaskMessage.mockRejectedValueOnce(new Error('SQS error'));

        const res = await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Could not create task and send SQS Message');
      });

      it('should return 500 when task save fails', async () => {
        jest.spyOn(Task.prototype, 'save').mockRejectedValueOnce(new Error('DB error'));

        const res = await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Could not create task and send SQS Message');
      });

      it('should create task with correct parameters', async () => {
        const createSpy = jest.spyOn(Task.prototype, 'save').mockResolvedValueOnce(true);

        await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=true&includeArchived=true&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(createSpy).toHaveBeenCalled();
      });
    });

    describe('without authorization', () => {
      it('should return 403 for non-authorized user', async () => {
        const res = await server
          .get(`/monitoring/copyClient?id=${client._id}&includeSalesFiles=true&includeTables=false&includeArchived=false&includePeriodAndStatementFiles=true`)
          .set('applicationToken', applicationToken)
          .set('token', nonAuthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('/supportScriptList GET', () => {
    describe('with internal or monitoring user', () => {
      it('should return 200 and support scripts list', async () => {
        const appSettings = new AppSettings({
          supportScripts: [
            { name: 'Script 1', description: 'Test Script 1' },
            { name: 'Script 2', description: 'Test Script 2' },
          ],
        });
        await appSettings.save();

        const res = await server
          .get('/monitoring/supportScriptList')
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThan(0);
      });

      it('should return 200 with monitoring token', async () => {
        const appSettings = new AppSettings({
          supportScripts: [
            { name: 'Script 1' },
          ],
        });
        await appSettings.save();

        const res = await server
          .get('/monitoring/supportScriptList')
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(200);
      });

      it('should return empty array when no scripts are configured', async () => {
        await AppSettings.deleteMany({});
        await AppSettings.create({ supportScripts: [] });

        const res = await server
          .get('/monitoring/supportScriptList')
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      });
    });

    describe('without authorization', () => {
      it('should return 403 for non-authorized user', async () => {
        const res = await server
          .get('/monitoring/supportScriptList')
          .set('applicationToken', applicationToken)
          .set('token', nonAuthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('/supportScript GET', () => {
    describe('with internal or monitoring user', () => {
      it('should return 200 and create support script task', async () => {
        const scriptName = 'Test Support Script';
        const scriptParams = [{ name: 'clientId', value: client._id.toString() }];

        const res = await server
          .get('/monitoring/supportScript')
          .query({ script: scriptName, scriptParams: JSON.stringify(scriptParams) })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Script will begin shortly.');
        expect(TaskHelpers.sendTaskMessage).toHaveBeenCalled();
      });

      it('should return 200 with monitoring token', async () => {
        const scriptName = 'Test Support Script';
        const scriptParams = [{ name: 'clientId', value: client._id.toString() }];

        const res = await server
          .get('/monitoring/supportScript')
          .query({ script: scriptName, scriptParams: JSON.stringify(scriptParams) })
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(200);
      });

      it('should return 500 when support script task is already running', async () => {
        const scriptName = 'Test Support Script';
        const scriptParams = [{ name: 'clientId', value: client._id.toString() }];

        await Task.create({
          name: scriptName,
          type: 'Support Script',
          status: 'Pending',
          value: {
            id: client._id.toString(),
            script: scriptName,
            scriptParams,
          },
        });

        const res = await server
          .get('/monitoring/supportScript')
          .query({ script: scriptName, scriptParams: JSON.stringify(scriptParams) })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(500);
        expect(res.body.message).toContain('This task is already running');
      });

      it('should return 404 when user not found', async () => {
        const invalidUserToken = jwt.sign(
          {
            id: randomId(),
            internal: true,
            parentId: null,
            clientId: client._id,
            email: 'test@example.com',
            rights: {},
          },
          process.env.jsonSecretToken,
          { expiresIn: 86400 },
        );

        const scriptName = 'Test Support Script';
        const scriptParams = [{ name: 'clientId', value: client._id.toString() }];

        const res = await server
          .get('/monitoring/supportScript')
          .query({ script: scriptName, scriptParams: JSON.stringify(scriptParams) })
          .set('applicationToken', applicationToken)
          .set('token', invalidUserToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Could not find user');
      });
    });

    describe('without authorization', () => {
      it('should return 403 for non-authorized user', async () => {
        const scriptParams = [{ name: 'clientId', value: client._id.toString() }];

        const res = await server
          .get('/monitoring/supportScript')
          .query({ script: 'TestScript', scriptParams: JSON.stringify(scriptParams) })
          .set('applicationToken', applicationToken)
          .set('token', nonAuthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('/triggerFtpIngestion GET', () => {
    describe('with internal user', () => {
      it('should return 400 when FTP ingestion type is missing', async () => {
        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: client._id.toString() })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Missing FTP Ingestion Type');
      });

      it('should return 404 when client is not found', async () => {
        const invalidClientId = randomId();

        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: invalidClientId.toString(), ftpIngestionType: 'salesFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Could not find client');
      });

      it('should return 404 when ingestion type does not exist', async () => {
        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: client._id.toString(), ftpIngestionType: 'invalidIngestionType' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('does not exist');
      });

      it('should return 404 when FTP ingestion not found for client', async () => {
        const clientWithFtp = new Client({
          _id: randomId(),
          name: randomString(),
          salesFtpIngestions: [],
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
        });
        await clientWithFtp.save();

        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: clientWithFtp._id.toString(), ftpIngestionType: 'salesFtpIngestions', name: 'nonExistentFtp' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toContain('not found for this client');
      });

      it('should return 200 and trigger Catalogue FTP ingestion', async () => {
        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: client._id.toString(), ftpIngestionType: 'ddexFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('FTP ingestion has been initiated');
      });

      it('should generate a notification when ingestion completes successfully', async () => {
        jest.spyOn(Notification, 'generate').mockImplementation(() => {});

        await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: client._id.toString(), ftpIngestionType: 'ddexFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        await new Promise(process.nextTick);

        expect(Notification.generate).toHaveBeenCalledWith(
          'FTP Ingestion',
          'Catalogue FTP ingestion has completed successfully',
          null,
          expect.objectContaining({ internal: true }),
          expect.objectContaining({
            identifier: 'monitoringTools',
            subject: 'FTP Ingestion',
            mainText: 'Catalogue FTP ingestion has completed successfully',
          }),
        );
      });

      it('should return 200 and trigger Sales FTP ingestion', async () => {
        const clientWithFtp = new Client({
          _id: randomId(),
          name: randomString(),
          salesFtpIngestions: [{ name: 'Main Sales', active: true, host: 'ftp.example.com', port: 21, initialisedDate: new Date() }],
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
        });
        await clientWithFtp.save();

        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: clientWithFtp._id.toString(), ftpIngestionType: 'salesFtpIngestions', name: 'Main Sales' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Sales FTP ingestion has been initiated');
      });

      it('should return 200 and trigger ACK FTP ingestion', async () => {
        const clientWithFtp = new Client({
          _id: randomId(),
          name: randomString(),
          ackFtpIngestions: [{ name: 'ACK Ingestion', active: true, host: 'ftp.example.com', port: 21, initialisedDate: new Date() }],
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
        });
        await clientWithFtp.save();

        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: clientWithFtp._id.toString(), ftpIngestionType: 'ackFtpIngestions', name: 'ACK Ingestion' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Acknowledgement FTP ingestion has been initiated');
      });

      it('should return 200 and trigger ISWC FTP ingestion', async () => {
        const clientWithFtp = new Client({
          _id: randomId(),
          name: randomString(),
          iswcFtpIngestions: [{ name: 'ISWC Ingestion', active: true, host: 'ftp.example.com', port: 21 }],
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
        });
        await clientWithFtp.save();

        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: clientWithFtp._id.toString(), ftpIngestionType: 'iswcFtpIngestions', name: 'ISWC Ingestion' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('ISWC FTP ingestion has been initiated');
      });
    });

    describe('without internal user', () => {
      it('should return 403 for non-internal user', async () => {
        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: client._id.toString(), ftpIngestionType: 'salesFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should return 403 for non-authorized user', async () => {
        const res = await server
          .get('/monitoring/triggerFtpIngestion')
          .query({ clientId: client._id.toString(), ftpIngestionType: 'salesFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', nonAuthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('/ftpIngestionList GET', () => {
    describe('with internal user', () => {
      it('should return 200 and list of active FTP ingestions', async () => {
        const clientWithFtp = new Client({
          _id: randomId(),
          name: randomString(),
          salesFtpIngestions: [
            { name: 'Active Sales 1', active: true, host: 'ftp1.example.com', port: 21 },
            { name: 'Inactive Sales', active: false, host: 'ftp2.example.com', port: 21 },
            { name: 'Active Sales 2', active: true, host: 'ftp3.example.com', port: 21 },
          ],
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
        });
        await clientWithFtp.save();

        const res = await server
          .get('/monitoring/ftpIngestionList')
          .query({ clientId: clientWithFtp._id.toString(), ftpIngestionType: 'salesFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(2);
        expect(res.body).toContain('Active Sales 1');
        expect(res.body).toContain('Active Sales 2');
        expect(res.body).not.toContain('Inactive Sales');
      });

      it('should return 404 when client is not found', async () => {
        const invalidClientId = randomId();

        const res = await server
          .get('/monitoring/ftpIngestionList')
          .query({ clientId: invalidClientId, ftpIngestionType: 'salesFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe('Could not find client');
      });

      it('should return 500 when ftpIngestionType does not exist on client', async () => {
        const res = await server
          .get('/monitoring/ftpIngestionList')
          .query({ clientId: client._id.toString(), ftpIngestionType: 'nonExistentIngestionType' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('Failed to fetch FTP ingestion list');
      });

      it('should return 200 with empty array when no active ingestions', async () => {
        const clientWithFtp = new Client({
          _id: randomId(),
          name: randomString(),
          salesFtpIngestions: [{ name: 'Inactive', active: false, host: 'ftp.example.com', port: 21 }],
          createdBigQueryTables: true,
          createdBigQueryBackups: true,
        });
        await clientWithFtp.save();

        const res = await server
          .get('/monitoring/ftpIngestionList')
          .query({ clientId: clientWithFtp._id.toString(), ftpIngestionType: 'salesFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
      });
    });

    describe('without internal user', () => {
      it('should return 403 for non-internal user', async () => {
        const res = await server
          .get('/monitoring/ftpIngestionList')
          .query({ clientId: client._id.toString(), ftpIngestionType: 'salesFtpIngestions' })
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('/chart_credentials GET', () => {
    beforeEach(() => {
      process.env.MONGO_CHART_ID = 'test-chart-id';
      process.env.MONGO_CHART_URL = 'https://test-chart-url.example.com';
    });

    afterEach(() => {
      delete process.env.MONGO_CHART_ID;
      delete process.env.MONGO_CHART_URL;
    });

    describe('with internal user', () => {
      it('should return 200 and chart credentials', async () => {
        const internalUser = new User({
          _id: user._id,
          email: user.email,
          internal: true,
        });
        jest.spyOn(User, 'findById').mockResolvedValue(internalUser);

        const res = await server
          .get('/monitoring/chart_credentials')
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('url');
      });
    });

    describe('with monitoring user', () => {
      it('should return 200 and chart credentials', async () => {
        const monitoringUser = new User({
          _id: user._id,
          email: user.email,
          monitoring: true,
        });
        jest.spyOn(User, 'findById').mockResolvedValue(monitoringUser);

        const res = await server
          .get('/monitoring/chart_credentials')
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('url');
      });
    });

    describe('without authorization', () => {
      it('should return 403 for non-authorized user', async () => {
        const res = await server
          .get('/monitoring/chart_credentials')
          .set('applicationToken', applicationToken)
          .set('token', nonAuthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('/rerun-task GET', () => {
    describe('with superInternal user', () => {
      it('should return 200 when task is successfully rerun', async () => {
        const task = new Task({
          name: 'Test Task',
          clientId: client._id,
          status: 'Failed',
        });
        await task.save();

        const res = await server
          .get('/monitoring/rerun-task')
          .query({ taskId: task._id.toString() })
          .set('applicationToken', applicationToken)
          .set('token', superInternalToken);

        expect(res.status).toBe(200);
        expect(MonitoringController.rerunTask).toHaveBeenCalled();
      });

      it('should return 500 when rerunTask throws error', async () => {
        MonitoringController.rerunTask.mockRejectedValueOnce(new Error('Rerun failed'));

        const res = await server
          .get('/monitoring/rerun-task')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', superInternalToken);

        expect(res.status).toBe(500);
        expect(res.body.message).toContain('Failed to re-run task');
      });
    });

    describe('without superInternal user', () => {
      it('should return 403 for non-superInternal user', async () => {
        const res = await server
          .get('/monitoring/rerun-task')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should return 403 for monitoring user', async () => {
        const res = await server
          .get('/monitoring/rerun-task')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should return 403 for non-authorized user', async () => {
        const res = await server
          .get('/monitoring/rerun-task')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', nonAuthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('/terminate GET', () => {
    describe('with superInternal user', () => {
      it('should return 200 when task is successfully terminated', async () => {
        const task = new Task({
          name: 'Test Task',
          clientId: client._id,
          status: 'In Progress',
        });
        await task.save();

        const res = await server
          .get('/monitoring/terminate')
          .query({ taskId: task._id.toString() })
          .set('applicationToken', applicationToken)
          .set('token', superInternalToken);

        expect(res.status).toBe(200);
        expect(MonitoringController.terminateTask).toHaveBeenCalled();
      });

      it('should return 500 when terminateTask throws error', async () => {
        MonitoringController.terminateTask.mockRejectedValueOnce(new Error('Terminate failed'));

        const res = await server
          .get('/monitoring/terminate')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', superInternalToken);

        expect(res.status).toBe(500);
        expect(res.body.message).toContain('Failed to terminate task');
      });
    });

    describe('without superInternal user', () => {
      it('should return 403 for non-superInternal user', async () => {
        const res = await server
          .get('/monitoring/terminate')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', internalToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should return 403 for monitoring user', async () => {
        const res = await server
          .get('/monitoring/terminate')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', monitoringToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should return 403 for non-authorized user', async () => {
        const res = await server
          .get('/monitoring/terminate')
          .query({ taskId: randomId().toString() })
          .set('applicationToken', applicationToken)
          .set('token', nonAuthorizedToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });
});
