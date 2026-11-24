jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  TaskHelpers: { createTaskAndSendMessage: jest.fn().mockResolvedValue({}) },
}));

const request = require('supertest');
const { testUtils, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');

const config = require('../../config.json');
const User = require('../../models/user');
const Client = require('../../models/client');
const Task = require('../../models/task');
const server = require('../../index');
const { TASK_NAME } = require('../../libs/duplicates/runTaskForFindingDuplicates');

const applicationToken = config.applicationTokens[0];

describe('/publishers', () => {
  let email;
  let client;
  let user;
  let clientUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    email = `${randomString()}@curve.com`;

    [client, user] = await Promise.all([
      Client({ name: testUtils.randomString(), createdBigQueryTables: true, createdBigQueryBackups: true }).save(),
      new User({ email }).save(),
    ]);

    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  describe('/duplicates/start-task GET', () => {
    describe('when the type is works', () => {
      it('should start a task for finding duplicate works', async () => {
        const response = await request(server)
          .get('/catalogue/duplicates/start-task?type=work')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(response.statusCode).toEqual(200);
        expect(response.body.message).toEqual('Searching Catalogue For Duplicates');
        expect(response.body.type).toEqual('work');
        expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, expect.objectContaining({
          name: TASK_NAME,
          clientId: client._id.toString(),
          email,
          value: expect.objectContaining({ catalogueType: 'work', clientId: client._id.toString() }),
        }));
      });
    });

    describe('when the type is composers', () => {
      it('should start a task for finding duplicate composers', async () => {
        const response = await request(server)
          .get('/catalogue/duplicates/start-task?type=composer')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(response.statusCode).toEqual(200);
        expect(response.body.message).toEqual('Searching Catalogue For Duplicates');
        expect(response.body.type).toEqual('composer');
        expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, expect.objectContaining({
          name: TASK_NAME,
          clientId: client._id.toString(),
          email,
          value: expect.objectContaining({ catalogueType: 'composer', clientId: client._id.toString() }),
        }));
      });
    });

    describe('when the type is publishers', () => {
      it('should start a task for finding duplicate publishers', async () => {
        const response = await request(server)
          .get('/catalogue/duplicates/start-task?type=publisher')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(response.statusCode).toEqual(200);
        expect(response.body.message).toEqual('Searching Catalogue For Duplicates');
        expect(response.body.type).toEqual('publisher');
        expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, expect.objectContaining({
          name: TASK_NAME,
          clientId: client._id.toString(),
          email,
          value: expect.objectContaining({ catalogueType: 'publisher', clientId: client._id.toString() }),
        }));
      });
    });
  });
});
