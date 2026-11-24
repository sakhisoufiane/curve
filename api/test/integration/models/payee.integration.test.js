process.env.NODE_ENV = 'test';
require('../../../models/db');

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const { promisify } = require('util');

const { randomString, cleanUp, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Client = require('../../../models/client');
const Payee = require('../../../models/payee');
const Notification = require('../../../models/notification');

describe('import', () => {
  describe('Create payees', () => {
    let client; let curveUser; let notificationGenerateStub;

    beforeEach(async () => {
      client = await new Client({
        _id: randomId(),
        name: randomString(),
        issueIdentifier: false,
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      }).save();

      curveUser = { clientId: client._id.toString() };

      notificationGenerateStub = sinon.stub(Notification, 'generate').callsFake((title, message, type, user, options, callback) => {
        // Call the callback with null for error and a mock result
        callback(null, {});
      });
    });

    it('should create the payees defined in the file', async () => {
      const file = {
        originalname: 'payee-integration-test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: path.join(__dirname, '../../test-data/payee/payee-integration-test.xlsx'),
      };
      await promisify(Payee.importFromExcel)(file, curveUser, false);

      const results = await Payee.find({ clientId: client._id.toString() }).sort({ name: 1 });
      expect(results.length).to.eq(2);
      const [result1, result2] = results;
      expect(result1.name).to.eq('payee1');
      expect(result2.name).to.eq('payee2');
    });

    it('should send an email with the correct content', async () => {
      const file = {
        originalname: 'payee-integration-test.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: path.join(__dirname, '../../test-data/payee/payee-integration-test.xlsx'),
      };
      await promisify(Payee.importFromExcel)(file, curveUser, false);

      expect(notificationGenerateStub.calledOnce).to.be.true;
      const [name, description, link, user, options] = notificationGenerateStub.getCall(0).args;
      expect(name).to.eq('Your Payee Import Has Completed');
      expect(description).to.eq('2 Payees imported in file payee-integration-test.xlsx');
      expect(options.identifier).to.eq('importComplete');
      expect(options.subject).to.eq('Your Payee Import Has Completed');
    });

    it('should it error when there are duplicate names within the file', async () => {
      const file = {
        originalname: 'payee-integration-test-duplicates.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        path: path.join(__dirname, '../../test-data/payee/payee-integration-test-duplicates.xlsx'),
      };
      await promisify(Payee.importFromExcel)(file, curveUser, false);
      const results = await Payee.find({ clientId: client._id.toString() });
      expect(results.length).to.eq(0);

      expect(notificationGenerateStub.calledOnce).to.be.true;
      const [name, description, link, user, options] = notificationGenerateStub.getCall(0).args;
      expect(name).to.eq('Your Payee Import Has Errored');
      expect(description).to.eq('1 errors in file payee-integration-test-duplicates.xlsx');
      expect(options.identifier).to.eq('importError');
      expect(options.subject).to.eq('Your Payee Import Has Errored');
      expect(options.error[0]).to.eq('Duplicate name: payee1 - lines: 3,6,9');
    });
  });

  afterEach((done) => {
    sinon.restore();
    cleanUp(done);
  });
});
