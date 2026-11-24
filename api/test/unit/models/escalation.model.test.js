process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const { randomId, randomDate, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Escalation = require('../../../models/escalation');

describe('Escalation', () => {
  logger.info('::::file:::: unit/models/escalation .....................');

  beforeEach(async () => {
    sinon.restore();
  });

  it('should return the document with all fields set against it', (done) => {
    const escalationFields = {
      clientId: randomId(),
      periodId: randomId(),
      contractId: randomId(),
      trackers: {},
      startDate: randomDate(),
      endDate: randomDate(),
      previousCalculationTrackers: {},
    };

    escalationFields.trackers[randomDate()] = {
      units: randomInt(),
      gross: randomInt(),
      net: randomInt(),
      startingUnits: randomInt(),
      startingGross: randomInt(),
      startingNet: randomInt(),
    };

    escalationFields.previousCalculationTrackers[randomDate()] = {
      units: randomInt(),
      gross: randomInt(),
      net: randomInt(),
      startingUnits: randomInt(),
      startingGross: randomInt(),
      startingNet: randomInt(),
    };

    const escalation = new Escalation(escalationFields);

    expect(escalation.clientId).to.eq(escalationFields.clientId);
    expect(escalation.periodId.toString()).to.eq(escalationFields.periodId);
    expect(escalation.contractId.toString()).to.deep.eq(escalationFields.contractId);
    expect(escalation.trackers).to.deep.eq(escalationFields.trackers);
    expect(escalation.startDate).to.deep.eq(new Date(escalationFields.startDate));
    expect(escalation.endDate).to.deep.eq(new Date(escalationFields.endDate));
    expect(escalation.previousCalculationTrackers).to.deep.eq(escalationFields.previousCalculationTrackers);

    done();
  });
});
