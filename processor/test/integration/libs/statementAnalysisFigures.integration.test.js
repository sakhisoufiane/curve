// @TODO: take to jest. It's easy

process.env.NODE_ENV = 'test';
require('../../../models/db');

const { expect } = require('chai');
const { testUtils, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');

let bigQuery;

const { statementAnalysisFigures: StatementAnalysisFigures } = require('../../../libs/statementAnalysisFigures');

async function writeToDb(data, table) {
  await bigQuery.client
    .dataset(bigQuery.datasetName)
    .table(table)
    .insert(data);
}

const bqTestUtils = new BigQueryTestUtils();

describe('StatementAnalysisFigures', () => {
  const periodIds = [testUtils.randomId(), testUtils.randomId()];
  const contractIds = [testUtils.randomId(), testUtils.randomId()];
  const costIds = [testUtils.randomId(), testUtils.randomId()];

  const bigQueryOutput1 = {
    periodId: periodIds[0],
    contractId: contractIds[0],
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
    territory: testUtils.randomString(),
    source: testUtils.randomString(),
    subSource: testUtils.randomString(),
    catalogueCatNo: testUtils.randomString(),
    catalogueReleaseTitle: testUtils.randomString(),
    units: testUtils.randomFloat(),
    catalogueIsrc: testUtils.randomString(),
    catalogueTrackTitle: testUtils.randomString(),
    contractCurrencyCalculationInput: testUtils.randomFloat(),
    contractCurrencyProRataAmount: testUtils.randomFloat(),
    calculationInput: testUtils.randomFloat(),
    workId: testUtils.randomString(),
    catalogueIdentifier: testUtils.randomString(),
    catalogueWorkTitle: testUtils.randomString(),
    configuration: testUtils.randomString(),
    distributionChannel: testUtils.randomString(),
    contractCurrencyDeduction: testUtils.randomFloat(),
  };

  const bigQueryOutput2 = {
    periodId: periodIds[1],
    contractId: contractIds[1],
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
    territory: testUtils.randomString(),
    source: testUtils.randomString(),
    subSource: testUtils.randomString(),
    catalogueCatNo: testUtils.randomString(),
    catalogueReleaseTitle: testUtils.randomString(),
    units: testUtils.randomFloat(),
    catalogueIsrc: testUtils.randomString(),
    catalogueTrackTitle: testUtils.randomString(),
    contractCurrencyCalculationInput: testUtils.randomFloat(),
    contractCurrencyProRataAmount: testUtils.randomFloat(),
    calculationInput: testUtils.randomFloat(),
    workId: testUtils.randomString(),
    catalogueIdentifier: testUtils.randomString(),
    catalogueWorkTitle: testUtils.randomString(),
    configuration: testUtils.randomString(),
    distributionChannel: testUtils.randomString(),
    contractCurrencyDeduction: testUtils.randomFloat(),
  };

  const bigQueryCost1 = {
    periodId: periodIds[0],
    contractId: contractIds[0],
    costId: costIds[0],
    type: testUtils.randomString(),
    contractCurrencyAmount: testUtils.randomFloat(),
    contractCurrencyCalculationInput: bigQueryOutput1.contractCurrencyCalculationInput,
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
  };

  const bigQueryCost2 = {
    periodId: periodIds[1],
    contractId: contractIds[1],
    type: testUtils.randomString(),
    contractCurrencyAmount: testUtils.randomFloat(),
    costId: costIds[1],
    contractCurrencyCalculationInput: bigQueryOutput2.contractCurrencyCalculationInput,
    contractCurrencyCalculationOutput: testUtils.randomFloat(),
  };

  const bigQueryRelease1 = {
    periodId: periodIds[0],
    contractId: contractIds[0],
    contractCurrencyCalculationOutput: bigQueryOutput1.contractCurrencyCalculationOutput,
    territory: bigQueryOutput1.territory,
    source: bigQueryOutput1.source,
    subSource: bigQueryOutput1.subSource,
    catalogueCatNo: bigQueryOutput1.catalogueCatNo,
    catalogueReleaseTitle: bigQueryOutput1.catalogueReleaseTitle,
    units: bigQueryOutput1.units,
    catalogueIsrc: bigQueryOutput1.catalogueIsrc,
    catalogueTrackTitle: bigQueryOutput1.catalogueTrackTitle,
    contractCurrencyCalculationInput: bigQueryOutput1.contractCurrencyCalculationInput,
    contractCurrencyProRataAmount: bigQueryOutput1.contractCurrencyProRataAmount,
    calculationInput: bigQueryOutput1.calculationInput,
    workId: bigQueryOutput1.workId,
    catalogueIdentifier: bigQueryOutput1.catalogueIdentifier,
    catalogueWorkTitle: bigQueryOutput1.catalogueWorkTitle,
    configuration: bigQueryOutput1.configuration,
    distributionChannel: bigQueryOutput1.distributionChannel,
    contractCurrencyDeduction: bigQueryOutput1.contractCurrencyDeduction,
    catType: 'Release',
  };

  const bigQueryRelease2 = {
    periodId: periodIds[1],
    contractId: contractIds[1],
    contractCurrencyCalculationOutput: bigQueryOutput2.contractCurrencyCalculationOutput,
    territory: bigQueryOutput2.territory,
    source: bigQueryOutput2.source,
    subSource: bigQueryOutput2.subSource,
    catalogueCatNo: bigQueryOutput2.catalogueCatNo,
    catalogueReleaseTitle: bigQueryOutput2.catalogueReleaseTitle,
    units: bigQueryOutput2.units,
    catalogueIsrc: bigQueryOutput2.catalogueIsrc,
    catalogueTrackTitle: bigQueryOutput2.catalogueTrackTitle,
    contractCurrencyCalculationInput: bigQueryOutput2.contractCurrencyCalculationInput,
    contractCurrencyProRataAmount: bigQueryOutput2.contractCurrencyProRataAmount,
    calculationInput: bigQueryOutput2.calculationInput,
    workId: bigQueryOutput2.workId,
    catalogueIdentifier: bigQueryOutput2.catalogueIdentifier,
    catalogueWorkTitle: bigQueryOutput2.catalogueWorkTitle,
    configuration: bigQueryOutput2.configuration,
    distributionChannel: bigQueryOutput2.distributionChannel,
    contractCurrencyDeduction: bigQueryOutput2.contractCurrencyDeduction,
    catType: 'Release',
  };

  const bigQueryTrack1 = {
    periodId: periodIds[0],
    contractId: contractIds[0],
    contractCurrencyCalculationOutput: bigQueryOutput1.contractCurrencyCalculationOutput,
    territory: bigQueryOutput1.territory,
    source: bigQueryOutput1.source,
    subSource: bigQueryOutput1.subSource,
    catalogueCatNo: bigQueryOutput1.catalogueCatNo,
    catalogueReleaseTitle: bigQueryOutput1.catalogueReleaseTitle,
    units: bigQueryOutput1.units,
    catalogueIsrc: bigQueryOutput1.catalogueIsrc,
    catalogueTrackTitle: bigQueryOutput1.catalogueTrackTitle,
    contractCurrencyCalculationInput: bigQueryOutput1.contractCurrencyCalculationInput,
    contractCurrencyProRataAmount: bigQueryOutput1.contractCurrencyProRataAmount,
    calculationInput: bigQueryOutput1.calculationInput,
    workId: bigQueryOutput1.workId,
    catalogueIdentifier: bigQueryOutput1.catalogueIdentifier,
    catalogueWorkTitle: bigQueryOutput1.catalogueWorkTitle,
    configuration: bigQueryOutput1.configuration,
    distributionChannel: bigQueryOutput1.distributionChannel,
    contractCurrencyDeduction: bigQueryOutput1.contractCurrencyDeduction,
    catType: 'Track',
  };
  const bigQueryTrack2 = {
    periodId: periodIds[1],
    contractId: contractIds[1],
    contractCurrencyCalculationOutput: bigQueryOutput2.contractCurrencyCalculationOutput,
    territory: bigQueryOutput2.territory,
    source: bigQueryOutput2.source,
    subSource: bigQueryOutput2.subSource,
    catalogueCatNo: bigQueryOutput2.catalogueCatNo,
    catalogueReleaseTitle: bigQueryOutput2.catalogueReleaseTitle,
    units: bigQueryOutput2.units,
    catalogueIsrc: bigQueryOutput2.catalogueIsrc,
    catalogueTrackTitle: bigQueryOutput2.catalogueTrackTitle,
    contractCurrencyCalculationInput: bigQueryOutput2.contractCurrencyCalculationInput,
    contractCurrencyProRataAmount: bigQueryOutput2.contractCurrencyProRataAmount,
    calculationInput: bigQueryOutput2.calculationInput,
    workId: bigQueryOutput2.workId,
    catalogueIdentifier: bigQueryOutput2.catalogueIdentifier,
    catalogueWorkTitle: bigQueryOutput2.catalogueWorkTitle,
    configuration: bigQueryOutput2.configuration,
    distributionChannel: bigQueryOutput2.distributionChannel,
    contractCurrencyDeduction: bigQueryOutput2.contractCurrencyDeduction,
    catType: 'Track',
  };

  const bigQueryWork1 = {
    periodId: periodIds[0],
    contractId: contractIds[0],
    contractCurrencyCalculationOutput: bigQueryOutput1.contractCurrencyCalculationOutput,
    territory: bigQueryOutput1.territory,
    source: bigQueryOutput1.source,
    subSource: bigQueryOutput1.subSource,
    catalogueCatNo: bigQueryOutput1.catalogueCatNo,
    catalogueReleaseTitle: bigQueryOutput1.catalogueReleaseTitle,
    units: bigQueryOutput1.units,
    catalogueIsrc: bigQueryOutput1.catalogueIsrc,
    catalogueTrackTitle: bigQueryOutput1.catalogueTrackTitle,
    contractCurrencyCalculationInput: bigQueryOutput1.contractCurrencyCalculationInput,
    contractCurrencyProRataAmount: bigQueryOutput1.contractCurrencyProRataAmount,
    calculationInput: bigQueryOutput1.calculationInput,
    workId: bigQueryOutput1.workId,
    catalogueIdentifier: bigQueryOutput1.catalogueIdentifier,
    catalogueWorkTitle: bigQueryOutput1.catalogueWorkTitle,
    configuration: bigQueryOutput1.configuration,
    distributionChannel: bigQueryOutput1.distributionChannel,
    contractCurrencyDeduction: bigQueryOutput1.contractCurrencyDeduction,
    catType: 'Work',
  };
  const bigQueryWork2 = {
    periodId: periodIds[1],
    contractId: contractIds[1],
    contractCurrencyCalculationOutput: bigQueryOutput2.contractCurrencyCalculationOutput,
    territory: bigQueryOutput2.territory,
    source: bigQueryOutput2.source,
    subSource: bigQueryOutput2.subSource,
    catalogueCatNo: bigQueryOutput2.catalogueCatNo,
    catalogueReleaseTitle: bigQueryOutput2.catalogueReleaseTitle,
    units: bigQueryOutput2.units,
    catalogueIsrc: bigQueryOutput2.catalogueIsrc,
    catalogueTrackTitle: bigQueryOutput2.catalogueTrackTitle,
    contractCurrencyCalculationInput: bigQueryOutput2.contractCurrencyCalculationInput,
    contractCurrencyProRataAmount: bigQueryOutput2.contractCurrencyProRataAmount,
    calculationInput: bigQueryOutput2.calculationInput,
    workId: bigQueryOutput2.workId,
    catalogueIdentifier: bigQueryOutput2.catalogueIdentifier,
    catalogueWorkTitle: bigQueryOutput2.catalogueWorkTitle,
    configuration: bigQueryOutput2.configuration,
    distributionChannel: bigQueryOutput2.distributionChannel,
    contractCurrencyDeduction: bigQueryOutput2.contractCurrencyDeduction,
    catType: 'Work',
  };

  let event;

  let clientId;
  before(async () => {
    clientId = testUtils.randomId();

    event = {
      clientId,
      bigQuery,
      outputFilter: {},
      salesOutputFilter: {},
    };

    await bqTestUtils.init();
    bigQuery = await bqTestUtils.getBigQuery();
    event = {
      bigQuery,
      outputFilter: {},
      salesOutputFilter: {},
    };

    testUtils.cleanUpAsync(clientId);
  });

  beforeEach(async () => {
    await writeToDb([bigQueryCost1, bigQueryCost2], bigQuery.costsTable);
    await writeToDb([bigQueryOutput1, bigQueryOutput2, bigQueryTrack1, bigQueryTrack2, bigQueryRelease1, bigQueryRelease2, bigQueryWork1, bigQueryWork2], bigQuery.outputTable);
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
    StatementAnalysisFigures(event, (err, result) => {
      const territories = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          units: bigQueryOutput1.units * 4,
          gross: bigQueryOutput1.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput1.contractCurrencyCalculationOutput * 4,
          territory: bigQueryOutput1.territory,
          deduction: bigQueryOutput1.contractCurrencyDeduction * 4,
          lines: 4,
        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          units: bigQueryOutput2.units * 4,
          gross: bigQueryOutput2.calculationInput * 4,
          net: bigQueryOutput2.contractCurrencyCalculationOutput * 4,
          territory: bigQueryOutput2.territory,
          deduction: bigQueryOutput2.contractCurrencyDeduction * 4,
          lines: 4,
        },
      ];

      const distributionChannels = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          units: bigQueryOutput1.units * 4,
          gross: bigQueryOutput1.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput1.contractCurrencyCalculationOutput * 4,
          distributionChannel: bigQueryOutput1.distributionChannel,
          deduction: bigQueryOutput1.contractCurrencyDeduction * 4,
          lines: 4,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          units: bigQueryOutput2.units * 4,
          gross: bigQueryOutput2.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput2.contractCurrencyCalculationOutput * 4,
          distributionChannel: bigQueryOutput2.distributionChannel,
          deduction: bigQueryOutput2.contractCurrencyDeduction * 4,
          lines: 4,
        },
      ];

      const configurations = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          units: bigQueryOutput1.units * 4,
          gross: bigQueryOutput1.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput1.contractCurrencyCalculationOutput * 4,
          configuration: bigQueryOutput1.configuration,
          deduction: bigQueryOutput1.contractCurrencyDeduction * 4,
          lines: 4,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          units: bigQueryOutput2.units * 4,
          gross: bigQueryOutput2.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput2.contractCurrencyCalculationOutput * 4,
          configuration: bigQueryOutput2.configuration,
          deduction: bigQueryOutput2.contractCurrencyDeduction * 4,
          lines: 4,
        },
      ];

      const sources = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          units: bigQueryOutput1.units * 4,
          gross: bigQueryOutput1.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput1.contractCurrencyCalculationOutput * 4,
          source: bigQueryOutput1.source,
          deduction: bigQueryOutput1.contractCurrencyDeduction * 4,
          lines: 4,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          units: bigQueryOutput2.units * 4,
          gross: bigQueryOutput2.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput2.contractCurrencyCalculationOutput * 4,
          source: bigQueryOutput2.source,
          deduction: bigQueryOutput2.contractCurrencyDeduction * 4,
          lines: 4,
        },
      ];

      const subSources = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          units: bigQueryOutput1.units * 4,
          gross: bigQueryOutput1.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput1.contractCurrencyCalculationOutput * 4,
          subSource: bigQueryOutput1.subSource,
          deduction: bigQueryOutput1.contractCurrencyDeduction * 4,
          lines: 4,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          units: bigQueryOutput2.units * 4,
          gross: bigQueryOutput2.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput2.contractCurrencyCalculationOutput * 4,
          subSource: bigQueryOutput2.subSource,
          deduction: bigQueryOutput2.contractCurrencyDeduction * 4,
          lines: 4,
        },
      ];

      const releases = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          catalogueCatNo: bigQueryOutput1.catalogueCatNo,
          catalogueReleaseTitle: bigQueryOutput1.catalogueReleaseTitle,
          units: bigQueryOutput1.units,
          gross: bigQueryOutput1.contractCurrencyCalculationInput,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount,
          net: bigQueryOutput1.contractCurrencyCalculationOutput,
          deduction: bigQueryOutput1.contractCurrencyDeduction,
          lines: 1,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          catalogueCatNo: bigQueryOutput2.catalogueCatNo,
          catalogueReleaseTitle: bigQueryOutput2.catalogueReleaseTitle,
          units: bigQueryOutput2.units,
          gross: bigQueryOutput2.contractCurrencyCalculationInput,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount,
          net: bigQueryOutput2.contractCurrencyCalculationOutput,
          deduction: bigQueryOutput2.contractCurrencyDeduction,
          lines: 1,
        },
      ];

      const tracks = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          catalogueIsrc: bigQueryOutput1.catalogueIsrc,
          catalogueTrackTitle: bigQueryOutput1.catalogueTrackTitle,
          units: bigQueryOutput1.units,
          gross: bigQueryOutput1.contractCurrencyCalculationInput,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount,
          net: bigQueryOutput1.contractCurrencyCalculationOutput,
          deduction: bigQueryOutput1.contractCurrencyDeduction,
          lines: 1,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          catalogueIsrc: bigQueryOutput2.catalogueIsrc,
          catalogueTrackTitle: bigQueryOutput2.catalogueTrackTitle,
          units: bigQueryOutput2.units,
          gross: bigQueryOutput2.contractCurrencyCalculationInput,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount,
          net: bigQueryOutput2.contractCurrencyCalculationOutput,
          deduction: bigQueryOutput2.contractCurrencyDeduction,
          lines: 1,
        },
      ];

      const works = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          catalogueIdentifier: bigQueryOutput1.catalogueIdentifier,
          catalogueWorkTitle: bigQueryOutput1.catalogueWorkTitle,
          units: bigQueryOutput1.units,
          gross: bigQueryOutput1.contractCurrencyCalculationInput,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount,
          net: bigQueryOutput1.contractCurrencyCalculationOutput,
          deduction: bigQueryOutput1.contractCurrencyDeduction,
          workId: bigQueryOutput1.workId,
          lines: 1,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          catalogueIdentifier: bigQueryOutput2.catalogueIdentifier,
          catalogueWorkTitle: bigQueryOutput2.catalogueWorkTitle,
          units: bigQueryOutput2.units,
          gross: bigQueryOutput2.contractCurrencyCalculationInput,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount,
          net: bigQueryOutput2.contractCurrencyCalculationOutput,
          deduction: bigQueryOutput2.contractCurrencyDeduction,
          workId: bigQueryOutput2.workId,
          lines: 1,
        },
      ];

      const configChannels = [
        {
          periodId: bigQueryOutput1.periodId,
          contractId: bigQueryOutput1.contractId,
          configuration: bigQueryOutput1.configuration,
          distributionChannel: bigQueryOutput1.distributionChannel,
          units: bigQueryOutput1.units * 4,
          gross: bigQueryOutput1.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput1.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput1.contractCurrencyCalculationOutput * 4,
          deduction: bigQueryOutput1.contractCurrencyDeduction * 4,
          lines: 4,

        },
        {
          periodId: bigQueryOutput2.periodId,
          contractId: bigQueryOutput2.contractId,
          configuration: bigQueryOutput2.configuration,
          distributionChannel: bigQueryOutput2.distributionChannel,
          units: bigQueryOutput2.units * 4,
          gross: bigQueryOutput2.contractCurrencyCalculationInput * 4,
          proRataGrossAmount: bigQueryOutput2.contractCurrencyProRataAmount * 4,
          net: bigQueryOutput2.contractCurrencyCalculationOutput * 4,
          deduction: bigQueryOutput2.contractCurrencyDeduction * 4,
          lines: 4,
        },
      ];

      // configurationChannels
      const distributionChannelsNet = [{
        type: distributionChannels[0].distributionChannel,
        units: distributionChannels[0].units,
        value: distributionChannels[0].net,
        deduction: distributionChannels[0].deduction,
      }];
      const distributionChannelsGross = [{
        type: distributionChannels[0].distributionChannel,
        units: distributionChannels[0].units,
        value: distributionChannels[0].gross,
        proRataGrossAmount: distributionChannels[0].proRataGrossAmount,
        deduction: distributionChannels[0].deduction,
      }];

      expect(result[bigQueryOutput1.contractId].gross.distributionChannels).to.deep.eq(distributionChannelsGross);
      expect(result[bigQueryOutput1.contractId].net.distributionChannels).to.deep.eq(distributionChannelsNet);

      // configurations
      const configurationsNet = [{
        type: configurations[0].configuration,
        units: configurations[0].units,
        value: configurations[0].net,
        deduction: configurations[0].deduction,
      }];
      const configurationsGross = [{
        type: configurations[0].configuration,
        units: configurations[0].units,
        value: configurations[0].gross,
        deduction: configurations[0].deduction,
        proRataGrossAmount: distributionChannels[0].proRataGrossAmount,
      }];
      expect(result[bigQueryOutput1.contractId].gross.configurations).to.deep.eq(configurationsGross);
      expect(result[bigQueryOutput1.contractId].net.configurations).to.deep.eq(configurationsNet);

      // territories
      const territoriesNet = [{
        type: territories[0].territory,
        units: territories[0].units,
        value: territories[0].net,
        deduction: territories[0].deduction,
      }];
      const territoriesGross = [{
        type: territories[0].territory,
        units: territories[0].units,
        value: territories[0].gross,
        deduction: territories[0].deduction,
        proRataGrossAmount: territories[0].proRataGrossAmount,
      }];

      expect(result[bigQueryOutput1.contractId].gross.territories).to.deep.eq(territoriesGross);
      expect(result[bigQueryOutput1.contractId].net.territories).to.deep.eq(territoriesNet);

      // sources
      const sourcesNet = [{
        type: sources[0].source,
        units: sources[0].units,
        value: sources[0].net,
        deduction: sources[0].deduction,
      }];
      const sourcesGross = [{
        type: sources[0].source,
        units: sources[0].units,
        value: sources[0].gross,
        deduction: sources[0].deduction,
        proRataGrossAmount: sources[0].proRataGrossAmount,
      }];
      expect(result[bigQueryOutput1.contractId].gross.sources).to.deep.eq(sourcesGross);
      expect(result[bigQueryOutput1.contractId].net.sources).to.deep.eq(sourcesNet);

      // subSources
      const subSourcesNet = [{
        type: subSources[0].subSource,
        units: subSources[0].units,
        value: subSources[0].net,
        deduction: subSources[0].deduction,
      }];
      const subSourcesGross = [{
        type: subSources[0].subSource,
        units: subSources[0].units,
        value: subSources[0].gross,
        deduction: subSources[0].deduction,
        proRataGrossAmount: subSources[0].proRataGrossAmount,
      }];
      expect(result[bigQueryOutput1.contractId].gross.subSources).to.deep.eq(subSourcesGross);
      expect(result[bigQueryOutput1.contractId].net.subSources).to.deep.eq(subSourcesNet);

      // configChannels
      const configChannelsNet = [{
        distributionChannel: configChannels[0].distributionChannel,
        configuration: configChannels[0].configuration,
        units: configChannels[0].units,
        value: configChannels[0].net,
        deduction: configChannels[0].deduction,
      }];
      const configChannelsGross = [{
        distributionChannel: configChannels[0].distributionChannel,
        configuration: configChannels[0].configuration,
        units: configChannels[0].units,
        value: configChannels[0].gross,
        deduction: configChannels[0].deduction,
        proRataGrossAmount: configChannels[0].proRataGrossAmount,
      }];
      expect(result[bigQueryOutput1.contractId].gross.configurationByDistributionChannel).to.deep.eq(configChannelsGross);
      expect(result[bigQueryOutput1.contractId].net.configurationByDistributionChannel).to.deep.eq(configChannelsNet);

      // releases
      const releasesNet = [{
        type: releases[0].catalogueCatNo,
        title: releases[0].catalogueReleaseTitle,
        units: releases[0].units,
        value: releases[0].net,
        deduction: releases[0].deduction,
      }];
      const releasesGross = [{
        type: releases[0].catalogueCatNo,
        title: releases[0].catalogueReleaseTitle,
        units: releases[0].units,
        value: releases[0].gross,
        deduction: releases[0].deduction,
        proRataGrossAmount: releases[0].proRataGrossAmount,
      }];

      expect(result[bigQueryOutput1.contractId].gross.releases).to.deep.eq(releasesGross);
      expect(result[bigQueryOutput1.contractId].net.releases).to.deep.eq(releasesNet);

      // tracks
      const tracksNet = [{
        type: tracks[0].catalogueIsrc,
        title: tracks[0].catalogueTrackTitle,
        units: tracks[0].units,
        value: tracks[0].net,
        deduction: tracks[0].deduction,
      }];
      const tracksGross = [{
        type: tracks[0].catalogueIsrc,
        title: tracks[0].catalogueTrackTitle,
        units: tracks[0].units,
        value: tracks[0].gross,
        deduction: tracks[0].deduction,
        proRataGrossAmount: tracks[0].proRataGrossAmount,
      }];
      expect(result[bigQueryOutput1.contractId].gross.tracks).to.deep.eq(tracksGross);
      expect(result[bigQueryOutput1.contractId].net.tracks).to.deep.eq(tracksNet);

      // works
      const worksNet = [{
        type: works[0].catalogueIdentifier,
        title: works[0].catalogueWorkTitle,
        units: works[0].units,
        value: works[0].net,
        deduction: works[0].deduction,
      }];
      const worksGross = [{
        type: works[0].catalogueIdentifier,
        title: works[0].catalogueWorkTitle,
        units: works[0].units,
        value: works[0].gross,
        deduction: works[0].deduction,
        proRataGrossAmount: works[0].proRataGrossAmount,
      }];

      expect(result[bigQueryOutput1.contractId].gross.works).to.deep.eq(worksGross);
      expect(result[bigQueryOutput1.contractId].net.works).to.deep.eq(worksNet);

      // costs
      const costsNet = [{
        type: bigQueryCost1.type,
        value: bigQueryCost1.contractCurrencyCalculationOutput,
      }];
      const costsGross = [{
        type: bigQueryCost1.type,
        value: bigQueryCost1.contractCurrencyAmount,
      }];

      expect(result[bigQueryOutput1.contractId].gross.costs).to.deep.eq(costsGross);
      expect(result[bigQueryOutput1.contractId].net.costs).to.deep.eq(costsNet);

      done(err);
    });
  });
});
