process.env.NODE_ENV = 'test';

const sinon = require('sinon');
const { expect } = require('chai');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const AppSettings = require('../../../../../../models/appSettings');

const { addAppleSalesAltCalculationMonth } = require('../../../../../../libs/support/supportScripts/suite/addAppleSalesAltCalculationMonth');

describe('addAppleSalesAltCalculationMonth', () => {
  logger.debug('\n\n**** .test/unit/libs/support/supportScripts/addAppleSalesAltCalculationMonth.unit.test');

  const monthAndYear = '082024';
  let appSettingsSaveStub;

  beforeEach(() => {
    appSettingsSaveStub = sinon.stub().resolves();
    sinon.stub(AppSettings, 'findOne').resolves({ save: appSettingsSaveStub, appleSalesAltCalculationMonths: [] });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should add month and year to apple alternate calculation months', (done) => {
    addAppleSalesAltCalculationMonth(monthAndYear, (err) => {
      expect(err).to.be.undefined;
      expect(appSettingsSaveStub.calledOnce).to.be.true;
      done();
    });
  });

  it('should retun error on app settings error', () => {
    const errorMessage = randomString();
    AppSettings.findOne.rejects(errorMessage);

    addAppleSalesAltCalculationMonth(monthAndYear, (err) => {
      expect(err).to.equal(errorMessage);
      expect(appSettingsSaveStub.calledOnce).to.be.false;
    });
  });

  it('should retun error if no app settings found', (done) => {
    AppSettings.findOne.resolves(null);

    addAppleSalesAltCalculationMonth(monthAndYear, (err) => {
      expect(err).to.eq('No app settings found');
      expect(appSettingsSaveStub.calledOnce).to.be.false;
      done();
    });
  });
});
