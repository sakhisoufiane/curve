process.env.NODE_ENV = 'test';
process.env.DB_PROTOCOL = 'mongodb://';
process.env.DB_URL = 'localhost';
process.env.DB_NAME = 'curve_test';
require('../../../models/db');

const { testUtils, fileManager, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const SFTP = require('ssh2-sftp-client');
const sinon = require('sinon');
const Client = require('../../../models/client');
const IswcAcknowledgementController = require('../../../controllers/iswcAcknowledgement');
const Work = require('../../../models/work');

logger.debug('\n\n**** .test/integration/controllers/iswcAcknowledgement.integration.test.js');

describe.skip('IswcAcknowledgementController Integration Test', () => {
  let ftpStub; let workStub; let client; let clientId; let serverId;

  beforeEach(async () => {
    const partyNo = testUtils.randomInt();
    serverId = testUtils.randomId();
    client = await new Client({
      name: testUtils.randomString(),
      iswcFtpIngestions: [{
        _id: serverId,
        name: testUtils.randomString(),
        host: testUtils.randomString(),
        username: testUtils.randomString(),
        password: testUtils.randomString(),
        active: true,
        lastSuccessfulCheck: new Date(),
        directory: testUtils.randomString(),
        port: 21,
        protocol: 'SFTP',
      }],
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();
    clientId = client._id;

    // Stub SFTP methods
    ftpStub = {
      connect: sinon.stub().resolves(),
      get: sinon.stub().resolves(Buffer.from(JSON.stringify({
        fileHeader: {
          submittingPublisher: { deliveryId: testUtils.randomId() },
        },
        acknowledgements: [
          {
            originalSubmissionId: partyNo,
            preferredIswc: 'T1234567890',
            originalTransactionType: 'FindSubmission',
          },
        ],
      }))),
      disconnect: sinon.stub().resolves(),
      deleteFile: sinon.stub().resolves(),
    };

    // Stub the SFTP prototype methods
    sinon.stub(SFTP.prototype, 'connect').callsFake(() => ftpStub.connect());
    sinon.stub(SFTP.prototype, 'get').callsFake(() => ftpStub.get());
    sinon.stub(SFTP.prototype, 'end').callsFake(() => ftpStub.disconnect());

    // Stub S3 upload
    sinon.stub(fileManager, 'uploadToS3').yields(null, 's3://mock-url');

    workStub = sinon.stub(Work, 'findOne').callsFake(({ partyNo: queryPartyNo }) => {
      if (queryPartyNo === partyNo) {
        return {
          _id: testUtils.randomId(),
          isIswcIrsEligible: true,
          isIswcIasEligible: true,
          save: sinon.stub().resolves(),
        };
      }
      return null;
    });
  });

  afterEach(async () => {
    sinon.restore();
    await testUtils.cleanUp();
  });

  it('should set isIswcIrsEligible and isIswcIasEligible to false', async () => {
    const fileName = 'test-file.json';
    await IswcAcknowledgementController.digestAckFile({ fileName, serverId, clientId });
    sinon.assert.calledOnce(workStub);
    const updatedWork = workStub.returnValues[0];
    expect(updatedWork.isIswcIrsEligible).to.be.false;
    expect(updatedWork.isIswcIasEligible).to.be.false;
  });
});
