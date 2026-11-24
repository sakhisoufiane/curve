const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');

const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const config = require('../../config.json');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: (...args) => mockCSVRawExport(...args),
}));

const Client = require('../../models/client');
const Cost = require('../../models/cost');
const Payee = require('../../models/payee');
const User = require('../../models/user');

const server = supertest(require('../../index'));

const applicationToken = config.applicationTokens[0];

describe('/costs', function () {
  logger.info('>>>file>>>> int/routes/costs .....................');
  let importFromExcel;
  let sendExport;
  let client;
  let user;
  let cost1;

  beforeAll(() => {
    importFromExcel = jest.spyOn(Cost, 'importFromExcel').mockResolvedValue();
    sendExport = jest.spyOn(Cost, 'sendExport').mockResolvedValue();
  });

  beforeEach(async () => {
    client = new Client({
      _id: randomId(),
      name: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 15),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: randomString() });
    await user.save();

    cost1 = new Cost({ clientId: client._id, name: 'Cost 1', invoiceNo: 'InvoiceNo1', file: 'File1', type: 'COST' });
    await cost1.save();
    const cost2 = new Cost({ clientId: client._id, name: 'Cost 2', invoiceNo: 'InvoiceNo2', file: 'File2', type: 'COST' });
    await cost2.save();
    const cost3 = new Cost({ clientId: client._id, name: 'Cost 3', invoiceNo: 'InvoiceNo3', file: 'File3', type: 'COST' });
    await cost3.save();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('as a client user', () => {
    let clientUser;

    beforeEach(() => {
      const userEdit = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
      userEdit.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
      clientUser = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('as a user with full rights', () => {
      describe('/ GET', () => {
        it('should return a list of costs', async () => {
          const res = await server
            .get('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.costs).toBeInstanceOf(Array);
          const costs = await Cost.find({ clientId: client._id });
          expect(res.body.costs.length).toBe(costs.length);
        });

        it('should return metadata of costs index on / GET', async () => {
          const res = await server
            .get('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.meta).toBeInstanceOf(Object);
        });

        it('should return the first page if not passed a specific page', async () => {
          const res = await server
            .get('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(1);
        });

        it('should return the passed page when passed the parameter', async () => {
          const res = await server
            .get('/costs?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(3);
        });

        it('should return the pages available', async () => {
          const res = await server
            .get('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.totalPages).toBe(1);
        });

        it('should set the amount to be returned per page when passed a limit option', async () => {
          const res = await server
            .get('/costs?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.costs.length).toBe(1);
          const costs = await Cost.countDocuments({ clientId: client._id });
          expect(res.body.meta.totalPages).toBe(costs);
        });
      });
    });

    describe('/:id GET', function () {
      it('should return a cost and 200 status when a cost is found', async () => {
        const res = await server
          .get(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body.clientId).toBe(cost1.clientId);
        expect(res.body.type).toBe(cost1.type);
        expect(res.body.invoiceNo).toBe(cost1.invoiceNo);
        expect(res.body.targetPeriod).toBe(cost1.targetPeriod);
        expect(res.body.description).toBe(cost1.description);
        expect(res.body.file).toBe(cost1.file);
      });
    });

    it('should return a 500 status when invalid cost id', async () => {
      const id = 'anything';

      const res = await server
        .get(`/costs/${id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Internal error, please try again');
    });

    it('should return a 404 status when cost is not found', async () => {
      const unknownId = randomId().toString();

      const res = await server
        .get(`/costs/${unknownId}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(`Could not find Cost with ID ${unknownId}`);
    });

    describe('/:id PUT', function () {
      it('should update with passed values only when a cost is found', async () => {
        // Cost.find({ name: 'Cost 1' }, function (e, costs) {
        // const id = costs[0]._id;
        const changedName = `${cost1.name}changed`;

        const res = await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ name: changedName });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe(changedName);
      });

      it('should not update clientId', async () => {
        const changedTitle = `${cost1.title}changed`;

        const res = await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ name: changedTitle, clientId: 'changed' });

        expect(res.body.clientId).toBe(cost1.clientId);
      });

      it("should not update any fields it isn't passed", async () => {
        const changedTitle = `${cost1.title}changed`;

        const res = await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ name: changedTitle, clientId: 'changed' });

        expect(res.body.foreignId).toBe(cost1.foreignId);
      });

      it('should error when name field is missing', async () => {
        const res = await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ name: '' });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('A Name is required');
      });

      describe('when a cost is not found', function () {
        it('should return a 404 status', async () => {
          const id = randomId().toString();

          const res = await server
            .put(`/costs/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ name: 'Changed Cost Title' });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Cost with ID ${id}`);
        });
      });

      describe('parameters validation', () => {
        it('should return 400 when amount param is a non-numeric string', async () => {
          // Arrange
          const id = cost1._id.toString();

          // Act
          const res = await server
            .put(`/costs/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ amount: '100,5' });

          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBeTruthy();
        });

        it('should return 400 when amount param is an empty string', async () => {
          // Arrange
          const id = cost1._id.toString();

          // Act
          const res = await server
            .put(`/costs/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ amount: '' });

          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBeTruthy();
        });

        it('should return 200 when amount param is a numeric string', async () => {
          // Arrange
          const id = cost1._id.toString();

          // Act
          const res = await server
            .put(`/costs/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ amount: '10.5' });

          // Assert
          expect(res.status).toBe(200);
        });
      });
    });

    describe('/:id DELETE', function () {
      it('should delete the cost and return a 200 status when a cost is found', async () => {
        const res = await server
          .delete(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(200);
        const cost = await Cost.find({ _id: cost1._id });
        expect(cost).toEqual([]);
      });

      it('should return a 404 status when a cost is not found', async () => {
        const id = randomId().toString();

        const res = await server
          .delete(`/costs/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Cost with ID ${id}`);
      });
    });

    describe('/ POST', function () {
      it('should return a cost created with the passed parameters', async () => {
        const originalCosts = await Cost.find({});

        const params = {
          clientId: client._id.toString(),
          name: 'name',
          type: 'type',
          invoiceNo: 'invoiceNo',
          targetPeriod: 'targetPeriod',
          description: 'description',
          file: 'file',
        };

        const res = await server
          .post('/costs')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(params);

        expect(res.status).toBe(200);
        expect(res.body.clientId).toBe(params.clientId);
        expect(res.body.name).toBe(params.name);
        expect(res.body.type).toBe(params.type);
        expect(res.body.invoiceNo).toBe(params.invoiceNo);
        expect(res.body.targetPeriod).toBe(params.targetPeriod);
        expect(res.body.description).toBe(params.description);
        expect(res.body.file).toBe(params.file);

        const costs = await Cost.find({});
        expect(costs.length).toBe(originalCosts.length + 1);
      });

      describe('parameters validation', () => {
        it('should return 400 when amount param is a non-numeric string', async () => {
          // Arrange
          const params = { name: 'name', amount: '100,5' };

          // Act
          const res = await server
            .post('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBeTruthy();
        });

        it('should return 400 when amount param is an empty string', async () => {
          // Arrange
          const params = { name: 'name', amount: '' };

          // Act
          const res = await server
            .post('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBeTruthy();
        });

        it('should return 200 when amount param is a numeric string', async () => {
          // Arrange
          const params = {
            name: 'name',
            type: 'type',
            invoiceNo: 'invoiceNo',
            amount: '10.5',
          };

          // Act
          const res = await server
            .post('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params);

          // Assert
          expect(res.status).toBe(200);
        });
      });
    });

    describe('/import POST', function () {
      describe('when a file is passed', function () {
        it('should give a 200', async () => {
          const res = await server
            .post('/costs/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .attach('file', 'test/test-data/test_cost.xlsx');

          expect(res.status).toBe(200);
          expect(res.body.message).toBe('Costs are importing, and a report will be sent to you shortly.');
        });

        it('should call importFromExcel with the uploaded file', async () => {
          await server
            .post('/costs/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .attach('file', 'test/test-data/test_cost.xlsx');

          expect(importFromExcel).toHaveBeenCalled();
        });
      });

      describe('when no file is uploaded', function () {
        it('should return an error without a file in the request', async () => {
          const res = await server
            .post('/costs/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(400);
          expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
        });
      });
    });

    describe('/export POST', function () {
      it('should return 200', async () => {
        const res = await server
          .post('/costs/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [cost1._id] });

        expect(res.status).toBe(200);
      });

      it('should call sendExport', async () => {
        await server
          .post('/costs/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [cost1._id] });

        expect(sendExport).toHaveBeenCalled();
      });
    });

    describe('as a user with None rights', function () {
      let clientUserNone;

      beforeEach(() => {
        const userNone = { id: user._id, internal: false, parentId: null, clientId: null, rights: {} };
        userNone.rights[client._id] = { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' };
        clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', function () {
        it('should return 403', async () => {
          const res = await server
            .get('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id GET', function () {
        it('should return 403', async () => {
          const res = await server
            .get(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id PUT', function () {
        it('should return 403', async () => {
          const res = await server
            .put(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ name: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', function () {
        it('should return 403', async () => {
          const res = await server
            .delete(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', function () {
        it('should return 403', async () => {
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            partyNo: 2,
            payeeId: 'payeeId',
            name: 'name',
            cae: 'cae',
            mainPro: 'mainPro',
            mechanicalPro: 'mechanicalPro',
            performancePro: 'performancePro',
            syncPro: 'syncPro',
            mainProIdentifier: 'mainProIdentifier',
            mechanicalProIdentifier: 'mechanicalProIdentifier',
            performanceProIdentifier: 'performanceProIdentifier',
            syncProIdentifier: 'syncProIdentifier',
            controlled: true,
            notes: 'notes',
            societies: ['S1', 'S2', 'S3'],
            costAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          const res = await server
            .post('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', function () {
        it('should give a 403', async () => {
          const res = await server
            .post('/costs/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .attach('file', 'test/test-data/test_cost.xlsx');

          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', function () {
        it('should return 403', async () => {
          const res = await server
            .post('/costs/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with View rights', function () {
      let clientUserView;

      beforeEach(() => {
        const userView = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
        userView.rights[client._id] = { sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View' };
        clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', function () {
        it('should return 200', async () => {
          const res = await server
            .get('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', function () {
        it('should return 200', async () => {
          const res = await server
            .get(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', function () {
        it('should return 403', async () => {
          const res = await server
            .put(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ name: 'changedName' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', function () {
        it('should return 403', async () => {
          const res = await server
            .delete(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', function () {
        it('should return 403', async () => {
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            partyNo: 2,
            payeeId: 'payeeId',
            name: 'name',
            cae: 'cae',
            mainPro: 'mainPro',
            mechanicalPro: 'mechanicalPro',
            performancePro: 'performancePro',
            syncPro: 'syncPro',
            mainProIdentifier: 'mainProIdentifier',
            mechanicalProIdentifier: 'mechanicalProIdentifier',
            performanceProIdentifier: 'performanceProIdentifier',
            syncProIdentifier: 'syncProIdentifier',
            controlled: true,
            notes: 'notes',
            societies: ['S1', 'S2', 'S3'],
            costAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          const res = await server
            .post('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(params);

          expect(res.status).toBe(403);
        });
      });

      describe('/import POST', function () {
        it('should give a 403', async () => {
          const res = await server
            .post('/costs/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .attach('file', 'test/test-data/test_cost.xlsx');

          expect(res.status).toBe(403);
        });
      });

      describe('/export POST', function () {
        it('should return 200', async () => {
          const res = await server
            .post('/costs/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [cost1._id] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await server
            .post('/costs/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [cost1._id] });

          expect(sendExport).toHaveBeenCalled();
        });
      });
    });

    describe('as a user with Edit rights', function () {
      let clientUserEdit;

      beforeEach(() => {
        const userEdit = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
        userEdit.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
        clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', function () {
        it('should return 200', async () => {
          const res = await server
            .get('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', function () {
        it('should return 200', async () => {
          const res = await server
            .put(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ name: 'changedName' });

          expect(res.status).toBe(200);
        });
      });

      describe('/:id DELETE', function () {
        it('should return 200', async () => {
          const res = await server
            .delete(`/costs/${cost1._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toBe(200);
        });
      });

      describe('/ POST', function () {
        it('should return 200', async () => {
          const params = {
            clientId: client._id.toString(),
            name: 'name',
            type: 'type',
            invoiceNo: 'invoiceNo',
            targetPeriod: 'targetPeriod',
            description: 'description',
            file: 'file',
          };

          const res = await server
            .post('/costs')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.name).toBe(params.name);
          expect(res.body.type).toBe(params.type);
          expect(res.body.invoiceNo).toBe(params.invoiceNo);
          expect(res.body.targetPeriod).toBe(params.targetPeriod);
          expect(res.body.description).toBe(params.description);
          expect(res.body.file).toBe(params.file);
        });
      });

      describe('/import POST', function () {
        it('should give a 200', async () => {
          const res = await server
            .post('/costs/import')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .attach('file', 'test/test-data/test_cost.xlsx');

          expect(res.status).toBe(200);
        });
      });

      describe('/export POST', function () {
        it('should return 200', async () => {
          const res = await server
            .post('/costs/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [cost1._id] });

          expect(res.status).toBe(200);
        });

        it('should call sendExport', async () => {
          await server
            .post('/costs/export')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [cost1._id] });

          expect(sendExport).toHaveBeenCalled();
        });
      });
    });
  });

  describe('as an internal user', function () {
    const internal = jwt.sign({ internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', function () {
      it('should return a 200 response', async () => {
        const res = await server
          .get('/costs')
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id GET', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the cost', async () => {
        const originalTitle = cost1.title;

        await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const updatedCost = await Cost.findById(cost1._id);
        expect(updatedCost.title).toBe(originalTitle);
      });
    });

    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .delete(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the cost', async () => {
        await server
          .delete(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internal);

        const count = await Cost.countDocuments({ _id: cost1._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', function () {
      it('should return a 200 response', async () => {
        const params = {
          clientId: client._id.toString(),
          name: 'name',
          type: 'type',
          invoiceNo: 'invoiceNo',
          targetPeriod: 'targetPeriod',
          description: 'description',
          file: 'file',
        };

        const res = await server
          .post('/costs')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send(params);

        expect(res.status).toBe(200);
      });

      it('should not create a cost', async () => {
        const originalCount = await Cost.countDocuments({});

        await server
          .post(`/costs/${cost1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const newCount = await Cost.countDocuments({});
        expect(newCount).toBe(originalCount);
      });
    });

    describe('/import POST', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/costs/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'test/test-data/test_cost.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a cost', async () => {
        const originalCount = await Cost.countDocuments({});

        await server
          .post('/costs/import')
          .set('applicationToken', applicationToken)
          .set('token', internal)
          .attach('file', 'test/test-data/test_cost.xlsx');

        const newCount = await Cost.countDocuments({});
        expect(newCount).toBe(originalCount);
      });
    });

    describe('/export POST', function () {
      it('should return a 403', async () => {
        const res = await server
          .post('/costs/export')
          .set('applicationToken', applicationToken)
          .set('token', internal);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('as a parent user without a client', function () {
    const parent = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get('/costs')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the cost', async () => {
        const originalTitle = cost1.title;

        await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const updatedCost = await Cost.findById(cost1._id);
        expect(updatedCost.title).toBe(originalTitle);
      });
    });

    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .delete(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the cost', async () => {
        await server
          .delete(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', parent);

        const count = await Cost.countDocuments({ _id: cost1._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/costs')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a cost', async () => {
        const originalCount = await Cost.countDocuments({});

        await server
          .post(`/costs/${cost1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .send({ title: 'Changed Title' });

        const newCount = await Cost.countDocuments({});
        expect(newCount).toBe(originalCount);
      });
    });

    describe('/import POST', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/costs/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'test/test-data/test_cost.xlsx');

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not import a cost', async () => {
        const originalCount = await Cost.countDocuments({});

        await server
          .post('/costs/import')
          .set('applicationToken', applicationToken)
          .set('token', parent)
          .attach('file', 'test/test-data/test_cost.xlsx');

        const newCount = await Cost.countDocuments({});
        expect(newCount).toBe(originalCount);
      });
    });

    describe('/export POST', function () {
      it('should return a 403', async () => {
        const res = await server
          .post('/costs/export')
          .set('applicationToken', applicationToken)
          .set('token', parent);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });
  });

  describe('as a payee user', function () {
    const contractId = '345';
    const contractIds = [contractId, '678'];
    let payeeToken;

    beforeEach(async () => {
      const payee = new Payee({ name: 'Payee Login', clientId: client._id });
      await payee.save();
      payeeToken = jwt.sign({
        internal: false, parentId: null, payeeId: payee._id, contractIds,
      }, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get('/costs')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the cost', async () => {
        const originalName = cost1.name;

        await server
          .put(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        const updatedCost = await Cost.findById(cost1._id);
        expect(updatedCost.name).toBe(originalName);
      });
    });

    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .delete(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not delete the cost', async () => {
        await server
          .delete(`/costs/${cost1._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        const count = await Cost.countDocuments({ _id: cost1._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', function () {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/costs')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a cost', async () => {
        const originalCount = await Cost.countDocuments({});

        await server
          .post('/costs')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        const newCount = await Cost.countDocuments({});
        expect(newCount).toBe(originalCount);
      });
    });

    describe('/import POST', function () {
      it('should return 403', async () => {
        const res = await server
          .post('/costs/import')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken)
          .attach('file', 'test/test-data/test_cost.xlsx');

        expect(res.status).toBe(403);
      });
    });

    describe('/export POST', function () {
      it('should return 403', async () => {
        const res = await server
          .post('/costs/export')
          .set('applicationToken', applicationToken)
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });
  });

  describe('/raw-export POST', () => {
    let clientUser;

    beforeEach(() => {
      mockCSVRawExport.mockReset();
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });

      const userEdit = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
      userEdit.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
      clientUser = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    it('should return 200 with async message when sync is not set', async () => {
      const res = await server
        .post('/costs/raw-export')
        .set('token', clientUser)
        .set('applicationToken', applicationToken)
        .send({ filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.message).toEqual('Your report will be sent to you via email shortly');
    });

    it('should return 200 with csvPublicLink when sync=true', async () => {
      const res = await server
        .post('/costs/raw-export')
        .set('token', clientUser)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toEqual('https://s3.amazonaws.com/test-export.csv');
    });

    it('should call CSVRawExport with sync=true when body param set', async () => {
      await server
        .post('/costs/raw-export')
        .set('token', clientUser)
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
        .post('/costs/raw-export')
        .set('token', clientUser)
        .set('applicationToken', applicationToken)
        .send({ sync: true, filter: {} });
      expect(res.status).toBe(500);
      expect(res.body.message).toEqual('Export failed');
    });

    it('should apply updatedAfter filter to updatedAt.$gte', async () => {
      await server
        .post('/costs/raw-export')
        .set('token', clientUser)
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
        .post('/costs/raw-export')
        .set('token', clientUser)
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
        .post('/costs/raw-export')
        .set('token', clientUser)
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
        .post('/costs/raw-export')
        .set('token', clientUser)
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
        .post('/costs/raw-export')
        .set('token', clientUser)
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

    it('should return 403 when user has no sales rights', async () => {
      const userNone = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
      userNone.rights[client._id] = { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' };
      const noRightsToken = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/costs/raw-export')
        .set('token', noRightsToken)
        .set('applicationToken', applicationToken)
        .send({ filter: {} });
      expect(res.status).toBe(403);
    });
  });

  describe('Date filtering', () => {
    let token;
    let oldCost;
    let midCost;
    let newCost;

    beforeEach(async () => {
      const userEdit = { id: user._id, internal: false, parentId: null, clientId: client._id, email: 'test-upload@curve.com', rights: {} };
      userEdit.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
      token = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });

      oldCost = new Cost({
        clientId: client._id,
        name: 'Old Cost',
        type: 'COST',
        invoiceNo: 'OLD-001',
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        updatedAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      await oldCost.save();

      midCost = new Cost({
        clientId: client._id,
        name: 'Mid Cost',
        type: 'COST',
        invoiceNo: 'MID-001',
        createdAt: new Date('2022-06-15T12:00:00.000Z'),
        updatedAt: new Date('2022-06-15T12:00:00.000Z'),
      });
      await midCost.save();

      newCost = new Cost({
        clientId: client._id,
        name: 'New Cost',
        type: 'COST',
        invoiceNo: 'NEW-001',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
      await newCost.save();
    });

    describe('createdAfter filter', () => {
      it('should filter costs created on or after the specified date', async () => {
        const res = await server
          .get('/costs?createdAfter=2022-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Mid Cost');
        expect(costNames).toContain('New Cost');
        expect(costNames).not.toContain('Old Cost');
      });

      it('should include costs created exactly on the filter date', async () => {
        const res = await server
          .get('/costs?createdAfter=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Mid Cost');
      });
    });

    describe('createdBefore filter', () => {
      it('should filter costs created on or before the specified date', async () => {
        const res = await server
          .get('/costs?createdBefore=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Old Cost');
        expect(costNames).toContain('Mid Cost');
        expect(costNames).not.toContain('New Cost');
      });

      it('should include costs created exactly on the filter date', async () => {
        const res = await server
          .get('/costs?createdBefore=2020-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Old Cost');
      });
    });

    describe('updatedAfter filter', () => {
      it('should filter costs updated on or after the specified date', async () => {
        const res = await server
          .get('/costs?updatedAfter=2022-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Mid Cost');
        expect(costNames).toContain('New Cost');
        expect(costNames).not.toContain('Old Cost');
      });

      it('should include costs updated exactly on the filter date', async () => {
        const res = await server
          .get('/costs?updatedAfter=2024-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('New Cost');
      });
    });

    describe('updatedBefore filter', () => {
      it('should filter costs updated on or before the specified date', async () => {
        const res = await server
          .get('/costs?updatedBefore=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Old Cost');
        expect(costNames).toContain('Mid Cost');
        expect(costNames).not.toContain('New Cost');
      });

      it('should include costs updated exactly on the filter date', async () => {
        const res = await server
          .get('/costs?updatedBefore=2022-06-15')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Mid Cost');
      });
    });

    describe('date range combinations', () => {
      it('should apply createdAfter and createdBefore together', async () => {
        const res = await server
          .get('/costs?createdAfter=2021-01-01&createdBefore=2023-01-01')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Mid Cost');
        expect(costNames).not.toContain('Old Cost');
        expect(costNames).not.toContain('New Cost');
      });

      it('should combine date filters with text search', async () => {
        const res = await server
          .get('/costs?createdAfter=2020-01-01&text=Mid')
          .set('applicationToken', applicationToken)
          .set('token', token);

        expect(res.status).toBe(200);
        const costNames = res.body.costs.map((c) => c.name);
        expect(costNames).toContain('Mid Cost');
        expect(costNames).not.toContain('Old Cost');
        expect(costNames).not.toContain('New Cost');
      });
    });
  });
});
