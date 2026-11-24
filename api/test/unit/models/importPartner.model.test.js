process.env.NODE_ENV = 'test';

const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomArray } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const sinon = require('sinon');

const ImportPartner = require('../../../models/importPartner');

describe('ImportPartner', () => {
  logger.info('>>>file>>>> unit/models/importPartner .....................');

  const importPartnerFields = {
    name: randomString(),
    clientId: randomId(),
    transferringSystem: randomString(),
    notes: randomString(),
    defaults: {
      territoryGroupId: randomString(),
      territories: randomArray(),
      claimingParty: {
        publisherId: randomString(),
        contractType: randomString(),
      },
      setMainIdentifier: false,
      setPublisherInterestedParty: false,
      setComposerInterestedParty: false,
      ingestionTerritory: randomString(),
      contracts: [],
      catalogueGroups: [],
    },
  };
  let importPartner;

  beforeEach(async () => {
    importPartner = new ImportPartner(importPartnerFields);

    sinon.stub(ImportPartner.prototype, 'save');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should include import partner fields', () => {
    const result = importPartner.toObject();
    expect(result).to.deep.include(importPartnerFields);
  });
});
