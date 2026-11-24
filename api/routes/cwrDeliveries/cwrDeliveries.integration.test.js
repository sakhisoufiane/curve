const { testUtils, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, cleanUpAsync } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');

const Client = require('../../models/client');
const User = require('../../models/user');
const Task = require('../../models/task');
const config = require('../../config.json');
const CwrDelivery = require('../../models/cwrDelivery');
const CwrDeliveryController = require('../../controllers/cwrDelivery');

const applicationToken = config.applicationTokens[0];

const server = supertest(require('../../index'));

describe('/cwrDeliveries', () => {
  let client;
  let user;
  let delivery;
  let token;
  let invalidToken;

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    user = new User({ clientId: client._id.toString(), email: `${randomString()}@curve.com` });
    await user.save();

    delivery = new CwrDelivery({
      name: randomString(),
      clientId: client._id.toString(),
      outputFormat: 'CWR',
      territory: 'WW',
      workIds: [randomId(), randomId(), randomId()],
    });
    await delivery.save();

    const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const invalidUserToken = { id: randomId(), internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    invalidToken = jwt.sign(invalidUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
  });

  afterEach(async () => {
    await cleanUpAsync(client._id.toString());
  });

  describe('/:id/songlist/export POST', () => {
    it('should return 404 when the delivery could not be found', async () => {
      // Arrange
      const id = randomId();

      // Act
      const res = await server
        .post(`/cwrDeliveries/${id}/songlist/export`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      // Assert
      expect(res.status).toEqual(404);
      expect(res.body.message).toEqual(`Could not find Cwr Delivery with ID ${id}`);
    });

    it('should return 403 if the user has no catalogue rights', async () => {
      // Act
      const res = await server
        .post(`/cwrDeliveries/${delivery._id.toString()}/songlist/export`)
        .set('applicationToken', applicationToken)
        .set('token', invalidToken);

      // Assert
      expect(res.status).toEqual(403);
      expect(res.body.message).toEqual('Forbidden');
    });

    it('should return 200 success and send an export task to the queue', async () => {
      // Act
      const res = await server
        .post(`/cwrDeliveries/${delivery._id.toString()}/songlist/export`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      // Assert
      expect(res.status).toEqual(200);

      // A Songlist Export task should have been created
      const [task] = await Task.find({
        name: 'Songlist Export',
        clientId: client._id.toString(),
        'value.deliveryId': delivery._id.toString(),
      });
      expect(task).toMatchObject({
        clientId: client._id.toString(),
        clientName: client.name,
        name: 'Songlist Export',
        email: user.email,
        status: 'Pending',
        value: { deliveryId: delivery._id.toString() },
      });

      // The task above should have been sent to the queue
      expect(TaskHelpers.sendTaskMessage).toHaveBeenCalled();
      const sentTask = TaskHelpers.sendTaskMessage.mock.calls[0][0];
      expect(sentTask._id.toString()).toEqual(task._id.toString());
    });

    it('should return 500 if an error occurs in the export controller method', async () => {
      // Arrange
      jest.spyOn(CwrDeliveryController, 'exportSonglist').mockRejectedValue(new Error('FakeError'));

      // Act
      const res = await server
        .post(`/cwrDeliveries/${delivery._id.toString()}/songlist/export`)
        .set('applicationToken', applicationToken)
        .set('token', token);

      // Assert
      expect(res.status).toEqual(500);
      expect(res.body.message).toEqual('Internal error, please try again');
    });
  });
});
