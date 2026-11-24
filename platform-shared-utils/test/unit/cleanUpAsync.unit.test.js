jest.mock('fs/promises');
jest.mock('app-root-dir', () => ({
  get: () => '/fake/root',
}));
jest.mock('../../libs/logger', () => ({
  error: jest.fn(),
}));

const fsPromises = require('fs/promises');
const testUtils = require('../../libs/testUtils');

describe('cleanUpAsync', () => {
  const mockDeleteMany = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    fsPromises.readdir.mockReset();
    mockDeleteMany.mockReset();
  });

  it('should delete from all models except db.js and signup.js (if clientId is provided)', async () => {
    fsPromises.readdir.mockResolvedValue([
      'client.js',
      'someModel.js',
      'signup.js',
      'db.js',
    ]);

    // Mock dynamic require
    jest.mock(
      '/fake/root/models/client.js',
      () => ({
        deleteMany: mockDeleteMany,
      }),
      { virtual: true },
    );

    jest.mock(
      '/fake/root/models/someModel.js',
      () => ({
        deleteMany: mockDeleteMany,
      }),
      { virtual: true },
    );

    const clientId = testUtils.randomId();
    await testUtils.cleanUpAsync(clientId);

    expect(mockDeleteMany).toHaveBeenCalledWith({ _id: clientId });
    expect(mockDeleteMany).toHaveBeenCalledWith({ clientId });
    expect(mockDeleteMany).toHaveBeenCalledTimes(2);
  });

  it('should delete from all models if no clientId is provided except db.js', async () => {
    fsPromises.readdir.mockResolvedValue([
      'client.js',
      'someModel.js',
      'signup.js',
      'db.js',
    ]);

    // Mock dynamic require
    jest.mock(
      '/fake/root/models/client.js',
      () => ({
        deleteMany: mockDeleteMany,
      }),
      { virtual: true },
    );

    jest.mock(
      '/fake/root/models/someModel.js',
      () => ({
        deleteMany: mockDeleteMany,
      }),
      { virtual: true },
    );

    jest.mock(
      '/fake/root/models/signup.js',
      () => ({
        deleteMany: mockDeleteMany,
      }),
      { virtual: true },
    );

    await testUtils.cleanUpAsync();

    expect(mockDeleteMany).toHaveBeenCalledWith({});
    expect(mockDeleteMany).toHaveBeenCalledWith({});
    expect(mockDeleteMany).toHaveBeenCalledWith({});
    expect(mockDeleteMany).toHaveBeenCalledTimes(3);
  });
});
