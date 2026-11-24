const { randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const helpers = require('./helpers');

describe('helpers', () => {
  describe('hashArrayOfStrings', () => {
    it('returns same hash regardless of input order', () => {
      // Arrange
      const a = ['b', 'a', 'c'];
      const b = ['c', 'b', 'a'];
      // Act & Assert
      expect(helpers.hashArrayOfStrings(a)).toBe(helpers.hashArrayOfStrings(b));
    });

    it('returns different hash for different content', () => {
      // Arrange
      const a = ['a', 'b', 'c'];
      const b = ['a', 'b', 'd'];
      // Act & Assert
      expect(helpers.hashArrayOfStrings(a)).not.toBe(helpers.hashArrayOfStrings(b));
    });

    it('is deterministic for the same input', () => {
      // Arrange
      const a = ['x', 'y', 'z'];
      // Act & Assert
      expect(helpers.hashArrayOfStrings(a)).toBe(helpers.hashArrayOfStrings(a));
    });

    it('does not mutate the input array', () => {
      // Arrange
      const original = ['b', 'a', 'c'];
      const copy = [...original];
      // Act
      helpers.hashArrayOfStrings(original);
      // Assert
      expect(original).toEqual(copy);
    });

    it('returns a 64-character hex string', () => {
      // Act
      const result = helpers.hashArrayOfStrings(['one', 'two']);
      // Assert
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });
  });
  describe('removeLeadingZeros', () => {
    it('removes leading zeros from a string', () => {
      // Arrange
      const str = randomString();
      const value = `0000${str}`;
      // Act & Assert
      expect(helpers.removeLeadingZeros({ value })).toBe(str);
    });

    it('returns empty string for falsy values', () => {
      // Act & Assert
      expect(helpers.removeLeadingZeros({ value: null })).toBe('');
      expect(helpers.removeLeadingZeros({ value: undefined })).toBe('');
      expect(helpers.removeLeadingZeros({ value: '' })).toBe('');
    });

    it('handles numeric input by converting to string', () => {
      // Arrange
      const value = randomInt();
      // Act & Assert
      expect(helpers.removeLeadingZeros({ value })).toBe(String(value));
    });

    it('returns original string if there are no leading zeros', () => {
      // Arrange
      const value = String(randomInt());
      // Act & Assert
      expect(helpers.removeLeadingZeros({ value })).toBe(value);
    });

    it('returns "0" for input of 0', () => {
      // Arrange
      const value = 0;
      // Act & Assert
      expect(helpers.removeLeadingZeros({ value })).toBe(String(value));
    });

    it('returns original string if it is all zeros', () => {
      // Arrange
      const value = '0'.repeat(randomInt());
      // Act & Assert
      expect(helpers.removeLeadingZeros({ value })).toBe(value);
    });
  });
});
