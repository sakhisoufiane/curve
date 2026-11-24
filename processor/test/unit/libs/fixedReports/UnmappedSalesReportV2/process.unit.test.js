process.env.NODE_ENV = 'test';

const fs = require('fs');
const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const avsc = require('avsc');

const GoogleStorage = require('../../../../../controllers/googleStorage');
const Helper = require('../../../../../libs/fixedReports/unmappedSalesV2/helper');

let Process;

logger.debug('\n\n**** .test/unit/libs/fixedReports/UnmappedSalesReportV2/process.unit.test.js');

describe('#UnmappedSalesReportV2 Process', () => {
  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    Process = rewire('../../../../../libs/fixedReports/unmappedSalesV2/process');

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#processBatch', () => {
    let file;
    let reportId;
    let catalogue;
    let contracts;
    let template;
    let writeCsv;
    let client;

    let row;

    beforeEach((done) => {
      // Variables
      client = { clientType: randomId() };
      file = { name: randomString() };
      reportId = randomId();
      catalogue = { Releases: {}, Tracks: {}, Works: {} };
      contracts = {};
      template = [randomString(), randomString(), randomString()];
      writeCsv = { addToFile: sinon.stub() };

      row = { catType: 'Release', releaseId: randomId() };
      // Fake Async Iterator for readLines
      const fakeAsyncIterator = (async function* () {
        yield row;
      }());

      // Stubs
      sinon.stub(GoogleStorage.prototype, 'downloadFile').resolves();
      sinon.stub(Process, 'processRow').resolves();
      sinon.stub(avsc, 'createFileDecoder').returns(fakeAsyncIterator);
      sinon.stub(fs, 'unlinkSync').returns();

      done();
    });

    it('should download the file', async () => {
      await Process.processBatch({
        client,
        file,
        reportId,
        catalogue,
        contracts,
        template,
        writeCsv,
      });
      expect(GoogleStorage.prototype.downloadFile.called).to.be.true;
    });

    it('should process rows from readLines', async () => {
      await Process.processBatch({
        client,
        file,
        reportId,
        catalogue,
        contracts,
        template,
        writeCsv,
      });

      expect(Process.processRow.called).to.be.true;
      expect(Process.processRow.callCount).to.equal(1);
      expect(Process.processRow.calledWithExactly({ row, catalogue, contracts, template, writeCsv, client, reportId })).to.be.true;
    });
  });
  describe('#processRow', () => {
    beforeEach((done) => {
      sinon.stub(Helper, 'addToFile').resolves();
      done();
    });
    describe('When no Catalogue Documenet is found', () => {
      it('should not call Helper.addToFile', async () => {
        const row = { catType: 'Release', releaseId: randomId() };
        const catalogue = { Releases: {}, Tracks: {}, Works: {} };
        const contracts = {};
        const template = [randomString(), randomString(), randomString()];
        const writeCsv = { addToFile: sinon.stub() };
        const client = { clientType: randomString() };

        await Process.processRow({ row, catalogue, contracts, template, writeCsv, client });

        expect(Helper.addToFile.called).to.be.false;
      });
    });
    describe("When Release Specific Right is found and Cat Type of Row is 'Track' and row.contractIds does NOT include the contract against the right", () => {
      it('should call Helper.addToFile', async () => {
        const contractId = randomId();
        const row = { catType: 'Track', releaseId: randomId(), contractIds: `${randomId()}, ${randomId()}`, trackId: randomId() };
        const catalogue = {
          Tracks: {
            [row.trackId]: {
              releaseSpecificSalesReturnsRights: [{ releaseId: row.releaseId, contractId }],
            },
          },
          Releases: {},
          Works: {},
        };
        const contracts = { [contractId]: { name: randomString(), _id: contractId } };
        const template = [randomString(), randomString(), randomString()];
        const writeCsv = {};
        const client = { clientType: randomString() };

        await Process.processRow({ row, catalogue, contracts, template, writeCsv, client });

        expect(Helper.addToFile.called).to.be.true;
      });
    });
    describe('When Release Specific Right is found and Cat Type of Row is Track but there is no row.ReleaseId', () => {
      it('should not call Helper.addToFile', async () => {
        const contractId = randomId();
        const row = { catType: 'Track', contractIds: `${randomId()}, ${randomId()}`, trackId: randomId() };
        const catalogue = {
          Tracks: {
            [row.trackId]: {
              releaseSpecificSalesReturnsRights: [{ releaseId: randomId(), contractId }],
            },
          },
          Releases: {},
          Works: {},
        };
        const contracts = { [contractId]: { name: randomString(), _id: contractId } };
        const template = [randomString(), randomString(), randomString()];
        const writeCsv = {};
        const client = { clientType: randomString() };

        await Process.processRow({ row, catalogue, contracts, template, writeCsv, client });

        expect(Helper.addToFile.called).to.be.false;
      });
    });
    describe('When unreportedContractIds are found when comparing row.contractIds to Catlaogue.salesReturnsRights', () => {
      it('should call addFile for each unreportedContractId', async () => {
        const reprotedContractId = randomId();
        const unreportedContractId = randomId();
        const row = { catType: 'Release', releaseId: randomId(), contractIds: `${reprotedContractId}, ${randomId()}` };
        const catalogue = {
          Releases: {
            [row.releaseId]: {
              salesReturnsRights: [unreportedContractId, reprotedContractId],
            },
          },
          Tracks: {},
          Works: {},
        };
        const contracts = { [unreportedContractId]: { name: randomString(), _id: unreportedContractId }, [reprotedContractId]: { name: randomString(), _id: reprotedContractId } };
        const template = [randomString(), randomString(), randomString()];
        const writeCsv = {};
        const client = { clientType: randomString() };

        await Process.processRow({ row, catalogue, contracts, template, writeCsv, client });

        expect(Helper.addToFile.called).to.be.true;
        expect(Helper.addToFile.callCount).to.equal(1);
        expect(
          Helper.addToFile.calledWithExactly({
            writeCsv,
            sales: Helper.formatRow({
              contract: contracts[unreportedContractId],
              row,
              template,
            }),
          }),
        ).to.be.true;
      });
    });
    describe('When Release Specific Right is found and Cat Type of Row is Track and row.contractIds includes the contract against the right', () => {
      it('should not call Helper.addToFile', async () => {
        const contractId = randomId();
        const row = { catType: 'Track', releaseId: randomId(), contractIds: `${randomId()}, ${contractId}`, trackId: randomId() };
        const catalogue = {
          Tracks: {
            [row.trackId]: {
              releaseSpecificSalesReturnsRights: [{ releaseId: row.releaseId, contractId }],
            },
          },
          Releases: {},
          Works: {},
        };
        const contracts = { [contractId]: { name: randomString(), _id: contractId } };
        const template = [randomString(), randomString(), randomString()];
        const writeCsv = {};
        const client = { clientType: randomString() };

        await Process.processRow({ row, catalogue, contracts, template, writeCsv, client });

        expect(Helper.addToFile.called).to.be.false;
      });
    });
    describe('When there are Release Specific Rights but row.releaseId is different, but there are unreportedContractIds against sales return rights', () => {
      it('should call addFile for each unreportedContractId', async () => {
        const reprotedContractId = randomId();
        const unreportedContractId = randomId();
        const row = { catType: 'Track', releaseId: randomId(), trackId: randomId(), contractIds: `${reprotedContractId}, ${randomId()}` };
        const catalogue = {
          Tracks: {
            [row.trackId]: {
              salesReturnsRights: [unreportedContractId, reprotedContractId],
              releaseSpecificSalesReturnsRights: [{ releaseId: randomId(), contractId: randomId() }],
            },
          },
          releases: {},
          Works: {},
        };
        const contracts = { [unreportedContractId]: { name: randomString(), _id: unreportedContractId }, [reprotedContractId]: { name: randomString(), _id: reprotedContractId } };
        const template = [randomString(), randomString(), randomString()];
        const writeCsv = {};
        const client = { clientType: randomString() };

        await Process.processRow({ row, catalogue, contracts, template, writeCsv, client });

        expect(Helper.addToFile.called).to.be.true;
        expect(Helper.addToFile.callCount).to.equal(1);
        expect(
          Helper.addToFile.calledWithExactly({
            writeCsv,
            sales: Helper.formatRow({
              contract: contracts[unreportedContractId],
              row,
              template,
            }),
          }),
        ).to.be.true;
      });
    });
  });
});
