const { parseRawModifiedAt, readAllFiles, testFileTypeAllowed } = require('./ftpHelpers');
const { allowedSalesFileExtensions } = require('../../../config.json');

describe('parseRawModifiedAt', () => {
  test('parses format with time (e.g., "Jun 11 12:34") using current year', () => {
    const currentYear = new Date().getFullYear();
    const result = parseRawModifiedAt('Jun 11 12:34');
    expect(result).toEqual(new Date(`Jun 11 ${currentYear} 12:34:00 UTC`));
  });

  test('parses format with year (e.g., "Jun 11 2024")', () => {
    const result = parseRawModifiedAt('Jun 11 2024');
    expect(result).toEqual(new Date('Jun 11 2024 00:00:00 UTC'));
  });

  test('returns null for unrecognized format', () => {
    const result = parseRawModifiedAt('Invalid Date String');
    expect(result).toBeNull();
  });
});

describe('readAllFiles with basic-ftp list format', () => {
  let instance;

  beforeEach(() => {
    instance = {
      readAllFiles,
      testExcludeDirPattern: jest.fn().mockReturnValue(false),
      testFileInclusion: jest.fn().mockReturnValue(true),
      parseRawModifiedAt: jest.fn().mockReturnValue(new Date('2025-06-11T12:34:00Z')),
    };
  });

  it('processes file', async () => {
    const mockFtp = {
      ls: jest.fn().mockResolvedValue([
        {
          name: 'document.csv',
          type: '-',
          rawModifiedAt: 'Jun 11 12:34',
        },
        {
          name: 'archive.csv.zip',
          type: '-',
          modifiedAt: new Date('2025-06-11T12:34:00Z'),
        },
        {
          name: 'log.csv.gz',
          type: '-',
          modifiedAt: new Date('2025-06-11T12:34:00Z'),
        },
      ]),
    };

    const ftpFiles = [];
    const zipFiles = [];
    const gZipFiles = [];

    const mockServer = { protocol: 'FTP', dsp: {}, name: 'serverName' };
    const mockClient = { _id: 'clientId', name: 'clientName' };
    const mockIngestCB = jest.fn();
    const mockRecurseCB = jest.fn();
    await new Promise((resolve) => {
      instance.readAllFiles.call(
        instance,
        mockFtp,
        mockServer,
        '/some/path',
        true, // isFirstPass
        [],
        false, // recursive
        ftpFiles,
        zipFiles,
        gZipFiles,
        mockRecurseCB,
        true, // topLevel
        (...args) => {
          mockIngestCB(...args);
          resolve();
        },
        'LOGTEXT',
        mockClient,
      );
    });

    expect(mockFtp.ls).toHaveBeenCalledWith('/some/path');
    expect(instance.parseRawModifiedAt).toHaveBeenCalledTimes(1);
  });
});

describe('testFileTypeAllowed', () => {
  it.each(allowedSalesFileExtensions)(
    'should return true for allowed file extension %s',
    (extension) => {
      const fileName = `example${extension}`;
      const result = testFileTypeAllowed(fileName, 'LogTag', 'client123', 'serverABC', 'TestClient');
      expect(result).toBe(true);
    },
  );

  it.each(allowedSalesFileExtensions)(
    'should return true for allowed file extension %s (upper case)',
    (extension) => {
      const fileName = `example${extension.toUpperCase()}`;
      const result = testFileTypeAllowed(fileName, 'LogTag', 'client123', 'serverABC', 'TestClient');
      expect(result).toBe(true);
    },
  );
});
