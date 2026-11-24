process.env.NODE_ENV = 'test';
require('../../../models/db');

const { testUtils, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const { expect } = require('chai');

const config = require('../../../config.json');
const Cost = require('../../../models/cost');

const PeriodAnalysisFigures = require('../../../libs/periodAnalysisFigures');

let bigQuery;

let periodIds; let contractIds; let salesLineIds; let costIds;

let output1; let output2;

let input1; let input2;

let bigQueryTrack1; let bigQueryTrack2;

let bigQueryRelease1; let bigQueryRelease2;

let bigQueryWork1; let bigQueryWork2;

let bigQueryCost1; let bigQueryCost2;

let mongoCost1; let mongoCost2;

let db; let event; let clientId;

const bqTestUtils = new BigQueryTestUtils();

describe('PeriodAnalysisFigures', () => {
  before(function (done) {
    clientId = testUtils.randomId();
    bqTestUtils.init().then(() => {
      testUtils.cleanUp(clientId, done);
    });
  });

  beforeEach(async () => {
    periodIds = [testUtils.randomId(), testUtils.randomId()];
    contractIds = [testUtils.randomId(), testUtils.randomId()];
    salesLineIds = [testUtils.randomId(), testUtils.randomId()];
    costIds = [testUtils.randomId(), testUtils.randomId()];

    output1 = { periodId: periodIds[0], contractId: contractIds[0], salesLineId: salesLineIds[0], calculationOutput: testUtils.randomFloat(), territory: testUtils.randomString(), source: testUtils.randomString(), subSource: testUtils.randomString(), catalogueCatNo: testUtils.randomString(), catalogueReleaseTitle: testUtils.randomString(), units: testUtils.randomFloat(), mechanicalBasisPercentage: testUtils.randomFloat(), calculationInput: testUtils.randomFloat(), catalogueIsrc: testUtils.randomString(), catalogueTrackTitle: testUtils.randomString(), workId: testUtils.randomString(), catalogueIdentifier: testUtils.randomString(), catalogueWorkTitle: testUtils.randomString(), configuration: testUtils.randomString(), distributionChannel: testUtils.randomString() };
    output2 = { periodId: periodIds[1], contractId: contractIds[1], salesLineId: salesLineIds[1], calculationOutput: testUtils.randomFloat(), territory: testUtils.randomString(), source: testUtils.randomString(), subSource: testUtils.randomString(), catalogueCatNo: testUtils.randomString(), catalogueReleaseTitle: testUtils.randomString(), units: testUtils.randomFloat(), mechanicalBasisPercentage: testUtils.randomFloat(), calculationInput: testUtils.randomFloat(), catalogueIsrc: testUtils.randomString(), catalogueTrackTitle: testUtils.randomString(), workId: testUtils.randomString(), catalogueIdentifier: testUtils.randomString(), catalogueWorkTitle: testUtils.randomString(), configuration: testUtils.randomString(), distributionChannel: testUtils.randomString() };

    input1 = { id: salesLineIds[0], units: testUtils.randomFloat(), homeCurrencyNetAmount: testUtils.randomFloat() };
    input2 = { id: salesLineIds[1], units: testUtils.randomFloat(), homeCurrencyNetAmount: testUtils.randomFloat() };

    bigQueryTrack1 = { periodId: periodIds[0], contractId: contractIds[0], calculationOutput: output1.calculationOutput, territory: output1.territory, source: output1.source, subSource: output1.subSource, catalogueCatNo: output1.catalogueCatNo, catalogueReleaseTitle: output1.catalogueReleaseTitle, units: output1.units, mechanicalBasisPercentage: output1.mechanicalBasisPercentage, calculationInput: output1.calculationInput, catalogueIsrc: output1.catalogueIsrc, catalogueTrackTitle: output1.catalogueTrackTitle, workId: output1.workId, catalogueIdentifier: output1.catalogueIdentifier, catalogueWorkTitle: output1.catalogueWorkTitle, configuration: output1.configuration, distributionChannel: output1.distributionChannel, catType: 'Track' };
    bigQueryTrack2 = { periodId: periodIds[1], contractId: contractIds[1], calculationOutput: output2.calculationOutput, territory: output2.territory, source: output2.source, subSource: output2.subSource, catalogueCatNo: output2.catalogueCatNo, catalogueReleaseTitle: output2.catalogueReleaseTitle, units: output2.units, mechanicalBasisPercentage: output2.mechanicalBasisPercentage, calculationInput: output2.calculationInput, catalogueIsrc: output2.catalogueIsrc, catalogueTrackTitle: output2.catalogueTrackTitle, workId: output2.workId, catalogueIdentifier: output2.catalogueIdentifier, catalogueWorkTitle: output2.catalogueWorkTitle, configuration: output2.configuration, distributionChannel: output2.distributionChannel, catType: 'Track' };

    bigQueryRelease1 = { periodId: periodIds[0], contractId: contractIds[0], calculationOutput: output1.calculationOutput, territory: output1.territory, source: output1.source, subSource: output1.subSource, catalogueCatNo: output1.catalogueCatNo, catalogueReleaseTitle: output1.catalogueReleaseTitle, units: output1.units, mechanicalBasisPercentage: output1.mechanicalBasisPercentage, calculationInput: output1.calculationInput, catalogueIsrc: output1.catalogueIsrc, catalogueTrackTitle: output1.catalogueTrackTitle, workId: output1.workId, catalogueIdentifier: output1.catalogueIdentifier, catalogueWorkTitle: output1.catalogueWorkTitle, configuration: output1.configuration, distributionChannel: output1.distributionChannel, catType: 'Release' };
    bigQueryRelease2 = { periodId: periodIds[1], contractId: contractIds[1], calculationOutput: output2.calculationOutput, territory: output2.territory, source: output2.source, subSource: output2.subSource, catalogueCatNo: output2.catalogueCatNo, catalogueReleaseTitle: output2.catalogueReleaseTitle, units: output2.units, mechanicalBasisPercentage: output2.mechanicalBasisPercentage, calculationInput: output2.calculationInput, catalogueIsrc: output2.catalogueIsrc, catalogueTrackTitle: output2.catalogueTrackTitle, workId: output2.workId, catalogueIdentifier: output2.catalogueIdentifier, catalogueWorkTitle: output2.catalogueWorkTitle, configuration: output2.configuration, distributionChannel: output2.distributionChannel, catType: 'Release' };

    bigQueryWork1 = { periodId: periodIds[0], contractId: contractIds[0], calculationOutput: output1.calculationOutput, territory: output1.territory, source: output1.source, subSource: output1.subSource, catalogueCatNo: output1.catalogueCatNo, catalogueReleaseTitle: output1.catalogueReleaseTitle, units: output1.units, mechanicalBasisPercentage: output1.mechanicalBasisPercentage, calculationInput: output1.calculationInput, catalogueIsrc: output1.catalogueIsrc, catalogueTrackTitle: output1.catalogueTrackTitle, workId: output1.workId, catalogueIdentifier: output1.catalogueIdentifier, catalogueWorkTitle: output1.catalogueWorkTitle, configuration: output1.configuration, distributionChannel: output1.distributionChannel, catType: 'Work' };
    bigQueryWork2 = { periodId: periodIds[1], contractId: contractIds[1], calculationOutput: output2.calculationOutput, territory: output2.territory, source: output2.source, subSource: output2.subSource, catalogueCatNo: output2.catalogueCatNo, catalogueReleaseTitle: output2.catalogueReleaseTitle, units: output2.units, mechanicalBasisPercentage: output2.mechanicalBasisPercentage, calculationInput: output2.calculationInput, catalogueIsrc: output2.catalogueIsrc, catalogueTrackTitle: output2.catalogueTrackTitle, workId: output2.workId, catalogueIdentifier: output2.catalogueIdentifier, catalogueWorkTitle: output2.catalogueWorkTitle, configuration: output2.configuration, distributionChannel: output2.distributionChannel, catType: 'Work' };

    bigQueryCost1 = { periodId: periodIds[0], contractId: contractIds[0], costId: costIds[0], amount: testUtils.randomFloat(), calculationOutput: testUtils.randomFloat(), type: testUtils.randomString() };
    bigQueryCost2 = { periodId: periodIds[0], contractId: contractIds[0], costId: costIds[1], amount: testUtils.randomFloat(), calculationOutput: testUtils.randomFloat(), type: bigQueryCost1.type };

    mongoCost1 = new Cost({ name: testUtils.randomString(), clientId, periodId: periodIds[0], contractId: contractIds[0], costId: costIds[0], amount: testUtils.randomFloat(), type: testUtils.randomString() });
    mongoCost2 = new Cost({ name: testUtils.randomString(), clientId, periodId: periodIds[0], contractId: contractIds[0], costId: costIds[1], amount: testUtils.randomFloat(), type: mongoCost1.type });

    bigQuery = await bqTestUtils.getBigQuery();

    await bigQuery.client
      .dataset(bigQuery.datasetName)
      .table(bigQuery.costsTable)
      .insert([bigQueryCost1, bigQueryCost2]);
    await bigQuery.client
      .dataset(bigQuery.datasetName)
      .table(bigQuery.outputTable)
      .insert([output1, output2, bigQueryTrack1, bigQueryTrack2, bigQueryRelease1, bigQueryRelease2, bigQueryWork1, bigQueryWork2]);
    await bigQuery.client
      .dataset(bigQuery.datasetName)
      .table(bigQuery.inputTable)
      .insert([input1, input2]);

    await mongoCost1.save();
    await mongoCost2.save();

    db = await MongoClient.connect(`${config.databaseUrl.test}/${config.databaseName.test}`);

    event = {
      clientId,
      bigQuery,
      db,
      outputFilter: {},
      salesOutputFilter: {},
      costsInputDatabaseTable: 'costs',
      inputFilter: {},
      outputSalesValue: 'mechanicalBasisPercentage',
      type: testUtils.randomString(),
    };
  });

  afterEach(function (done) {
    testUtils.cleanUp(clientId, done);
  });

  after(function (done) {
    bqTestUtils.stopTestContainer().then(() => {
      testUtils.cleanUp(clientId, done);
    });
  });

  it('should get the result', (done) => {
    PeriodAnalysisFigures(event, (err, result) => {
      const expectedTerritoriesGross = [
        { type: output1.territory, units: input1.units, value: input1.homeCurrencyNetAmount },
        { type: output2.territory, units: input2.units, value: input2.homeCurrencyNetAmount },
      ];
      const expectedTerritoriesNet = [
        { type: output1.territory, units: output1.units * 4, value: output1.mechanicalBasisPercentage * 4 },
        { type: output2.territory, units: output2.units * 4, value: output2.mechanicalBasisPercentage * 4 },
      ];
      const expectedDistributionChannelsGross = [
        { type: output1.distributionChannel, units: input1.units, value: input1.homeCurrencyNetAmount },
        { type: output2.distributionChannel, units: input2.units, value: input2.homeCurrencyNetAmount },
      ];
      const expectedDistributionChannelsNet = [
        { type: output1.distributionChannel, units: output1.units * 4, value: output1.mechanicalBasisPercentage * 4 },
        { type: output2.distributionChannel, units: output2.units * 4, value: output2.mechanicalBasisPercentage * 4 },
      ];
      const expectedConfigurationsGross = [
        { type: output1.configuration, units: input1.units, value: input1.homeCurrencyNetAmount },
        { type: output2.configuration, units: input2.units, value: input2.homeCurrencyNetAmount },
      ];
      const expectedConfigurationsNet = [
        { type: output1.configuration, units: output1.units * 4, value: output1.mechanicalBasisPercentage * 4 },
        { type: output2.configuration, units: output2.units * 4, value: output2.mechanicalBasisPercentage * 4 },
      ];
      const expectedSourcesGross = [
        { type: output1.source, units: input1.units, value: input1.homeCurrencyNetAmount },
        { type: output2.source, units: input2.units, value: input2.homeCurrencyNetAmount },
      ];
      const expectedSourcesNet = [
        { type: output1.source, units: output1.units * 4, value: output1.mechanicalBasisPercentage * 4 },
        { type: output2.source, units: output2.units * 4, value: output2.mechanicalBasisPercentage * 4 },
      ];
      const expectedSubSourcesGross = [
        { type: output1.subSource, units: input1.units, value: input1.homeCurrencyNetAmount },
        { type: output2.subSource, units: input2.units, value: input2.homeCurrencyNetAmount },
      ];
      const expectedSubSourcesNet = [
        { type: output1.subSource, units: output1.units * 4, value: output1.mechanicalBasisPercentage * 4 },
        { type: output2.subSource, units: output2.units * 4, value: output2.mechanicalBasisPercentage * 4 },
      ];
      const expectedReleasesNet = [
        { type: output1.catalogueCatNo, title: output1.catalogueReleaseTitle, units: output1.units, value: output1.mechanicalBasisPercentage },
        { type: output2.catalogueCatNo, title: output2.catalogueReleaseTitle, units: output2.units, value: output2.mechanicalBasisPercentage },
      ];
      const expectedTracksNet = [
        { type: output1.catalogueIsrc, title: output1.catalogueTrackTitle, units: output1.units, value: output1.mechanicalBasisPercentage },
        { type: output2.catalogueIsrc, title: output2.catalogueTrackTitle, units: output2.units, value: output2.mechanicalBasisPercentage },
      ];
      const expectedWorksNet = [
        { type: output1.catalogueIdentifier, title: output1.catalogueWorkTitle, units: output1.units, value: output1.mechanicalBasisPercentage },
        { type: output2.catalogueIdentifier, title: output2.catalogueWorkTitle, units: output2.units, value: output2.mechanicalBasisPercentage },
      ];
      const expectedConfigurationByDistributionChannelNet = [
        { distributionChannel: output1.distributionChannel, configuration: output1.configuration, units: output1.units * 4, value: output1.mechanicalBasisPercentage * 4 },
        { distributionChannel: output2.distributionChannel, configuration: output2.configuration, units: output2.units * 4, value: output2.mechanicalBasisPercentage * 4 },
      ];

      expect(result.gross.territories.map((item) => item.type).sort()).to.deep.eq(expectedTerritoriesGross.map((item) => item.type).sort());
      expect(result.gross.distributionChannels.map((item) => item.type).sort()).to.deep.eq(expectedDistributionChannelsGross.map((item) => item.type).sort());
      expect(result.gross.configurations.map((item) => item.type).sort()).to.deep.eq(expectedConfigurationsGross.map((item) => item.type).sort());
      expect(result.gross.sources.map((item) => item.type).sort()).to.deep.eq(expectedSourcesGross.map((item) => item.type).sort());
      expect(result.gross.subSources.map((item) => item.type).sort()).to.deep.eq(expectedSubSourcesGross.map((item) => item.type).sort());
      expect(result.gross.costs.map((item) => item.type).sort()).to.deep.eq([{ type: mongoCost1.type, value: mongoCost1.amount + mongoCost2.amount }].map((item) => item.type).sort());

      expect(result.net.territories.map((item) => item.type).sort()).to.deep.eq(expectedTerritoriesNet.map((item) => item.type).sort());
      expect(result.net.distributionChannels.map((item) => item.type).sort()).to.deep.eq(expectedDistributionChannelsNet.map((item) => item.type).sort());
      expect(result.net.configurations.map((item) => item.type).sort()).to.deep.eq(expectedConfigurationsNet.map((item) => item.type).sort());
      expect(result.net.sources.map((item) => item.type).sort()).to.deep.eq(expectedSourcesNet.map((item) => item.type).sort());
      expect(result.net.subSources.map((item) => item.type).sort()).to.deep.eq(expectedSubSourcesNet.map((item) => item.type).sort());
      expect(result.net.releases.map((item) => item.type).sort()).to.deep.eq(expectedReleasesNet.map((item) => item.type).sort());
      expect(result.net.tracks.map((item) => item.type).sort()).to.deep.eq(expectedTracksNet.map((item) => item.type).sort());
      expect(result.net.works.map((item) => item.type).sort()).to.deep.eq(expectedWorksNet.map((item) => item.type).sort());
      expect(result.net.configurationByDistributionChannel.map((item) => item.type).sort()).to.deep.eq(expectedConfigurationByDistributionChannelNet.map((item) => item.type).sort());
      expect(result.net.costs.map((item) => item.type).sort()).to.deep.eq([{ type: bigQueryCost1.type, value: bigQueryCost1.calculationOutput + bigQueryCost2.calculationOutput }].map((item) => item.type).sort());

      done(err);
    });
  });
});
