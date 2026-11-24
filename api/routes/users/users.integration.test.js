const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomInt, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const { authenticator } = require('otplib');
const generateMfa = require('../../libs/generateMfa');
const AuthenticateController = require('../../controllers/authenticate');
const config = require('../../config.json');
const Client = require('../../models/client');
const User = require('../../models/user');
const Payee = require('../../models/payee');
const Authenticate = require('../../libs/authenticate');

const applicationToken = config.applicationTokens[0];
const server = supertest(require('../../index'));

describe('/users', () => {
  logger.info('>>>file>>>> routes/users .....................');

  let client;
  let user;
  let token;
  let tokenNoRights;
  let payee;

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();

    payee = new Payee({ name: randomString(), clientId: client._id.toString() });
    await payee.save();

    user = new User({ email: `${randomString()}@curve.com`.toLowerCase(), status: 'Active' });
    await user.save();

    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id.toString(),
      email: user.email,
      rights: {
        [client._id.toString()]: { catalogue: 'Edit' },
      },
    };
    token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

    const userTokenNoRights = {
      id: randomId(),
      internal: false,
      parentId: null,
      clientId: client._id.toString(),
      email: `${testUtils.randomString()}@curve.com`,
      rights: {},
    };
    tokenNoRights = jwt.sign(userTokenNoRights, process.env.jsonSecretToken, { expiresIn: 86400 });

    jest.spyOn(AuthenticateController, 'checkPasswordExpired').mockReturnValue(false);
    jest.spyOn(generateMfa, 'authenticate').mockReturnValue(true);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('/users/:id/check_mfa PUT', () => {
    it('returns 401 for invalid authenticator token', async () => {
      jest.spyOn(authenticator, 'check').mockImplementation(() => false);
      generateMfa.authenticate.mockRestore();

      const res = await server
        .put(`/users/${user._id}/check_mfa`)
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send({
          multiFactorAuthenticationType: 'Authenticator App',
          multiFactorAuthenticationSetupToken: randomInt(),
          email: user.email,
        });

      expect(authenticator.check).toHaveBeenCalled();
      expect(res.status).toBe(401);
      expect(res.body.success).toBeFalsy();
    });

    it('returns 200 and success true for valid authenticator token', async () => {
      jest.spyOn(authenticator, 'check').mockImplementation(() => false);
      generateMfa.authenticate = jest.fn().mockReturnValue(true);

      const res = await server
        .put(`/users/${user._id}/check_mfa`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          multiFactorAuthenticationType: 'Authenticator App',
          multiFactorAuthenticationSetupToken: randomInt(),
          email: user.email,
        });

      expect(generateMfa.authenticate).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.success).toBeTruthy();
    });

    it('returns 401 and success false for invalid email authenticator token', async () => {
      const mfaToken = randomInt(6);
      jest.spyOn(Authenticate, 'decodeToken').mockImplementation((code, cb) => cb({ id: user._id.toString(), code: randomInt(6) }));

      const res = await server
        .put(`/users/${user._id}/check_mfa`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          multiFactorAuthenticationType: 'Email',
          multiFactorAuthenticationSetupToken: mfaToken,
          email: user.email,
        });

      expect(Authenticate.decodeToken).toHaveBeenCalled();
      expect(res.status).toBe(401);
      expect(res.body.success).toBeFalsy();
    });

    it('returns 200 and success true for valid email authenticator token', async () => {
      const mfaToken = randomInt(6);
      jest.spyOn(Authenticate, 'decodeToken').mockImplementation((code, cb) => cb({ id: user._id.toString(), code: mfaToken }));

      const res = await server
        .put(`/users/${user._id}/check_mfa`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          multiFactorAuthenticationType: 'Email',
          multiFactorAuthenticationSetupToken: mfaToken,
          email: user.email,
        });

      expect(Authenticate.decodeToken).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.success).toBeTruthy();
    });

    it('returns 200 and success false if invalid auth type', async () => {
      jest.spyOn(authenticator, 'check').mockImplementation(() => false);
      generateMfa.authenticate = jest.fn().mockReturnValue(true);

      const res = await server
        .put(`/users/${user._id}/check_mfa`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          multiFactorAuthenticationType: 'Invalid Type',
          multiFactorAuthenticationSetupToken: randomInt(),
          email: user.email,
        });

      expect(generateMfa.authenticate).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body.success).toBeFalsy();
      expect(res.body.message).toBe('Multi-factor authentication type not set');
    });
  });

  describe('/users/enable_mfa POST', () => {
    it('returns 200 and success false when user not found', async () => {
      const res = await server
        .post('/users/enable_mfa')
        .set('applicationToken', applicationToken)
        .set('token', tokenNoRights)
        .send({ email: randomString(), type: 'Email' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBeFalsy();
      expect(res.body.message).toBe('User not found. Please check details and try again.');
    });

    it('returns 200 and success true when user found and type is email', async () => {
      const res = await server
        .post('/users/enable_mfa')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ email: user.email, type: 'Email' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBeTruthy();

      const updatedUser = await User.findOne({ email: user.email });
      expect(updatedUser.multiFactorAuthentication).toBeTruthy();
      expect(updatedUser.multiFactorAuthenticationType).toBe('Email');
    });

    it('returns 200 and success true when user found and type is authenticator app', async () => {
      const res = await server
        .post('/users/enable_mfa')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({ email: user.email, type: 'Authenticator App' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBeTruthy();

      const updatedUser = await User.findOne({ email: user.email });
      expect(updatedUser.multiFactorAuthentication).toBeTruthy();
      expect(updatedUser.multiFactorAuthenticationType).toBe('Authenticator App');
    });
  });

  describe('/users/:id/setup_mfa_email PUT', () => {
    it('returns 200 and success false when multiFactorAuthenticationType is not Email', async () => {
      const res = await server
        .put(`/users/${user._id}/setup_mfa_email`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          email: randomString(),
          multiFactorAuthenticationType: 'Invalid Type',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBeFalsy();
      expect(res.body.message).toBe('Multi-factor authentication type not set to Email');
    });

    it('returns 200 and success false when user not found', async () => {
      const res = await server
        .put(`/users/${randomId()}/setup_mfa_email`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          email: randomString(),
          multiFactorAuthenticationType: 'Email',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBeFalsy();
      expect(res.body.message).toBe('User not found. Please check details and try again.');
    });

    it('returns 200 and success true when valid user and multiFactorAuthenticationType is Email', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({ ...user, createMultiFactorTokenAndSendEmail: jest.fn((cb) => cb(null, randomString())) });

      const res = await server
        .put(`/users/${user._id}/setup_mfa_email`)
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          email: randomString(),
          multiFactorAuthenticationType: 'Email',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBeTruthy();
    });
  });
  describe('/users/:id DELETE', () => {
    let anotherClient;
    let anotherPayee;
    let clientAdminUser;
    let clientAdminToken;
    beforeEach(async () => {
      // Create another client for multi-client test
      const anotherClientDoc = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
      await anotherClientDoc.save();
      anotherClient = await Client.findById(anotherClientDoc._id);

      const anotherPayeeDoc = new Payee({ name: randomString(), clientId: anotherClient._id.toString() });
      await anotherPayeeDoc.save();
      anotherPayee = await Payee.findById(anotherPayeeDoc._id);

      // Create a client admin user to perform the deletion
      const clientAdminUserDoc = new User({
        email: `${randomString()}@curve.com`.toLowerCase(),
        status: 'Active',
        adminClientIds: [client._id.toString()],
        rights: {
          [client._id.toString()]: { catalogue: 'Edit' },
        },
      });
      await clientAdminUserDoc.save();
      clientAdminUser = await User.findById(clientAdminUserDoc._id);

      clientAdminToken = jwt.sign({
        id: clientAdminUser._id,
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: clientAdminUser.email,
        rights: {
          [client._id.toString()]: { catalogue: 'Edit' },
        },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });
    describe('When a user has multiple clients and/or payees', () => {
      describe('When a standard user is removed from a client', () => {
        it('should remove the user from the client', async () => {
          // Arrange
          const standardUser = new User({
            email: `${randomString()}@curve.com`.toLowerCase(),
            status: 'Active',
            clientIds: [client._id.toString(), anotherClient._id.toString()],
            rights: {
              [client._id.toString()]: { catalogue: 'Edit' },
              [anotherClient._id.toString()]: { catalogue: 'Edit' },
            },
            payeeIds: [payee._id.toString(), anotherPayee._id.toString()],
          });
          await standardUser.save();

          // Act
          const res = await server
            .delete(`/users/${standardUser._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientAdminToken);

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.success).toBeTruthy();
          expect(res.body.message).toBe('User successfully deleted');

          // Verify user still exists but was removed from the client
          const updatedUser = await User.findById(standardUser._id);
          expect(updatedUser).toBeTruthy();
          expect(updatedUser.clientIds).not.toContain(client._id.toString());
          expect(updatedUser.clientIds).toContain(anotherClient._id.toString());

          // Verify rights for the client were removed
          expect(updatedUser.rights[client._id.toString()]).toBeUndefined();
          expect(updatedUser.rights[anotherClient._id.toString()]).toBeDefined();

          // Verify payees associated with the client were removed
          expect(updatedUser.payeeIds).not.toContain(payee._id.toString());
          expect(updatedUser.payeeIds).toContain(anotherPayee._id.toString());
        });
      });

      describe('When payee is removed from a user', () => {
        it('should remove the payee from the user', async () => {
          // Arrange
          const standardUser = new User({
            email: `${randomString()}@curve.com`.toLowerCase(),
            status: 'Active',
            clientIds: [client._id.toString(), anotherClient._id.toString()],
            payeeIds: [payee._id.toString(), anotherPayee._id.toString()],
            rights: {
              [client._id.toString()]: { catalogue: 'Edit' },
              [anotherClient._id.toString()]: { catalogue: 'Edit' },
            },
          });
          await standardUser.save();

          clientAdminToken = jwt.sign({
            id: clientAdminUser._id,
            internal: false,
            parentId: null,
            clientId: client._id.toString(),
            email: clientAdminUser.email,
            payeeId: payee._id.toString(),
            rights: {
              [client._id.toString()]: { catalogue: 'Edit' },
            },
          }, process.env.jsonSecretToken, { expiresIn: 86400 });

          // Act
          const res = await server
            .delete(`/users/${standardUser._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientAdminToken);

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.success).toBeTruthy();
          expect(res.body.message).toBe('User successfully deleted');
          const updatedUser = await User.findById(standardUser._id);
          expect(updatedUser).toBeTruthy();
          expect(updatedUser.payeeIds).not.toContain(payee._id.toString());
          expect(updatedUser.payeeIds).toContain(anotherPayee._id.toString());
          expect(updatedUser.rights[client._id.toString()]).toBeDefined();
          expect(updatedUser.rights[anotherClient._id.toString()]).toBeDefined();
        });
      });

      describe('When a client admin user is removed from a client', () => {
        it('should remove the user from the client', async () => {
          // Arrange
          const clientAdminUserDoc = new User({
            email: `${randomString()}@curve.com`.toLowerCase(),
            status: 'Active',
            clientIds: [client._id.toString(), anotherClient._id.toString()],
            adminClientIds: [client._id.toString()],
            rights: {
              [client._id.toString()]: { catalogue: 'Edit', admin: 'true' },
              [anotherClient._id.toString()]: { catalogue: 'Edit' },
            },
          });
          await clientAdminUserDoc.save();
          clientAdminUser = await User.findById(clientAdminUserDoc._id);

          // Act
          const res = await server
            .delete(`/users/${clientAdminUser._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientAdminToken);

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.success).toBeTruthy();
          expect(res.body.message).toBe('User successfully deleted');
          const updatedUser = await User.findById(clientAdminUser._id);
          expect(updatedUser).toBeTruthy();
          expect(updatedUser.clientIds).not.toContain(client._id.toString());
          expect(updatedUser.clientIds).toContain(anotherClient._id.toString());
          expect(updatedUser.adminClientIds).not.toContain(client._id.toString());
          expect(updatedUser.rights[client._id.toString()]).toBeUndefined();
          expect(updatedUser.rights[anotherClient._id.toString()]).toBeDefined();
        });
      });

      describe('When user removed from all clients and payees', () => {
        it('User should be deleted', async () => {
          // Arrange
          const standardUser = new User({
            email: `${randomString()}@curve.com`.toLowerCase(),
            status: 'Active',
            clientIds: [client._id.toString()],
            rights: {
              [client._id.toString()]: { catalogue: 'Edit' },
            },
          });
          await standardUser.save();

          // Act
          const res = await server
            .delete(`/users/${standardUser._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientAdminToken);

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.success).toBeTruthy();
          expect(res.body.message).toBe('User successfully deleted');
          const updatedUser = await User.findById(standardUser._id);
          expect(updatedUser).toBeNull();
        });

        it('User should be deleted when removed from all payees', async () => {
          // Arrange
          const standardUser = new User({
            email: `${randomString()}@curve.com`.toLowerCase(),
            status: 'Active',
            payeeIds: [payee._id.toString()],
          });
          await standardUser.save();

          // Act
          const res = await server
            .delete(`/users/${standardUser._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientAdminToken);

          // Assert
          expect(res.status).toBe(200);
          expect(res.body.success).toBeTruthy();
          expect(res.body.message).toBe('User successfully deleted');
          const updatedUser = await User.findById(standardUser._id);
          expect(updatedUser).toBeNull();
        });
      });
    });
  });
});
