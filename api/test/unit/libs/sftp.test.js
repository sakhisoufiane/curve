const sinon = require('sinon');
const chai = require('chai');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const SFTP = require('ssh2-sftp-client');
const fs = require('fs');
const Sftp = require('../../../libs/sftp');
chai.use(require('sinon-chai'));

const { expect } = chai;

// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('SFTP', () => {
  logger.info('\n\n**** .test/unit/libs/sftp.test.js');

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

  afterEach(() => {
    sinon.restore();
  });

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
    sinon.stub(fileManager, 'downloadFromS3').yields(null, 'dummyFile');
    sinon.stub(fs, 'readFileSync').returns(privateKeyMock);
    sinon.stub(SFTP.prototype, 'connect').resolves();
    sinon.stub(logger, 'info');

    const sftp = new Sftp(configPrivateKey);
    await sftp.connect(serverName, clientId, logText, clientName);

    expect(fileManager.downloadFromS3).to.have.been.calledOnceWith(configPrivateKey.privateKey, process.env.S3_bucket);
    expect(fs.readFileSync).to.have.been.calledOnceWith('dummyFile');
    expect(SFTP.prototype.connect).to.have.been.calledOnce;
    expect(SFTP.prototype.connect.getCall(0).args[0]).to.deep.eql(expectedConfig);
    expect(logger.info).to.have.been.calledOnceWith(`${logText}: ${clientName} (${clientId}) - ${serverName} Connected to ${configPrivateKey.host}`);
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
    sinon.stub(fileManager, 'downloadFromS3').yields(null, 'dummyFile');
    sinon.stub(fs, 'readFileSync').returns(privateKeyMock);
    sinon.stub(SFTP.prototype, 'connect').resolves();
    sinon.stub(logger, 'info');

    const sftp = new Sftp({ ...configPassword, password });
    await sftp.connect(serverName, clientId, logText, clientName);

    expect(fileManager.downloadFromS3).to.not.have.been.called;
    expect(fs.readFileSync).to.not.have.been.called;
    expect(SFTP.prototype.connect).to.have.been.calledOnce;
    expect(SFTP.prototype.connect.getCall(0).args[0]).to.deep.eql(expectedConfig);
    expect(logger.info).to.have.been.calledOnceWith(`${logText}: ${clientName} (${clientId}) - ${serverName} Connected to ${configPassword.host}`);
  });

  it('should throw error if connecting using a private key and fails to download file', async () => {
    const serverName = randomString();
    const clientId = randomId();
    const logText = randomString();
    const clientName = randomString();
    sinon.stub(fileManager, 'downloadFromS3').yields({ message: 'Failed to download file' });
    sinon.stub(SFTP.prototype, 'connect').resolves();
    sinon.stub(logger, 'debug');

    try {
      const sftp = new Sftp(configPrivateKey);
      await sftp.connect(serverName, clientId, logText, clientName);
    } catch (err) {
      expect(SFTP.prototype.connect).not.to.have.been.called;
      expect(err).to.deep.eql({ message: 'Failed to download file' });
      expect(logger.debug).to.have.been.calledOnceWith(`${logText} - ${clientName} (${clientId}) - ${serverName} Error downloading key file from S3`);
    }
  });

  it('should throw error if connecting using a private key and fails to connect', async () => {
    const serverName = randomString();
    const clientId = randomId();
    const logText = randomString();
    const clientName = randomString();
    const privateKeyMock = randomString();
    sinon.stub(fileManager, 'downloadFromS3').yields(null, 'dummyFile');
    sinon.stub(fs, 'readFileSync').returns(privateKeyMock);
    sinon.stub(SFTP.prototype, 'connect').resolves();
    sinon.stub(logger, 'debug');
    sinon.stub(logger, 'error');

    try {
      const sftp = new Sftp(configPrivateKey);
      await sftp.connect(serverName, clientId, logText, clientName);
    } catch (err) {
      expect(SFTP.prototype.connect).to.have.been.calledOnce;
      expect(err).to.deep.eql({ message: 'Failed to connect' });
      expect(logger.debug).to.have.been.calledOnceWith('Errored on connection');
      expect(logger.error).to.have.been.calledWith(`${logText} - ${clientName} (${clientId}) - ${serverName} Error connecting to ${configPrivateKey.host}`);
      expect(logger.error).to.have.been.calledWith(`${logText} - ${clientName} (${clientId}) - ${serverName} ${err}`);
    }
  });
});
