process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const AppSettings = require('../../../models/appSettings');

describe('AppSettings', () => {
  logger.info('>>>file>>>> unit/models/AppSettings .....................');

  let appSettings;
  const appSettingsFields = {
    overrideAlwaysRunFull: testUtils.randomBoolean(),
    features: {
      payments: testUtils.randomBoolean(),
      demo: testUtils.randomBoolean(),
    },
    state: {
      maintenance: testUtils.randomBoolean(),
      deployment: testUtils.randomBoolean(),
      scaleDown: testUtils.randomBoolean(),
    },
    fuga: {
      periodBlockedEmails: [testUtils.randomString(), testUtils.randomString()],
    },
  };

  beforeEach(() => {
    appSettings = new AppSettings(appSettingsFields);
  });

  it('should include all fields', () => {
    expect(appSettings.overrideAlwaysRunFull).to.eql(appSettingsFields.overrideAlwaysRunFull);
    expect(appSettings.toObject().features).to.deep.eq(appSettingsFields.features);
    expect(appSettings.toObject().state).to.deep.eq(appSettingsFields.state);
    expect(appSettings.toObject().fuga).to.deep.eq(appSettingsFields.fuga);
  });
});
