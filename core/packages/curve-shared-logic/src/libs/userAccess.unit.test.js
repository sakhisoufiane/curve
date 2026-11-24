const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const userAccess = require('./userAccess');

describe('userAccess', () => {
  describe('allowWriteAccessToAll', () => {
    it('should return false if user is not defined', async () => {
      const user = undefined;
      const result = await userAccess.allowWriteAccessToAll({ user, allowPayee: false });
      expect(result).toBeFalsy();
    });

    it('should return true if allowPayee is true and user has a payeeId', async () => {
      const payeeId = randomId();
      const result = await userAccess.allowWriteAccessToAll({ user: { payeeId }, allowPayee: true });
      expect(result).toBeTruthy();
    });

    it('should return false if allowPayee is false and user has a payeeId', async () => {
      const payeeId = randomId();
      const result = await userAccess.allowWriteAccessToAll({ user: { payeeId }, allowPayee: false });
      expect(result).toBeFalsy();
    });

    it('should return false if user has no clientId', async () => {
      const clientId = undefined;
      const result = await userAccess.allowWriteAccessToAll({ user: { clientId } });
      expect(result).toBeFalsy();
    });

    it('should return false if adminOnly is true and user is not admin for the client', async () => {
      const clientId = randomId();
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { admin: false } } },
        adminOnly: true,
      });
      expect(result).toBeFalsy();
    });

    it('should return true if user has Edit rights for the type', async () => {
      const clientId = randomId();
      const type = 'contracts';
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [type]: 'Edit' } } },
        type,
      });
      expect(result).toBeTruthy();
    });

    it('should return false if user has View rights for the type', async () => {
      const clientId = randomId();
      const type = 'contracts';
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [type]: 'View' } } },
        type,
      });
      expect(result).toBeFalsy();
    });

    it('should return false if user has None rights for the type', async () => {
      const clientId = randomId();
      const type = 'contracts';
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [type]: 'None' } } },
        type,
      });
      expect(result).toBeFalsy();
    });

    it('should return false if user does not have rights for the type', async () => {
      const clientId = randomId();
      const type = 'contracts';
      const differentType = 'sales';
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [differentType]: 'Edit' } } },
        type,
      });
      expect(result).toBeFalsy();
    });

    it('should return true if user is internal and adminOnly is false', async () => {
      const clientId = randomId();
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, internal: true },
        adminOnly: false,
      });
      expect(result).toBeTruthy();
    });

    it('should return false if user is internal and adminOnly is true', async () => {
      const clientId = randomId();
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, internal: true },
        adminOnly: true,
      });
      expect(result).toBeFalsy();
    });
  });
});
