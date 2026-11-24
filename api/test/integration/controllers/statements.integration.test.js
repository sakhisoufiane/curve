/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { randomString, cleanUp } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Notification = require('../../../models/notification');
const Payee = require('../../../models/payee');
const Period = require('../../../models/period');
const Statement = require('../../../models/statement');
const User = require('../../../models/user');

const StatementController = require('../../../controllers/statement');

const { expect } = chai;
chai.use(chaiHttp);

let payee1; let payee2; let contract1; let contract2; let client; let user; let baseUser; let userFull;

// This test has been migrated to Jest and is being kept here for reference.
// It will be deleted at a later point.
describe.skip('StatementController', function () {
  logger.info('>>>file>>>> int/controllers/statements .....................');

  before(cleanUp);

  beforeEach(async () => {
    client = new Client({ name: randomString(), email: 'test@curve.com', primaryEmail: 'test@curve.com', createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();
    user = new User();
    await user.save();

    baseUser = { id: user._id, internal: false, parentId: null, clientId: client._id, email: 'test@curve.com', rights: {} };
    userFull = { ...baseUser, rights: { [client._id]: { periods: 'Edit' } } };

    payee1 = new Payee({ clientId: client._id, name: 'Payee 1' });
    await payee1.save();

    contract1 = new Contract({ clientId: client._id, payeeId: payee1._id.toString(), payees: [{ payeeId: payee1._id.toString(), percentage: 100 }], name: 'Contract 1' });
    await contract1.save();

    payee2 = new Payee({ clientId: client._id, name: 'Payee 2' });
    await payee2.save();

    contract2 = new Contract({ clientId: client._id, payeeId: payee2._id.toString(), payees: [{ payeeId: payee2._id.toString(), percentage: 100 }], name: 'Contract 2' });
    await contract2.save();
  });

  afterEach(cleanUp);

  const createPeriod = async (name) => {
    const period = new Period({ clientId: client._id, name, startDate: new Date(), endDate: new Date() });
    await period.save();
    return period;
  };

  const createStatements = async (periodId, contractId, count, status) => {
    const idsForProcessing = [];
    for (let i = 0; i < count; i++) {
      const statement = new Statement({
        clientId: client._id,
        name: `Statement ${i}`,
        contractId,
        analysis: 'analysis',
        periodId,
        status: status || 'Processing',
      });
      await statement.save();
      idsForProcessing.push(statement._id.toString());
    }

    return idsForProcessing;
  };

  const expectAllCalls = (spy, expectedValue) => {
    for (let i = 0; i < spy.callCount; i++) {
      expect(spy.getCall(i).args[0]).to.deep.eq(expectedValue);
    }
  };

  describe('setStatementStatus', () => {
    it('should only set selected statements status when period has under 1000 statements', async () => {
      // Add period with 10 statements for processing
      const period1 = await createPeriod('Period 1');
      const idsForProcessing = await createStatements(period1._id, contract1._id, 10);

      // Add period with 10 statements
      const period2 = await createPeriod('Period 2');
      await createStatements(period2._id, contract2._id, 10);

      await StatementController.setStatementStatus({ clientId: client._id, period2: period1, status: 'Published', ids: idsForProcessing });

      const countPeriod2Published = await Statement.countDocuments({ periodId: period1._id, status: 'Published' });
      expect(countPeriod2Published).to.eq(10);

      const countPeriod3Published = await Statement.countDocuments({ periodId: period2._id, status: 'Published' });
      expect(countPeriod3Published).to.eq(0);
    });

    it('should only set selected statements status when period has over 1000 statements', async () => {
      // Add period with 1100 statements for processing
      const period1 = await createPeriod('Period 1');
      const idsForProcessing = await createStatements(period1._id, contract1._id, 1100);

      // Add period with 10 statements
      const period2 = await createPeriod('Period 2');
      await createStatements(period2._id, contract2._id, 10);

      await StatementController.setStatementStatus({ clientId: client._id, period2: period1, status: 'Published', ids: idsForProcessing });

      const countPeriod2Published = await Statement.countDocuments({ periodId: period1._id, status: 'Published' });
      expect(countPeriod2Published).to.eq(1100);

      const countPeriod3Published = await Statement.countDocuments({ periodId: period2._id, status: 'Published' });
      expect(countPeriod3Published).to.eq(0);
    });
  });

  describe('sendStatements', () => {
    beforeEach(() => {
      sinon.spy(Notification, 'generate');
      sinon.spy(Contract, 'findById');
      sinon.spy(Payee, 'find');
      sinon.spy(User, 'find');
    });

    afterEach(() => sinon.restore());

    it('should only send selected statements when period has under 1000 statements', async () => {
      // Add period with 10 statements for processing
      const period1 = await createPeriod('Period 1');
      const idsForProcessing = await createStatements(period1._id, contract1._id, 5, 'Published');

      // Add period with 10 statements
      const period2 = await createPeriod('Period 2');
      await createStatements(period2._id, contract2._id, 10, 'Published');

      await StatementController.sendStatements({ period: period1, curveUser: userFull, ids: idsForProcessing, sendAll: false, statementsFilter: { periodId: period1._id } });

      expect(Notification.generate.calledOnce).to.be.true;
      expect(Notification.generate.getCall(0).args[0]).to.contain(`${client.name}: ${period1.name} Period, statements have been sent`);
      expect(Notification.generate.getCall(0).args[4].mainText).to.contain('5 Statements');

      expect(Contract.findById.callCount).to.eq(5);
      expectAllCalls(Contract.findById, contract1._id.toString());

      expect(Payee.find.callCount).to.eq(5);
      expectAllCalls(Payee.find, { clientId: client._id.toString(), _id: { $in: [payee1._id.toString()] } });

      expect(User.find.callCount).to.eq(5);
      expectAllCalls(User.find, { payeeIds: { $in: [payee1._id.toString()] } });
    });

    it('should only send selected statements when period has over 1000 statements', async () => {
      // Add period with 1100 statements for processing
      const period1 = await createPeriod('Period 1');
      const idsForProcessing = await createStatements(period1._id, contract1._id, 1100, 'Published');

      // Add period with 10 statements
      const period2 = await createPeriod('Period 2');
      await createStatements(period2._id, contract2._id, 10, 'Published');

      await StatementController.sendStatements({ period: period1, curveUser: userFull, ids: idsForProcessing, sendAll: false, statementsFilter: { periodId: period1._id } });

      expect(Notification.generate.calledOnce).to.be.true;
      expect(Notification.generate.getCall(0).args[0]).to.contain(`${client.name}: ${period1.name} Period, statements have been sent`);
      expect(Notification.generate.getCall(0).args[4].mainText).to.contain('1100 Statements');

      expect(Contract.findById.callCount).to.eq(1100);
      expectAllCalls(Contract.findById, contract1._id.toString());

      expect(Payee.find.callCount).to.eq(1100);
      expectAllCalls(Payee.find, { clientId: client._id.toString(), _id: { $in: [payee1._id.toString()] } });

      expect(User.find.callCount).to.eq(1100);
      expectAllCalls(User.find, { payeeIds: { $in: [payee1._id.toString()] } });
    });
  });
});
