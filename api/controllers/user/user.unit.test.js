const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const bcrypt = require('bcrypt');
const { checkPasswordsMatch } = require('./user');

describe('user', () => {
  describe('checkPasswordsMatch', () => {
    it('should return no match if old password not provided', async () => {
      const passwordsMatch = checkPasswordsMatch(undefined, randomString());
      expect(passwordsMatch).toBeFalsy();
    });

    it('should return no match if new password not provided', async () => {
      const passwordsMatch = checkPasswordsMatch(randomString(), undefined);
      expect(passwordsMatch).toBeFalsy();
    });

    it('should return no match if neither password provided', async () => {
      const passwordsMatch = checkPasswordsMatch(undefined, undefined);
      expect(passwordsMatch).toBeFalsy();
    });

    it('should return no match if encrypted passwords do not match', async () => {
      bcrypt.compareSync = jest.fn().mockReturnValue(false);
      const passwordsMatch = checkPasswordsMatch(randomString(), randomString());
      expect(passwordsMatch).toBeFalsy();
    });

    it('should return a match if encrypted passwords match', async () => {
      bcrypt.compareSync = jest.fn().mockReturnValue(true);
      const passwordsMatch = checkPasswordsMatch(randomString(), randomString());
      expect(passwordsMatch).toBeTruthy();
    });
  });
});
