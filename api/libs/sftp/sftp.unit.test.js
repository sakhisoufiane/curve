const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const SFTP = require('ssh2-sftp-client');
const fs = require('fs');
const Sftp = require('./sftp');

describe('SFTP', () => {
  const configPrivateKey = {
    host: '3.255.155.132',
    username: 'curve_sftp',
    port: 22,
    authenticationType: 'Key File',
    privateKey: 'deliveryPartners/667a89ec8958231b88b46ef6/dummyFile',
  };
  const configPassword = {
    host: '3.255.155.132',
    username: 'curve_sftp',
    port: 22,
    authenticationType: 'Password',
  };

  it('should connect using private key', async () => {
    const serverName = randomString();
    const clientId = randomId();
    const logText = randomString();
    const clientName = randomString();
    const privateKeyMock = randomString();
    const expectedConfig = {
      host: '3.255.155.132',
      username: 'curve_sftp',
      port: 22,
      privateKey: privateKeyMock,
      algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-512'] },
    };
    const mockDownloadFromS3 = jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, 'dummyFile'));
    const mockReadFileSync = jest.spyOn(fs, 'readFileSync').mockReturnValue(privateKeyMock);
    const mockSftpConnect = jest.spyOn(SFTP.prototype, 'connect').mockResolvedValue();
    const mockLoggerInfo = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const sftp = new Sftp(configPrivateKey);
    await sftp.connect(serverName, clientId, logText, clientName);

    expect(mockDownloadFromS3).toHaveBeenCalledTimes(1);
    expect(mockDownloadFromS3).toHaveBeenCalledWith(configPrivateKey.privateKey, process.env.S3_bucket, expect.any(Function));
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync).toHaveBeenCalledWith('dummyFile');
    expect(mockSftpConnect).toHaveBeenCalledTimes(1);
    expect(mockSftpConnect.mock.calls[0][0]).toEqual(expectedConfig);
    expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
    expect(mockLoggerInfo).toHaveBeenCalledWith(`${logText}: ${clientName} (${clientId}) - ${serverName} Connected to ${configPrivateKey.host}`);
  });

  it('should connect using password', async () => {
    const serverName = randomString();
    const clientId = randomId();
    const logText = randomString();
    const clientName = randomString();
    const privateKeyMock = randomString();
    const password = randomString();
    const expectedConfig = {
      host: '3.255.155.132',
      username: 'curve_sftp',
      port: 22,
      password,
      algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-512'] },
    };
    const mockDownloadFromS3 = jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, 'dummyFile'));
    const mockReadFileSync = jest.spyOn(fs, 'readFileSync').mockReturnValue(privateKeyMock);
    const mockSftpConnect = jest.spyOn(SFTP.prototype, 'connect').mockResolvedValue();
    const mockLoggerInfo = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const sftp = new Sftp({ ...configPassword, password });
    await sftp.connect(serverName, clientId, logText, clientName);

    expect(mockDownloadFromS3).not.toHaveBeenCalled();
    expect(mockReadFileSync).not.toHaveBeenCalled();
    expect(mockSftpConnect).toHaveBeenCalledTimes(1);
    expect(mockSftpConnect.mock.calls[0][0]).toEqual(expectedConfig);
    expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
    expect(mockLoggerInfo).toHaveBeenCalledWith(`${logText}: ${clientName} (${clientId}) - ${serverName} Connected to ${configPassword.host}`);
  });

  it('should throw error if connecting using a private key and fails to download file', async () => {
    const serverName = randomString();
    const clientId = randomId();
    const logText = randomString();
    const clientName = randomString();
    jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb({ message: 'Failed to download file' }));
    const mockSftpConnect = jest.spyOn(SFTP.prototype, 'connect').mockResolvedValue();
    const mockLoggerDebug = jest.spyOn(logger, 'debug').mockImplementation(() => {});

    try {
      const sftp = new Sftp(configPrivateKey);
      await sftp.connect(serverName, clientId, logText, clientName);
    } catch (err) {
      expect(mockSftpConnect).not.toHaveBeenCalled();
      expect(err).toEqual({ message: 'Failed to download file' });
      expect(mockLoggerDebug).toHaveBeenCalledTimes(1);
      expect(mockLoggerDebug).toHaveBeenCalledWith(`${logText} - ${clientName} (${clientId}) - ${serverName} Error downloading key file from S3`);
    }
  });

  it('should throw error if connecting using a private key and fails to connect', async () => {
    const serverName = randomString();
    const clientId = randomId();
    const logText = randomString();
    const clientName = randomString();
    const privateKeyMock = randomString();
    jest.spyOn(fileManager, 'downloadFromS3').mockImplementation((key, bucket, cb) => cb(null, 'dummyFile'));
    jest.spyOn(fs, 'readFileSync').mockReturnValue(privateKeyMock);
    const mockSftpConnect = jest.spyOn(SFTP.prototype, 'connect').mockResolvedValue();
    const mockLoggerDebug = jest.spyOn(logger, 'debug').mockImplementation(() => {});
    const mockLoggerError = jest.spyOn(logger, 'error').mockImplementation(() => {});

    try {
      const sftp = new Sftp(configPrivateKey);
      await sftp.connect(serverName, clientId, logText, clientName);
    } catch (err) {
      expect(mockSftpConnect).toHaveBeenCalledTimes(1);
      expect(err).toEqual({ message: 'Failed to connect' });
      expect(mockLoggerDebug).toHaveBeenCalledTimes(1);
      expect(mockLoggerDebug).toHaveBeenCalledWith('Errored on connection');
      expect(mockLoggerError).toHaveBeenCalledWith(`${logText} - ${clientName} (${clientId}) - ${serverName} Error connecting to ${configPrivateKey.host}`);
      expect(mockLoggerError).toHaveBeenCalledWith(`${logText} - ${clientName} (${clientId}) - ${serverName} ${err}`);
    }
  });
});
