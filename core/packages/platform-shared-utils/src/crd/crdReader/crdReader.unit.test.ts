import { CrdReader } from './crdReader';
import { detectVersion } from './versionDetector';
import { V2Reader, V3Reader, V4Reader } from '../versionReaders';

jest.mock('./versionDetector', () => ({
  detectVersion: jest.fn(),
}));

const mockV2ReaderInstance = {
  readCrdFile: jest.fn(),
};

const mockV3ReaderInstance = {
  readCrdFile: jest.fn(),
};

const mockV4ReaderInstance = {
  readCrdFile: jest.fn(),
};

jest.mock('../versionReaders', () => ({
  V2Reader: jest.fn(() => mockV2ReaderInstance),
  V3Reader: jest.fn(() => mockV3ReaderInstance),
  V4Reader: jest.fn(() => mockV4ReaderInstance),
}));

describe('CrdReader', () => {
  const filePath = '/path/to/file.crd';
  const encoding = 'utf8' as BufferEncoding;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses V2Reader when version starts with 2', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '2.1' });
    mockV2ReaderInstance.readCrdFile.mockResolvedValue([['result']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(detectVersion).toHaveBeenCalledWith(filePath, encoding);
    expect(V2Reader).toHaveBeenCalledTimes(1);
    expect(mockV2ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['result']]);
  });

  it('uses V3Reader when version is 3.00', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '3.00' });
    mockV3ReaderInstance.readCrdFile.mockResolvedValue([['v3']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(V3Reader).toHaveBeenCalledTimes(1);
    expect(mockV3ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['v3']]);
  });

  it('uses V3Reader when version is 3.01', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '3.01' });
    mockV3ReaderInstance.readCrdFile.mockResolvedValue([['v3']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(V3Reader).toHaveBeenCalledTimes(1);
    expect(mockV3ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['v3']]);
  });

  it('uses V3Reader when version is 3.02', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '3.02' });
    mockV3ReaderInstance.readCrdFile.mockResolvedValue([['v3']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(V3Reader).toHaveBeenCalledTimes(1);
    expect(mockV3ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['v3']]);
  });

  it('uses V3Reader when version is 3.03', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '3.03' });
    mockV3ReaderInstance.readCrdFile.mockResolvedValue([['v3']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(V3Reader).toHaveBeenCalledTimes(1);
    expect(mockV3ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['v3']]);
  });

  it('uses V3Reader when version is 3.04', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '3.04' });
    mockV3ReaderInstance.readCrdFile.mockResolvedValue([['v3']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(V3Reader).toHaveBeenCalledTimes(1);
    expect(mockV3ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['v3']]);
  });

  it('uses V3Reader when version is 3.05', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '3.05' });
    mockV3ReaderInstance.readCrdFile.mockResolvedValue([['v3']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(V3Reader).toHaveBeenCalledTimes(1);
    expect(mockV3ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['v3']]);
  });

  it('uses V4Reader when version starts with 4 and forwards prs flag', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '4.01', prs: true });
    mockV4ReaderInstance.readCrdFile.mockResolvedValue([['v4']]);

    const reader = new CrdReader();
    const result = await reader.readCrdFile(filePath, encoding);

    expect(V4Reader).toHaveBeenCalledWith('4.01', true);
    expect(mockV4ReaderInstance.readCrdFile).toHaveBeenCalledWith(filePath, encoding);
    expect(result).toEqual([['v4']]);
  });

  it('throws an error for unsupported versions', async () => {
    (detectVersion as jest.Mock).mockResolvedValue({ version: '5.0' });

    const reader = new CrdReader();

    await expect(reader.readCrdFile(filePath, encoding)).rejects.toThrow('Unsupported CRD version: 5.0');
    expect(V2Reader).not.toHaveBeenCalled();
    expect(V3Reader).not.toHaveBeenCalled();
    expect(V4Reader).not.toHaveBeenCalled();
  });
});
