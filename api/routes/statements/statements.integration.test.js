// statements.integration.test.js (Jest version)

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const config = require('../../config.json');
const server = require('../../index');

const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Cost = require('../../models/cost');
const Payee = require('../../models/payee');
const Period = require('../../models/period');
const SalesFile = require('../../models/salesFile');
const Statement = require('../../models/statement');
const User = require('../../models/user');
const Task = require('../../models/task');

const unknownObjectId = randomId();
const applicationToken = config.applicationTokens[0];

let payeeId; let contractId; let contractIds;
let client; let clientId; let user; let baseUser;
let statement1; let statement2; let statement3; let statement4; let salesFile; let cost; let period; let payee; let contract;

beforeEach(async () => {
  payeeId = randomId();
  contractId = randomId();
  contractIds = [contractId, randomId()];

  client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });

  await client.save();
  clientId = client._id.toString();

  user = new User({ email: randomString(), clientId });
  await user.save();
  baseUser = { id: user._id, internal: false, parentId: null, clientId, email: randomString(), rights: {} };

  salesFile = new SalesFile({
    clientId,
    name: 'name',
    invoiceNo: 'invoiceNo',
    salesAccountName: 'salesAccountName',
    salesTemplateName: 'salesTemplateName',
    salesTemplateId: 'salesTemplateId',
    targetPeriod: 'targetPeriodTest',
  });
  await salesFile.save();

  cost = new Cost({ clientId, name: 'Cost 1', invoiceNo: 'InvoiceNo1', file: 'File1', type: 'Type1' });
  await cost.save();

  payee = new Payee({ clientId, name: randomString() });
  await payee.save();

  contract = new Contract({ payeeId: payee._id.toString(), payees: [{ payeeId: payee._id.toString() }], clientId, name: randomString() });
  await contract.save();

  period = new Period({ clientId, name: 'Period 1', startDate: new Date(), endDate: new Date() });
  await period.save();

  statement1 = new Statement({ clientId, name: 'Statement 1', contractId: contract._id, analysis: 'analysis', periodId: period._id });
  await statement1.save();

  statement2 = new Statement({ clientId, name: 'Statement 2', contractId: contract._id, status: 'Published', periodId: period._id });
  await statement2.save();

  statement3 = new Statement({
    clientId,
    name: 'Statement 3',
    contractId: contract._id,
    periodId: period._id,
    salesFilesIds: [salesFile._id],
    costIds: [cost._id],
  });
  await statement3.save();

  statement4 = new Statement({ clientId, name: 'Statement 4', contractId: 'TEST_CONTRACT_ID' });
  await statement4.save();

  jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
});

