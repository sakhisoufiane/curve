const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');

const Client = require('../../models/client');
const User = require('../../models/user');

const config = require('../../config.json');

const applicationToken = config.applicationTokens[0];

const server = supertest(require('../../index'));

describe('/reset', function () {
  logger.info('>>>file>>>> routes/reset .....................');

  const currentPassword = 'Password1!12';
  const validPassword = 'Password2!12';

  let client;
  let user;
  let token;
  let invalidToken;

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    user = new User({ email: `${randomString()}@curve.com`, userCreationToken: randomString() }); // , password: '$2b$10$vifJ80.gG2sSW37V1btT1.h4mYC5ONYrbw3FzmNzqvQts9mlgMobe' });
    user.setNewPassword(currentPassword, () => { });
    await user.save();

    const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const invalidUserToken = { id: randomId(), internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    invalidToken = jwt.sign(invalidUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  describe('/reset POST', function () {
    it('should return 400 and with message if passwords do not match', async () => {
      const resetFields = {
        password: randomString(),
        confirm: randomString(),
        token,
      };
      const res = await server
        .post('/reset')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(resetFields);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Passwords do not match');
    });

    it('should return 400 and with message if passwords do not meet requirements', async () => {
      const newPassword = randomString();
      const resetFields = {
        password: newPassword,
        confirm: newPassword,
        token,
      };
      const res = await server
        .post('/reset')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(resetFields);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password does not meet the minimum requirements');
    });

    it('should return 200 and user not found message', async () => {
      const resetFields = {
        password: validPassword,
        confirm: validPassword,
        token: invalidToken,
      };
      const res = await server
        .post('/reset')
        .set('applicationToken', applicationToken)
        .query({ token: invalidToken })
        .send(resetFields);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('No user found with this email. Please contact support or the company that sent you this invite');
    });

    it('should return 200 and error if current password is the same as existing password', async () => {
      User.prototype.authenticate = jest.fn().mockReturnValue({ response: true });
      const resetFields = {
        password: currentPassword,
        confirm: currentPassword,
        token: invalidToken,
      };
      const res = await server
        .post('/reset')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(resetFields);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reuse is not allowed. Please select a new password');
    });

    it('should return 200 and success', async () => {
      User.prototype.authenticate = jest.fn().mockReturnValue({ response: true });
      const resetFields = {
        password: validPassword,
        confirm: validPassword,
        token,
      };
      const res = await server
        .post('/reset')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(resetFields);

      expect(res.status).toBe(200);
      expect(res.body.success).toBeTruthy();
    });
  });
});
