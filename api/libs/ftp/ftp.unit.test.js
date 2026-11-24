jest.mock('basic-ftp', () => {
  const mClient = {
    access: jest.fn(),
    list: jest.fn(),
    close: jest.fn(),
  };

  return {
    Client: jest.fn(() => mClient),
  };
});

jest.mock('ftp', () => jest.fn().mockImplementation(() => {
  const handlers = {};
  return {
    on: (event, cb) => {
      handlers[event] = cb;
    },
    connect: () => {
      // simulate async "ready" event
      setImmediate(() => {
        if (handlers.ready) handlers.ready();
      });
    },
    end: jest.fn(),
    put: jest.fn(),
    get: jest.fn(),
    rmdir: jest.fn(),
    mkdir: jest.fn(),
  };
}));

const Ftp = require('./ftp');

describe('ls function', () => {
  let ftpInstance;
  const MockClient = require('basic-ftp').Client;
  const mockList = MockClient().list;

  beforeEach(async () => {
    ftpInstance = new Ftp({
      host: 'mock-host',
      username: 'user',
      password: 'pass',
      protocol: 'FTP',
    });

    mockList.mockResolvedValue([
      { name: 'visible-dir', type: 2 },
      { name: '.hidden-dir', type: 2 },
      { name: 'file.txt', type: 0 },
    ]);

    await ftpInstance.connect('serverName', 'clientId', 'logText', 'clientName');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return only non-hidden directories and files', async () => {
    const result = await ftpInstance.ls('/');
    expect(result).toEqual([
      { name: 'visible-dir', type: 'd' },
      { name: 'file.txt', type: '?' },
    ]);
    expect(mockList).toHaveBeenCalledWith('/');
  });

  it('should default to root directory if no argument provided', async () => {
    await ftpInstance.ls();
    expect(mockList).toHaveBeenCalledWith('/');
  });
});
