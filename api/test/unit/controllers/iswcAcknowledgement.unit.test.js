process.env.NODE_ENV = 'test';

const { logger, createXlsx, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));

process.env.NODE_ENV = 'test';
require('../../../models/db');
const { expect } = require('chai');
const Client = require('../../../models/client');
const IswcAcknowledgementController = require('../../../controllers/iswcAcknowledgement');
const IswcDeliveredWork = require('../../../models/iswcDeliveredWork'); // Assuming you need this for aggregate
const IswcAcknowledgement = require('../../../models/iswcAcknowledgement');
const Notification = require('../../../models/notification');

describe('IswcAcknowledgementController', () => {
  logger.info('\n\n**** .test/unit/controllers/iswcAcknowledgement.unit.test.js');
  let req; let res; let testClient; let testUser; let testWorks; let iswcAcknowledgement; let deliveredWorksTest;

  beforeEach(async () => {
    // // Create test client
    testClient = {
      name: 'Test Client',
      _id: testUtils.randomId(),
      features: {
        payeeBalances: false,
      },
    };

    testUser = {
      _id: testUtils.randomId(),
      rights: {
        [testClient._id]: {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        },
      } };

    // Create corresponding Work documents
    const work1 = {
      _id: testUtils.randomId(),
      title: 'CANVAS WORLD',
      identifier: '6485',
      composer: 'DANIEL MOSS, DUNCAN MANN, DAVID GARDENER',
    };

    const work2 = {
      _id: testUtils.randomId(),
      title: 'PHILLY SENSATION',
      identifier: '68352',
      composer: 'ANDREA MOLITARI, MICHELE MINGO, MAURIZIO ALFIERI',
    };

    const work3 = {
      _id: testUtils.randomId(),
      title: 'PHILLY SENSATION - REJECTED',
      identifier: '68353',
      composer: 'ANDREA MOLITARI, MICHELE MINGO, MAURIZIO ALFIERI',
    };

    const work4 = {
      _id: testUtils.randomId(),
      title: 'RANDOM WORK',
      identifier: '12345',
      composer: 'RANDOM COMPOSER',
    };

    const iswcAcknowledgementId = testUtils.randomId();
    testWorks = [{
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
    { _id: testUtils.randomId(),
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
    }];
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
    iswcAcknowledgement = {
      _id: testWorks[0].iswcAcknowledgementId,
      clientId: testClient._id.toString(),
      fileName: 'test-file',
    },
    deliveredWorksTest = [{
      _id: testUtils.randomId(),
      workId: testWorks[0].workId,
      clientId: testClient._id.toString(),
      iswcAcknowledgementId: testWorks[0].iswcAcknowledgementId,
      work: [testWorks[0]],
    }, {
      _id: testUtils.randomId(),
      workId: testWorks[1].workId,
      clientId: testClient._id.toString(),
      iswcAcknowledgementId: testWorks[1].iswcAcknowledgementId,
      work: [testWorks[1]],
    }, {
      _id: testUtils.randomId(),
      workId: testWorks[2].workId,
      clientId: testClient._id.toString(),
      iswcAcknowledgementId: testWorks[2].iswcAcknowledgementId,
      work: [testWorks[2]],
    }, {
      _id: testUtils.randomId(),
      workId: testWorks[3].workId,
      clientId: testClient._id.toString(),
      iswcAcknowledgementId: testWorks[3].iswcAcknowledgementId,
      work: [testWorks[3]],
    }];

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore(); // Restore all stubs after each test
  });
  describe('iswcAcknowledgementController', () => {
    describe('exportIswcAcknowledgement', () => {
      it('should call createXlsxExport when total count is less than 1000', async () => {
        // Mock the `getIswcAcknowledgementWorks` method to return a valid aggregation pipeline
        const mockAggregationPipeline = [
          { $match: { clientId: testClient._id } },
          { $sort: { createdAt: -1 } },
          { $limit: 500 },
        ];
        sinon.stub(IswcAcknowledgementController, 'getIswcAcknowledgementWorks').resolves(mockAggregationPipeline);

        // Mock the `aggregate` method to return the testWorks
        sinon.stub(IswcDeliveredWork, 'aggregate').resolves(deliveredWorksTest);

        // Mock the client lookup
        sinon.stub(Client, 'findById').resolves(testClient);

        const xlsxSpy = sinon.spy(createXlsx, 'createInTemplate');

        // Call the controller function
        await IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });

        // Assert that the XLSX export was triggered with the right parameters
        expect(xlsxSpy).to.have.been.calledOnce;
      });

      it('should return 500 if an error occurs during the process', async () => {
        sinon.stub(IswcAcknowledgementController, 'getIswcAcknowledgementWorks').throws(new Error('Some error'));
        await IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });
        expect(res.status).to.have.been.calledWith(500);
        expect(res.json).to.have.been.calledWith({ message: 'Failed to start export process, please try again.' });
      });
    });

    describe('getIswcAcknowledgementWorks', () => {
      it('should apply the correct filter when applied', async () => {
        sinon.stub(IswcAcknowledgement, 'findById').resolves(iswcAcknowledgement);
        req.query.transactionStatus = 'FullyAccepted';
        // Call the controller function
        const aggregate = await IswcAcknowledgementController.getIswcAcknowledgementWorks({ req, res, forExport: true });
        expect(aggregate[0].$match.transactionStatus).to.equal('FullyAccepted');
      });

      it('should apply the correct filter when applied', async () => {
        sinon.stub(IswcAcknowledgement, 'findById').resolves(iswcAcknowledgement);
        req.query.transactionStatus = 'Rejected';
        // Call the controller function
        const aggregate = await IswcAcknowledgementController.getIswcAcknowledgementWorks({ req, res, forExport: true });
        expect(aggregate[0].$match.transactionStatus).to.equal('Rejected');
      });
    });

    describe('sendNotification', () => {
      it('should send a notification successfully', async () => {
        // Mock the `getIswcAcknowledgementWorks` method to return a valid aggregation pipeline
        const mockAggregationPipeline = [
          { $match: { clientId: testClient._id } },
          { $sort: { createdAt: -1 } },
          { $limit: 500 },
        ];
        sinon.stub(IswcAcknowledgementController, 'getIswcAcknowledgementWorks').resolves(mockAggregationPipeline);

        // Mock the `aggregate` method to return the testWorks
        sinon.stub(IswcDeliveredWork, 'aggregate').resolves(deliveredWorksTest);

        // Mock the client lookup
        sinon.stub(Client, 'findById').resolves(testClient);

        const notificationSpy = sinon.spy(Notification, 'generate');

        // Call the controller function
        await IswcAcknowledgementController.exportIswcAcknowledgement({ req, res });

        // Assertions
        expect(notificationSpy).to.have.been.calledOnce;
      });
    });
  });
});
