process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger, testUtils, fileManager, createZip } = require('@curveroyaltysystems/platform-shared-utils');

const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');

const { describe } = require('mocha');

const Composer = require('../../../models/composer');
const User = require('../../../models/user');
const Client = require('../../../models/client');
const Notification = require('../../../models/notification');

const { expect } = chai;
chai.use(chaiHttp);
chai.use(require('sinon-chai'));

async function createComposers(client, count) {
  const composers = Array.from({ length: count }, (_, i) => new Composer({
    clientId: client._id,
    name: `TEST COMPOSER ${i + 1}`,
    linkedContracts: [{ contractId: testUtils.randomId() }],
    societies: [{ society: 'PRS', identifier: 'PRS12345' }],
    publisherAgreements: [{ publisherId: testUtils.randomId(), agreementType: 'Exclusive', territory: 'World' }],
  }));

  await Composer.insertMany(composers);
}

describe('Integration tests for Composer Export ', async () => {
  logger.info('>>>file>>>> int/routes/composers .....................');
  let client; let user; let uploadStub; let createZipSpy;
  beforeEach(async function () {
    await testUtils.cleanUp();
    client = await new Client({ name: 'AttiTest', createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();
    user = await new User({ email: 'attilioandream@gmail.com',
      lockedForNonPayment: false,
      clientId: client._id.toString(),
      type: 'client',
      adminType: 'Standard',
      iat: 1741779113,
      exp: 1741865513,
    });
    await user.save();
    // Stubs for uploads to S3 and Spies
    sinon.stub(Notification, 'generate').yields();
    sinon.stub(fileManager, 'publicLink24Hours').yields();
    uploadStub = sinon.stub(fileManager, 'uploadToS3');
    createZipSpy = sinon.spy(createZip, 'localFiles');

    uploadStub.yields();
  });
  afterEach(async () => {
    await testUtils.cleanUp();
    sinon.restore();
  });

  describe('When exporting composers', () => {
    it('Should export a .xlsx file when composers < 1000', async function () {
      user.rights = {
        [client._id]: {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        },
      };
      await user.save();

      const filter = { clientId: client._id };
      const clientType = 'Publisher';
      await createComposers(client, 10);

      Composer.sendExport(filter, clientType, user);

      await new Promise((resolve) => { setTimeout(resolve, 10000); });

      expect(Notification.generate.called).to.be.true;
      expect(uploadStub.calledOnce).to.be.true;
      expect(uploadStub.args[0][0]).to.include('.xlsx');
    });
    it('Should export a .csv file when composers > 999', async function () {
      user.rights = {
        [client._id]: {
          catalogue: 'Edit',
          contracts: 'Edit',
          sales: 'Edit',
          periods: 'Edit',
        },
      };
      await user.save();

      const filter = { clientId: client._id };
      const clientType = 'Publisher';
      await createComposers(client, 1001);

      Composer.sendExport(filter, clientType, user);

      // Wait for 4 seconds before checking
      await new Promise((resolve) => { setTimeout(resolve, 10000); });

      expect(Notification.generate.called).to.be.true;
      expect(uploadStub.calledOnce).to.be.true;
      expect(createZipSpy.args[0][0][0]).to.include('.csv');
      expect(createZipSpy.args[0][0][1]).to.include('.csv');
      expect(createZipSpy.args[0][0][2]).to.include('.csv');
      expect(uploadStub.args[0][0]).to.include('.zip');
    });
  });
});
