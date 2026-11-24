/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
process.env.NODE_ENV = 'test';

const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const config = require('../../../config.json');
const server = require('../../../index');

const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Cost = require('../../../models/cost');
const Payee = require('../../../models/payee');
const Period = require('../../../models/period');
const SalesFile = require('../../../models/salesFile');
const Statement = require('../../../models/statement');
const User = require('../../../models/user');

const { expect } = chai;
chai.use(chaiHttp);

let statement1; let statement2; let statement3; let salesFile; let cost; let period; let payee; let contract;
const applicationToken = config.applicationTokens[0];
const unknownObjectId = '5ff35cdd382af5001071ffee';

const payeeId = randomId();
const contractId = randomId();
const contractIds = [contractId, randomId()];

const client = new Client({ name: randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
const user = new User();
const baseUser = { id: user._id, internal: false, parentId: null, clientId: client._id, email: 'test-upload@curve.com', rights: {} };

describe('/statements', function () {
  logger.info('>>>file>>>> int/routes/statements .....................');

  beforeEach(async () => {
    sinon.stub(TaskHelpers, 'sendTaskMessage').resolves();

    await client.save();
    await user.save();

    salesFile = new SalesFile(
      { clientId: client._id, name: 'name', invoiceNo: 'invoiceNo', salesAccountName: 'salesAccountName', salesTemplateName: 'salesTemplateName', salesTemplateId: 'salesTemplateId', targetPeriod: 'targetPeriodTest' },
    );
    await salesFile.save();

    cost = new Cost({ clientId: client._id, name: 'Cost 1', invoiceNo: 'InvoiceNo1', file: 'File1', type: 'Type1' });
    await cost.save();

    payee = new Payee({ clientId: client._id, name: 'Payee 1' });
    await payee.save();

    contract = new Contract({ payeeId: payee._id.toString(), name: 'Contract 1' });
    await contract.save();

    period = new Period({ clientId: client._id, name: 'Period 1', startDate: new Date(), endDate: new Date() });
    await period.save();

    statement1 = new Statement({ clientId: client._id, name: 'Statement 1', contractId: contract._id, analysis: 'analysis', periodId: period._id });
    await statement1.save();

    statement2 = new Statement({ clientId: client._id, name: 'Statement 2', contractId: contract._id, status: 'Published', periodId: period._id });
    await statement2.save();

    statement3 = new Statement({ clientId: client._id, name: 'Statement 3', contractId: contract._id, periodId: period._id, salesFilesIds: [salesFile._id], costIds: [cost._id] });
    await statement3.save();
  });

  afterEach(async () => {
    sinon.restore();

    await Cost.collection.drop();
    await Contract.collection.drop();
    await Payee.collection.drop();
    await Period.collection.drop();
    await SalesFile.collection.drop();
    await Statement.collection.drop();
  });

  after(async () => {
    await User.collection.deleteMany({});
    await Contract.collection.deleteMany({});
    await Client.collection.deleteMany({});
  });

  describe('as a client user with full rights', function () {
    const userFull = { ...baseUser, rights: { [client._id]: { periods: 'Edit' } } };
    const clientUserFull = jwt.sign(userFull, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return a list of statements', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(200);
        expect(res.body.statements).to.be.an('array');
        const statements = await Statement.find({ clientId: client._id });
        expect(res.body.statements.length).to.be.eq(statements.length);
      });

      it('should return metadata of statements index on / GET', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(200);
        expect(res.body.meta).to.be.an('object');
      });

      it('should return the first page if not passed a specific page', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.body.meta.currentPage).to.be.eq(1);
      });

      it('should return the passed page when passed the parameter', async () => {
        const res = await chai.request(server)
          .get('/statements?page=3')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.body.meta.currentPage).to.be.eq(3);
      });

      it('should return the pages available', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.body.meta.totalPages).to.be.eq(1);
      });

      it('should set the amount to be returned per page when passed a limit option', async () => {
        const res = await chai.request(server)
          .get('/statements?limit=1')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.body.statements.length).to.eq(1);
        const statementCount = await Statement.countDocuments({ clientId: client._id });
        expect(res.body.meta.totalPages).to.be.eq(statementCount);
      });
    });

    describe('/:id GET', () => {
      it('should return a statement and 200 status', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(200);
        expect(res.body).to.be.be.a('object');
        expect(res.body.clientId).to.eq(statement1.clientId);
        expect(res.body.name).to.eq(statement1.name);
        expect(res.body.accountingPeriod).to.eq(statement1.accountingPeriod);
        expect(res.body.status).to.eq(statement1.status);
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await chai.request(server)
          .get(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(404);
        expect(res.body.message).to.eq(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id PUT', () => {
      it('should update with passed values only', async () => {
        const id = statement1._id;
        const changedName = `${statement1.name}changed`;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ name: changedName });

        expect(res.status).to.eq(200);
        expect(res.body.name).to.eq(changedName);
      });

      it('should not update clientId', async () => {
        const id = statement1._id;
        const changedTitle = `${statement1.name}changed`;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ name: changedTitle, clientId: 'changed' });

        expect(res.body.clientId).to.eq(statement1.clientId);
      });

      it("should not update any fields it isn't passed", async () => {
        const id = statement1._id;
        const changedName = `${statement1.name}changed`;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ name: changedName, clientId: 'changed' });

        expect(res.body.foreignId).to.eq(statement1.foreignId);
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await chai.request(server)
          .put(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ title: 'Changed Statement Title' });

        expect(res.status).to.eq(404);
        expect(res.body.message).to.eq(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id DELETE', () => {
      it('should delete the statement and return a 200 status when statement is found', async () => {
        const statements = await Statement.find({});
        const id = statements[0]._id;

        const res = await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(200);
        const newStatements = await Statement.find({});
        expect(newStatements.length).to.eq(statements.length - 1);
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await chai.request(server)
          .delete(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(404);
        expect(res.body.message).to.eq(`Could not find Statement with ID ${unknownObjectId}`);
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

        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send(params);

        expect(res.status).to.eq(200);
        expect(res.body.clientId).to.eq(client._id.toString());
        expect(res.body.periodId).to.eq(params.periodId);
        expect(res.body.contractId).to.eq(params.contractId);
        expect(res.body.name).to.eq(params.name);
        expect(res.body.accountingPeriod).to.eq(params.accountingPeriod);
        expect(res.body.status).to.eq(params.status);
        expect(res.body.openingValue).to.eq(params.openingValue);
      });

      it('should add the statement to the database', async () => {
        const statements = await Statement.find({});
        const params = { clientId: '123', name: 'Post Statement' };

        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send(params);

        expect(res.status).to.eq(200);
        const newStatements = await Statement.find({});
        expect(newStatements.length).to.eq(statements.length + 1);
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 200', async () => {
        const id = statement2._id;

        const res = await chai.request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ id });

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 200', async () => {
        const id = statement2._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(200);
      });
    });

    describe('/send_many POST', () => {
      it('should return 200', async () => {
        const res = await chai.request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ filter: { periodId: period._id } });

        expect(res.status).to.eq(200);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 200 when filtering by periodId', async () => {
        const res = await chai.request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ ids: [], filter: { periodId: period._id } });

        expect(res.status).to.eq(200);
      });

      it('should return 200 when filtering by statementIds', async () => {
        const res = await chai.request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ ids: [statement1._id] });

        expect(res.status).to.eq(200);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 200 when filtering by periodId', async () => {
        const res = await chai.request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ ids: [], filter: { periodId: period._id } });

        expect(res.status).to.eq(200);
      });

      it('should return 200 when filtering by statementIds', async () => {
        const res = await chai.request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull)
          .send({ ids: [statement1._id] });

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a statement analysis and 200 status', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(200);
        expect(res.body.analytics).to.eq(statement1.analysis);
      });

      it('should return a 404 status', async () => {
        const res = await chai.request(server)
          .get(`/statements/${unknownObjectId}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(404);
        expect(res.body.message).to.eq(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a statement sale files and 200 status', async () => {
        const id = statement3._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);
        expect(res.status).to.eq(200);
      });
      it('should return a targetPeriodId value with the salesFiles', async () => {
        const id = statement3._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);
        expect(res.body.salesFiles[0].targetPeriod).to.eq('targetPeriodTest');
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a statement cost and 200 status', async () => {
        const id = statement3._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserFull);

        expect(res.status).to.eq(200);
      });
    });
  });

  describe('as a user with None rights', () => {
    const userNone = {
      ...baseUser,
      rights: { [client._id]: { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' } },
    };
    const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return 403', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({ name: 'changedName' });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).to.eq(403);
      });
    });

    describe('/ POST', () => {
      it('should return 403', async () => {
        const params = { clientId: client._id.toString(), name: 'Name', address: 'Address', country: 'Country', vatNo: 'VATNO' };

        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send(params);

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({ id });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).to.eq(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 200', async () => {
        const res = await chai.request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .query({ ids: [statement1._id.toString()] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).to.eq(403);
      });
    });
  });

  describe('as a user with View rights', function () {
    const userView = { ...baseUser, rights: { [client._id]: { periods: 'View' } } };
    const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id GET', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({ name: 'changedName' });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).to.eq(403);
      });
    });

    describe('/ POST', () => {
      it('should return 403', async () => {
        const params = {
          clientId: client._id.toString(),
          name: 'Name',
          address: 'Address',
          country: 'Country',
          vatNo: 'VATNO',
        };

        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send(params);

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/calculate POST', function () {
      it('should return 403', function (done) {
        const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
        const id = statement1._id;
        chai.request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({ id })
          .end(function (err, res) {
            expect(res.status).to.eq(403);
            done();
          });
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).to.eq(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .query({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return 200', async () => {
        const id = statement3._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return 200', async () => {
        const id = statement3._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).to.eq(200);
      });
    });
  });

  describe('as a user with Edit rights', function () {
    const userEdit = { ...baseUser, rights: { [client._id]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' } } };
    const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id GET', () => {
      it('should return a statement and 200 status when statement found', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(200);
        expect(res.body).to.be.be.a('object');
        expect(res.body.clientId).to.eq(statement1.clientId);
        expect(res.body.name).to.eq(statement1.name);
        expect(res.body.accountingPeriod).to.eq(statement1.accountingPeriod);
        expect(res.body.status).to.eq(statement1.status);
      });

      it('should return a 404 status when statement not found', async () => {
        const res = await chai.request(server)
          .get(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(404);
        expect(res.body.message).to.eq(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id PUT', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ name: 'changedName' });

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(200);
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

        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send(params);

        expect(res.status).to.eq(200);
        expect(res.body.clientId).to.eq(client._id.toString());
        expect(res.body.periodId).to.eq(params.periodId);
        expect(res.body.contractId).to.eq(params.contractId);
        expect(res.body.name).to.eq(params.name);
        expect(res.body.accountingPeriod).to.eq(params.accountingPeriod);
        expect(res.body.status).to.eq(params.status);
        expect(res.body.openingValue).to.eq(params.openingValue);
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 200', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ id });

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 200', async () => {
        const id = statement2._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(200);
      });
    });

    describe('/send_many POST', () => {
      it('should return 200', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).to.eq(200);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 200', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).to.eq(200);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 200', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a statement analysis and 200 status', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(200);
        expect(res.body.analytics).to.eq(statement1.analysis);
      });

      it('should return a 404 status', async () => {
        const res = await chai.request(server)
          .get(`/statements/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(404);
        expect(res.body.message).to.eq(`Could not find Statement with ID ${unknownObjectId}`);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a statement sale files and 200 status', async () => {
        const id = statement3._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a statement costs and 200 status', async () => {
        const id = statement3._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).to.eq(200);
      });
    });
  });

  describe('as an internal user', function () {
    const userInternal = { ...baseUser, internal: true, rights: {} };
    const clientUserInternal = jwt.sign(userInternal, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return a 200 response', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id GET', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id PUT', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        expect(res.status).to.eq(200);
      });

      it('should not update the statement', async () => {
        const id = statement1._id;

        await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        const newStatements = await Statement.find({ _id: id });
        expect(newStatements[0].title).to.eq(statement1.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).to.eq(200);
      });

      it('should delete the statement', async () => {
        const id = statement1._id;

        await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        const statementCount = await Statement.countDocuments({ _id: id });
        expect(statementCount).to.eq(0);
      });
    });

    describe('/ POST', () => {
      it('should return a 200 response', async () => {
        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        expect(res.status).to.eq(200);
      });

      it('should not create a statement', async () => {
        const id = statement1._id;

        const originalCount = await Statement.countDocuments({});

        await chai.request(server)
          .post(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        const updatedCount = await Statement.countDocuments({});
        expect(updatedCount).to.eq(originalCount);
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 200', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ id });

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).to.eq(403);
      });
    });

    describe('/send_many GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ ids: [id], filter: { periodId: period._id } });

        expect(res.status).to.eq(403);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a 200 response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a 200 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).to.eq(200);
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a 200 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).to.eq(200);
      });
    });
  });

  describe('as a parent user without a client', function () {
    const userParent = { ...baseUser, internal: false, parentId: 'parentId', rights: {} };
    const clientUserParent = jwt.sign(userParent, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await chai.request(server)
          .get('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should not update the statement', async () => {
        const id = statement1._id;

        await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent)
          .send({ title: 'Changed Title' });

        const newStatements = await Statement.find({ _id: id });
        expect(newStatements[0].title).to.eq(statement1.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });

      it('should not delete the statement', async () => {
        const id = statement1._id;

        await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        const statementCount = await Statement.countDocuments({ _id: id });
        expect(statementCount).to.eq(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent)
          .send({ title: 'Changed Title' });

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });

      it('should not create a statement', async () => {
        const id = statement1._id;
        const originalCount = await Statement.countDocuments({});

        await chai.request(server)
          .post(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent)
          .send({ title: 'Changed Title' });

        const updatedCount = await Statement.countDocuments({});
        expect(updatedCount).to.eq(originalCount);
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent)
          .send({ id });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).to.eq(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserParent);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });
  });

  describe('as a payee user', () => {
    const userPayee = { ...baseUser, internal: false, payeeId, contractIds, rights: {} };
    const clientUserPayee = jwt.sign(userPayee, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee)
          .send({ title: 'Changed Title' });

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });

      it('should not update the statement', async () => {
        const id = statement1._id;

        await chai.request(server)
          .put(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee)
          .send({ name: 'Changed Title' });

        const newStatements = await Statement.find({ _id: statement1._id });
        expect(newStatements[0].name).to.eq(statement1.name);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });

      it('should not delete the statement', async () => {
        const id = statement1._id;

        await chai.request(server)
          .delete(`/statements/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        const statementCount = await Statement.countDocuments({ _id: id });
        expect(statementCount).to.eq(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await chai.request(server)
          .post('/statements')
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee)
          .send({ title: 'Changed Title' });

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id/calculate POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post(`/statements/${id}/calculate`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee)
          .send({ id });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/send GET', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .get(`/statements/${id}/send`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        expect(res.status).to.eq(403);
      });
    });

    describe('/send_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post('/statements/send_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/publish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post('/statements/publish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/unpublish_many POST', () => {
      it('should return 403', async () => {
        const id = statement1._id.toString();

        const res = await chai.request(server)
          .post('/statements/unpublish_many')
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee)
          .send({ ids: [id] });

        expect(res.status).to.eq(403);
      });
    });

    describe('/:id/detail GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/detail`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id/sales_files GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/sales_files`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });

    describe('/:id/costs GET', () => {
      it('should return a 403 forbidden response', async () => {
        const id = statement1._id;

        const res = await chai.request(server)
          .get(`/statements/${id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserPayee);

        expect(res.status).to.eq(403);
        expect(res.body.message).to.eq('Forbidden');
      });
    });
  });
});
