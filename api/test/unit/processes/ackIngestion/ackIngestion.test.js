const sinon = require('sinon');
const chai = require('chai');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');
chai.use(require('sinon-chai'));
const SFTP = require('ssh2-sftp-client');
const fs = require('fs');
const ackIngestion = require('../../../../processes/ftpIngestion/ackIngestion');
const Client = require('../../../../models/client');

const { expect } = chai;

describe('ackIngestion', () => {
  logger.info('\n\n**** .test/unit/processes/ackIngestion/ackIngestion.test.js');

  afterEach(() => {
    sinon.restore();
  });

  it('should call sftp with private key param', async () => {
    const client = { clientId: randomId() };
    const logText = randomString();
    const privateKeyMock = randomString();
    const server = {
      protocol: 'SFTP',
      host: '3.255.155.132',
      username: 'curve_sftp',
      port: 22,
      authenticationType: 'Key File',
      fileKey: privateKeyMock,
      algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-512'] },
      initialisedDate: moment().format(),
    };
    const expectedConfig = {
      host: '3.255.155.132',
      username: 'curve_sftp',
      privateKey: privateKeyMock,
      port: 22,
      algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-512'] },
    };
    sinon.stub(fileManager, 'downloadFromS3').yields(null, 'dummyFile');
    sinon.stub(fs, 'readFileSync').returns(privateKeyMock);
    sinon.stub(SFTP.prototype, 'connect').rejects();
    const clientMock = { _id: randomId(), name: randomString() };
    sinon.stub(Client, 'findById').returns({ select: () => clientMock });

    try {
      await ackIngestion.ingest({ server, client, logText });
    } catch (err) {
      expect(SFTP.prototype.connect).to.have.been.calledOnce;
      expect(SFTP.prototype.connect).to.have.been.calledWith(expectedConfig);
    }
  });

  it('should call sftp with password param', async () => {
    const client = { clientId: randomId() };
    const logText = randomString();
    const passwordMock = randomString();
    const server = {
      protocol: 'SFTP',
      host: '3.255.155.132',
      username: 'curve_sftp',
      port: 22,
      authenticationType: 'Password',
      password: passwordMock,
      algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-512'] },
      initialisedDate: moment().format(),
    };
    const expectedConfig = {
      host: '3.255.155.132',
      username: 'curve_sftp',
      password: passwordMock,
      port: 22,
      algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-512'] },
    };
    sinon.stub(SFTP.prototype, 'connect').rejects();
    const clientMock = { _id: randomId(), name: randomString() };
    sinon.stub(Client, 'findById').returns({ select: () => clientMock });

    try {
      await ackIngestion.ingest({ server, client, logText });
    } catch (err) {
      expect(SFTP.prototype.connect).to.have.been.calledOnce;
      expect(SFTP.prototype.connect).to.have.been.calledWith(expectedConfig);
    }
  });
});
