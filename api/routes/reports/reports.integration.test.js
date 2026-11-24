jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  BigQuery: jest.fn().mockReturnValue({
    getCount: jest.fn(),
  }),
  TaskHelpers: { createTaskAndSendMessage: jest.fn().mockResolvedValue({}) },
}));

const supertest = require('supertest');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');

const config = require('../../config.json');
const server = supertest(require('../../index'));
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const User = require('../../models/user');
const Report = require('../../models/report');
const Task = require('../../models/task');
const Cost = require('../../models/cost');
const Reports = require('../../controllers/reports');

const applicationToken = config.applicationTokens[0];

describe('/reports', () => {
  let client;
  let user;
  let report;
  const bigQuery = new BigQuery();

  beforeEach(async () => {
    client = new Client({ name: randomString(), createdBigQueryTables: true });
    await client.save();

    user = new User({ email: `${randomString()}@curve.com` });
    await user.save();

    report = new Report({ clientId: client._id.toString(), table: 'Sales Output', name: randomString() });
    await report.save();

    bigQuery.getCount.mockImplementation((table, count, filter, cb) => cb(null, [{ count: 10_000 }]));
    jest.spyOn(TaskHelpers, 'createTaskAndSendMessage').mockResolvedValue();
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      let clientUser;

      beforeEach(() => {
        const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id, email: `${randomString()}@curve.com`, rights: {} };
        userToken.rights[client._id.toString()] = { sales: 'Edit' };
        clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/export GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toEqual(200);
          expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
            clientId: report.clientId,
            clientName: client.name,
            email: user.email,
            name: 'Report Creation',
            value: {
              reportId: report._id.toString(),
            },
          });
        });

        it('should return 404 if the report is not found', async () => {
          const id = randomId();
          const res = await server
            .get(`/reports/${id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Report with ID ${id}`);
        });

        it('should return 500 is a report export task is already running', async () => {
          await Task.create({
            name: 'Report Creation',
            clientId: report.clientId,
            status: 'In Progress',
            'value.reportId': report._id.toString(),
          });

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual('This task is already running - please wait until it has completed before running again');
        });

        describe('when the dataset is MongoDB', () => {
          it('should return 413 if the report is over 500 million rows', async () => {
            report.table = 'Costs Input';
            await report.save();
            jest.spyOn(Cost, 'countDocuments').mockResolvedValueOnce(500_000_001);

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toEqual(413);
            expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
          });
        });

        describe('when the dataset is BigQuery', () => {
          it('should return 413 if the report is over 500 million rows', async () => {
            bigQuery.getCount.mockImplementationOnce((table, count, filter, cb) => cb(null, [{ count: 800_000_000 }]));

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toEqual(413);
            expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
          });
        });

        describe('when the filter is null', () => {
          it('should still generate a report', async () => {
            jest.spyOn(Reports, 'getFilter').mockResolvedValueOnce(null);

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser);

            expect(res.status).toEqual(200);
          });
        });
      });
    });

    describe('as a user with None rights', () => {
      let userNone;
      let clientUserNone;

      beforeEach(() => {
        userNone = { id: user._id, internal: false, parentId: null, clientId: null, rights: {} };
        userNone.rights[client._id] = { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' };
        clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/export GET', () => {
        it('should return 403', async () => {
          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toEqual(403);
        });
      });
    });

    describe('as a user with View rights', function () {
      let userView;
      let clientUserView;

      beforeEach(() => {
        userView = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
        userView.rights[client._id] = { sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View' };
        clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/export GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toEqual(200);
          expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
            clientId: report.clientId,
            clientName: client.name,
            email: user.email,
            name: 'Report Creation',
            value: {
              reportId: report._id.toString(),
            },
          });
        });

        it('should return 404 if the report is not found', async () => {
          const id = randomId();
          const res = await server
            .get(`/reports/${id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Report with ID ${id}`);
        });

        it('should return 500 is a report export task is already running', async () => {
          await Task.create({
            name: 'Report Creation',
            clientId: report.clientId,
            status: 'In Progress',
            'value.reportId': report._id.toString(),
          });

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual('This task is already running - please wait until it has completed before running again');
        });

        describe('when the dataset is MongoDB', () => {
          it('should return 413 if the report is over 500 million rows', async () => {
            report.table = 'Costs Input';
            await report.save();
            jest.spyOn(Cost, 'countDocuments').mockResolvedValueOnce(500_000_001);

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserView);

            expect(res.status).toEqual(413);
            expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
          });
        });

        describe('when the dataset is BigQuery', () => {
          it('should return 413 if the report is over 500 million rows', async () => {
            bigQuery.getCount.mockImplementationOnce((table, count, filter, cb) => cb(null, [{ count: 800_000_000 }]));

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserView);

            expect(res.status).toEqual(413);
            expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
          });
        });

        describe('when the filter is null', () => {
          it('should still generate a report', async () => {
            jest.spyOn(Reports, 'getFilter').mockResolvedValueOnce(null);

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserView);

            expect(res.status).toEqual(200);
          });
        });
      });
    });

    describe('as a user with Edit rights', function () {
      let userEdit;
      let clientUserEdit;

      beforeEach(() => {
        userEdit = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
        userEdit.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
        clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/export GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toEqual(200);
          expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
            clientId: report.clientId,
            clientName: client.name,
            email: user.email,
            name: 'Report Creation',
            value: {
              reportId: report._id.toString(),
            },
          });
        });

        it('should return 404 if the report is not found', async () => {
          const id = randomId();
          const res = await server
            .get(`/reports/${id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toEqual(404);
          expect(res.body.message).toEqual(`Could not find Report with ID ${id}`);
        });

        it('should return 500 is a report export task is already running', async () => {
          await Task.create({
            name: 'Report Creation',
            clientId: report.clientId,
            status: 'In Progress',
            'value.reportId': report._id.toString(),
          });

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toEqual(500);
          expect(res.body.message).toEqual('This task is already running - please wait until it has completed before running again');
        });

        describe('when the dataset is MongoDB', () => {
          it('should return 413 if the report is over 500 million rows', async () => {
            report.table = 'Costs Input';
            await report.save();
            jest.spyOn(Cost, 'countDocuments').mockResolvedValueOnce(500_000_001);

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            expect(res.status).toEqual(413);
            expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
          });
        });

        describe('when the dataset is BigQuery', () => {
          it('should return 413 if the report is over 500 million rows', async () => {
            bigQuery.getCount.mockImplementationOnce((table, count, filter, cb) => cb(null, [{ count: 800_000_000 }]));

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            expect(res.status).toEqual(413);
            expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
          });
        });

        describe('when the filter is null', () => {
          it('should still generate a report', async () => {
            jest.spyOn(Reports, 'getFilter').mockResolvedValueOnce(null);

            const res = await server
              .get(`/reports/${report._id}/export`)
              .set('applicationToken', applicationToken)
              .set('token', clientUserEdit);

            expect(res.status).toEqual(200);
          });
        });
      });
    });
  });

  describe('as an internal user', function () {
    let internal;

    beforeEach(() => {
      internal = jwt.sign({ id: user._id, internal: true, parentId: null, clientId: client._id, email: `${randomString()}@curve.com` }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/export GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get(`/reports/${report._id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toEqual(200);
        expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
          clientId: report.clientId,
          clientName: client.name,
          email: user.email,
          name: 'Report Creation',
          value: {
            reportId: report._id.toString(),
          },
        });
      });

      it('should return 404 if the report is not found', async () => {
        const id = randomId();
        const res = await server
          .get(`/reports/${id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual(`Could not find Report with ID ${id}`);
      });

      it('should return 500 is a report export task is already running', async () => {
        await Task.create({
          name: 'Report Creation',
          clientId: report.clientId,
          status: 'In Progress',
          'value.reportId': report._id.toString(),
        });

        const res = await server
          .get(`/reports/${report._id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('This task is already running - please wait until it has completed before running again');
      });

      describe('when the dataset is MongoDB', () => {
        it('should return 413 if the report is over 500 million rows', async () => {
          report.table = 'Costs Input';
          await report.save();
          jest.spyOn(Cost, 'countDocuments').mockResolvedValueOnce(500_000_001);

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toEqual(413);
          expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
        });
      });

      describe('when the dataset is BigQuery', () => {
        it('should return 413 if the report is over 500 million rows', async () => {
          bigQuery.getCount.mockImplementationOnce((table, count, filter, cb) => cb(null, [{ count: 800_000_000 }]));

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toEqual(413);
          expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
        });
      });

      describe('when the filter is null', () => {
        it('should still generate a report', async () => {
          jest.spyOn(Reports, 'getFilter').mockResolvedValueOnce(null);

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', internal);

          expect(res.status).toEqual(200);
        });
      });
    });
  });

  describe('as a parent user without a client', function () {
    let parent;

    beforeEach(() => {
      parent = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/export GET', () => {
      it('should return a 403', async () => {
        const res = await server
          .get(`/reports/${report._id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
  });

  describe('as a payee user', function () {
    const contractId = randomId();
    const contractIds = [contractId, randomId()];
    let payee;
    let payeeToken;

    beforeEach(async () => {
      payee = new Payee({ name: randomString(), clientId: client._id });
      await payee.save();
      payeeToken = jwt.sign({ id: user._id, internal: false, parentId: null, payeeId: payee._id, contractIds }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/export GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get(`/reports/${report._id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toEqual(200);
        expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, {
          clientId: report.clientId,
          clientName: client.name,
          email: user.email,
          name: 'Report Creation',
          value: {
            reportId: report._id.toString(),
          },
        });
      });

      it('should return 404 if the report is not found', async () => {
        const id = randomId();
        const res = await server
          .get(`/reports/${id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual(`Could not find Report with ID ${id}`);
      });

      it('should return 500 is a report export task is already running', async () => {
        await Task.create({
          name: 'Report Creation',
          clientId: report.clientId,
          status: 'In Progress',
          'value.reportId': report._id.toString(),
        });

        const res = await server
          .get(`/reports/${report._id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('This task is already running - please wait until it has completed before running again');
      });

      it('should return 403 if the report client ID does not match the payee client ID', async () => {
        report.clientId = randomId();
        await report.save();

        const res = await server
          .get(`/reports/${report._id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      it('should return 403 if the report createdBy ID does not match the payee user ID', async () => {
        report.createdBy = randomId();
        await report.save();

        const res = await server
          .get(`/reports/${report._id}/export`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      describe('when the dataset is MongoDB', () => {
        it('should return 413 if the report is over 500 million rows', async () => {
          report.table = 'Costs Input';
          await report.save();
          jest.spyOn(Cost, 'countDocuments').mockResolvedValueOnce(500_000_001);

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken);

          expect(res.status).toEqual(413);
          expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
        });
      });

      describe('when the dataset is BigQuery', () => {
        it('should return 413 if the report is over 500 million rows', async () => {
          bigQuery.getCount.mockImplementationOnce((table, count, filter, cb) => cb(null, [{ count: 800_000_000 }]));

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken);

          expect(res.status).toEqual(413);
          expect(res.body.message).toEqual('Your report output will exceed 500 million lines. Please contact support if this is intentional, otherwise please adjust the filters to reduce the data size.');
        });
      });

      describe('when the filter is null', () => {
        it('should still generate a report', async () => {
          jest.spyOn(Reports, 'getFilter').mockResolvedValueOnce(null);

          const res = await server
            .get(`/reports/${report._id}/export`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken);

          expect(res.status).toEqual(200);
        });
      });
    });
  });
});
