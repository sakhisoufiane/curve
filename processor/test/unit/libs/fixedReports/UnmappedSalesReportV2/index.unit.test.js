process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Client = require('../../../../../models/client');
const Period = require('../../../../../models/period');
const SalesFile = require('../../../../../models/salesFile');

const GoogleStorage = require('../../../../../controllers/googleStorage');
const Process = require('../../../../../libs/fixedReports/unmappedSalesV2/process');
const Catalogue = require('../../../../../libs/fixedReports/unmappedSalesV2/catalogue');
const UnmappedHelpers = require('../../../../../libs/fixedReports/unmappedSalesV2/helper');

let UnmappedSalesReport;

logger.debug('\n\n**** .test/unit/libs/fixedReports/UnmappedSalesReportV2/index.unit.test.js');

describe('UnmappedSalesReport Index', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    UnmappedSalesReport = rewire('../../../../../libs/fixedReports/unmappedSalesV2/index');
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#run', () => {
    beforeEach((done) => {
      sinon.stub(Period, 'findById').resolves({ _id: randomId() });
      sinon.stub(Client, 'findById');
      Client.findById.resolves({
        _id: randomId(),
        bigQueryDataset: randomString(),
        bigQuerySalesTable: randomString(),
        bigQueryPeriodSales: randomString(),
        bigQueryPeriodCosts: randomString(),
      });
      sinon.stub(UnmappedSalesReport, 'createReport').resolves({});
      done();
    });

    describe('if not clientId is passed', () => {
      it('should throw an error', async () => {
        try {
          await UnmappedSalesReport.run({});
        } catch (error) {
          expect(error.message).to.equal('ClientId is missing from report document');
        }
      });
    });

    describe('if no reportId is passed', () => {
      const report = { clientId: randomId(), filters: [] };
      it('should throw an error', async () => {
        try {
          await UnmappedSalesReport.run(report);
        } catch (error) {
          expect(error.message).to.equal('No ReportId parameter was passed');
        }
      });
    });

    describe('if periodId is not passed', () => {
      it('should throw an error when periodId is not passed', async () => {
        const report = { _id: randomId(), filters: [], clientId: randomId() };
        try {
          await UnmappedSalesReport.run(report);
        } catch (error) {
          expect(error.message).to.equal('No PeriodId parameter was passed');
        }
      });
    });

    describe('if period is not found', () => {
      it('should throw an error', async () => {
        const periodId = randomId();
        const report = { _id: randomId(), filters: [{ period: periodId }], clientId: randomId() };
        Period.findById.resolves(null);
        try {
          await UnmappedSalesReport.run(report);
        } catch (error) {
          expect(error.message).to.equal(`No Period found: ${periodId}`);
        }
      });
      it('should throw an error (When Mongo Errors)', async () => {
        const periodId = randomId();
        const report = { _id: randomId(), filters: [{ period: periodId }], clientId: randomId() };
        Period.findById.rejects(new Error('Mongo Error'));

        try {
          await UnmappedSalesReport.run(report);
        } catch (error) {
          expect(error.message).to.equal(`No Period found: ${periodId}`);
        }
      });
    });

    it('should call client.findById', async () => {
      const periodId = randomId();
      const report = { _id: randomId(), filters: [{ period: periodId }], clientId: randomId() };
      await UnmappedSalesReport.run(report);
      expect(Client.findById.called).to.be.true;
    });

    describe('if client is not found', () => {
      it('should throw an error', async () => {
        const clientId = randomId();
        const report = { _id: randomId(), filters: [{ period: randomId() }], clientId };
        Client.findById.resolves(null);
        try {
          await UnmappedSalesReport.run(report);
        } catch (error) {
          expect(error.message).to.equal(`No Client found: ${clientId}`);
        }
      });
      it('should throw an error (When Mongo Errors)', async () => {
        const clientId = randomId();
        const report = { _id: randomId(), filters: [{ period: randomId() }], clientId };
        Client.findById.rejects(new Error('Mongo Error'));

        try {
          await UnmappedSalesReport.run(report);
        } catch (error) {
          expect(error.message).to.equal(`No Client found: ${clientId}`);
        }
      });
    });

    it('should call UnmappedSalesReport.createReport', async () => {
      const periodId = randomId();
      const report = { _id: randomId(), filters: [{ period: periodId }], clientId: randomId() };
      await UnmappedSalesReport.run(report);
      expect(UnmappedSalesReport.createReport.called).to.be.true;
    });

    describe('if UnmappedSalesReport.createReport fails', () => {
      it('should throw an error', async () => {
        const periodId = randomId();
        const report = { _id: randomId(), filters: [{ period: periodId }], clientId: randomId() };
        UnmappedSalesReport.createReport.rejects(new Error('Error Running Report'));

        try {
          await UnmappedSalesReport.run(report);
        } catch (error) {
          expect(error.message).to.equal('Error Running Report');
        }
      });
    });
  });

  describe('#createReport', () => {
    let bigQuery; let reportId; let period; let client; let writeCsv; let template;
    beforeEach((done) => {
      // Variables
      bigQuery = {};
      reportId = randomId();
      period = { _id: randomId(), salesFilesIds: [randomId()] };
      client = { _id: randomId() };
      writeCsv = { headers: [], outputLocation: randomString() };
      template = [{ header: randomString(), field: randomString() }];

      // Stubs
      sinon.stub(SalesFile, 'find').returns({ select: () => ({ lean: () => (Promise.resolve([{ _id: randomId(), partitionNo: randomInt() }])) }) });

      sinon.stub(Catalogue, 'loadCatalogue').resolves({ contracts: {}, catalogue: {} });

      sinon.stub(UnmappedHelpers, 'buildQuery').returns('');
      sinon.stub(UnmappedHelpers, 'write').resolves();
      sinon.stub(UnmappedHelpers, 'queryJob').resolves();

      sinon.stub(Process, 'processBatch').resolves();

      sinon.stub(GoogleStorage.prototype, 'getFilteredFiles').resolves([{ name: randomString() }]);
      done();
    });

    it('should call SalesFile.find', async () => {
      await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
      expect(SalesFile.find.called).to.be.true;
    });
    describe('if no salesFiles are found', () => {
      it('should return', async () => {
        SalesFile.find.returns({ select: () => ({ lean: () => (Promise.resolve([])) }) });
        await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
        expect(Catalogue.loadCatalogue.called).to.be.false;
        expect(UnmappedHelpers.buildQuery.called).to.be.false;
        expect(UnmappedHelpers.queryJob.called).to.be.false;
        expect(GoogleStorage.prototype.getFilteredFiles.called).to.be.false;
        expect(Process.processBatch.called).to.be.false;
      });
    });
    it('should call catalogue.loadCatalogue', async () => {
      await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
      expect(Catalogue.loadCatalogue.called).to.be.true;
    });
    it('shoud call UnmappedHelpers.buildQuery', async () => {
      await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
      expect(UnmappedHelpers.buildQuery.called).to.be.true;
      expect(UnmappedHelpers.buildQuery.args[0][0].gsPath.includes('gs://')).to.be.true;
      expect(UnmappedHelpers.buildQuery.args[0][0].gsPath.includes('export-*')).to.be.true;
    });
    it('should call UnmappedHelpers.queryJob', async () => {
      await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
      expect(UnmappedHelpers.queryJob.called).to.be.true;
    });
    describe('When queryJob errors', () => {
      it('should throw an error', async () => {
        const mockError = new Error('BigQuery Error');
        UnmappedHelpers.queryJob.rejects(mockError);
        try {
          await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
        } catch (error) {
          expect(error.message).to.equal(mockError.message);
          expect(UnmappedHelpers.write.called).to.be.false;
        }
      });
    });
    it('should call GoogleStorage.getFilteredFiles', async () => {
      await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
      expect(GoogleStorage.prototype.getFilteredFiles.called).to.be.true;
    });
    describe('When getFilteredFiles error', () => {
      it('should throw an error', async () => {
        const mockError = new Error('GoogleStorage Error');
        GoogleStorage.prototype.getFilteredFiles.rejects(mockError);
        try {
          await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
        } catch (error) {
          expect(error.message).to.equal(mockError.message);
          expect(UnmappedHelpers.write.called).to.be.false;
        }
      });
    });
    describe('When no files are found', () => {
      it('should return', async () => {
        GoogleStorage.prototype.getFilteredFiles.returns([]);
        await UnmappedSalesReport.createReport({ reportId, bigQuery, period, client, writeCsv, template });
        expect(Process.processBatch.called).to.be.false;
        expect(UnmappedHelpers.write.called).to.be.false;
      });
    });
  });
});
