/* eslint-disable no-await-in-loop */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const generateMfa = require('../libs/generateMfa');
const AuthenticateController = require('../controllers/authenticate');
const config = require('../config.json');
const Client = require('../models/client');
const User = require('../models/user');

const applicationToken = config.applicationTokens[0];
const server = supertest(require('../index'));

describe('/authenticate', () => {
  logger.info('>>>file>>>> routes/authenticate .....................');

  let client;
  let userApp; let userAppNoMfaType; let tokenApp;
  let userEmail; let tokenEmail;
  let tokenMfaCode; let tokenAppNoMfaType;

  const mfaCode = randomString();

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    userApp = new User({ email: `${randomString()}@curve.com`.toLowerCase(), multiFactorAuthenticationType: 'Authenticator App' });
    await userApp.save();

    const userToken = {
      id: userApp._id,
      internal: false,
      parentId: null,
      clientId: client._id.toString(),
      email: userApp.email,
      rights: {
        [client._id.toString()]: { catalogue: 'Edit' },
      },
    };
    tokenApp = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    userAppNoMfaType = new User({ email: `${randomString()}@curve.com`.toLowerCase(), multiFactorAuthenticationType: 'Authenticator App' });
    await userAppNoMfaType.save();

    const userTokenNoMfaType = {
      id: userAppNoMfaType._id,
      internal: false,
      parentId: null,
      clientId: client._id.toString(),
      email: userAppNoMfaType.email,
      rights: {
        [client._id.toString()]: { catalogue: 'Edit' },
      },
    };
    tokenAppNoMfaType = jwt.sign(userTokenNoMfaType, process.env.jsonSecretToken, { expiresIn: 86400 });

    tokenMfaCode = jwt.sign({ code: mfaCode }, process.env.jsonSecretToken, { expiresIn: 900 });
    userEmail = new User({ email: `${randomString()}@curve.com`.toLowerCase(), multiFactorAuthenticationType: 'Email', multiFactorAuthenticationEmailCode: tokenMfaCode });
    await userEmail.save();
    const userEmailToken = {
      internal: false,
      parentId: null,
      clientId: client._id.toString(),
      email: userEmail.email,
      rights: {
        [client._id.toString()]: { catalogue: 'Edit' },
      },
    };
    tokenEmail = jwt.sign(userEmailToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    jest.spyOn(AuthenticateController, 'checkPasswordExpired').mockReturnValue(false);
    jest.spyOn(generateMfa, 'authenticate').mockReturnValue(true);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('/authenticate/multi_factor POST', () => {
    it('returns 200 and not expired for app type MFA', async () => {
      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .set('token', tokenApp)
        .send({ token: tokenApp, type: 'Authenticator App' });

      expect(generateMfa.authenticate).toHaveBeenCalled();
      expect(AuthenticateController.checkPasswordExpired).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.passwordExpired).toBe(false);
    });

    it('returns 200 and not expired for app type MFA with no MFA type on the user (during setup)', async () => {
      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .set('token', tokenAppNoMfaType)
        .send({ token: tokenAppNoMfaType, type: 'Authenticator App' });

      expect(generateMfa.authenticate).toHaveBeenCalled();
      expect(AuthenticateController.checkPasswordExpired).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.passwordExpired).toBe(false);
    });

    it('returns 200 and expired for app type MFA', async () => {
      AuthenticateController.checkPasswordExpired.mockReturnValue(true);

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .set('token', tokenApp)
        .send({ token: tokenApp, type: 'Authenticator App' });

      expect(generateMfa.authenticate).toHaveBeenCalled();
      expect(AuthenticateController.checkPasswordExpired).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.passwordExpired).toBe(true);
    });

    it('returns 200 with error message for incorrect app code', async () => {
      generateMfa.authenticate.mockReturnValue(false);

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .set('token', tokenApp)
        .send({ token: tokenApp, type: 'Authenticator App' });

      expect(generateMfa.authenticate).toHaveBeenCalled();
      expect(AuthenticateController.checkPasswordExpired).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Code incorrect');
    });

    it('returns 200 and not expired for email MFA', async () => {
      jest.spyOn(User.prototype, 'multiFactorAuthenticate').mockReturnValue({ response: true, message: 'Authentication passed.' });

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .set('token', tokenEmail)
        .send({ token: tokenEmail, type: 'Email' });

      expect(User.prototype.multiFactorAuthenticate).toHaveBeenCalled();
      expect(AuthenticateController.checkPasswordExpired).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.passwordExpired).toBe(false);
    });

    it('returns 200 and expired for email MFA', async () => {
      jest.spyOn(User.prototype, 'multiFactorAuthenticate').mockReturnValue({ response: true, message: 'Authentication passed.' });
      AuthenticateController.checkPasswordExpired.mockReturnValue(true);

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .set('token', tokenEmail)
        .send({ token: tokenEmail, type: 'Email' });

      expect(User.prototype.multiFactorAuthenticate).toHaveBeenCalled();
      expect(AuthenticateController.checkPasswordExpired).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.passwordExpired).toBe(true);
    });

    it('returns 200 with error message for incorrect email MFA code', async () => {
      jest.spyOn(User.prototype, 'multiFactorAuthenticate').mockReturnValue({ response: false, message: 'Invalid code. Please try again.' });

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .set('token', tokenEmail)
        .send({ token: tokenEmail, type: 'Email' });

      expect(User.prototype.multiFactorAuthenticate).toHaveBeenCalled();
      expect(AuthenticateController.checkPasswordExpired).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Invalid code. Please try again.');
    });

    it('returns 200 after some attempts when under the rate limit threshold', async () => {
      for (let i = 0; i < 3; i += 1) {
        await server
          .post('/authenticate/multi_factor')
          .set('applicationToken', applicationToken)
          .send({ token: tokenApp, type: 'Authenticator App' });
      }

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .send({ token: tokenApp, type: 'Authenticator App' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 403 and does not crash when no token is provided', async () => {
      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .send({});

      expect(res.status).toBe(403);
    });

    it('returns 429 after 5 attempts within 15 minutes', async () => {
      for (let i = 0; i < 5; i += 1) {
        await server
          .post('/authenticate/multi_factor')
          .set('applicationToken', applicationToken)
          .send({ token: tokenApp, type: 'Authenticator App' });
      }

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .send({ token: tokenApp, type: 'Authenticator App' });

      expect(res.status).toBe(429);
    });

    it('returns 429 on correct code after 5 failed attempts', async () => {
      generateMfa.authenticate.mockReturnValue(false);

      for (let i = 0; i < 5; i += 1) {
        await server
          .post('/authenticate/multi_factor')
          .set('applicationToken', applicationToken)
          .send({ token: tokenApp, type: 'Authenticator App' });
      }

      generateMfa.authenticate.mockReturnValue(true);

      const res = await server
        .post('/authenticate/multi_factor')
        .set('applicationToken', applicationToken)
        .send({ token: tokenApp, type: 'Authenticator App' });

      expect(res.status).toBe(429);
    });
  });
});