describe('/statements', () => {
  describe('as a client user with full rights', function () {
    let clientUserFullToken;

    beforeEach(async () => {
      const clientUserFull = { ...baseUser, rights: { [clientId]: { periods: 'Edit' } } };
      clientUserFullToken = jwt.sign(clientUserFull, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a list of statements', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.statements)).toBe(true);

        const statements = await Statement.find({ clientId });
        expect(res.body.statements.length).toBe(statements.length);
        expect(res.body.statements[0].updatedAt).toBeDefined();
      });

      it('should return metadata of statements index on / GET', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(200);
        expect(typeof res.body.meta).toBe('object');
        expect(res.body.meta).not.toBeNull();
      });

      it('should return the first page if not passed a specific page', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.body.meta.currentPage).toBe(1);
      });

      it('should return the passed page when passed the parameter', async () => {
        const res = await request(server)
          .get('/statements?page=3')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.body.meta.currentPage).toBe(3);
      });

      it('should return the pages available', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);
        expect(res.body.meta.totalPages).toBe(1);
      });

      it('should set the amount to be returned per page when passed a limit option', async () => {
        const res = await request(server)
          .get('/statements?limit=1')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.body.statements.length).toBe(1);

        const statementCount = await Statement.countDocuments({ clientId });
        expect(res.body.meta.totalPages).toBe(statementCount);
      });
    });

    describe('/:id GET', () => {
      it('should return a statement and 200 status', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(200);
        expect(typeof res.body).toBe('object');
        expect(res.body.clientId).toBe(statement1.clientId);
        expect(res.body.name).toBe(statement1.name);
        expect(res.body.accountingPeriod).toBe(statement1.accountingPeriod);
        expect(res.body.status).toBe(statement1.status);
        expect(res.body.updatedAt).toBeDefined();
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await request(server)
          .get(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id PUT', () => {
      it('should update with passed values only', async () => {
        const id = statement1._id;
        const changedName = `${statement1.name}changed`;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ name: changedName });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(changedName);
      });

      it('should not update clientId', async () => {
        const id = statement1._id;
        const changedTitle = `${statement1.name}changed`;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ name: changedTitle, clientId: 'changed' });

        expect(res.body.clientId).toBe(statement1.clientId);
      });

      it("should not update any fields it isn't passed", async () => {
        const id = statement1._id;
        const changedName = `${statement1.name}changed`;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ name: changedName, clientId: 'changed' });

        expect(res.body.foreignId).toBe(statement1.foreignId);
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await request(server)
          .put(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ title: 'Changed Statement Title' });

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id DELETE', () => {
      it('should delete the statement and return a 200 status when statement is found', async () => {
        const id = statement1._id;

        const res = await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(200);

        const statement = await Statement.findById(statement1._id);
        expect(statement).toBe(null);
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await request(server)
          .delete(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/ POST', () => {
      it('should return a statement created with the passed parameters', async () => {
        const params = {
          clientId: 'ClientID',
          periodId: 'PeriodId',
          contractId: 'ContractID',
          name: 'Name',
          accountingPeriod: 'Accounting Statement',
          status: 'Status',
          openingValue: 123,
          revenue: 456,
          costs: 789,
          closingValue: 321,
        };

        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send(params);

        expect(res.status).toBe(200);
        expect(res.body.clientId).toBe(clientId);
        expect(res.body.periodId).toBe(params.periodId);
        expect(res.body.contractId).toBe(params.contractId);
        expect(res.body.name).toBe(params.name);
        expect(res.body.accountingPeriod).toBe(params.accountingPeriod);
        expect(res.body.status).toBe(params.status);
        expect(res.body.openingValue).toBe(params.openingValue);
      });

      it('should add the statement to the database', async () => {
        const statements = await Statement.find({ clientId });
        const params = { clientId, name: 'Post Statement' };

        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send(params);

        expect(res.status).toBe(200);

        const newStatements = await Statement.find({ clientId });
        expect(newStatements.length).toBe(statements.length + 1);
      });
    });

    // describe('/:id/calculate POST', () => {
    //   it('should return 200', async () => {
    //     const id = statement2._id;

    //     const res = await request(server)
    //       .post(`/statements/${id}/calculate`)
    //       .set('applicationToken', applicationToken)
    //       .set('token', clientUserFullToken)
    //       .send({ id });

    //     expect(res.status).toBe(200);
    //   });
    // });
    describe('/:id/send GET', () => {
      it('should return 200', async () => {
        const id = statement2._id;

        const res = await request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(200);
      });
    });
    describe('/send_many POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ filter: { periodId: period._id } });

        expect(res.status).toBe(200);
      });
    });
    describe('/publish_many POST', () => {
      it('should return 200 when filtering by periodId', async () => {
        const res = await request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ ids: [], filter: { periodId: period._id } });

        expect(res.status).toBe(200);
      });

      it('should return 200 when filtering by statementIds', async () => {
        const res = await request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ ids: [statement1._id] });

        expect(res.status).toBe(200);
      });
    });
    describe('/unpublish_many POST', () => {
      it('should return 200 when filtering by periodId', async () => {
        const res = await request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ ids: [], filter: { periodId: period._id } });

        expect(res.status).toBe(200);
      });

      it('should return 200 when filtering by statementIds', async () => {
        const res = await request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ ids: [statement1._id] });

        expect(res.status).toBe(200);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a statement analysis and 200 status', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(200);
        expect(res.body.analytics).toBe(statement1.analysis);
      });

      it('should return a 404 status', async () => {
        const res = await request(server)
          .get(`/statements/${unknownObjectId}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a statement sale files and 200 status', async () => {
        const id = statement3._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(200);
      });

      it('should return a targetPeriodId value with the salesFiles', async () => {
        const id = statement3._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.body.salesFiles[0].targetPeriod).toBe('targetPeriodTest');
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a statement cost and 200 status', async () => {
        const id = statement3._id;

        const res = await request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/download_selected_statements POST', () => {
      beforeAll(() => {
        jest.spyOn(TaskHelpers, 'sendTaskMessage').mockResolvedValue();
      });

      it('should return 200, and create a task in the database when called with valid statement ids', async () => {
        const res = await request(server)
          .post('/statements/download_selected_statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFullToken)
          .send({ statementIds: [statement1._id.toString()] });

        expect(res.status).toBe(200);
        const [task] = await Task.find({
          name: 'Download Selected Statements Zip',
        });
        expect(task.value.ids).toEqual([statement1._id.toString()]);
        // The task above should have been sent to the queue
        expect(TaskHelpers.sendTaskMessage).toHaveBeenCalled();

        const sentTask = TaskHelpers.sendTaskMessage.mock.calls[0][0];
        expect(sentTask._id.toString()).toEqual(task._id.toString());
      });

      afterEach(async () => {
        await Task.deleteMany({
          name: 'Download Selected Statements Zip',
        });
      });
    });
  });

  describe('as a user with None rights', () => {
    let clientUserNoneToken;

    beforeEach(() => {
      const clientUserNone = {
        ...baseUser,
        rights: { [clientId]: { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' } },
      };
      clientUserNoneToken = jwt.sign(clientUserNone, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken);

        expect(res.status).toBe(403);
      });
    });
    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken)
          .send({ name: 'changedName' });

        expect(res.status).toBe(403);
      });
    });
    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken);

        expect(res.status).toBe(403);
      });
    });
    describe('/ POST', () => {
      it('should return 403', async () => {
        const params = { clientId, name: 'Name', address: 'Address', country: 'Country', vatNo: 'VATNO' };

        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken)
          .send(params);

        expect(res.status).toBe(403);
      });
    });
    describe('/:id/calculate POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken)
          .send({ id });

        expect(res.status).toBe(403);
      });
    });
    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken);

        expect(res.status).toBe(403);
      });
    });
    describe('/send_many POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken)
          .query({ ids: [statement1._id.toString()] });

        expect(res.status).toBe(403);
      });
    });
    describe('/unpublish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/download_selected_statements POST', () => {
      it('should return 403 forbidden for user with no rights', async () => {
        const statementId = randomId();

        const res = await request(server)
          .post('/statements/download_selected_statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNoneToken)
          .send({ statementIds: [statementId] });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden, user does not have access to all statements requested');
      });
    });
  });

  describe('as a user with View rights', () => {
    let clientUserViewToken;

    beforeEach(() => {
      const clientUserView = { ...baseUser, rights: { [clientId]: { periods: 'View' } } };
      clientUserViewToken = jwt.sign(clientUserView, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id GET', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken)
          .send({ name: 'changedName' });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/ POST', () => {
      it('should return 403', async () => {
        const params = {
          clientId,
          name: 'Name',
          address: 'Address',
          country: 'Country',
          vatNo: 'VATNO',
        };

        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken)
          .send(params);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken)
          .send({ id });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken)
          .query({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return 200', async () => {
        const id = statement3._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return 200', async () => {
        const id = statement3._id;

        const res = await request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserViewToken);

        expect(res.status).toBe(200);
      });
    });
  });

  describe('as a user with Edit rights', () => {
    let clientUserEditToken;
    beforeEach(() => {
      const clientUserEdit = {
        ...baseUser,
        rights: {
          [clientId]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' },
        },
      };
      clientUserEditToken = jwt.sign(clientUserEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id GET', () => {
      it('should return a statement and 200 status when statement found', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(200);
        expect(typeof res.body).toBe('object');
        expect(res.body.clientId).toBe(statement1.clientId);
        expect(res.body.name).toBe(statement1.name);
        expect(res.body.accountingPeriod).toBe(statement1.accountingPeriod);
        expect(res.body.status).toBe(statement1.status);
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await request(server)
          .get(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id PUT', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken)
          .send({ name: 'changedName' });

        expect(res.status).toBe(200);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/ POST', () => {
      it('should return 200', async () => {
        const params = {
          clientId: 'ClientID',
          periodId: 'PeriodId',
          contractId: 'ContractID',
          name: 'Name',
          accountingPeriod: 'Accounting Statement',
          status: 'Status',
          openingValue: 123,
          revenue: 456,
          costs: 789,
          closingValue: 321,
        };

        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken)
          .send(params);

        expect(res.status).toBe(200);
        expect(res.body.clientId).toBe(clientId);
        expect(res.body.periodId).toBe(params.periodId);
        expect(res.body.contractId).toBe(params.contractId);
        expect(res.body.name).toBe(params.name);
        expect(res.body.accountingPeriod).toBe(params.accountingPeriod);
        expect(res.body.status).toBe(params.status);
        expect(res.body.openingValue).toBe(params.openingValue);
      });
    });

    // describe('/:id/calculate POST', () => {
    //   it('should return 200', async () => {
    //     const id = statement1._id.toString();

    //     const res = await request(server)
    //       .post(`/statements/${id}/calculate`)
    //       .set('applicationToken', applicationToken)
    //       .set('token', clientUserEditToken)
    //       .send({ id });

    //     expect(res.status).toBe(200);
    //   });
    // });

    describe('/:id/send GET', () => {
      it('should return 200', async () => {
        const id = statement2._id;

        const res = await request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/send_many POST', () => {
      it('should return 200', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).toBe(200);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 200', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).toBe(200);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 200', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).toBe(200);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a statement analysis and 200 status', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(200);
        expect(res.body.analytics).toBe(statement1.analysis);
      });

      it('should return a 404 status', async () => {
        const res = await request(server)
          .get(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a statement sale files and 200 status', async () => {
        const id = statement3._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a statement costs and 200 status', async () => {
        const id = statement3._id;

        const res = await request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/download_selected_statements POST', () => {
      it('should return 200, and create a task in the database when called with valid statement ids', async () => {
        const res = await request(server)
          .post('/statements/download_selected_statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEditToken)
          .send({ statementIds: [statement1._id.toString()] });

        expect(res.status).toBe(200);
        const [task] = await Task.find({
          name: 'Download Selected Statements Zip',
        });
        expect(task.value.ids).toEqual([statement1._id.toString()]);

        expect(TaskHelpers.sendTaskMessage).toHaveBeenCalled();

        const sentTask = TaskHelpers.sendTaskMessage.mock.calls[0][0];
        expect(sentTask._id.toString()).toEqual(task._id.toString());
      });

      afterEach(async () => {
        await Task.deleteMany({
          name: 'Download Selected Statements Zip',
        });
      });
    });
  });

  describe('as an internal user', function () {
    let userInternalToken;

    beforeEach(() => {
      const userInternal = { ...baseUser, internal: true, rights: {} };
      userInternalToken = jwt.sign(userInternal, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id GET', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id PUT', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(200);
      });

      it('should not update the statement', async () => {
        const id = statement1._id;

        await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken)
          .send({ title: 'Changed Title' });

        const updatedStatement = await Statement.findById(id);
        expect(updatedStatement.title).toBe(statement1.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        expect(res.status).toBe(200);
      });

      it('should delete the statement', async () => {
        const id = statement1._id;

        await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        const statementCount = await Statement.countDocuments({ _id: id });
        expect(statementCount).toBe(0);
      });
    });

    describe('/ POST', () => {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(200);
      });
      // Invalid Test
      //   it('should not create a statement', async () => {
      //     const originalCount = await Statement.countDocuments({});

      //     // Trying to POST to /statements (create), not to /statements/:id which is invalid for POST create
      //     await request(server)
      //       .post('/statements')
      //       .set('applicationToken', applicationToken)
      //       .set('token', userInternalToken)
      //       .send({ title: 'Changed Title' });

    //     const updatedCount = await Statement.countDocuments({});
    //     expect(updatedCount).toBe(originalCount);
    //   });
    });

    // describe('/:id/calculate POST', () => {
    //   it('should return 200', async () => {
    //     const id = statement1._id;

    //     const res = await request(server)
    //       .post(`/statements/${id}/calculate`)
    //       .set('applicationToken', applicationToken)
    //       .set('token', userInternalToken)
    //       .send({ id });

    //     expect(res.status).toBe(200);
    //   });
    // });

    describe('/:id/send GET', () => {
      it('should return 403 forbidden', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 403 forbidden', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).toBe(403);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 403 forbidden', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 403 forbidden', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken);

        expect(res.status).toBe(200);
      });
    });

    describe('/download_selected_statements POST', () => {
      it('should return 200, and create a task in the database when called with valid statement ids', async () => {
        const res = await request(server)
          .post('/statements/download_selected_statements')
          .set('applicationToken', applicationToken)
          .set('token', userInternalToken)
          .send({ statementIds: [statement1._id.toString()] });

        expect(res.status).toBe(200);
        const [task] = await Task.find({
          name: 'Download Selected Statements Zip',
        });
        expect(task.value.ids).toEqual([statement1._id.toString()]);

        expect(TaskHelpers.sendTaskMessage).toHaveBeenCalled();

        const sentTask = TaskHelpers.sendTaskMessage.mock.calls[0][0];
        expect(sentTask._id.toString()).toEqual(task._id.toString());
      });

      afterEach(async () => {
        await Task.deleteMany({
          name: 'Download Selected Statements Zip',
        });
      });
    });
  });

  describe('as a parent user without a client', () => {
    let userParentToken;

    beforeEach(() => {
      const userParent = { ...baseUser, internal: false, parentId: 'parentId', rights: {} };
      userParentToken = jwt.sign(userParent, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should not update the statement', async () => {
        const id = statement1._id;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);

        const newStatements = await Statement.find({ _id: id });
        expect(newStatements[0].title).toBe(statement1.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the statement', async () => {
        const id = statement1._id;

        await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        const statementCount = await Statement.countDocuments({ _id: id });
        expect(statementCount).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', userParentToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a statement', async () => {
        const id = statement1._id;
        const originalCount = await Statement.countDocuments({ clientId });

        await request(server)
          .post(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken)
          .send({ title: 'Changed Title' });

        const updatedCount = await Statement.countDocuments({ clientId });
        expect(updatedCount).toBe(originalCount);
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken)
          .send({ id });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', userParentToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', userParentToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', userParentToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', userParentToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });
  describe('as a payee user', () => {
    let userPayee; let userPayeeToken;

    beforeEach(() => {
      userPayee = { ...baseUser, internal: false, payeeId, contractIds, rights: {} };
      userPayeeToken = jwt.sign(userPayee, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the statement', async () => {
        const id = statement1._id;

        await request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ name: 'Changed Title' });

        const newStatements = await Statement.find({ _id: statement1._id });
        expect(newStatements[0].name).toBe(statement1.name);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the statement', async () => {
        const id = statement1._id;

        await request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken);

        const statementCount = await Statement.countDocuments({ _id: id });
        expect(statementCount).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ id });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ ids: [id] });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
    describe('/download_selected_statements POST', () => {
      it('should return 200 when the user has access to all statements', async () => {
        const statementId = statement1._id.toString();
        const userPayeeWithPayeeIdToken = jwt.sign({ ...userPayee, payeeId: payee._id }, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await request(server)
          .post('/statements/download_selected_statements')
          .set('applicationToken', applicationToken)
          .set('token', userPayeeWithPayeeIdToken)
          .send({ statementIds: [statementId] });

        expect(res.status).toBe(200);
      });
      it('should return 403 when the user does not have access to all statements', async () => {
        const userPayeeWithPayeeIdToken = jwt.sign({ ...userPayee, payeeId: payee._id }, process.env.jsonSecretToken, { expiresIn: 86400 });

        const res = await request(server)
          .post('/statements/download_selected_statements')
          .set('applicationToken', applicationToken)
          .set('token', userPayeeWithPayeeIdToken)
          .send({ statementIds: [statement4._id.toString()] });
        expect(res.status).toBe(403);
      });

      it('should return 500 when the payee is not found', async () => {
        const statementId = statement1._id.toString();

        const res = await request(server)
          .post('/statements/download_selected_statements')
          .set('applicationToken', applicationToken)
          .set('token', userPayeeToken)
          .send({ statementIds: [statementId] });
        expect(res.status).toBe(500);
      });
    });
  });
});
