const TerritoryGroupController = require('./territoryGroup');

const expectedErrorMessage = 'Territory Group name must be <150 characters and contain only characters: A-Z a-z 0-9 () \' - , and spaces';

describe('validate', () => {
  it('should pass for a valid alphanumeric name', () => {
    expect(TerritoryGroupController.validate({ name: 'ValidName123 (Europe, Netherlands)' }))
      .toEqual([]);
  });

  it('should fail if name contains any special characters', () => {
    const specialChars = [
      '!', '@', '#', '$', '%', '^', '&', '*',
      '_', '=', '+', '[', ']', '{', '}', ';', ':',
      '"', '\\', '|', '.', '<', '>', '/', '?', '`', '~',
    ];
    specialChars.forEach((char) => {
      const name = `ValidName${char}`;
      expect(TerritoryGroupController.validate({ name }))
        .toEqual([expectedErrorMessage]);
    });
  });

  it('should fail if name exceeds 150 characters', () => {
    const longName = 'A'.repeat(151);
    expect(TerritoryGroupController.validate({ name: longName }))
      .toEqual([expectedErrorMessage]);
  });

  it('should pass if name contains spaces', () => {
    expect(TerritoryGroupController.validate({ name: 'Valid Name With Spaces, World' }))
      .toEqual([]);
  });

  it('should pass for an empty string', () => {
    expect(TerritoryGroupController.validate({ name: '' }))
      .toEqual([]);
  });
});
