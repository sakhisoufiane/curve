const moment = require('moment');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate, randomError } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { FORBIDDEN_ERROR, INTERNAL_ERROR } = require('../constants');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: (...args) => mockCSVRawExport(...args),
}));

const User = require('../../models/user');
const config = require('../../config.json');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const Period = require('../../models/period');
const Contract = require('../../models/contract');
const Statement = require('../../models/statement');
const SalesFile = require('../../models/salesFile');
const SalesGroup = require('../../models/salesGroup');
const Task = require('../../models/task');

const server = supertest(require('../../index'));

describe('/periods', () => {
  logger.info('>>>file>>>> routes/periods/periods.integration.test .....................');

  // stop logger from logging each api request
  logger.info = jest.fn();
  logger.error = jest.fn();

  const applicationToken = config.applicationTokens[0];
  const unknownObjectId = randomId();

  let client; let user; let contract; let statement; let period; let period2; let payee;
  let salesGroupIncluded1; let salesGroupIncluded2; let salesGroupIncluded3; let salesGroupExcluded1; let salesGroupExcluded2;
  let clientUserFull; let clientUserEdit; let clientUserView; let clientUserNone; let internalClientUser; let internalUser; let parentUser; let payeeUser;

  beforeEach(async () => {
    client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ email: randomString() });
    await user.save();

    payee = new Payee({
      clientId: client._id,
      name: randomString(),
    });
    await payee.save();

    // Create contract for the Payee
    contract = new Contract({
      clientId: client._id,
      payees: [{ payeeId: payee._id, percentage: 100 }],
      name: randomString(),
    });
    await contract.save();

    const baseUser = { id: user._id, email: 'test-upload@curve.com', internal: false, clientId: client._id, parentId: null, rights: {} };
    clientUserFull = jwt.sign({ ...baseUser, rights: { [client._id]: { admin: true, periods: 'Edit' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserEdit = jwt.sign({ ...baseUser, rights: { [client._id]: { periods: 'Edit' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserView = jwt.sign({ ...baseUser, rights: { [client._id]: { periods: 'View' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserNone = jwt.sign({ ...baseUser, rights: { [client._id]: { periods: 'None' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    internalClientUser = jwt.sign({ ...baseUser, internal: true, clientId: client._id.toString() }, process.env.jsonSecretToken, { expiresIn: 86400 });
    internalUser = jwt.sign({ ...baseUser, internal: true, clientId: null }, process.env.jsonSecretToken, { expiresIn: 86400 });
    parentUser = jwt.sign({ ...baseUser, clientId: null, parentId: randomId() }, process.env.jsonSecretToken, { expiresIn: 86400 });
    payeeUser = jwt.sign({ ...baseUser, clientId: null, payeeId: payee._id.toString(), contractIds: [contract._id.toString()] }, process.env.jsonSecretToken, { expiresIn: 86400 });

    salesGroupIncluded1 = new SalesGroup({
      clientId: client._id,
      name: randomString(),
      type: 'resolved',
    });
    await salesGroupIncluded1.save();

    salesGroupIncluded2 = new SalesGroup({
      clientId: client._id,
      name: randomString(),
      type: 'resolved',
    });
    await salesGroupIncluded2.save();

    salesGroupIncluded3 = new SalesGroup({
      clientId: client._id,
      name: randomString(),
      type: 'resolved',
    });
    await salesGroupIncluded3.save();

    salesGroupExcluded1 = new SalesGroup({
      clientId: client._id,
      name: randomString(),
      type: 'resolved',
    });
    await salesGroupExcluded1.save();

    salesGroupExcluded2 = new SalesGroup({
      clientId: client._id,
      name: randomString(),
      type: 'resolved',
    });
    await salesGroupExcluded2.save();

    period = new Period({
      clientId: client._id,
      name: randomString(),
      contractType: 'Standard',
      runNo: 0,
      locked: false,
      createdAt: randomDate(),
    });
    await period.save();

    period2 = new Period({
      clientId: client._id,
      name: randomString(),
      contractType: 'Standard',
      runNo: 0,
      locked: false,
      resolvedGroupIds: [salesGroupIncluded1._id.toString(), salesGroupIncluded2._id.toString(), salesGroupIncluded3._id.toString()],
      createdAt: randomDate(),
    });
    await period2.save();

    // Create statement for the Payee contract
    statement = new Statement({
      clientId: client._id,
      contractId: contract._id,
      periodId: period._id,
      name: randomString(),
      status: 'Published',
    });
    await statement.save();

    // Create statement for a different Payee (should be ignored in Payee queries)
    await new Statement({
      clientId: client._id,
      contractId: randomId(),
      periodId: period2._id,
      name: randomString(),
      status: 'Published',
    }).save();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await Client.findByIdAndDelete(client._id);
    await User.deleteMany({ clientId: client._id });
    await Payee.deleteMany({ clientId: client._id });
    await Contract.deleteMany({ clientId: client._id });
    await Period.deleteMany({ clientId: client._id });
    await Statement.deleteMany({ clientId: client._id });
    await SalesGroup.deleteMany({ clientId: client._id });
    await Task.deleteMany({ clientId: client._id });
  });

  describe('/ GET', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a list of periods', async () => {
          // Act
          const res = await server
            .get('/periods')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.periods)).toEqual(true);
          const periods = await Period.find({ clientId: client._id.toString() });
          expect(res.body.periods.length).toEqual(periods.length);
          expect(res.body.periods[0].updatedAt).toBeDefined();
        });

        it('should return metadata of periods index on / GET', async () => {
          // Act
          const res = await server
            .get('/periods')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(typeof res.body.meta).toEqual('object');
        });
        it('should return the first page if not passed a specific page', async () => {
          // Act
          const res = await server
            .get('/periods')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual(1);
        });
        it('should return the passed page when passed the parameter', async () => {
          // Act
          const res = await server
            .get('/periods?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual(3);
        });
        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get('/periods')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.totalPages).toEqual(1);
        });
        it('should set the amount to be returned per page when passed a limit option', async () => {
          // Act
          const res = await server
            .get('/periods?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.periods.length).toEqual(1);
          const count = await Period.countDocuments({ clientId: client._id.toString() });
          expect(res.body.meta.totalPages).toEqual(count);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a list of periods', async () => {
          // Act
          const res = await server
            .get('/periods')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.periods)).toEqual(true);
          const periods = await Period.find({ clientId: client._id.toString() });
          expect(res.body.periods.length).toEqual(periods.length);
        });
      });

      describe('as a user with View rights', () => {
        it('should return a list of periods', async () => {
          // Act
          const res = await server
            .get('/periods')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.periods)).toEqual(true);
          const periods = await Period.find({ clientId: client._id.toString() });
          expect(res.body.periods.length).toEqual(periods.length);
        });
      });

      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get('/periods')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a list of periods', async () => {
        // Act
        const res = await server
          .get('/periods')
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(Array.isArray(res.body.periods)).toEqual(true);
        const periods = await Period.find({ clientId: client._id.toString() });
        expect(res.body.periods.length).toEqual(periods.length);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a list of periods', async () => {
        // Act
        const res = await server
          .get('/periods')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(Array.isArray(res.body.periods)).toEqual(true);
        const periods = await Period.find({ clientId: client._id.toString() });
        expect(res.body.periods.length).toEqual(periods.length);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get('/periods')
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should ONLY return a list of periods the payee has access to', async () => {
        // Act
        const res = await server
          .get('/periods')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(Array.isArray(res.body.periods)).toEqual(true);
        expect(res.body.periods.length).toEqual(1);
        expect(res.body.periods).toEqual([{ _id: period._id.toString(), name: period.name }]);
      });
    });
  });

  describe('/:id/history GET', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return the history of a period', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id}/history`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.modelHistory)).toEqual(true);
        });
        it('should return 404 if the period is not found', async () => {
          // Arrange
          const id = randomId();
          // Act
          const res = await server
            .get(`/periods/${id}/history`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Period with ID ${id}`);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return the history of a period', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id}/history`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.modelHistory)).toEqual(true);
        });
      });

      describe('as a user with View rights', () => {
        it('should return the history of a period', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id}/history`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.modelHistory)).toEqual(true);
        });
      });

      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id}/history`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return the history of a period', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(Array.isArray(res.body.modelHistory)).toEqual(true);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id GET', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a period and 200 status', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body._id).toEqual(period._id.toString());
          expect(res.body.clientId).toEqual(period.clientId);
          expect(res.body.name).toEqual(period.name);
          expect(res.body.contractType).toEqual(period.contractType);
          expect(res.body.updatedAt).toBeDefined();
        });
        it('should return a 404 status when not found', async () => {
          // Act
          const res = await server
            .get(`/periods/${unknownObjectId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Period with ID ${unknownObjectId}`);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a period and 200 status', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body._id).toEqual(period._id.toString());
          expect(res.body.clientId).toEqual(period.clientId);
          expect(res.body.name).toEqual(period.name);
          expect(res.body.contractType).toEqual(period.contractType);
        });
      });

      describe('as a user with View rights', () => {
        it('should return a period and 200 status', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body._id).toEqual(period._id.toString());
          expect(res.body.clientId).toEqual(period.clientId);
          expect(res.body.name).toEqual(period.name);
          expect(res.body.contractType).toEqual(period.contractType);
        });
      });

      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a period and 200 status', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(res.body._id).toEqual(period._id.toString());
        expect(res.body.clientId).toEqual(period.clientId);
        expect(res.body.name).toEqual(period.name);
        expect(res.body.contractType).toEqual(period.contractType);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('if public export links have been generated', () => {
      beforeEach(async () => {
        // Arrange
        period.unreportedCostsCsvPublicLink = randomString();
        period.salesExportZipsPublicLinks = [randomString(), randomString(), randomString()];
        period.statementSalesExportZipsPublicLinks = randomString();
        await period.save();
      });
      describe('as a client user', () => {
        describe('as a user with Full rights', () => {
          it('should include the public export links', async () => {
            // Act
            const res = await server
              .get(`/periods/${period._id.toString()}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull);
            // Assert
            expect(res.status).toEqual(200);
            expect(res.body._id).toEqual(period._id.toString());
            expect(res.body.unreportedCostsCsvPublicLink).toEqual(period.unreportedCostsCsvPublicLink);
            expect(res.body.salesExportZipsPublicLinks).toEqual(period.salesExportZipsPublicLinks);
            expect(res.body.statementSalesExportZipsPublicLinks).toEqual(period.statementSalesExportZipsPublicLinks);
          });
        });
        describe('as a user with Edit rights', () => {
          it('should include the public export links', async () => {
            // Act
            const res = await server
              .get(`/periods/${period._id.toString()}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);
            // Assert
            expect(res.status).toEqual(200);
            expect(res.body._id).toEqual(period._id.toString());
            expect(res.body.unreportedCostsCsvPublicLink).toEqual(period.unreportedCostsCsvPublicLink);
            expect(res.body.salesExportZipsPublicLinks).toEqual(period.salesExportZipsPublicLinks);
            expect(res.body.statementSalesExportZipsPublicLinks).toEqual(period.statementSalesExportZipsPublicLinks);
          });
        });

        describe('as a user with View rights', () => {
          it('should include the public export links', async () => {
            // Act
            const res = await server
              .get(`/periods/${period._id.toString()}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserView);
            // Assert
            expect(res.status).toEqual(200);
            expect(res.body._id).toEqual(period._id.toString());
            expect(res.body.unreportedCostsCsvPublicLink).toEqual(period.unreportedCostsCsvPublicLink);
            expect(res.body.salesExportZipsPublicLinks).toEqual(period.salesExportZipsPublicLinks);
            expect(res.body.statementSalesExportZipsPublicLinks).toEqual(period.statementSalesExportZipsPublicLinks);
          });
        });
      });
      describe('as an internal client user', () => {
        it('should include the public export links', async () => {
          // Act
          const res = await server
            .get(`/periods/${period._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', internalClientUser);
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body._id).toEqual(period._id.toString());
          expect(res.body.unreportedCostsCsvPublicLink).toEqual(period.unreportedCostsCsvPublicLink);
          expect(res.body.salesExportZipsPublicLinks).toEqual(period.salesExportZipsPublicLinks);
          expect(res.body.statementSalesExportZipsPublicLinks).toEqual(period.statementSalesExportZipsPublicLinks);
        });
      });
    });
  });

  describe('/:id/resolved_groups GET', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a list of included Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
          expect(res.body.resolvedGroups.length).toEqual(period2.resolvedGroupIds.length);
        });
        it('should return metadata of the included Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(typeof res.body.meta).toEqual('object');
        });
        it('should return the first page if not passed a specific page', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual(1);
        });
        it('should return the passed page when passed the parameter', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups?page=3`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual(3);
        });
        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.totalPages).toEqual(1);
        });
        it('should set the amount to be returned per page when passed a limit option', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups?limit=1`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.resolvedGroups.length).toEqual(1);
          expect(res.body.meta.totalPages).toEqual(period2.resolvedGroupIds.length);
        });
        it('should return a 404 status when period is not found', async () => {
          // Act
          const res = await server
            .get(`/periods/${unknownObjectId}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Period with ID ${unknownObjectId}`);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a list of included Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
          expect(res.body.resolvedGroups.length).toEqual(period2.resolvedGroupIds.length);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a list of included Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
          expect(res.body.resolvedGroups.length).toEqual(period2.resolvedGroupIds.length);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a list of included Resolved Groups', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
        expect(res.body.resolvedGroups.length).toEqual(period2.resolvedGroupIds.length);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id/unincluded_resolved_groups GET', () => {
    let totalResolvedGroups;
    beforeEach(async () => {
      // Arrange
      const allResolvedGroups = await SalesGroup.find({ clientId: client._id.toString(), type: 'resolved' });
      totalResolvedGroups = allResolvedGroups?.length;
    });
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should return a list of excluded Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
          expect(res.body.resolvedGroups.length).toEqual(totalResolvedGroups - period2.resolvedGroupIds.length);
        });
        it('should return metadata of the excluded Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(200);
          expect(typeof res.body.meta).toEqual('object');
        });
        it('should return the first page if not passed a specific page', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual(1);
        });
        it('should return the passed page when passed the parameter', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups?page=3`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toEqual(3);
        });
        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.totalPages).toEqual(1);
        });
        it('should set the amount to be returned per page when passed a limit option', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups?limit=1`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.resolvedGroups.length).toEqual(1);
          expect(res.body.meta.totalPages).toEqual(totalResolvedGroups - period2.resolvedGroupIds.length);
        });
        it('should return a 404 status when period is not found', async () => {
          // Act
          const res = await server
            .get(`/periods/${unknownObjectId}/resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Period with ID ${unknownObjectId}`);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should return a list of excluded Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
          expect(res.body.resolvedGroups.length).toEqual(totalResolvedGroups - period2.resolvedGroupIds.length);
        });
      });

      describe('as a user with View rights', () => {
        it('should return a list of excluded Resolved Groups', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toEqual(200);
          expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
          expect(res.body.resolvedGroups.length).toEqual(totalResolvedGroups - period2.resolvedGroupIds.length);
        });
      });

      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get(`/periods/${period2._id}/unincluded_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should return a list of excluded Resolved Groups', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/unincluded_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser);
        // Assert
        expect(res.status).toEqual(200);
        expect(Array.isArray(res.body.resolvedGroups)).toEqual(true);
        expect(res.body.resolvedGroups.length).toEqual(totalResolvedGroups - period2.resolvedGroupIds.length);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/unincluded_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/unincluded_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/periods/${period2._id}/unincluded_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id/include_filtered_resolved_groups POST', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should add the filtered salesGroup(s) to the period', async () => {
          // Arrange
          const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ text: resolvedGroupToAdd });
          // Assert
          expect(res.status).toEqual(200);
          const periodResult = await Period.findById(period2._id);
          const includedResolvedGroups = periodResult.resolvedGroupIds;
          expect(includedResolvedGroups.length === period2.resolvedGroupIds.length + 1);
          expect(includedResolvedGroups[includedResolvedGroups.length - 1] === resolvedGroupToAdd);
        });
        it('should call SalesGroup.find with the correct parameters', async () => {
          // Arrange
          jest.spyOn(SalesGroup, 'find');
          const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
          const filter = {
            clientId: client._id.toString(),
            type: 'resolved',
            $or: [{
              name: {
                $regex: new RegExp(resolvedGroupToAdd, 'i'),
              },
            }, { _id: resolvedGroupToAdd }],
          };
          // Act
          await server
            .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ text: resolvedGroupToAdd });
          // Assert
          expect(SalesGroup.find).toHaveBeenCalledWith(filter);
        });
        describe('when SalesGroup.find throws an error', () => {
          it('should return a 500 error', async () => {
            // Arrange
            const error = randomError();
            jest.spyOn(SalesGroup, 'find').mockRejectedValue(new Error(error));
            const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
            // Act
            const res = await server
              .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ text: resolvedGroupToAdd });
            // Assert
            expect(res.status).toEqual(500);
            expect(res.body.message).toEqual(INTERNAL_ERROR);
          });
        });
        it('should call Period.findByIdAndUpdate with the correct parameters', async () => {
          // Arrange
          jest.spyOn(Period, 'findByIdAndUpdate');
          const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
          // Act
          await server
            .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ text: resolvedGroupToAdd });
          // Assert
          expect(Period.findByIdAndUpdate).toHaveBeenCalledWith(period2._id.toString(), { $push: { resolvedGroupIds: { $each: [resolvedGroupToAdd] } } }, { new: true });
        });
        describe('when Period.findByIdAndUpdate throws an error', () => {
          it('should return a 500 error', async () => {
            // Arrange
            const error = randomError();
            jest.spyOn(Period, 'findByIdAndUpdate').mockRejectedValue(new Error(error));
            const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
            // Act
            const res = await server
              .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ text: resolvedGroupToAdd });
            // Assert
            expect(res.status).toEqual(500);
            expect(res.body.message).toEqual(INTERNAL_ERROR);
          });
        });
        it('should return a 404 status when period is not found', async () => {
          // Act
          const res = await server
            .post(`/periods/${unknownObjectId}/include_filtered_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Period with ID ${unknownObjectId}`);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should add the filtered salesGroup(s) to the period', async () => {
          // Arrange
          const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ text: resolvedGroupToAdd });
          // Assert
          expect(res.status).toEqual(200);
          const periodResult = await Period.findById(period2._id);
          const includedResolvedGroups = periodResult.resolvedGroupIds;
          expect(includedResolvedGroups.length === period2.resolvedGroupIds.length + 1);
          expect(includedResolvedGroups[includedResolvedGroups.length - 1] === resolvedGroupToAdd);
        });
      });
      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ text: resolvedGroupToAdd });
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ text: resolvedGroupToAdd });
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should add the filtered salesGroup(s) to the period', async () => {
        // Arrange
        const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser)
          .send({ text: resolvedGroupToAdd });
        // Assert
        expect(res.status).toEqual(200);
        const periodResult = await Period.findById(period2._id);
        const includedResolvedGroups = periodResult.resolvedGroupIds;
        expect(includedResolvedGroups.length === period2.resolvedGroupIds.length + 1);
        expect(includedResolvedGroups[includedResolvedGroups.length - 1] === resolvedGroupToAdd);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ text: resolvedGroupToAdd });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ text: resolvedGroupToAdd });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupToAdd = salesGroupExcluded1._id.toString();
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_filtered_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ text: resolvedGroupToAdd });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id/include_selected_resolved_groups POST', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should add the filtered salesGroup(s) to the period', async () => {
          // Arrange
          const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ resolvedGroupIds });
          // Assert
          expect(res.status).toEqual(200);
          const periodResult = await Period.findById(period2._id);
          const includedResolvedGroups = periodResult.resolvedGroupIds;
          expect(includedResolvedGroups.length === period2.resolvedGroupIds.length + 1);
          expect(includedResolvedGroups[includedResolvedGroups.length - 1] === resolvedGroupIds[0]);
        });
        it('should call SalesGroup.find with the correct parameters', async () => {
          // Arrange
          jest.spyOn(SalesGroup, 'find');
          const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
          const filter = {
            clientId: client._id.toString(),
            _id: { $in: resolvedGroupIds },
          };
          // Act
          await server
            .post(`/periods/${period2._id}/include_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ resolvedGroupIds });
          // Assert
          expect(SalesGroup.find).toHaveBeenCalledWith(filter);
        });
        describe('when SalesGroup.find throws an error', () => {
          it('should return a 500 error', async () => {
            // Arrange
            const error = randomError();
            jest.spyOn(SalesGroup, 'find').mockRejectedValue(new Error(error));
            const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
            // Act
            const res = await server
              .post(`/periods/${period2._id}/include_selected_resolved_groups`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ resolvedGroupIds });
            // Assert
            expect(res.status).toEqual(500);
            expect(res.body.message).toEqual(INTERNAL_ERROR);
          });
        });
        it('should call Period.findByIdAndUpdate with the correct parameters', async () => {
          // Arrange
          jest.spyOn(Period, 'findByIdAndUpdate');
          const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
          // Act
          await server
            .post(`/periods/${period2._id}/include_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ resolvedGroupIds });
          // Assert
          expect(Period.findByIdAndUpdate).toHaveBeenCalledWith(period2._id.toString(), { $push: { resolvedGroupIds: { $each: resolvedGroupIds } } }, { new: true });
        });
        describe('when Period.findByIdAndUpdate throws an error', () => {
          it('should return a 500 error', async () => {
            // Arrange
            const error = randomError();
            jest.spyOn(Period, 'findByIdAndUpdate').mockRejectedValue(new Error(error));
            const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
            // Act
            const res = await server
              .post(`/periods/${period2._id}/include_selected_resolved_groups`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ resolvedGroupIds });
            // Assert
            expect(res.status).toEqual(500);
            expect(res.body.message).toEqual(INTERNAL_ERROR);
          });
        });
        it('should return a 404 status when period is not found', async () => {
          // Act
          const res = await server
            .post(`/periods/${unknownObjectId}/include_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Period with ID ${unknownObjectId}`);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should add the filtered salesGroup(s) to the period', async () => {
          // Arrange
          const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ resolvedGroupIds });
          // Assert
          expect(res.status).toEqual(200);
          const periodResult = await Period.findById(period2._id);
          const includedResolvedGroups = periodResult.resolvedGroupIds;
          expect(includedResolvedGroups.length === period2.resolvedGroupIds.length + 1);
          expect(includedResolvedGroups[includedResolvedGroups.length - 1] === resolvedGroupIds[0]);
        });
      });

      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ resolvedGroupIds });
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });

      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/include_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ resolvedGroupIds });
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should add the filtered salesGroup(s) to the period', async () => {
        // Arrange
        const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser)
          .send({ resolvedGroupIds });
        // Assert
        expect(res.status).toEqual(200);
        const periodResult = await Period.findById(period2._id);
        const includedResolvedGroups = periodResult.resolvedGroupIds;
        expect(includedResolvedGroups.length === period2.resolvedGroupIds.length + 1);
        expect(includedResolvedGroups[includedResolvedGroups.length - 1] === resolvedGroupIds[0]);
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ resolvedGroupIds });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ resolvedGroupIds });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupIds = [salesGroupExcluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/include_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ resolvedGroupIds });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id/remove_selected_resolved_groups POST', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        it('should remove the filtered salesGroup(s) from the period', async () => {
          // Arrange
          const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
          // Assert
          expect(res.status).toEqual(200);
          const periodResult = await Period.findById(period2._id);
          const includedResolvedGroups = periodResult.resolvedGroupIds;
          expect(includedResolvedGroups.length === period2.resolvedGroupIds.length - 1);
          expect(includedResolvedGroups.includes(resolvedGroupIdsToRemove[0])).toBeFalsy();
        });
        it('should call SalesGroup.find with the correct parameters', async () => {
          // Arrange
          jest.spyOn(SalesGroup, 'find');
          const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
          const filter = {
            clientId: client._id.toString(),
            _id: { $in: resolvedGroupIdsToRemove },
          };
          // Act
          await server
            .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
          // Assert
          expect(SalesGroup.find).toHaveBeenCalledWith(filter);
        });
        describe('when SalesGroup.find throws an error', () => {
          it('should return a 500 error', async () => {
            // Arrange
            const error = randomError();
            jest.spyOn(SalesGroup, 'find').mockRejectedValue(new Error(error));
            const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
            // Act
            const res = await server
              .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
            // Assert
            expect(res.status).toEqual(500);
            expect(res.body.message).toEqual(INTERNAL_ERROR);
          });
        });
        it('should call Period.findByIdAndUpdate with the correct parameters', async () => {
          // Arrange
          jest.spyOn(Period, 'findByIdAndUpdate');
          const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
          // Act
          await server
            .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
          // Assert
          expect(Period.findByIdAndUpdate).toHaveBeenCalledWith(period2._id.toString(), { $pullAll: { resolvedGroupIds: resolvedGroupIdsToRemove } }, { new: true });
        });
        describe('when Period.findByIdAndUpdate throws an error', () => {
          it('should return a 500 error', async () => {
            // Arrange
            const error = randomError();
            jest.spyOn(Period, 'findByIdAndUpdate').mockRejectedValue(new Error(error));
            const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
            // Act
            const res = await server
              .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
            // Assert
            expect(res.status).toEqual(500);
            expect(res.body.message).toEqual(INTERNAL_ERROR);
          });
        });
        it('should return a 404 status when period is not found', async () => {
          // Act
          const res = await server
            .post(`/periods/${unknownObjectId}/remove_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Period with ID ${unknownObjectId}`);
        });
      });
      describe('as a user with Edit rights', () => {
        it('should remove the filtered salesGroup(s) from the period', async () => {
          // Arrange
          const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
          // Assert
          expect(res.status).toEqual(200);
          const periodResult = await Period.findById(period2._id);
          const includedResolvedGroups = periodResult.resolvedGroupIds;
          expect(includedResolvedGroups.length === period2.resolvedGroupIds.length - 1);
          expect(includedResolvedGroups.includes(resolvedGroupIdsToRemove[0])).toBeFalsy();
        });
      });

      describe('as a user with View rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });

      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
          // Act
          const res = await server
            .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      it('should remove the filtered salesGroup(s) from the period', async () => {
        // Arrange
        const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalClientUser)
          .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
        // Assert
        expect(res.status).toEqual(200);
        const periodResult = await Period.findById(period2._id);
        const includedResolvedGroups = periodResult.resolvedGroupIds;
        expect(includedResolvedGroups.length === period2.resolvedGroupIds.length - 1);
        expect(includedResolvedGroups.includes(resolvedGroupIdsToRemove[0])).toBeFalsy();
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const resolvedGroupIdsToRemove = [salesGroupIncluded1._id.toString()];
        // Act
        const res = await server
          .post(`/periods/${period2._id}/remove_selected_resolved_groups`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ resolvedGroupIds: resolvedGroupIdsToRemove });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/:id/validate_generate_unreported_file POST', () => {
    describe('as a client user', () => {
      describe('as a user with Full rights', () => {
        describe('When User is Not Found', () => {
          it('should return 404', async () => {
            // Arrange
            const nonUserToken = jwt.sign({ id: randomId() }, process.env.jsonSecretToken, { expiresIn: 86400 });
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', nonUserToken)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(404);
            expect(res.body).toEqual({ message: 'User not found' });
          });
        });
        describe('When Period Is Not Found', () => {
          it('should return 404', async () => {
            // Act
            const res = await server
              .post('/periods/asdasdf/validate_generate_unreported_file')
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(404);
            expect(res.body).toEqual({ message: 'Period not found' });
          });
        });
        describe('When no Type is passed', () => {
          it('should return 400', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull);
            // Assert
            expect(res.status).toEqual(400);
            expect(res.body).toEqual({ message: 'Type is required' });
          });
        });
        describe('When Type passed is NOT Unreported Sales or Unreported Costs', () => {
          it('Should return 400', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Stuff' });
            // Assert
            expect(res.status).toEqual(400);
            expect(res.body).toEqual({ message: "Invalid type. Type must be either 'Unreported Sales' or 'Unreported Costs'" });
          });
        });
        describe('When Type is Unreported Sales & there are no sales files AND no resolved groups attached to the period', () => {
          it('should return 200 with a message', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(200);
            expect(res.body).toEqual({
              canGenerate: false,
              type: 'Unreported Sales',
              message: 'No Sales are attached to this period. Generating an Unreported Sales CSV is not necessary.',
            });
          });
        });
        describe('When Type is Unreported Costs & there are no costs files attached to the period', () => {
          it('Should return 200 with a message', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Costs' });
            // Assert
            expect(res.status).toEqual(200);
            expect(res.body).toEqual({
              canGenerate: false,
              type: 'Unreported Costs',
              message: 'No Costs are attached to this period. Generating an Unreported Costs CSV is not necessary.',
            });
          });
        });

        describe('When Type is Unreported Sales & there are sales files attached to the period, but none are a head of period.processEndTime', () => {
          // Arrange
          let periodWithSalesFiles;
          beforeEach(async () => {
            periodWithSalesFiles = new Period({
              clientId: client._id,
              name: randomString(),
              contractType: 'Standard',
              runNo: 0,
              locked: false,
              createdAt: randomDate(),
              unreportedSalesCsv: randomString(),
              salesFilesIds: [randomId(), randomId()],
              processEndTime: randomDate(),
            });
            await periodWithSalesFiles.save();
          });
          it('Should return 200', async () => {
            // Act
            const res = await server
              .post(`/periods/${periodWithSalesFiles._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Sales' });
            const result = { ...res.body, publicLink: null };
            const foundPeriod = await Period.findById(periodWithSalesFiles._id);
            // Assert
            expect(res.status).toEqual(200);
            expect(result).toEqual({
              canGenerate: true,
              type: 'Unreported Sales',
              publicLink: null,
              unreportedLastRun: moment(foundPeriod.processEndTime).format(),
            });
          });
        });

        describe('When Type is Unreported Sales & there are sales files attached to the period, but some are a head of period.processEndTime', () => {
          // Arrange
          let periodWithSalesFiles; let salesFileAheadOfPeriod;
          beforeEach(async () => {
            const baseTime = new Date();
            salesFileAheadOfPeriod = new SalesFile({
              clientId: client._id.toString(),
              name: randomString(),
              createdAt: new Date(period.createdAt.getTime() + 1000),
              lastIngested: { date: moment(baseTime).add(1, 'day').format() },
              reportedStatus: 'Unreported',
            });
            await salesFileAheadOfPeriod.save();
            periodWithSalesFiles = new Period({
              clientId: client._id,
              name: randomString(),
              contractType: 'Standard',
              runNo: 0,
              locked: false,
              createdAt: randomDate(),
              salesFilesIds: [salesFileAheadOfPeriod._id.toString(), randomId()],
              unreportedSalesCsv: randomString(),
              processEndTime: moment(baseTime).format(),
            });
            await periodWithSalesFiles.save();
          });
          it('Should return 200 with a message', async () => {
            // Arrange
            const message = `
              Some sales files have been (re)ingested since the last creation of the Unreported Sales CSV File, which may result in data discrepancies.
              To ensure accuracy, these files will be automatically excluded from the Unreported Sales CSV.
              Below is the list of excluded sales files:
            `;
            const foundPeriod = await Period.findById(periodWithSalesFiles._id);
            // Act
            const res = await server
              .post(`/periods/${periodWithSalesFiles._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(200);
            expect({ ...res.body, salesFileMessage: res?.body?.salesFileMessage.replace(/\s/g, ''), publicLink: null }).toEqual({
              canGenerate: true,
              type: 'Unreported Sales',
              salesFileList: [
                {
                  _id: salesFileAheadOfPeriod._id.toString(),
                  name: salesFileAheadOfPeriod.name,
                  lastIngestedDate: salesFileAheadOfPeriod.lastIngested.date,
                },
              ],
              salesFileMessage: message.replace(/\s/g, ''),
              publicLink: null,
              periodEndDate: moment.utc(periodWithSalesFiles.processEndTime).format(),
              unreportedLastRun: moment(foundPeriod.processEndTime).format(),
            });
          });
        });

        describe('When Type is Unreported Sales & ALL sales files have been re-ingested since the last processing of the period', () => {
          // Arrange
          let periodWithSalesFiles; let salesFileAheadOfPeriod;
          beforeEach(async () => {
            const baseTime = new Date();
            salesFileAheadOfPeriod = new SalesFile({
              clientId: client._id.toString(),
              name: randomString(),
              createdAt: new Date(period.createdAt.getTime() + 1000),
              lastIngested: { date: moment(baseTime).add(1, 'day').format() },
              reportedStatus: 'Unreported',
            });
            await salesFileAheadOfPeriod.save();
            periodWithSalesFiles = new Period({
              clientId: client._id,
              name: randomString(),
              contractType: 'Standard',
              runNo: 0,
              locked: false,
              createdAt: randomDate(),
              salesFilesIds: [salesFileAheadOfPeriod._id.toString()],
              processEndTime: moment(baseTime).format(),
              unreportedSalesCsv: randomString(),
            });
            await periodWithSalesFiles.save();
          });
          it('Should return 200 with a message', async () => {
            // Arrange
            const message = `
              All sales files have been (re)ingested since the last processing of this period, which may result in data discrepancies. Please re-process the period.
            `;
            // Act
            const res = await server
              .post(`/periods/${periodWithSalesFiles._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(200);
            expect({ ...res.body, salesFileMessage: res?.body?.salesFileMessage.replace(/\s/g, ''), publicLink: null }).toEqual({
              canGenerate: false,
              type: 'Unreported Sales',
              salesFileList: [],
              salesFileMessage: message.replace(/\s/g, ''),
              periodEndDate: moment.utc(periodWithSalesFiles.processEndTime).format(),
              unreportedLastRun: moment(periodWithSalesFiles.processEndTime).format(),
              publicLink: null,
            });
          });
        });

        describe('When Type is Unreported Sales & there are sales files attached to the period, but some are a head of period.processEndTime and some are not BUT the contractType is MCPS', () => {
          // Arrange
          let periodWithSalesFiles; let salesFileAheadOfPeriod;
          beforeEach(async () => {
            const baseTime = new Date();
            salesFileAheadOfPeriod = new SalesFile({
              clientId: client._id.toString(),
              name: randomString(),
              createdAt: new Date(period.createdAt.getTime() + 1000),
              lastIngested: { date: moment(baseTime).add(1, 'day').format() },
              reportedStatus: 'Unreported',
            });
            await salesFileAheadOfPeriod.save();
            periodWithSalesFiles = new Period({
              clientId: client._id,
              name: randomString(),
              runNo: 0,
              locked: false,
              createdAt: randomDate(),
              salesFilesIds: [salesFileAheadOfPeriod._id.toString(), randomId()],
              processEndTime: moment(baseTime).format(),
              contractType: 'MCPS',
              unreportedSalesCsv: randomString(),
            });
            await periodWithSalesFiles.save();
          });
          it('Should return 200 with NO message', async () => {
            // Arrange
            const message = `
              Some sales files have been (re)ingested since the last creation of the Unreported Sales CSV File, which may result in data discrepancies.
              To ensure accuracy, these files will be automatically excluded from the Unreported Sales CSV.
              Below is the list of excluded sales files:
            `;
            const foundPeriod = await Period.findById(periodWithSalesFiles._id);
            // Act
            const res = await server
              .post(`/periods/${periodWithSalesFiles._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(200);
            expect({ ...res.body, salesFileMessage: res?.body?.salesFileMessage.replace(/\s/g, ''), publicLink: null }).toEqual({
              canGenerate: true,
              type: 'Unreported Sales',
              salesFileList: [
                {
                  _id: salesFileAheadOfPeriod._id.toString(),
                  name: salesFileAheadOfPeriod.name,
                  lastIngestedDate: salesFileAheadOfPeriod.lastIngested.date,
                },
              ],
              salesFileMessage: message.replace(/\s/g, ''),
              publicLink: null,
              periodEndDate: moment.utc(periodWithSalesFiles.processEndTime).format(),
              unreportedLastRun: moment(foundPeriod.processEndTime).format(),
            });
          });
        });

        describe('When Type is Unreported Sales & there are Resolved Groups attached to the period', () => {
          // Arrange
          let periodWithResolvedGroups;
          beforeEach(async () => {
            periodWithResolvedGroups = new Period({
              clientId: client._id,
              name: randomString(),
              contractType: 'Standard',
              runNo: 0,
              locked: false,
              createdAt: randomDate(),
              unreportedSalesCsv: randomString(),
              resolvedGroupIds: [randomId(), randomId()],
              processEndTime: randomDate(),
            });
            await periodWithResolvedGroups.save();
          });
          it('Should return 200', async () => {
            // Act
            const res = await server
              .post(`/periods/${periodWithResolvedGroups._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Sales' });
            const result = { ...res.body, publicLink: null };
            const foundPeriod = await Period.findById(periodWithResolvedGroups._id);
            // Assert
            expect(res.status).toEqual(200);
            expect(result).toEqual({
              canGenerate: true,
              type: 'Unreported Sales',
              publicLink: null,
              unreportedLastRun: moment(foundPeriod.processEndTime).format(),
            });
          });
        });

        describe('When Type is Unreported Costs & there are costs files attached to the period', () => {
          // Arrange
          let periodWithCostsFiles;
          beforeEach(async () => {
            periodWithCostsFiles = new Period({
              clientId: client._id,
              name: randomString(),
              contractType: 'Standard',
              runNo: 0,
              locked: false,
              createdAt: randomDate(),
              costIds: [randomId(), randomId()],
              unreportedCostsCsv: randomString(),
            });
            await periodWithCostsFiles.save();
          });
          it('Should return 200', async () => {
            // Act
            const res = await server
              .post(`/periods/${periodWithCostsFiles._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ type: 'Unreported Costs' });
            // Assert
            expect(res.status).toEqual(200);
            expect({ ...res.body, publicLink: null }).toEqual({
              canGenerate: true,
              type: 'Unreported Costs',
              publicLink: null,
            });
          });
        });
      });
      describe('as a user with Edit rights', () => {
        describe('When Type is Unreported Sales & there are no sales files AND no resolved groups attached to the period', () => {
          it('should return 200 with a message', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(200);
            expect(res.body).toEqual({
              canGenerate: false,
              type: 'Unreported Sales',
              message: 'No Sales are attached to this period. Generating an Unreported Sales CSV is not necessary.',
            });
          });
        });
      });
      describe('as a user with View rights', () => {
        describe('When Type is Unreported Sales & there are no sales files AND no resolved groups attached to the period', () => {
          it('should return 200 with a message', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserView)
              .send({ type: 'Unreported Sales' });
            // Assert
            expect(res.status).toEqual(200);
            expect(res.body).toEqual({
              canGenerate: false,
              type: 'Unreported Sales',
              message: 'No Sales are attached to this period. Generating an Unreported Sales CSV is not necessary.',
            });
          });
        });
      });
      describe('as a user with None rights', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ type: 'Unreported Sales' });
          // Assert
          expect(res.status).toEqual(403);
          expect(res.body.message).toEqual(FORBIDDEN_ERROR);
        });
      });
    });
    describe('as an internal client user', () => {
      describe('When Type is Unreported Sales & there are no sales files AND no resolved groups attached to the period', () => {
        it('should return 200 with a message', async () => {
          // Act
          const res = await server
            .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
            .set('applicationToken', applicationToken)
            .set('token', internalClientUser)
            .send({ type: 'Unreported Sales' });
          // Assert
          expect(res.status).toEqual(200);
          expect(res.body).toEqual({
            canGenerate: false,
            type: 'Unreported Sales',
            message: 'No Sales are attached to this period. Generating an Unreported Sales CSV is not necessary.',
          });
        });
      });
    });
    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ type: 'Unreported Sales' });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ type: 'Unreported Sales' });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post(`/periods/${period._id.toString()}/validate_generate_unreported_file`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ type: 'Unreported Sales' });
        // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  // Outstanding tests to be written
  describe('/:id/qa_report GET', () => { });
  describe('/:id/batch_tasks GET', () => { });
  describe('/:id/detail GET', () => { });
  describe('/:id/sales_files GET', () => { });
  describe('/:id/unincluded_sales_files GET', () => { });
  describe('/:id/costs GET', () => { });
  describe('/:id/unincluded_costs GET', () => { });
  describe('/:id/statements_export GET', () => { });
  describe('/:id/export_sales GET', () => { });
  describe('/:id/export_costs GET', () => { });
  describe('/:id PUT', () => { });
  describe('/:id/include_all_sales_files GET', () => { });
  describe('/:id/include_filtered_sales_files GET', () => { });
  describe('/:id/include_selected_sales_files GET', () => { });
  describe('/:id/remove_selected_sales_files GET', () => { });
  describe('/:id/include_all_costs GET', () => { });
  describe('/:id/include_filtered_costs GET', () => { });
  describe('/:id/include_selected_costs GET', () => { });
  describe('/:id/remove_selected_costs GET', () => { });
  describe('/:id DELETE', () => { });
  describe('/ POST', () => { });
  describe('/:id/calculate POST', () => { });
  describe('/:id/calculateFull POST', () => { });
  describe('/:id/generate_unreported_file POST', () => { });
  describe('/:id/process_batch_task POST', () => { });
  describe('/:id/statements_zip POST', () => { });
  describe('/:id/sales_csv POST', () => { });
  describe('/:id/costs_csv POST', () => { });
  describe('/:id/catalogue_setting_error POST', () => { });
  describe('/:id/catalogue_setting_complete POST', () => { });
  describe('/:id/create_statement POST', () => { });
  describe('/:id/publish_all_statements GET', () => { });
  describe('/:id/unpublish_all_statements GET', () => { });
  describe('/:id/send_all_statements GET', () => { });
  describe('/:id/archive_all_sales_files GET', () => { });
  describe('/:id/archive_fully_reported_sales_files GET', () => { });
  describe('/:id/archive_all_costs GET', () => { });
  describe('/:id/archive_fully_reported_costs GET', () => { });
  describe('/:id/platoon_output GET', () => { });
  describe('/:id/platoon_sap_download GET', () => { });

  describe('/:id/publish_fuga_statements POST', () => {
    const fugaPublishTask = 'Fuga Publish Statements';

    beforeEach(() => {
      jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
    });

    describe('as a client user', () => {
      describe('when the client is a FUGA client AND publish statements to GCS is enabled', () => {
        beforeEach(async () => {
          client.features = { fugaPublishStatementsToCloudStorage: true };
          await client.save();
        });

        describe('as a user with Full rights', () => {
          it('should return a 200 status', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);
            // Assert
            expect(res.status).toEqual(200);
            const task = await Task.findOne({ name: fugaPublishTask, clientId: period.clientId });
            expect(task).not.toBeNull();
            expect(task.value.periodId).toEqual(period._id.toString());
            expect(task.email).toEqual(user.email);
            expect(TaskHelpers.sendTaskMessage).toHaveBeenCalledWith(expect.objectContaining({ _id: task._id }));
            expect(res.body).toEqual({ message: expect.any(String) });
          });
        });

        describe('as a user with Edit rights', () => {
          it('should return a 200 status', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);
            // Assert
            expect(res.status).toEqual(200);
            const task = await Task.findOne({ name: fugaPublishTask, clientId: period.clientId });
            expect(task).not.toBeNull();
            expect(task.value.periodId).toEqual(period._id.toString());
            expect(task.email).toEqual(user.email);
            expect(TaskHelpers.sendTaskMessage).toHaveBeenCalledWith(expect.objectContaining({ _id: task._id }));
            expect(res.body).toEqual({ message: expect.any(String) });
          });
        });

        describe('as a user with View rights', () => {
          it('should return a 403 forbidden response', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserNone);
            // Assert
            expect(res.status).toEqual(403);
            expect(res.body.message).toEqual(FORBIDDEN_ERROR);
          });
        });

        describe('as a user with None rights', () => {
          it('should return a 403 forbidden response', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserNone);
            // Assert
            expect(res.status).toEqual(403);
            expect(res.body.message).toEqual(FORBIDDEN_ERROR);
          });
        });
      });

      describe('when the client is a FUGA client but publish statements to GCS is disabled', () => {
        beforeEach(async () => {
          client.fugaIntegration.fugaOrgId = randomId();
          client.fugaIntegration.enablePublishStatements = false;
          await client.save();
        });

        describe('as a user with Full rights', () => {
          it('should return a 400 status', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);
            // Assert
            expect(res.status).toEqual(400);
            expect(res.body).toEqual({ message: expect.any(String) });
          });
        });

        describe('as a user with Edit rights', () => {
          it('should return a 400 status', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);
            // Assert
            expect(res.status).toEqual(400);
            expect(res.body).toEqual({ message: expect.any(String) });
          });
        });

        describe('as a user with View rights', () => {
          it('should return a 403 forbidden response', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserNone);
            // Assert
            expect(res.status).toEqual(403);
            expect(res.body.message).toEqual(FORBIDDEN_ERROR);
          });
        });

        describe('as a user with None rights', () => {
          it('should return a 403 forbidden response', async () => {
            // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserNone);
            // Assert
            expect(res.status).toEqual(403);
            expect(res.body.message).toEqual(FORBIDDEN_ERROR);
          });
        });
      });

      describe('when the client is not a FUGA client', () => {
        describe('as a user with Full rights', () => {
          it('should return a 400 status', async () => {
          // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);
            // Assert
            expect(res.status).toEqual(400);
            expect(res.body).toEqual({ message: expect.any(String) });
          });
        });

        describe('as a user with Edit rights', () => {
          it('should return a 400 status', async () => {
          // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);
            // Assert
            expect(res.status).toEqual(400);
            expect(res.body).toEqual({ message: expect.any(String) });
          });
        });

        describe('as a user with View rights', () => {
          it('should return a 403 forbidden response', async () => {
          // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserNone);
            // Assert
            expect(res.status).toEqual(403);
            expect(res.body.message).toEqual(FORBIDDEN_ERROR);
          });
        });

        describe('as a user with None rights', () => {
          it('should return a 403 forbidden response', async () => {
          // Act
            const res = await server
              .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserNone);
            // Assert
            expect(res.status).toEqual(403);
            expect(res.body.message).toEqual(FORBIDDEN_ERROR);
          });
        });
      });
    });

    describe('as an internal client user', () => {
      describe('when the client is a FUGA client AND publish statements to GCS is enabled', () => {
        beforeEach(async () => {
          client.features = { fugaPublishStatementsToCloudStorage: true };
          await client.save();
        });

        it('should return a 200 status', async () => {
          // Act
          const res = await server
            .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
            .set('applicationToken', applicationToken)
            .set('token', internalClientUser);
            // Assert
          expect(res.status).toEqual(200);
          const task = await Task.findOne({ name: fugaPublishTask, clientId: period.clientId });
          expect(task).not.toBeNull();
          expect(task.value.periodId).toEqual(period._id.toString());
          expect(task.email).toEqual(user.email);
          expect(TaskHelpers.sendTaskMessage).toHaveBeenCalledWith(expect.objectContaining({ _id: task._id }));
          expect(res.body).toEqual({ message: expect.any(String) });
        });
      });

      describe('when the client is a FUGA client but publish statements to GCS is disabled', () => {
        beforeEach(async () => {
          client.features = { fugaPublishStatementsToCloudStorage: false };
          await client.save();
        });

        it('should return a 400 status', async () => {
          // Act
          const res = await server
            .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
            .set('applicationToken', applicationToken)
            .set('token', internalClientUser);
            // Assert
          expect(res.status).toEqual(400);
          expect(res.body).toEqual({ message: expect.any(String) });
        });
      });

      describe('when the client is not a FUGA client', () => {
        it('should return a 400 status', async () => {
          // Act
          const res = await server
            .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
            .set('applicationToken', applicationToken)
            .set('token', internalClientUser);
            // Assert
          expect(res.status).toEqual(400);
          expect(res.body).toEqual({ message: expect.any(String) });
        });
      });
    });

    describe('as an internal user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });

    describe('as a parent user without a client', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
          // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });

    describe('as a payee user', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .post(`/periods/${period._id.toString()}/publish_fuga_statements`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
          // Assert
        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual(FORBIDDEN_ERROR);
      });
    });
  });

  describe('/raw-export POST', () => {
    beforeEach(() => {
      mockCSVRawExport.mockReset();
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
    });

    it('should return 200 with async message when sync is not set', async () => {
      const res = await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
    });

    it('should return 200 with csvPublicLink when sync=true', async () => {
      const res = await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
    });

    it('should call CSVRawExport with sync=true when body param set', async () => {
      await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          sync: true,
        }),
      );
    });

    it('should return 500 when CSVRawExport throws in sync mode', async () => {
      mockCSVRawExport.mockRejectedValue(new Error('Export failed'));
      const res = await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(500);
      expect(res.body.message).toEqual('Export failed');
    });

    it('should apply updatedAfter filter to updatedAt.$gte', async () => {
      await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ filter: { updatedAfter: '2025-01-15' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            updatedAt: { $gte: new Date('2025-01-15T00:00:00.000Z') },
          }),
        }),
      );
    });

    it('should apply updatedBefore filter to updatedAt.$lte', async () => {
      await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ filter: { updatedBefore: '2025-01-20' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            updatedAt: { $lte: new Date('2025-01-20T23:59:59.999Z') },
          }),
        }),
      );
    });

    it('should apply createdAfter filter to createdAt.$gte', async () => {
      await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ filter: { createdAfter: '2025-01-10' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            createdAt: { $gte: new Date('2025-01-10T00:00:00.000Z') },
          }),
        }),
      );
    });

    it('should apply createdBefore filter to createdAt.$lte', async () => {
      await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ filter: { createdBefore: '2025-01-25' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            createdAt: { $lte: new Date('2025-01-25T23:59:59.999Z') },
          }),
        }),
      );
    });

    it('should apply combined updatedAfter and updatedBefore as date range', async () => {
      await server
        .post('/periods/raw-export')
        .set('token', clientUserView)
        .set('applicationToken', applicationToken)
        .send({ filter: { updatedAfter: '2025-01-01', updatedBefore: '2025-01-31' } });
      expect(mockCSVRawExport).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            updatedAt: {
              $gte: new Date('2025-01-01T00:00:00.000Z'),
              $lte: new Date('2025-01-31T23:59:59.999Z'),
            },
          }),
        }),
      );
    });

    it('should return 403 when user has None periods rights', async () => {
      const res = await server
        .post('/periods/raw-export')
        .set('token', clientUserNone)
        .set('applicationToken', applicationToken)
        .send({ filter: {} });
      expect(res.status).toBe(403);
    });

    it('should allow Edit user to export', async () => {
      const res = await server
        .post('/periods/raw-export')
        .set('token', clientUserEdit)
        .set('applicationToken', applicationToken)
        .send({ filter: {} });
      expect(res.status).toBe(200);
    });
  });

  // TEMPLATE for further tests
  // describe('as a client user', () => {
  //   describe('as a user with Full rights', () => {
  //   });
  //   describe('as a user with Edit rights', () => {
  //   });
  //   describe('as a user with View rights', () => {
  //   });
  //   describe('as a user with None rights', () => {
  //   });
  // });
  // describe('as an internal client user', () => {
  // });
  // describe('as an internal user without a client', () => {
  // });
  // describe('as a parent user without a client', () => {
  // });
  // describe('as a payee user', () => {
  // });
});
