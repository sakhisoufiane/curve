process.env.NODE_ENV = 'test';
require('../../../models/db');

const { testUtils, createXlsx, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');

const { cleanUp } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const IswcAcknowledgementController = require('../../../controllers/iswcAcknowledgement');
const IswcDeliveredWork = require('../../../models/iswcDeliveredWork');
const Client = require('../../../models/client');
const Notification = require('../../../models/notification');
const Work = require('../../../models/work');
const IswcAcknowledgement = require('../../../models/iswcAcknowledgement');

const { expect } = chai;

chai.use(chaiHttp);

// Define the test suite
// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('Integration Test for ISWC Acknowledgement Export Controller', () => {
  logger.info('\n\n**** test/integration/controllers/iswcAcknowledgement.integration.test.js');

  let req; let res; let testUser; let testClient; let testWorks; let iswcAcknowledgement;

  // Set up mock data before each test
  beforeEach(async () => {
    // Create test client
    testClient = await new Client({ name: randomString(), _id: testUtils.randomId(), createdBigQueryTables: true, createdBigQueryBackups: true }).save();

    // Create test user
    testUser = ({
      _id: testUtils.randomId(),
      clientId: testClient._id,
      name: randomString(),
      email: randomString(),
      rights: {
        [testClient._id]: {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        },
      },
    });

    // Create corresponding Work documents
    const work1 = await new Work({
      _id: testUtils.randomId(),
      title: 'CANVAS WORLD',
      identifier: randomString(),
      composer: 'DANIEL MOSS, DUNCAN MANN, DAVID GARDENER',
    }).save();

    const work2 = await new Work({
      _id: testUtils.randomId(),
      title: 'PHILLY SENSATION',
      identifier: randomString(),
      composer: 'ANDREA MOLITARI, MICHELE MINGO, MAURIZIO ALFIERI',
    }).save();

    const work3 = await new Work({
      _id: testUtils.randomId(),
      title: 'PHILLY SENSATION - REJECTED',
      identifier: randomString(),
      composer: 'ANDREA MOLITARI, MICHELE MINGO, MAURIZIO ALFIERI',
    }).save();

    const work4 = await new Work({
      _id: testUtils.randomId(),
      title: 'RANDOM WORK',
      identifier: randomString(),
      composer: 'RANDOM COMPOSER',
    }).save();

    const iswcAcknowledgementId = testUtils.randomId();

    // Insert into IswcDeliveredWork
    testWorks = await IswcDeliveredWork.insertMany([
      {
        _id: testUtils.randomId(),
        clientId: testClient._id.toString(),
        workId: work1._id,
        iswcAcknowledgementId,
        originalFileCreationDateTime: new Date('2024-09-18T10:59:32.506Z'),
        originalSubmissionId: 6485,
        processingDate: new Date('2024-09-18T14:11:16.739Z'),
        transactionStatus: 'FullyAccepted',
        submissionId: 7485,
        originalTransactionType: 'AddSubmission',
        originalTitle: 'CANVAS WORLD',
        agency: '052',
        sourcedb: 52,
        preferredIswc: 'T9133654656',
        interestedParties: [
          {
            name: 'MOSS DANIEL LEO',
            lastName: 'MOSS',
            nameNumber: 619026165,
            affiliation: '052',
            role: 'C',
          },
          {
            name: 'MANN DUNCAN PATRICK DYLAN',
            lastName: 'MANN',
            nameNumber: 655216253,
            affiliation: '052',
            role: 'C',
          },
          {
            name: 'GARDENER DAVID EDWARD',
            lastName: 'GARDENER',
            nameNumber: 657247226,
            affiliation: '052',
            role: 'C',
          },
          {
            name: 'JUST ISNT MUSIC LIMITED',
            lastName: 'JUST ISNT MUSIC LIMITED',
            nameNumber: 160248788,
            affiliation: '052',
            role: 'E',
          },
        ],
        workcode: '6485',
        otherTitles: [],
        createdAt: new Date('2024-09-19T19:43:08.887Z'),
        updatedAt: new Date('2024-09-19T19:43:08.887Z'),
      },
      {
        _id: testUtils.randomId(),
        clientId: testClient._id.toString(),
        workId: work2._id,
        iswcAcknowledgementId,
        originalFileCreationDateTime: new Date('2024-09-18T10:59:32.506Z'),
        originalSubmissionId: 56802,
        processingDate: new Date('2024-09-18T14:11:16.739Z'),
        transactionStatus: 'FullyAccepted',
        submissionId: 57802,
        originalTransactionType: 'AddSubmission',
        originalTitle: 'PHILLY SENSATION',
        agency: '052',
        sourcedb: 52,
        preferredIswc: 'T9844316127',
        interestedParties: [
          {
            name: 'ALFIERI MAURIZIO',
            lastName: 'ALFIERI',
            nameNumber: 175927727,
            affiliation: '074',
            role: 'C',
          },
          {
            name: 'MINGO MICHELE',
            lastName: 'MINGO',
            nameNumber: 459646115,
            affiliation: '074',
            role: 'C',
          },
          {
            name: 'MOLITARI ANDREA',
            lastName: 'MOLITARI',
            nameNumber: 452368354,
            affiliation: '074',
            role: 'C',
          },
          {
            name: 'JUST ISNT MUSIC LIMITED',
            lastName: 'JUST ISNT MUSIC LIMITED',
            nameNumber: 160248788,
            affiliation: '052',
            role: 'E',
          },
        ],
        workcode: '68352',
        otherTitles: [],
        createdAt: new Date('2024-09-19T20:47:13.746Z'),
        updatedAt: new Date('2024-09-19T20:47:13.746Z'),
      },
      {
        _id: testUtils.randomId(),
        clientId: testClient._id.toString(),
        workId: work3._id,
        iswcAcknowledgementId,
        originalFileCreationDateTime: new Date('2024-09-18T10:59:32.506Z'),
        originalSubmissionId: 56803,
        processingDate: new Date('2024-09-18T14:11:16.739Z'),
        transactionStatus: 'Rejected',
        submissionId: 57803,
        originalTransactionType: 'AddSubmission',
        originalTitle: 'PHILLY SENSATION - REJECTED',
        agency: '052',
        sourcedb: 52,
        preferredIswc: 'T9844316128',
        interestedParties: [
          {
            name: 'ALFIERI MAURIZIO',
            lastName: 'ALFIERI',
            nameNumber: 175927727,
            affiliation: '074',
            role: 'C',
          },
          {
            name: 'MINGO MICHELE',
            lastName: 'MINGO',
            nameNumber: 459646115,
            affiliation: '074',
            role: 'C',
          },
          {
            name: 'MOLITARI ANDREA',
            lastName: 'MOLITARI',
            nameNumber: 452368354,
            affiliation: '074',
            role: 'C',
          },
          {
            name: 'JUST ISNT MUSIC LIMITED',
            lastName: 'JUST ISNT MUSIC LIMITED',
            nameNumber: 160248788,
            affiliation: '052',
            role: 'E',
          },
        ],
        workcode: '68353',
        otherTitles: [],
        createdAt: new Date('2024-09-19T20:47:13.746Z'),
        updatedAt: new Date('2024-09-19T20:47:13.746Z'),
      },
      {
        _id: testUtils.randomId(),
        clientId: testClient._id.toString(),
        workId: work4._id,
        iswcAcknowledgementId,
        originalFileCreationDateTime: new Date('2024-09-18T10:59:32.506Z'),
        originalSubmissionId: 12345,
        processingDate: new Date('2024-09-18T14:11:16.739Z'),
        transactionStatus: undefined,
        submissionId: 67890,
        originalTransactionType: 'AddSubmission',
        originalTitle: 'RANDOM WORK',
        agency: '052',
        sourcedb: 52,
        preferredIswc: 'T1234567890',
        interestedParties: [
          {
            name: 'RANDOM COMPOSER',
            lastName: 'COMPOSER',
            nameNumber: 123456789,
            affiliation: '052',
            role: 'C',
          },
          {
            name: 'RANDOM PUBLISHER',
            lastName: 'PUBLISHER',
            nameNumber: 987654321,
            affiliation: '052',
            role: 'E',
          },
        ],
        workcode: '12345',
        otherTitles: [],
        createdAt: new Date('2024-09-19T20:47:13.746Z'),
        updatedAt: new Date('2024-09-19T20:47:13.746Z'),
      },
    ]);

    // Mock req and res objects for the controller
    req = {
      body: {
        id: testWorks[0].iswcAcknowledgementId.toString(),
        lastModifiedBy: testUser._id.toString(),
      },
      params: {
        id: testWorks[0].iswcAcknowledgementId.toString(),
      },
      curveUser: {
        id: testUser._id.toString(),
        clientId: testClient._id.toString(),
        rights: testUser.rights,
      },
      query: {
        page: null,
      },
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    iswcAcknowledgement = await new IswcAcknowledgement({
      fileName: 'test-file',
      clientId: testClient._id.toString(),
      _id: testWorks[0].iswcAcknowledgementId,
      deliveryPartnerId: testUtils.randomId(),
    }).save();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should only return Accepted Delivered Works to the frontend when the filter is set to FullyAccepted', async () => {
    // Arrange
    req.query.transactionStatus = 'FullyAccepted';
    // Act
    await IswcAcknowledgementController.getIswcAcknowledgementWorks({ req, res });
    const responseBody = res.json.getCall(0).args[0];
    const { deliveredWorks } = responseBody;
    // Assert
    expect(deliveredWorks[0].transactionStatus).to.equal('FullyAccepted');
  });

  it('should only return Rejected Delivered Works to the frontend when the filter is set to Rejected', async () => {
    // Arrange
    req.query.transactionStatus = 'Rejected';
    // Act
    await IswcAcknowledgementController.getIswcAcknowledgementWorks({ req, res });
    const responseBody = res.json.getCall(0).args[0];
    const { deliveredWorks } = responseBody;
    // Assert
    expect(deliveredWorks[0].transactionStatus).to.equal('Rejected');
  });

  it('should return all Delivered Works to the frontend when the filter is undefined', async () => {
    // Arrange
    req.query.transactionStatus = undefined;
    // Act
    await IswcAcknowledgementController.getIswcAcknowledgementWorks({ req, res });
    const responseBody = res.json.getCall(0).args[0];
    const { deliveredWorks } = responseBody;
    const deliveredWorkStatuses = deliveredWorks.map((work) => work.transactionStatus);
    // Assert
    expect(deliveredWorks.length).to.equal(4);
    expect(deliveredWorkStatuses).to.include('FullyAccepted', 'Rejected', undefined);
  });

  it('should generate an Excel file when exporting ISWC Acknowledgements with less than 1000 records and send the usual notifications', async () => {
    // Arrange
    const createXlsxSpy = sinon.spy(createXlsx, 'createInTemplate');
    const notificationSpy = sinon.spy(Notification, 'generate');
    // Act
    await IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });
    // Assert
    expect(createXlsxSpy.calledOnce).to.be.true;
    expect(notificationSpy.calledOnce).to.be.true;
  });

  it('should write the correct data to the Excel file when total count is < 1000', async () => {
    // Arrange
    const createXlsxSpy = sinon.spy(createXlsx, 'createInTemplate');
    // Act
    await IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });
    const statuses = createXlsxSpy.firstCall.args[0][0].map((row) => row[5]);
    // Assert
    // Verify that the Excel creation function was called
    expect(createXlsxSpy.calledOnce).to.be.true;
    // Verify that the correct data was passed to the Excel creation function
    expect(statuses).to.include('FullyAccepted', 'Rejected', undefined);
  });

  it('should only include FullyAccepted works for the excel file when the filter is set to FullyAccepted', async () => {
    // Arrange
    // Stub the createXlsx.createInTemplate function
    const createXlsxStub = sinon.stub(createXlsx, 'createInTemplate').callsFake((data, template, callback) => {
      // Trigger the callback to simulate XLSX creation
      callback(null, 'fake-xlsx-file');
    });
    req.body.transactionStatus = 'FullyAccepted';
    // Act
    await IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });
    // Capture the outputData passed to createInTemplate
    const outputData = createXlsxStub.getCall(0).args[0][0];
    // Assert
    // Check that only works with transactionStatus 'FullyAccepted' are included
    const outputStatuses = outputData.map((row) => row[5]);
    expect(createXlsxStub.calledOnce).to.be.true;
    expect(outputStatuses).to.include('FullyAccepted');
    expect(outputStatuses).to.not.include('Rejected');
  });

  it('should only include Rejected works for the excel file when the filter is set to Rejected', async () => {
    // Arrange
    // Stub the createXlsx.createInTemplate function
    const createXlsxStub = sinon.stub(createXlsx, 'createInTemplate').callsFake((data, template, callback) => {
      // Trigger the callback to simulate XLSX creation
      callback(null, 'fake-xlsx-file');
    });
    // Act
    req.body.transactionStatus = 'Rejected';
    await IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });
    // Capture the outputData passed to createInTemplate
    const outputData = createXlsxStub.getCall(0).args[0][0];
    // Assert
    // Check that only works with transactionStatus 'Rejected' are included
    const outputStatuses = outputData.map((row) => row[5]);
    expect(outputStatuses).to.include('Rejected');
    expect(outputStatuses).to.not.include('FullyAccepted');
    expect(createXlsxStub.calledOnce).to.be.true;
  });
});
