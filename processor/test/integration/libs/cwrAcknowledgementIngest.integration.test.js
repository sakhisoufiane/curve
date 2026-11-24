process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { cleanUp, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const CwrAcknowledgement = require('../../../libs/cwr/cwrAcknowledgementIngest');
const Work = require('../../../models/work');
const Client = require('../../../models/client');
const DeliveryPartner = require('../../../models/deliveryPartner');
const Notification = require('../../../models/notification');

describe.skip('CwrAcknowledgement Integration Tests', () => {
  let cwrAcknowledgementInstance;
  let cwrAcknowledgement;
  let clientId;
  let testFilePath;
  let deliveryPartner;
  let work;
  let testEmail;
  let partnerId;
  let statusCode;
  let iswc;
  let ackID;
  let headerLine;
  let ackLine;
  let iswcLine;
  let xrfLines;

  before((done) => {
    clientId = randomId();
    cleanUp(clientId, done);
  });

  beforeEach(async () => {
    testEmail = 'test@example.com';
    deliveryPartner = new DeliveryPartner({
      name: 'testDeliveryPartner',
      clientId,
      deliveryPartnerId: 'testDeliveryPartnerId',
      receivingParty: 'BMI',
    });
    await deliveryPartner.save();

    // create work with no ISWC for update
    work = new Work({
      title: 'TESTSONG',
      clientId,
      workId: 'testWorkId',
      societyCode: 'BMI',
      identifier: 'id001',
      originalSubmissionIdL: '321',
      partyNo: '123',
    });
    await work.save();

    clientId = 'testClientId';
    cwrAcknowledgement = {
      file: 'ackFile.txt',
      clientId,
      workIds: [],
      save: sinon.stub().callsFake((cb) => cb()),
    };

    cwrAcknowledgementInstance = new CwrAcknowledgement();
    sinon.stub(fileManager, 'downloadFromS3');
    sinon.stub(fs, 'existsSync').returns(true);

    // Declare variables for the ack file
    partnerId = 'PARTNERID1';
    statusCode = 'AS';
    iswc = 'ISW12';
    ackID = 'id001';
    // Construct each line with appropriate spacing
    headerLine = 'HDRTT000000021SomeHeaderInfo';
    ackLine = `ACK${' '.repeat(106)}${ackID}${' '.repeat(20 - ackID.length)}${partnerId}${' '.repeat(18)}${statusCode}${' '.repeat(31)}`;
    iswcLine = `ISW${' '.repeat(78)}${ackID}${' '.repeat(20 - ackID.length)}${iswc}`;
    xrfLines = [
      'XRF0000000100000009052636677BR      WY',
      'XRF0000000100000010044636677BR      WY',
      'XRF0000000100000011055A0P0AKJ00     WY',
      'XRF000000010000001207972304451      WY',
      'XRF000000010000001304072304451      WY',
      'XRF000000010000001408972304451      WY',
      'XRF000000010000001509072304451      WY',
    ];

    // Combine them into the final format
    sinon.stub(fs, 'readFile').yields(null, `${headerLine}\n${ackLine}\n${iswcLine}\n${xrfLines.join('\n')}`);

    sinon.stub(Notification, 'generate').yields(null, '');

    sinon.stub(Client, 'findById');
    Client.findById.returns({ _id: clientId, name: clientId });

    sinon.spy(Work, 'findByIdAndUpdate');
    testFilePath = '/tmp/ackFile.txt';
  });

  afterEach((done) => {
    sinon.restore();
    cleanUp(clientId, done);
  });

  it('should successfully ingest CWR ACK file and process data', (done) => {
    // Arrange
    fileManager.downloadFromS3.yields(null, testFilePath);

    // Act
    cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
      // Assert
      expect(fileManager.downloadFromS3.calledOnce).to.be.true;
      expect(cwrAcknowledgement.status).to.equal('Complete');
      expect(Notification.generate.notCalled).to.be.true;
      done();
    });
  });

  it('should handle error if file does not exist', (done) => {
    // Arrange
    fs.existsSync.returns(false);
    fileManager.downloadFromS3.yields(null, testFilePath);

    // Act
    cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
      // Assert
      expect(err).to.exist;
      expect(err.message).to.equal(`File does not exist at location: ${testFilePath}`);
      expect(cwrAcknowledgement.status).to.equal('Errored');
      done();
    });
  });

  it('should handle ingestion error during file read', (done) => {
    // Arrange
    fileManager.downloadFromS3.yields(null, testFilePath);
    fs.readFile.yields(new Error('File read error'));

    // Act
    cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
      // Assert
      expect(err).to.exist;
      expect(err.message).to.equal('File read error');
      expect(cwrAcknowledgement.status).to.equal('Errored');
      done();
    });
  });

  it('should save "Errored" status if reading the ACK file encounters an error', (done) => {
    // Arrange
    fileManager.downloadFromS3.yields(null, testFilePath);
    fs.readFile.yields(new Error('Read error'));

    // Act
    cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
      // Assert
      expect(err).to.exist;
      expect(cwrAcknowledgement.status).to.equal('Errored');
      done();
    });
  });

  it('should return an error if receiving party cannot be determined', (done) => {
    // Arrange
    fileManager.downloadFromS3.yields(null, testFilePath);
    fs.readFile.yields(null, 'HDRTT000000999SomeHeaderInfo\nACK                                                                                                                 TESTPARTNER1 PARTNERID1                  AS                               \nGRTGroupTrailerDetails\nTRLFileTrailerDetails');

    // Act
    cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
      // Assert
      expect(cwrAcknowledgement.status).to.equal('Errored');
      expect(cwrAcknowledgement.ingestionError).to.equal('Couldn\'t retrieve the PRO from the acknowledgement file.');
      done();
    });
  });

  it('should handle multiple delivery partners and set "Errored" status', (done) => {
    // Arrange
    fileManager.downloadFromS3.yields(null, testFilePath);
    cwrAcknowledgementInstance.receivingParty = 'Some PRO';
    sinon.stub(DeliveryPartner, 'countDocuments').yields(null, 2);

    // Act
    cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
      // Assert
      expect(err).to.exist;
      expect(cwrAcknowledgement.status).to.equal('Errored');
      expect(cwrAcknowledgement.ingestionError).to.equal('More than one Partner found associated with this file - please select a Partner from the Delivery Partner field below and click re-ingest');
      done();
    });
  });

  it('When receiving a CWR Ack file, we notify the user of any duplicate ISWC returned in the file', async () => {
    // Arrange
    fileManager.downloadFromS3.yields(null, testFilePath);
    const duplicateIswc = 'ISW12';

    // creating duplicate iswc works
    const work1 = new Work({
      title: 'TESTSONG123',
      clientId,
      workId: 'testWorkId',
      societyCode: 'BMI',
      identifier: 'TESTPARTNER1',
      originalSubmissionId: '321',
      partyNo: '123',
      iswc: duplicateIswc,
    });
    await work1.save();

    await new Promise((resolve, reject) => {
      cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    expect(cwrAcknowledgement.status).to.equal('Complete');
    expect(Notification.generate.calledOnce).to.be.true;
    const { args } = Notification.generate.firstCall;
    expect(args[1]).to.equal(('Duplicate ISWCs Detected in Acknowledgement File'));

    // check how many times this string was added to maintext
    const duplicateCount = (args[3].mainText.match(/cannot be assigned to the Work/g) || []).length;
    expect(duplicateCount).to.equal(1);
    expect(Work.findByIdAndUpdate.notCalled).to.be.true;
  });

  it('When receiving a CWR Ack file, we notify the user of multiple duplicate ISWCs returned in the file', async () => {
    // Arrange
    fileManager.downloadFromS3.yields(null, testFilePath);
    const duplicateIswc = 'ISW12';

    // creating duplicate iswc works
    const work1 = new Work({
      title: 'TESTSONG123',
      clientId,
      workId: 'testWorkId',
      societyCode: 'BMI',
      identifier: 'TESTPARTNER1',
      originalSubmissionId: '321',
      partyNo: '123',
      iswc: duplicateIswc,
    });
    await work1.save();

    const work2 = new Work({
      title: 'TESTSONG123',
      clientId,
      workId: 'testWorkId',
      societyCode: 'BMI',
      identifier: 'TESTPARTNER1',
      originalSubmissionId: '321',
      partyNo: '123',
      iswc: duplicateIswc,
    });
    await work2.save();

    await new Promise((resolve, reject) => {
      cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    expect(cwrAcknowledgement.status).to.equal('Complete');
    expect(Notification.generate.calledOnce).to.be.true;
    const { args } = Notification.generate.firstCall;
    expect(args[1]).to.equal(('Duplicate ISWCs Detected in Acknowledgement File'));

    // check how many times this string was added to maintext
    const duplicateCount = args[3].mainText.split('cannot be assigned to the Work').length - 1;
    expect(duplicateCount).to.equal(2);
    expect(Work.findByIdAndUpdate.notCalled).to.be.true;
  });

  describe('when XRF lines are included', () => {
    describe('when identifiers are for works', () => {
      describe('when identifiers are valid', () => {
        it('should import society identifiers', async () => {
          // Arrange
          fileManager.downloadFromS3.yields(null, testFilePath);
          // Act
          await new Promise((resolve) => {
            cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, () => resolve());
          });
          // Assert
          const { societyIdentifiers } = await Work.findById(work._id, 'societyIdentifiers').lean();
          expect(societyIdentifiers).to.deep.include({ society: 'PRS', identifier: '636677BR' });
          expect(societyIdentifiers).to.deep.include({ society: 'MCPS', identifier: '636677BR' });
          expect(societyIdentifiers).to.deep.include({ society: 'SABAM', identifier: 'A0P0AKJ00' });
          expect(societyIdentifiers).to.deep.include({ society: 'STIM', identifier: '72304451' });
          expect(societyIdentifiers).to.deep.include({ society: 'KODA', identifier: '72304451' });
          expect(societyIdentifiers).to.deep.include({ society: 'TEOSTO', identifier: '72304451' });
          expect(societyIdentifiers).to.deep.include({ society: 'TONO', identifier: '72304451' });
        });
      });

      describe('when identifiers are invalid', () => {
        it('should not import society identifiers', async () => {
          // Arrange
          fileManager.downloadFromS3.yields(null, testFilePath);
          xrfLines = [
            'XRF0000000100000009052636677BR      WU',
            'XRF0000000100000010044636677BR      WU',
            'XRF0000000100000011055A0P0AKJ00     WU',
            'XRF000000010000001207972304451      WU',
            'XRF000000010000001304072304451      WU',
            'XRF000000010000001408972304451      WU',
            'XRF000000010000001509072304451      WU',
          ];
          fs.readFile.restore();
          sinon.stub(fs, 'readFile').yields(null, `${headerLine}\n${ackLine}\n${iswcLine}\n${xrfLines.join('\n')}`);
          // Act
          await new Promise((resolve) => {
            cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, () => resolve());
          });
          // Assert
          const { societyIdentifiers } = await Work.findById(work._id, 'societyIdentifiers').lean();
          // It should only include the initial identifier from the work
          expect(societyIdentifiers).to.eql([{
            identifier: 'PARTNERID1',
            society: 'BMI',
          }]);
        });
      });
    });

    describe('when identifiers are not for works', () => {
      it('should not import society identifiers', async () => {
        // Arrange
        fileManager.downloadFromS3.yields(null, testFilePath);
        xrfLines = [
          'XRF0000000100000009052636677BR      XY',
          'XRF0000000100000010044636677BR      XY',
          'XRF0000000100000011055A0P0AKJ00     XY',
          'XRF000000010000001207972304451      XY',
          'XRF000000010000001304072304451      XY',
          'XRF000000010000001408972304451      XY',
          'XRF000000010000001509072304451      XY',
        ];
        fs.readFile.restore();
        sinon.stub(fs, 'readFile').yields(null, `${headerLine}\n${ackLine}\n${iswcLine}\n${xrfLines.join('\n')}`);
        // Act
        await new Promise((resolve) => {
          cwrAcknowledgementInstance.ingestFile(cwrAcknowledgement, testEmail, () => resolve());
        });
        // Assert
        const { societyIdentifiers } = await Work.findById(work._id, 'societyIdentifiers').lean();
        // It should only include the initial identifier from the work
        expect(societyIdentifiers).to.eql([{
          identifier: 'PARTNERID1',
          society: 'BMI',
        }]);
      });
    });
  });
});
