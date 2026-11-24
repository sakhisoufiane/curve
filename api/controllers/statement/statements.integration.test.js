/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */

const { randomString, cleanUpAsync } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Notification = require('../../models/notification');
const Payee = require('../../models/payee');
const Period = require('../../models/period');
const Statement = require('../../models/statement');
const User = require('../../models/user');

const StatementController = require('./statement');

// TODO(jest-migration): original file had `before(cleanUp)` as a pre-suite DB safety clean.
// There is no clientId available at that point, so it has been omitted.
// If stale data causes flakes, add a global Jest setup to handle it.

let payee1; let payee2; let contract1; let contract2; let client; let user; let baseUser; let userFull;

describe('StatementController', () => {
  beforeEach(async () => {
    client = new Client({ name: randomString(), email: 'test@curve.com', primaryEmail: 'test@curve.com', createdBigQueryTables: true, createdBigQueryBackups: true });
    await client.save();
    user = new User({ email: `${randomString()}@curve.com` });
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

  afterEach(async () => {
    await cleanUpAsync(client._id.toString());
  });

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
    for (let i = 0; i < spy.mock.calls.length; i++) {
      expect(spy.mock.calls[i][0]).toEqual(expectedValue);
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
      expect(countPeriod2Published).toBe(10);

      const countPeriod3Published = await Statement.countDocuments({ periodId: period2._id, status: 'Published' });
      expect(countPeriod3Published).toBe(0);
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
      expect(countPeriod2Published).toBe(1100);

      const countPeriod3Published = await Statement.countDocuments({ periodId: period2._id, status: 'Published' });
      expect(countPeriod3Published).toBe(0);
    });
  });

  describe('sendStatements', () => {
    let mockNotificationGenerate;
    let mockContractFindById;
    let mockPayeeFind;
    let mockUserFind;

    beforeEach(() => {
      mockNotificationGenerate = jest.spyOn(Notification, 'generate');
      mockContractFindById = jest.spyOn(Contract, 'findById');
      mockPayeeFind = jest.spyOn(Payee, 'find');
      mockUserFind = jest.spyOn(User, 'find');
    });

    afterEach(() => jest.restoreAllMocks());

    it('should only send selected statements when period has under 1000 statements', async () => {
      // Add period with 10 statements for processing
      const period1 = await createPeriod('Period 1');
      const idsForProcessing = await createStatements(period1._id, contract1._id, 5, 'Published');

      // Add period with 10 statements
      const period2 = await createPeriod('Period 2');
      await createStatements(period2._id, contract2._id, 10, 'Published');

      await StatementController.sendStatements({ period: period1, curveUser: userFull, ids: idsForProcessing, sendAll: false, statementsFilter: { periodId: period1._id } });

      expect(mockNotificationGenerate).toHaveBeenCalledTimes(1);
      expect(mockNotificationGenerate.mock.calls[0][0]).toContain(`${client.name}: ${period1.name} Period, statements have been sent`);
      expect(mockNotificationGenerate.mock.calls[0][4].mainText).toContain('5 Statements');

      expect(mockContractFindById).toHaveBeenCalledTimes(5);
      expectAllCalls(mockContractFindById, contract1._id.toString());

      expect(mockPayeeFind).toHaveBeenCalledTimes(5);
      expectAllCalls(mockPayeeFind, { clientId: client._id.toString(), _id: { $in: [payee1._id.toString()] } });

      expect(mockUserFind).toHaveBeenCalledTimes(5);
      expectAllCalls(mockUserFind, { payeeIds: { $in: [payee1._id.toString()] } });
    });

    it('should only send selected statements when period has over 1000 statements', async () => {
      // Add period with 1100 statements for processing
      const period1 = await createPeriod('Period 1');
      const idsForProcessing = await createStatements(period1._id, contract1._id, 1100, 'Published');

      // Add period with 10 statements
      const period2 = await createPeriod('Period 2');
      await createStatements(period2._id, contract2._id, 10, 'Published');

      await StatementController.sendStatements({ period: period1, curveUser: userFull, ids: idsForProcessing, sendAll: false, statementsFilter: { periodId: period1._id } });

      expect(mockNotificationGenerate).toHaveBeenCalledTimes(1);
      expect(mockNotificationGenerate.mock.calls[0][0]).toContain(`${client.name}: ${period1.name} Period, statements have been sent`);
      expect(mockNotificationGenerate.mock.calls[0][4].mainText).toContain('1100 Statements');

      expect(mockContractFindById).toHaveBeenCalledTimes(1100);
      expectAllCalls(mockContractFindById, contract1._id.toString());

      expect(mockPayeeFind).toHaveBeenCalledTimes(1100);
      expectAllCalls(mockPayeeFind, { clientId: client._id.toString(), _id: { $in: [payee1._id.toString()] } });

      expect(mockUserFind).toHaveBeenCalledTimes(1100);
      expectAllCalls(mockUserFind, { payeeIds: { $in: [payee1._id.toString()] } });
    });
  });
});
