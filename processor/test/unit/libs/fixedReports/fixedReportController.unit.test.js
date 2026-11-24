process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Client = require('../../../../models/client');
const Report = require('../../../../models/report');
const auditReport = require('../../../../libs/fixedReports/auditReport');
const UnmappedSalesReport = require('../../../../libs/fixedReports/unmappedSalesV2/index');

let FixedReportController;

logger.debug('\n\n**** .test/unit/libs/fixedReports/fixedReportController.unit.test.js');

describe('FixedReportController', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    FixedReportController = rewire('../../../../libs/fixedReports/fixedReportsController');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#runFixedReport', () => {
    let clientId; let report; let file; let publicKey;
    beforeEach((done) => {
      // Variables
      clientId = randomId();
      report = {
        _id: randomId(),
        clientId,
        reportType: 'Fixed',
        fixedReportId: { key: 'unmappedSalesReportV2', _id: randomId() },
      };
      file = randomString();
      publicKey = randomString();

      // Stubs
      sinon.stub(auditReport, 'run').resolves(file);
      sinon.stub(UnmappedSalesReport, 'run').resolves(file);
      sinon.stub(Client, 'findById');
      Client.findById.resolves({ _id: clientId });
      sinon.stub(FixedReportController, 'notifyClient').resolves();
      sinon.stub(FixedReportController, 'uploadToS3').resolves(publicKey);
      sinon.stub(Report, 'findById').returns({
        populate: sinon.stub().resolves(report),
      });
      done();
    });

    it('should call Report.findById', async () => {
      await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
      expect(Report.findById.called).to.be.true;
    });
    describe('When reportType is not fixed', () => {
      it('should throw an error', async () => {
        Report.findById.returns({
          populate: sinon.stub().resolves({
            _id: randomId(),
            reportType: 'Custom',
            fixedReportId: { key: 'unmappedSalesReportV2', _id: randomId() },
          }),
        });
        try {
          await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        } catch (err) {
          expect(err.message).to.equal('No Fixed Report is associated with this report');
        }
      });
    });
    it('should call client.findById', async () => {
      await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
      expect(Client.findById.called).to.be.true;
    });
    describe('When client is not found', () => {
      it('should throw an error', async () => {
        Client.findById.resolves(null);
        try {
          await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        } catch (err) {
          expect(err.message).to.equal(`Could not find Client ID: ${clientId}`);
        }
      });
    });
    describe('When client.findById throws an error', () => {
      it('should throw an error', async () => {
        const clientFindError = new Error('Client.findById error');
        Client.findById.rejects(clientFindError);
        try {
          await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        } catch (err) {
          expect(err.message).to.equal(clientFindError.message);
        }
      });
    });
    it('Should look up script from ScriptList and call .run()', async () => {
      await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
      expect(UnmappedSalesReport.run.called).to.be.true;
    });
    it('Should look up script from ScriptList and call .run() - Armada Report', async () => {
      Report.findById.returns({
        populate: sinon.stub().resolves({
          _id: randomId(),
          reportType: 'Fixed',
          fixedReportId: { key: 'auditReport', _id: randomId() },
        }),
      });
      await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
      expect(auditReport.run.called).to.be.true;
    });
    describe('When script is not found', () => {
      it('should throw an error', async () => {
        Report.findById.returns({
          populate: sinon.stub().resolves({
            _id: randomId(),
            reportType: 'Fixed',
            fixedReportId: { key: 'notFound', _id: randomId() },
          }),
        });
        try {
          await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        } catch (err) {
          expect(err.message).to.equal('No Script found with key: notFound');
        }
      });
    });
    describe('When .run() throws an error', () => {
      it('should throw an error', async () => {
        const runError = new Error('UnmappedSalesReport.run error');
        UnmappedSalesReport.run.rejects(runError);
        try {
          await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        } catch (err) {
          expect(err.message).to.equal(runError.message);
        }
      });
      it('should call notifyClient and pass the error', async () => {
        const runError = new Error('UnmappedSalesReport.run error');
        UnmappedSalesReport.run.rejects(runError);
        try {
          await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        } catch (err) {
          expect(FixedReportController.notifyClient.called).to.be.true;
          expect(FixedReportController.notifyClient.calledWithExactly({ client: { _id: clientId }, error: runError, report })).to.be.true;
        }
      });
    });
    describe('If .run() is successful', () => {
      it('should call uploadToS3 with the right params', async () => {
        await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        expect(FixedReportController.uploadToS3.calledWithExactly({ file, client: { _id: clientId } })).to.be.true;
      });
      describe('When uploadToS3 throws an error', () => {
        it('should call notifyClient and pass the error', async () => {
          const uploadError = new Error('uploadToS3 error');
          FixedReportController.uploadToS3.rejects(uploadError);
          try {
            await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
          } catch (err) {
            expect(FixedReportController.notifyClient.called).to.be.true;
            expect(FixedReportController.notifyClient.calledWithExactly({ client: { _id: clientId }, error: uploadError, report })).to.be.true;
          }
        });
      });
      it('should call notifyClient with the right params', async () => {
        await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
        expect(FixedReportController.notifyClient.calledWithExactly({ publicKey, client: { _id: clientId }, reportName: report.name, email: sinon.match.string })).to.be.true;
      });
      describe('When notifyClient throws an error', () => {
        it('should throw an error', async () => {
          const notifyError = new Error('notifyClient error');
          FixedReportController.notifyClient.rejects(notifyError);
          try {
            await FixedReportController.runFixedReport({ reportId: randomId(), email: randomString() });
          } catch (err) {
            expect(err.message).to.equal(notifyError.message);
          }
        });
      });
    });
  });
});
