const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const Mail = require('../../libs/sendEmail');

const Client = require('../../models/client');
const User = require('../../models/user');

const config = require('../../config.json');

const applicationToken = config.applicationTokens[0];

const server = supertest(require('../../index'));

describe('/expired', function () {
  logger.info('>>>file>>>> routes/expired .....................');

  const currentPassword = 'Password1!12';
  const validPassword = 'Password2!12';

  let client;
  let user;
  let token;
  let invalidToken;

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    user = new User({ email: `${randomString()}@curve.com` }); // , password: '$2b$10$vifJ80.gG2sSW37V1btT1.h4mYC5ONYrbw3FzmNzqvQts9mlgMobe' });
    await user.save();
    user.setNewPassword(currentPassword, () => { });

    const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const invalidUserToken = { id: randomId(), internal: false, parentId: null, clientId: client._id.toString(), email: `${testUtils.randomString()}@curve.com`, rights: {} };
    invalidToken = jwt.sign(invalidUserToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  describe('/expired POST', function () {
    it('should return 400 and with message if passwords do not match', async () => {
      const expiredFields = {
        currentPassword: randomString(),
        newPassword: randomString(),
        newPasswordRepeat: randomString(),
        token,
      };
      const res = await server
        .post('/expired')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(expiredFields);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Passwords do not match');
    });

    it('should return 400 and with message if passwords do not meet requirements', async () => {
      const newPassword = randomString();
      const expiredFields = {
        currentPassword: randomString(),
        newPassword,
        newPasswordRepeat: newPassword,
        token,
      };
      const res = await server
        .post('/expired')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(expiredFields);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Password does not meet the minimum requirements');
    });

    it('should return 200 and user not found message', async () => {
      const expiredFields = {
        currentPassword: randomString(),
        newPassword: validPassword,
        newPasswordRepeat: validPassword,
        token: invalidToken,
      };
      const res = await server
        .post('/expired')
        .set('applicationToken', applicationToken)
        .query({ token: invalidToken })
        .send(expiredFields);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User not found. Please contact support');
    });

    it('should return 200 and error if current password is invalid', async () => {
      const expiredFields = {
        currentPassword: randomString(),
        newPassword: validPassword,
        newPasswordRepeat: validPassword,
        token,
      };
      const res = await server
        .post('/expired')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(expiredFields);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Current password is incorrect');
    });

    it('should return 200 and error if current password is the same as existing password', async () => {
      User.prototype.authenticate = jest.fn().mockReturnValue({ response: true });
      Mail.expiredPassword = jest.fn();
      const expiredFields = {
        currentPassword,
        newPassword: currentPassword,
        newPasswordRepeat: currentPassword,
        token,
      };
      const res = await server
        .post('/expired')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(expiredFields);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reuse is not allowed. Please select a new password');
    });

    it('should return 200 and success', async () => {
      User.prototype.authenticate = jest.fn().mockReturnValue({ response: true });
      Mail.expiredPassword = jest.fn();
      const expiredFields = {
        currentPassword,
        newPassword: validPassword,
        newPasswordRepeat: validPassword,
        token,
      };
      const res = await server
        .post('/expired')
        .set('applicationToken', applicationToken)
        .query({ token })
        .send(expiredFields);

      expect(res.status).toBe(200);
      expect(res.body.success).toBeTruthy();
      expect(Mail.expiredPassword).toHaveBeenCalledTimes(1);
    });
  });
});
