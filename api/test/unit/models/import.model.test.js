process.env.NODE_ENV = 'test';

const chai = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomArray, randomInt, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { Types } = require('@curveroyaltysystems/models/mongoose');
const sinon = require('sinon');
const { IngestCwr } = require('@curveroyaltysystems/curve-shared-logic');
chai.use(require('sinon-chai'));

const Client = require('../../../models/client');
const Import = require('../../../models/import');
const Notification = require('../../../models/notification');

const { expect } = chai;

describe('Import', () => {
  logger.info('>>>file>>>> unit/models/import .....................');

  const importPartnerId = new Types.ObjectId(randomId());
  const importFields = {
    name: randomString(),
    clientId: randomId(),
    setupStage: randomString(),
    transferringSystem: randomString(),
    transferringParty: randomString(),
    contractId: randomString(),
    catalogueGroups: randomArray(),
    errors: randomArray(),
    status: 'Setup',
    counterpointFiles: {
      royaltorsFile: randomString(),
      royaltorRatesFile: randomString(),
      royaltorProductsFile: randomString(),
      soundRecordingsFile: randomString(),
      productManagerFile: randomString(),
      productAKAsFile: randomString(),
      publishingCatalogueExport: randomString(),
      publishingRatesExport: randomString(),
      publishingComposers: randomString(),
      publishingPublishers: randomString(),
      publishingBalances: randomString(),
      publishingTerritoryManager: randomString(),
    },
    valuesForMapping: {
      territories: randomArray(),
      distributionChannels: randomArray(),
      configurations: randomArray(),
      priceCategories: randomArray(),
      capacities: randomArray(),
      societies: randomArray(),
      publishingRates: randomArray(),
    },
    mappings: {
      territories: null,
      distributionChannels: null,
      configurations: null,
      priceCategories: null,
      societies: null,
      capacities: null,
      publishingRates: null,
    },
    defaults: {
      costContractTerms: null,
      reserveContractTerms: null,
      accountingPeriod: randomString(),
      contracts: null,
      catalogueGroups: null,
      territories: null,
      claimingParty: null,
      setMainIdentifier: false,
      setPublisherInterestedParty: false,
      setComposerInterestedParty: false,
      ingestionTerritory: randomString(),
    },
    ingestedPayees: randomInt(),
    ingestedContracts: randomInt(),
    ingestedReleases: randomInt(),
    ingestedTracks: randomInt(),
    ingestedWorks: randomInt(),
    ingestedComposers: randomInt(),
    ingestedPublishers: randomInt(),
    errorMessage: randomString(),
    importPartnerId,
  };
  let importModel;

  beforeEach(async () => {
    importModel = new Import(importFields);

    sinon.stub(IngestCwr, 'ingest');
    sinon.stub(Client, 'findById');
    sinon.stub(Notification, 'generate');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should include import fields', () => {
    const result = importModel.toObject();
    expect(result).to.deep.include(importFields);
  });

  describe('runCwrImport', () => {
    it('should generate notification with error if ingest fails', (done) => {
      const curveUser = { clientId: randomId() };
      IngestCwr.ingest.yields({}, randomInt(), []);
      Client.findById.resolves({});
      Notification.generate.yields(null, {});

      importModel.runCwrImport(curveUser, (err, result) => {
        expect(IngestCwr.ingest).to.have.been.calledOnce;
        expect(Client.findById).to.have.been.calledOnce;
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
        expect(Notification.generate).to.have.been.calledOnce;
        expect(Notification.generate.getCall(0).args[0]).to.eq(`Your Import ${importModel.name} Has Errored`);
        done();
      });
    });

    it('should generate notification with partial error if ingest fails', (done) => {
      const curveUser = { clientId: randomId() };
      const errors = [{ error: randomString(), title: randomString(), identifier: randomString() }];
      const ingestedWorks = randomInt();
      IngestCwr.ingest.yields(null, ingestedWorks, errors);
      Client.findById.resolves({});
      Notification.generate.yields(null, {});
      const expectedGenerateOptions = {
        identifier: 'partialImportError',
        curveUser: { clientId: curveUser.clientId },
        client: {},
        subject: `Your Import ${importFields.name} Has Partially Completed`,
        file: importFields.name,
        error: [`${errors[0].error} (${errors[0].title} - ${errors[0].identifier})`],
        count: ingestedWorks,
      };

      importModel.runCwrImport(curveUser, (err, result) => {
        expect(IngestCwr.ingest).to.have.been.calledOnce;
        expect(Client.findById).to.have.been.calledOnce;
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
        expect(Notification.generate).to.have.been.calledOnce;
        expect(Notification.generate.getCall(0).args[0]).to.eq('CWR Bulk import partially completed');
        expect(Notification.generate.getCall(0).args[1]).to.eq(`1 errors in file ${importFields.name}. ${ingestedWorks} works imported.`);
        expect(Notification.generate.getCall(0).args[4]).to.deep.eq(expectedGenerateOptions);
        done();
      });
    });

    it('should generate successful notification if ingest completes', (done) => {
      const curveUser = { clientId: randomId() };
      IngestCwr.ingest.yields(null, randomInt(), []);
      Client.findById.resolves({});
      Notification.generate.yields(null, {});

      importModel.runCwrImport(curveUser, (err, result) => {
        expect(IngestCwr.ingest).to.have.been.calledOnce;
        expect(Client.findById).to.have.been.calledOnce;
        expect(Client.findById).to.have.been.calledWith(curveUser.clientId);
        expect(Notification.generate).to.have.been.calledOnce;
        expect(Notification.generate.getCall(0).args[0]).to.eq('CWR Bulk import completed');
        done();
      });
    });
  });
});
