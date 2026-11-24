// Output location example:
// Input:  ./test/unit/src/userService.unit.test.js
// Output: ./src/userService.unit.test.js  ← next to the source file

const userService = require('../src/userService');

describe('UserService', () => {
  let mockFind;

  beforeAll(() => {
    mockFind = jest.spyOn(userService, 'find');
  });

  it('returns a user', async () => {
    mockFind.mockResolvedValue({ id: 1, name: 'Alice' });
    const user = await userService.find(1);
    expect(user).toEqual({ id: 1, name: 'Alice' });
  });

  it('throws on missing user', () => {
    expect(() => userService.find(null)).toThrow('Invalid ID');
  });
});
