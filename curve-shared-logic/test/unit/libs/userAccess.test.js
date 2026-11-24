const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const userAccess = require('../../../libs/userAccess');

describe('userAccess', () => {
  describe('allowWriteAccessToAll', () => {
    it('should return false if user is not defined', async () => {
      // Arrange
      const user = undefined;
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user,
        allowPayee: false,
      });
      // Assert
      expect(result).toBe(false);
    });

    it('should return true if allowPayee is true and user has a payeeId', async () => {
      // Arrange
      const payeeId = randomId();
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { payeeId },
        allowPayee: true,
      });
      // Assert
      expect(result).toBe(true);
    });

    it('should return false if allowPayee is false and user has a payeeId', async () => {
      // Arrange
      const payeeId = randomId();
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { payeeId },
        allowPayee: false,
      });
      // Assert
      expect(result).toBe(false);
    });

    it('should return false if user has no clientId', async () => {
      // Arrange
      const clientId = undefined;
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId },
      });
      // Assert
      expect(result).toBe(false);
    });

    it('should return false if adminOnly is true and user is not admin for the client', async () => {
      // Arrange
      const clientId = randomId();
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { admin: false } } },
        adminOnly: true,
      });
      // Assert
      expect(result).toBe(false);
    });

    it('should return true if user has Edit rights for the type', async () => {
      // Arrange
      const clientId = randomId();
      const type = 'contracts';
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [type]: 'Edit' } } },
        type,
      });
      // Assert
      expect(result).toBe(true);
    });

    it('should return false if user has View rights for the type', async () => {
      // Arrange
      const clientId = randomId();
      const type = 'contracts';
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [type]: 'View' } } },
        type,
      });
      // Assert
      expect(result).toBe(false);
    });

    it('should return false if user has None rights for the type', async () => {
      // Arrange
      const clientId = randomId();
      const type = 'contracts';
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [type]: 'None' } } },
        type,
      });
      // Assert
      expect(result).toBe(false);
    });

    it('should return false if user does not have rights for the type', async () => {
      // Arrange
      const clientId = randomId();
      const type = 'contracts';
      const differentType = 'sales';
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, rights: { [clientId]: { [differentType]: 'Edit' } } },
        type,
      });
      // Assert
      expect(result).toBe(false);
    });

    it('should return true if user is internal and adminOnly is false', async () => {
      // Arrange
      const clientId = randomId();
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, internal: true },
        adminOnly: false,
      });
      // Assert
      expect(result).toBe(true);
    });

    it('should return false if user is internal and adminOnly is true', async () => {
      // Arrange
      const clientId = randomId();
      // Act
      const result = await userAccess.allowWriteAccessToAll({
        user: { clientId, internal: true },
        adminOnly: true,
      });
      // Assert
      expect(result).toBe(false);
    });
  });
});
