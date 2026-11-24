const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const AuthenticateController = require('./authenticate');

const Client = require('../models/client');
const Payee = require('../models/payee');

describe('Authenticate', () => {
  logger.info('\n\n**** controllers/authenticate.unit.test.js');

  describe('checkPasswordExpired', () => {
    it('should return expired if password rotation date is older than 90 days', async () => {
      const expiredDate = new Date().setDate(new Date().getDate() - 91);
      const expired = AuthenticateController.checkPasswordExpired({ userPasswordRotationDate: expiredDate });
      expect(expired).toBeTruthy();
    });

    it('should return not expired if password rotation date is more recent than 90 days', async () => {
      const expiredDate = new Date().setDate(new Date().getDate() - 50);
      const expired = AuthenticateController.checkPasswordExpired({ userPasswordRotationDate: expiredDate });
      expect(expired).toBeFalsy();
    });

    it('should return not expired if password rotation date is null', async () => {
      const expired = AuthenticateController.checkPasswordExpired({ userPasswordRotationDate: null });
      expect(expired).toBeFalsy();
    });

    it('should return not expired if password rotation date is undefined', async () => {
      const expired = AuthenticateController.checkPasswordExpired({ userPasswordRotationDate: undefined });
      expect(expired).toBeFalsy();
    });
  });

  describe('isMfaRequired', () => {
    const mockUser = {
      _id: randomId(),
      internal: false,
      superInternal: false,
      multiFactorAuthentication: false,
      adminClientIds: [],
      payeeIds: [],
    };

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return false if mfa not required', async () => {
      const mfaRequired = await AuthenticateController.isMfaRequired({ ...mockUser });
      expect(mfaRequired).toBeFalsy();
    });

    it('should return true if internal user', async () => {
      const mfaRequired = await AuthenticateController.isMfaRequired({ ...mockUser, internal: true });
      expect(mfaRequired).toBeTruthy();
    });

    it('should return true if super internal user', async () => {
      const mfaRequired = await AuthenticateController.isMfaRequired({ ...mockUser, superInternal: true });
      expect(mfaRequired).toBeTruthy();
    });

    it('should return false if admin clients but payments not enabled', async () => {
      jest.spyOn(Client, 'countDocuments').mockResolvedValue(0);

      const mfaRequired = await AuthenticateController.isMfaRequired({ ...mockUser, adminClientIds: ['client1', 'client2'] });
      expect(mfaRequired).toBeFalsy();
    });

    it('should return true if admin clients with payments enabled', async () => {
      jest.spyOn(Client, 'countDocuments').mockResolvedValue(2);

      const mfaRequired = await AuthenticateController.isMfaRequired({ ...mockUser, adminClientIds: ['client1', 'client2'] });
      expect(mfaRequired).toBeTruthy();
    });

    it('should return false if payees but payments not enabled', async () => {
      const mockPayee1 = { _id: randomId(), clientId: 'client1' };
      const mockPayee2 = { _id: randomId(), clientId: 'client2' };
      jest.spyOn(Payee, 'find').mockResolvedValue([mockPayee1, mockPayee2]);
      jest.spyOn(Client, 'countDocuments').mockResolvedValue(0);

      const mfaRequired = await AuthenticateController.isMfaRequired({ ...mockUser, payeeIds: [mockPayee1._id.toString(), mockPayee2._id.toString()] });
      expect(mfaRequired).toBeFalsy();
    });

    it('should return true if payees with payments enabled', async () => {
      const mockPayee1 = { _id: randomId(), clientId: 'client1' };
      const mockPayee2 = { _id: randomId(), clientId: 'client2' };
      jest.spyOn(Payee, 'find').mockResolvedValue([mockPayee1, mockPayee2]);
      jest.spyOn(Client, 'countDocuments').mockResolvedValue(2);

      const mfaRequired = await AuthenticateController.isMfaRequired({ ...mockUser, payeeIds: [mockPayee1._id.toString(), mockPayee2._id.toString()] });
      expect(mfaRequired).toBeTruthy();
    });
  });
});
