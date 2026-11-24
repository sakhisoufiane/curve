process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const { cleanUp, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const rewire = require('rewire');
const Work = require('../../../models/work');
const Notification = require('../../../models/notification');
const Client = require('../../../models/client');
const IswcAcknowledgement = require('../../../models/iswcAcknowledgement');
const IswcDelivery = require('../../../models/iswcDelivery');
const IswcDeliveredWork = require('../../../models/iswcDeliveredWork');
const User = require('../../../models/user');

describe('IswcAcknowledgement Integration Tests', () => {
  let fileName;
  let serverId;
  let clientId;
  let sftpInstance;
  let IswcAcknowledgementIngest;
  let iswcDelivery;

  before((done) => {
    clientId = randomId();
    fileName = 'ackFile.json';
    serverId = 'testServer';
    cleanUp(clientId, done);
  });

  beforeEach(async () => {
    sinon.stub(Client, 'findOne').returns({ _id: clientId,
      deliveryEmails: ['test'],
      iswcFtpIngestions: [
        {
          _id: serverId,
          directory: '/test-directory',
          protocol: 'SFTP',
          host: 'test-host.example.com',
          username: 'testuser',
          password: 'testpassword',
        },
      ] });

    sinon.stub(Client, 'findById').returns({
      _id: clientId,
      select: sinon.stub().returns({
        lean: sinon.stub().resolves({ _id: clientId }),
      }),
    });

    sftpInstance = sinon.stub().returns({
      connect: sinon.stub().resolves(),
      disconnect: sinon.stub().resolves(),
      deleteFile: sinon.stub().resolves(),

    });

    IswcAcknowledgementIngest = rewire('../../../controllers/iswcAcknowledgement');
    IswcAcknowledgementIngest.__set__({
      Sftp: sftpInstance,
      downloadFile: sinon.stub().resolves(),
      uploadFileS3: sinon.stub().resolves('a public key'),
    });

    iswcDelivery = new IswcDelivery({
      deliveryId: '123',
      fileName,
      status: 'Pending',
      clientId,
      serverId,
    });
    await iswcDelivery.save();

    const validJsonData = JSON.stringify({
      fileHeader: { submittingPublisher: { deliveryId: iswcDelivery._id.toString() } },
      acknowledgements: [
        {
          originalTransactionType: 'FindSubmission',
          originalSubmissionId: '321',
          preferredIswc: 'testISWC',
        },
        {
          originalTransactionType: 'FindSubmission',
          originalSubmissionId: '123',
          preferredIswc: 'testISWC',
        },
      ],
    });
    sinon.stub(fs, 'readFileSync');
    fs.readFileSync.returns(validJsonData);

    const work = new Work({
      title: 'TESTSONG123',
      clientId,
      partyNo: '123',
    });
    await work.save();
  });

  afterEach((done) => {
    sinon.restore();
    cleanUp(clientId, done);
  });

  after((done) => {
    cleanUp(clientId, done);
  });

  it('should save errored version if data is missing from file, not save delivered work', async () => {
    fs.readFileSync.returns('{}');
    expect(await IswcAcknowledgement.find()).to.be.an('array').that.is.empty;
    await IswcAcknowledgementIngest.digestAckFile({ fileName, serverId, clientId });
    const iswcAcknowledgements = await IswcAcknowledgement.find();
    expect(iswcAcknowledgements).to.have.lengthOf(1);

    expect(iswcAcknowledgements[0].errors).to.eql([
      'Ack file is missing iswc delivery id in header',
      'Ack file doesnt have any acknowledgements',
      'Ack file output format doesnt match known examples',
    ]);
    expect(await IswcDeliveredWork.find()).to.be.an('array').that.is.empty;
  });

  it('should successfully ingest JSON ACK file and create iswc and delivered work  if it doesnt exist', async () => {
    expect(await IswcAcknowledgement.find()).to.be.empty;
    await IswcAcknowledgementIngest.digestAckFile({ fileName, serverId, clientId });
    const iswcAcknowledgements = await IswcAcknowledgement.find();
    expect(iswcAcknowledgements).to.have.lengthOf(1);

    expect(iswcAcknowledgements[0]).to.include({
      fileName: 'ackFile.json',
      clientId,
      publicKeyS3: 'a public key',
      outputFormat: 'ISWC Resolution (IRS)',
      __v: 0,
    });
    expect(iswcAcknowledgements[0].errors).to.be.an('array').that.is.empty;
    const iswcDeliveredWork = await IswcDeliveredWork.find();
    expect(iswcDeliveredWork).to.have.lengthOf(1);

    expect(iswcDeliveredWork[0]).to.include({
      originalTransactionType: 'FindSubmission',
      preferredIswc: 'testISWC',
      clientId,
    });
  });

  it('should successfully ingest JSON ACK file and update iswc and create delivered work if it exists', async () => {
    const iswcAcknowledgement = new IswcAcknowledgement({
      clientId,
      iswcDeliveryId: iswcDelivery._id.toString(),
    });
    await iswcAcknowledgement.save();

    const iswcAcknowledgementBefore = await IswcAcknowledgement.find();
    expect(iswcAcknowledgementBefore).to.have.lengthOf(1);

    expect(iswcAcknowledgementBefore[0]).to.include({
      clientId,
    });
    expect(iswcAcknowledgementBefore[0]).to.not.include({
      fileName: 'ackFile.json',
    });

    await IswcAcknowledgementIngest.digestAckFile({ fileName, serverId, clientId });
    const iswcAcknowledgementAfter = await IswcAcknowledgement.find();
    expect(iswcAcknowledgementAfter).to.have.lengthOf(1);

    expect(iswcAcknowledgementAfter[0]).to.include({
      fileName: 'ackFile.json',
      clientId,
      publicKeyS3: 'a public key',
      outputFormat: 'ISWC Resolution (IRS)',
      __v: 0,
    });
    expect(iswcAcknowledgementAfter[0].errors).to.be.an('array').that.is.empty;
    const iswcDeliveredWork = await IswcDeliveredWork.find();
    expect(iswcDeliveredWork).to.have.lengthOf(1);

    expect(iswcDeliveredWork[0]).to.include({
      originalTransactionType: 'FindSubmission',
      preferredIswc: 'testISWC',
      clientId,
    });
  });

  it('should notify user if duplicate iswcs exist', async () => {
    const work1 = new Work({
      title: 'TESTSONG123',
      clientId,
      iswc: 'testISWC',
    });
    await work1.save();
    sinon.stub(Notification, 'generate').yields(null, '');
    sinon.stub(User, 'findById').returns({ email: 'test' });

    expect(await IswcAcknowledgement.find()).to.be.empty;
    await IswcAcknowledgementIngest.digestAckFile({ fileName, serverId, clientId });
    const iswcAcknowledgements = await IswcAcknowledgement.find();
    expect(iswcAcknowledgements).to.have.lengthOf(1);

    expect(iswcAcknowledgements[0]).to.include({
      fileName: 'ackFile.json',
      clientId,
      publicKeyS3: 'a public key',
      outputFormat: 'ISWC Resolution (IRS)',
      __v: 0,
    });
    expect(iswcAcknowledgements[0].errors).to.be.an('array').that.is.empty;
    expect(await IswcDeliveredWork.find()).to.be.an('array').that.is.empty;
    expect(Notification.generate.calledOnce).to.be.true;
  });
});
