jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  BigQuery: jest.fn().mockReturnValue({
    getSize: jest.fn().mockImplementation((table, selection, filter, cb) => cb(null, [{ count: 0 }])),
    getDistinct: jest.fn().mockImplementation((table, column, filter, cb) => cb(null, [])),
    getCount: jest.fn().mockImplementation((table, column, filter, cb) => cb(null, [{ count: 0 }])),
  }),
  TaskHelpers: { createTaskAndSendMessage: jest.fn().mockResolvedValue({}) },
}));

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: mockCSVRawExport,
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const { randomString, randomDate, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { AtlasSearch } = require('@curveroyaltysystems/curve-shared-logic');

const config = require('../../config.json');
const server = require('../../index');
const Client = require('../../models/client');
const Import = require('../../models/import');
const ImportPartner = require('../../models/importPartner');
const Payee = require('../../models/payee');
const User = require('../../models/user');
const Work = require('../../models/work');
const DeliveredWork = require('../../models/deliveredWork');
const WorkController = require('../../controllers/work');
const SalesItemHelpers = require('../../libs/salesItemHelpers');

const [applicationToken] = config.applicationTokens;

describe('/works', () => {
  let client;
  let user;
  let baseUser;
  let payee;
  let work1;
  let work2;
  let work3;
  let importFromExcelStub;
  let importData;
  let importPartnerData;
  let deliveredWork;

  beforeEach(async () => {
    client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
      bigQuerySalesTable: randomString(),
    });
    await client.save();
    user = new User({ email: `${randomString()}@curveroyaltysystems.com`, clientId: client._id });
    await user.save();

    baseUser = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email: `${randomString()}@curveroyaltysystems.com`,
      rights: { [user.clientId]: { catalogue: 'None' } },
    };
    payee = new Payee({ title: randomString(), name: randomString(), clientId: client._id });
    await payee.save();

    importFromExcelStub = jest.spyOn(Work, 'importFromExcel').mockReturnValue();

    importPartnerData = new ImportPartner({ name: randomString(), clientId: client._id });
    await importPartnerData.save();

    importData = new Import({ name: randomString(), importPartnerId: importPartnerData._id, clientId: client._id });
    await importData.save();

    work1 = new Work({
      clientId: client._id,
      title: randomString(),
      invoiceNo: randomString(),
      file: randomString(),
      source: [{ importId: importData._id, importPartnerId: importPartnerData._id, action: 'create', date: randomDate() }],
    });
    await work1.save();

    work2 = new Work({
      clientId: client._id,
      title: randomString(),
      invoiceNo: randomString(),
      file: randomString(),
      source: [{ importId: importData._id, importPartnerId: importPartnerData._id, action: 'create', date: randomDate() }],
    });
    await work2.save();

    work3 = new Work({
      clientId: client._id,
      title: randomString(),
      invoiceNo: randomString(),
      file: randomString(),
      source: [{ importId: importData._id, importPartnerId: importPartnerData._id, action: 'create', date: randomDate() }],
      potentialDuplicates: [{ workId: work1._id }, { workId: work2._id }],
      potentialDuplicatesCount: 2,
    });
    await work3.save();

    deliveredWork = new DeliveredWork({
      clientId: client._id,
      workId: work2._id,
      mergedIntoWorkId: work1._id,
    });
    await deliveredWork.save();
  });

  describe('as a client user with full rights', () => {
    let userFull;
    let clientUser;

    beforeEach(() => {
      userFull = { ...baseUser, rights: { [client._id]: { catalogue: 'Edit' } } };
      clientUser = jwt.sign(userFull, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', function () {
      beforeEach(() => {
        jest.spyOn(AtlasSearch, 'getSearchResults').mockResolvedValue({ docs: [work1, work2, work3], totalPages: 1, total: 3 });
      });

      it('should return a list of works', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(200);
        expect(res.body.works).toEqual(expect.any(Array));
        expect(res.body.works.length).toEqual(3);
      });

      it('should return metadata of works index on / GET', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(200);
        expect(res.body.meta).toEqual(expect.any(Object));
      });

      it('should return the first page if not passed a specific page', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.body.meta.currentPage).toEqual(1);
      });

      it('should return the passed page when passed the parameter', async () => {
        const res = await request(server)
          .get('/works?page=3')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.body.meta.currentPage).toEqual(3);
      });

      it('should return the pages available', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.body.meta.totalPages).toEqual(1);
      });

      it('should set the amount to be returned per page when passed a limit option', async () => {
        AtlasSearch.getSearchResults.mockResolvedValueOnce({ docs: [work1], totalPages: 3, total: 1 });

        const res = await request(server)
          .get('/works?limit=1')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.body.works.length).toEqual(1);
        expect(res.body.meta.totalPages).toEqual(3);
      });
    });

    describe('/:id GET', function () {
      it('should return a work and 200 status', async () => {
        const work = await Work.findById(work1._id);

        const res = await request(server)
          .get(`/works/${work._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(200);
        expect(res.body).toEqual(expect.any(Object));
        expect(res.body.clientId).toEqual(work.clientId);
        expect(res.body.type).toEqual(work.type);
        expect(res.body.invoiceNo).toEqual(work.invoiceNo);
        expect(res.body.targetPeriod).toEqual(work.targetPeriod);
        expect(res.body.description).toEqual(work.description);
        expect(res.body.file).toEqual(work.file);
      });

      it('should return a 404 status when not found', async () => {
        const id = randomId();

        const res = await request(server)
          .get(`/works/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual(`Could not find Work with ID ${id}`);
      });
    });

    describe('/:id PUT', function () {
      it('should update with passed values only', async () => {
        const work = await Work.findById(work1._id);
        const id = work._id;
        const changedName = `${work.title}changed`;

        const res = await request(server)
          .put(`/works/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ title: changedName });

        expect(res.status).toEqual(200);
        expect(res.body.title).toEqual(changedName);
      });

      it('should not update clientId', async () => {
        const work = await Work.findById(work1._id);
        const id = work._id;
        const changedTitle = `${work.title}changed`;

        const res = await request(server)
          .put(`/works/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ title: changedTitle, clientId: 'changed' });

        expect(res.body.clientId).toEqual(work.clientId);
      });

      it("should not update any fields it isn't passed", async () => {
        const work = await Work.findById(work1._id);
        const id = work._id;
        const changedTitle = `${work.title}changed`;

        const res = await request(server)
          .put(`/works/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ title: changedTitle, clientId: 'changed' });

        expect(res.body.foreignId).toEqual(work.foreignId);
      });

      it('should return a 404 status when not found', async () => {
        const id = randomId();

        const res = await request(server)
          .put(`/works/${id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ title: 'Changed Work Title' });

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual(`Could not find Work with ID ${id}`);
      });
    });

    describe('/:id DELETE', () => {
      it('should delete the work and return a 200 status', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(200);
        const work = await Work.findById(work1._id);
        expect(work).toBeNull();
      });

      it('should prevent deletion when the work has sales data', async () => {
        jest.spyOn(SalesItemHelpers, 'checkDataBeforeDelete').mockImplementationOnce((model, params, cb) => cb(null, 201, 'Sales Files'));

        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(201);
        expect(res.body).toEqual('Some or all of these works are attached to Sales Files which will need to be deleted first');
        const work = await Work.findById(work1._id);
        expect(work).toBeDefined();
      });

      it('should return a 404 status when no ids sent', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual('Could not find Works');
      });

      describe('when the delete type is "duplicates"', () => {
        it('should delete the work and have the correct count of duplicates and return a 200 status', async () => {
          work1.potentialDuplicatesCount = 2;
          work1.potentialDuplicates = [{ workId: work2._id }, { workId: work3._id }];
          await work1.save();

          const res = await request(server)
            .delete('/works')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [work2._id.toString()], type: 'duplicates' });

          expect(res.status).toBe(200);
          const updatedWork = await Work.findById(work1._id).lean();
          expect(updatedWork.potentialDuplicatesCount).toEqual(1);
          expect(updatedWork.potentialDuplicates).toEqual([{ workId: work3._id }]);
        });

        it('should prevent deletion when the work has sales data', async () => {
          work1.potentialDuplicatesCount = 2;
          work1.potentialDuplicates = [{ workId: work2._id }, { workId: work3._id }];
          await work1.save();
          jest.spyOn(SalesItemHelpers, 'checkDataBeforeDelete').mockImplementationOnce((model, params, cb) => cb(null, 201, 'Sales Files'));

          const res = await request(server)
            .delete('/works')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send({ ids: [work2._id.toString()], type: 'duplicates' });

          expect(res.status).toEqual(201);
          expect(res.body).toEqual('Some or all of these works are attached to Sales Files which will need to be deleted first');
          const work = await Work.findById(work1._id);
          expect(work).toBeDefined();
        });
      });
    });

    describe('/ POST', () => {
      it('should return a work created with the passed parameters', async () => {
        const params = {
          clientId: client._id.toString(),
          title: randomString(),
          alternateTitles: [{ title: randomString(), language: 'EN' }],
          composer: randomString(),
          partyNo: 4,
          description: randomString(),
          tunecode: randomString(),
        };

        const res = await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(params);

        expect(res.status).toEqual(200);
        expect(res.body.clientId).toEqual(params.clientId);
        expect(res.body.title).toEqual(params.title);
        expect(res.body.composer).toEqual(params.composer);
        expect(res.body.identifier).toEqual(params.identifier);
        expect(res.body.partyNo).toEqual(4);
        expect(res.body.tunecode).toEqual(params.tunecode);
      });

      it('should add the work to the database', async () => {
        const worksCount = await Work.countDocuments({ clientId: client._id });
        const params = { clientId: client._id.toString(), title: randomString() };

        await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send(params);

        const newWorksCount = await Work.countDocuments({ clientId: client._id });
        expect(newWorksCount).toEqual(worksCount + 1);
      });
    });

    // These tests are not very useful as the entire functionality is mocked anyway, due to the import not being awaited
    // The route ideally needs re-designing to await for the import, or move it entirely to the Processor
    describe('/import POST', () => {
      it('should give a 200 when file passed', async () => {
        const res = await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .attach('file', `${process.env.APP_ROOT_DIR}/test/test-data/test_work.xlsx`);

        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual('Works are importing, and a report will be sent to you shortly.');
        expect(importFromExcelStub).toHaveBeenCalledWith(
          expect.objectContaining({ originalname: 'test_work.xlsx' }),
          expect.any(Object),
          false,
        );
      });

      it('should call importFromExcel with the uploaded file', async () => {
        await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .attach('file', `${process.env.APP_ROOT_DIR}/test/test-data/test_work.xlsx`);

        expect(importFromExcelStub).toHaveBeenCalled();
        expect(importFromExcelStub).toHaveBeenCalledWith(
          expect.objectContaining({ originalname: 'test_work.xlsx' }),
          expect.any(Object),
          false,
        );
      });

      it('should return an error without a file in the request', async () => {
        const res = await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(400);
        expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
        expect(importFromExcelStub).not.toHaveBeenCalled();
      });
    });

    describe('/export POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id/source GET', () => {
      it('should return work source and 200 status', async () => {
        const res = await request(server)
          .get(`/works/${work1._id.toString()}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(200);
        expect(res.body).toEqual(expect.any(Array));
        const source = res.body[0];
        expect(source.importName).toEqual(importData.name);
        expect(source.importPartnerName).toEqual(importPartnerData.name);
        expect(source.action).toEqual(work1.source[0].action);
        expect(source.date).toEqual(work1.source[0].date.toISOString());
      });

      it('should return a 500', async () => {
        const id = 'invalid-id';

        const res = await request(server)
          .get(`/works/${id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });

      it('should return a 404', async () => {
        const id = randomId();

        const res = await request(server)
          .get(`/works/${id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual(`Could not find Work with ID ${id}`);
      });
    });

    describe('/duplicates GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(200);
        expect(res.body.duplicates).toEqual(expect.any(Array));
        expect(res.body.duplicates.length).toEqual(1);
        expect(res.body.duplicates[0].potentialDuplicates.map((w) => w.workId)).toEqual([work1._id.toString(), work2._id.toString()]);
        expect(res.body.meta).toEqual({
          currentPage: 1,
          total: 1,
          totalPages: 1,
        });
      });

      it('should return 500 when an error occurs', async () => {
        jest.spyOn(Work, 'paginate').mockImplementationOnce(() => {
          throw new Error('FakeError');
        });

        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });
    });

    describe('/duplicates/overview POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ options: expect.any(Object), works: expect.any(Array) });
        expect(res.body.options.title[0]).toEqual(work3.title);
        expect(res.body.options).toEqual(expect.objectContaining({
          title: expect.arrayContaining([work3.title, work1.title, work2.title]),
        }));
        expect(res.body.works).toHaveLength(3);
        expect(res.body.works.map((w) => w._id).sort()).toEqual([work1._id.toString(), work2._id.toString(), work3._id.toString()].sort());
      });

      it('should handle any errors and return 500', async () => {
        jest.spyOn(Work, 'find').mockImplementationOnce(() => {
          throw new Error('FakeError');
        });

        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });

      it('should handle validation errors and return 400', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId: 'invalid-id',
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(400);
        expect(res.body.message).toEqual('No valid primary work id provided');
      });
    });

    describe('/duplicates/merge POST', () => {
      it('should return 200', async () => {
        const newTitle = randomString();

        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId: work3._id,
            data: { title: newTitle },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual('Works updated successfully');

        const updatedPrimaryWork = await Work.findById(work3._id);
        expect(updatedPrimaryWork.title).toEqual(newTitle);
        expect(updatedPrimaryWork.potentialDuplicatesCount).toEqual(0);
        expect(updatedPrimaryWork.potentialDuplicates).toHaveLength(0);

        const deletedWork = await Work.findById(work1._id);
        expect(deletedWork).toBeNull();

        const blacklistedWork = await Work.findById(work2._id);
        expect(blacklistedWork).toBeDefined();
      });

      it('should handle any errors and return 500', async () => {
        jest.spyOn(Work, 'findOne').mockImplementationOnce(() => {
          throw new Error('FakeError');
        });

        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId: work3._id,
            data: { title: randomString() },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.');
      });

      it('should return 400 when no primary work id is provided', async () => {
        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId: null,
            data: { title: randomString() },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(400);
        expect(res.body.message).toEqual('No valid primary Work ID provided');
      });

      it('should return 400 when no merge data is provided', async () => {
        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId: work3._id,
            data: null,
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(400);
        expect(res.body.message).toEqual('No valid merge data provided');
      });

      it('should return 400 when the primary work is not found', async () => {
        const primaryWorkId = randomId();

        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            primaryWorkId,
            data: { title: randomString() },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(400);
        expect(res.body.message).toEqual(`Primary Work not found with ID ${primaryWorkId}`);
      });
    });

    describe('/:id/deliveries_from_merged_works GET', () => {
      it('should return deliveries from merged works', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(200);
        expect(res.body.deliveries).toEqual(expect.any(Array));
      });

      it('should return 500 when an error occurs', async () => {
        jest.spyOn(WorkController, 'getDeliveriesFromMergedWorks').mockImplementationOnce(async () => {
          throw new Error('FakeError');
        });

        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUser);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });
    });

    describe('/get_works POST', () => {
      beforeEach(() => {
        jest.spyOn(AtlasSearch, 'getSearchResults').mockResolvedValue({ docs: [work1, work2, work3], totalPages: 1, total: 3 });
      });

      it('should return a list of works', async () => {
        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({});

        expect(res.status).toEqual(200);
        expect(res.body.works).toEqual(expect.any(Array));
        expect(res.body.works.length).toEqual(3);
      });

      it('should return metadata', async () => {
        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({});

        expect(res.status).toEqual(200);
        expect(res.body.meta).toEqual(expect.any(Object));
      });

      it('should return the first page by default', async () => {
        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({});

        expect(res.body.meta.currentPage).toEqual(1);
      });

      it('should return the specified page when passed in the body', async () => {
        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ page: 3 });

        expect(res.body.meta.currentPage).toEqual(3);
      });

      it('should limit the number of results when passed a limit', async () => {
        AtlasSearch.getSearchResults.mockResolvedValueOnce({ docs: [work1], totalPages: 3, total: 1 });

        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ limit: 1 });

        expect(res.body.works.length).toEqual(1);
        expect(res.body.meta.totalPages).toEqual(3);
      });

      it('should return 500 when Atlas Search throws an error', async () => {
        AtlasSearch.getSearchResults.mockRejectedValueOnce(new Error('Atlas Search error'));

        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({});

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });

      it('should return 200 when 200 identifiers are in the filter', async () => {
        const identifiers = Array.from({ length: 200 }, (_, i) => `IDENTIFIER_${i}`);

        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ identifiers });

        expect(res.status).toEqual(200);
      });
    });
  });

  describe('as a user with None rights', () => {
    let userNone;
    let clientUserNone;

    beforeEach(() => {
      userNone = { ...baseUser, rights: { [client._id]: { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' } } };
      clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id GET', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({ title: 'changedName' });

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(403);
      });
    });

    describe('/ POST', () => {
      it('should return 403', async () => {
        const params = {
          clientId: client._id.toString(),
          title: randomString(),
          alternateTitles: randomString(),
          composer: randomString(),
          partyNo: 4,
          description: randomString(),
          tunecode: randomString(),
        };

        const res = await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send(params);

        expect(res.status).toEqual(403);
      });
    });

    describe('/export POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/works/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id/source GET', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toEqual(403);
      });
    });

    describe('/duplicates GET', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toEqual(403);
      });
    });

    describe('/duplicates/overview POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(403);
      });
    });

    describe('/duplicates/merge POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({
            primaryWorkId: work3._id,
            data: { title: randomString() },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id/deliveries_from_merged_works GET', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone);

        expect(res.status).toEqual(403);
      });
    });

    describe('/get_works POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserNone)
          .send({});

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
  });

  describe('as a user with View rights', () => {
    let userView;
    let clientUserView;

    beforeEach(() => {
      userView = { ...baseUser, rights: { [client._id]: { sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View' } } };
      clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({ title: 'changedName' });

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(403);
      });
    });

    describe('/ POST', () => {
      it('should return 403', async () => {
        const params = {
          clientId: client._id.toString(),
          title: randomString(),
          alternateTitles: randomString(),
          composer: randomString(),
          partyNo: randomInt(),
          description: randomString(),
          tunecode: randomString(),
        };

        const res = await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send(params);

        expect(res.status).toEqual(403);
      });
    });

    describe('/import POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .attach('file', `${process.env.APP_ROOT_DIR}/test/test-data/test_work.xlsx`);

        expect(res.status).toEqual(200);
      });
    });

    describe('/export POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id/source GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).toEqual(200);
      });
    });

    describe('/duplicates GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).toEqual(200);
      });
    });

    describe('/duplicates/overview POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(200);
      });
    });

    describe('/duplicates/merge POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({
            primaryWorkId: work3._id,
            data: { title: randomString() },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id/deliveries_from_merged_works GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserView);

        expect(res.status).toEqual(200);
        expect(res.body.deliveries).toEqual(expect.any(Array));
      });
    });

    describe('/get_works POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/get_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserView)
          .send({});

        expect(res.status).toEqual(200);
        expect(res.body.works).toEqual(expect.any(Array));
      });
    });
  });

  describe('as a user with Edit rights', () => {
    let userEdit;
    let clientUserEdit;

    beforeEach(() => {
      userEdit = { ...baseUser, rights: { [client._id]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' } } };
      clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id PUT', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ title: 'changedName' });

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(200);
      });

      it('should prevent deletion when the work has sales data', async () => {
        jest.spyOn(SalesItemHelpers, 'checkDataBeforeDelete').mockImplementationOnce((model, params, cb) => cb(null, 201, 'Sales Files'));

        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(201);
        expect(res.body).toEqual('Some or all of these works are attached to Sales Files which will need to be deleted first');
        const work = await Work.findById(work1._id);
        expect(work).toBeDefined();
      });

      it('should return a 404 status when no ids sent', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual('Could not find Works');
      });

      describe('when the delete type is "duplicates"', () => {
        it('should delete the work and have the correct count of duplicates and return a 200 status', async () => {
          work1.potentialDuplicatesCount = 2;
          work1.potentialDuplicates = [{ workId: work2._id }, { workId: work3._id }];
          await work1.save();

          const res = await request(server)
            .delete('/works')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [work2._id.toString()], type: 'duplicates' });

          expect(res.status).toBe(200);
          const updatedWork = await Work.findById(work1._id).lean();
          expect(updatedWork.potentialDuplicatesCount).toEqual(1);
          expect(updatedWork.potentialDuplicates).toEqual([{ workId: work3._id }]);
        });

        it('should prevent deletion when the work has sales data', async () => {
          work1.potentialDuplicatesCount = 2;
          work1.potentialDuplicates = [{ workId: work2._id }, { workId: work3._id }];
          await work1.save();
          jest.spyOn(SalesItemHelpers, 'checkDataBeforeDelete').mockImplementationOnce((model, params, cb) => cb(null, 201, 'Sales Files'));

          const res = await request(server)
            .delete('/works')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids: [work2._id.toString()], type: 'duplicates' });

          expect(res.status).toEqual(201);
          expect(res.body).toEqual('Some or all of these works are attached to Sales Files which will need to be deleted first');
          const work = await Work.findById(work1._id);
          expect(work).toBeDefined();
        });
      });
    });

    describe('/ POST', () => {
      it('should return 200', async () => {
        const params = {
          clientId: client._id.toString(),
          title: randomString(),
          alternateTitles: [{ title: randomString(), language: 'EN' }],
          composer: randomString(),
          partyNo: 4,
          description: randomString(),
          tunecode: randomString(),
        };

        const res = await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send(params);

        expect(res.status).toEqual(200);
        expect(res.body.clientId).toEqual(params.clientId);
        expect(res.body.title).toEqual(params.title);
        expect(res.body.composer).toEqual(params.composer);
        expect(res.body.identifier).toEqual(params.identifier);
        expect(res.body.partyNo).toEqual(4);
        expect(res.body.tunecode).toEqual(params.tunecode);
      });
    });

    describe('/import POST', () => {
      it('should give a 200', async () => {
        const res = await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .attach('file', `${process.env.APP_ROOT_DIR}/test/test-data/test_work.xlsx`);

        expect(res.status).toEqual(200);
      });
    });

    describe('/export POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/export')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id/source GET', function () {
      it('should return work source and 200 status', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(200);
        expect(res.body).toEqual(expect.any(Array));
        const source = res.body[0];
        expect(source.importName).toEqual(importData.name);
        expect(source.importPartnerName).toEqual(importPartnerData.name);
        expect(source.action).toEqual(work1.source[0].action);
        expect(source.date).toEqual(work1.source[0].date.toISOString());
      });

      it('should return a 500', async () => {
        const id = 'invalid-id';

        const res = await request(server)
          .get(`/works/${id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });

      it('should return a 404', async () => {
        const id = randomId();

        const res = await request(server)
          .get(`/works/${id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual(`Could not find Work with ID ${id}`);
      });
    });

    describe('/duplicates GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(200);
      });
    });

    describe('/duplicates/overview POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: false },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(200);
      });
    });

    describe('/duplicates/merge POST', () => {
      it('should return 200', async () => {
        const newTitle = randomString();

        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit)
          .send({
            primaryWorkId: work3._id,
            data: { title: newTitle },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual('Works updated successfully');
      });
    });

    describe('/:id/deliveries_from_merged_works GET', () => {
      it('should return deliveries from merged works', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(200);
        expect(res.body.deliveries).toEqual(expect.any(Array));
      });

      it('should return 500 when an error occurs', async () => {
        jest.spyOn(WorkController, 'getDeliveriesFromMergedWorks').mockImplementationOnce(async () => {
          throw new Error('FakeError');
        });

        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserEdit);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });
    });
  });

  describe('as an internal user', () => {
    let userInternal;
    let clientUserInternal;

    beforeEach(() => {
      userInternal = { ...baseUser, internal: true };
      clientUserInternal = jwt.sign(userInternal, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id GET', function () {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id PUT', function () {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        expect(res.status).toEqual(200);
      });

      it('should update the work', async () => {
        await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        const updatedWork = await Work.findById(work1._id);
        expect(updatedWork.title).toEqual('Changed Title');
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(200);
        const workCount = await Work.countDocuments({ _id: work1._id });
        expect(workCount).toEqual(0);
      });

      it('should prevent deletion when the work has sales data', async () => {
        jest.spyOn(SalesItemHelpers, 'checkDataBeforeDelete').mockImplementationOnce((model, params, cb) => cb(null, 201, 'Sales Files'));

        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(201);
        expect(res.body).toEqual('Some or all of these works are attached to Sales Files which will need to be deleted first');
        const work = await Work.findById(work1._id);
        expect(work).toBeDefined();
      });

      it('should return a 404 status when no ids sent', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual('Could not find Works');
      });

      describe('when the delete type is "duplicates"', () => {
        it('should delete the work and have the correct count of duplicates and return a 200 status', async () => {
          work1.potentialDuplicatesCount = 2;
          work1.potentialDuplicates = [{ workId: work2._id }, { workId: work3._id }];
          await work1.save();

          const res = await request(server)
            .delete('/works')
            .set('applicationToken', applicationToken)
            .set('token', clientUserInternal)
            .send({ ids: [work2._id.toString()], type: 'duplicates' });

          expect(res.status).toBe(200);
          const updatedWork = await Work.findById(work1._id).lean();
          expect(updatedWork.potentialDuplicatesCount).toEqual(1);
          expect(updatedWork.potentialDuplicates).toEqual([{ workId: work3._id }]);
        });

        it('should prevent deletion when the work has sales data', async () => {
          work1.potentialDuplicatesCount = 2;
          work1.potentialDuplicates = [{ workId: work2._id }, { workId: work3._id }];
          await work1.save();
          jest.spyOn(SalesItemHelpers, 'checkDataBeforeDelete').mockImplementationOnce((model, params, cb) => cb(null, 201, 'Sales Files'));

          const res = await request(server)
            .delete('/works')
            .set('applicationToken', applicationToken)
            .set('token', clientUserInternal)
            .send({ ids: [work2._id.toString()], type: 'duplicates' });

          expect(res.status).toEqual(201);
          expect(res.body).toEqual('Some or all of these works are attached to Sales Files which will need to be deleted first');
          const work = await Work.findById(work1._id);
          expect(work).toBeDefined();
        });
      });
    });

    describe('/ POST', () => {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        expect(res.status).toEqual(200);
      });

      it('should create a work', async () => {
        await request(server)
          .post(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({ title: 'Changed Title' });

        const workCount = await Work.countDocuments({ clientId: client._id.toString() });
        expect(workCount).toEqual(3);
      });
    });

    describe('/import POST', () => {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .attach('file', 'test/test-data/test_work.xlsx');

        expect(res.status).toEqual(200);
      });

      it('should import a work', async () => {
        await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .attach('file', `${process.env.APP_ROOT_DIR}/test/test-data/test_work.xlsx`);

        const workCount = await Work.countDocuments({ clientId: client._id.toString() });
        expect(workCount).toEqual(3);
      });
    });

    it('should return 200', async () => {
      const res = await request(server)
        .post('/works/export')
        .set('applicationToken', applicationToken)
        .set('token', clientUserInternal);

      expect(res.status).toEqual(200);
    });

    describe('/:id/source GET', () => {
      it('should return work source and 200 status', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(200);
        expect(res.body).toEqual(expect.any(Array));
        const source = res.body[0];
        expect(source.importName).toEqual(importData.name);
        expect(source.importPartnerName).toEqual(importPartnerData.name);
        expect(source.action).toEqual(work1.source[0].action);
        expect(source.date).toEqual(work1.source[0].date.toISOString());
      });

      it('should return a 500', async () => {
        const id = 'invalid-id';

        const res = await request(server)
          .get(`/works/${id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });

      it('should return a 404', async () => {
        const id = randomId();

        const res = await request(server)
          .get(`/works/${id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(404);
        expect(res.body.message).toEqual(`Could not find Work with ID ${id}`);
      });
    });

    describe('/duplicates GET', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(200);
      });
    });

    describe('/duplicates/overview POST', () => {
      it('should return 200', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(200);
      });
    });

    describe('/duplicates/merge POST', () => {
      it('should return 200', async () => {
        const newTitle = randomString();

        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal)
          .send({
            primaryWorkId: work3._id,
            data: { title: newTitle },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(200);
        expect(res.body.message).toEqual('Works updated successfully');
      });
    });

    describe('/:id/deliveries_from_merged_works GET', () => {
      it('should return deliveries from merged works', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(200);
        expect(res.body.deliveries).toEqual(expect.any(Array));
      });

      it('should return 500 when an error occurs', async () => {
        jest.spyOn(WorkController, 'getDeliveriesFromMergedWorks').mockImplementationOnce(async () => {
          throw new Error('FakeError');
        });

        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', clientUserInternal);

        expect(res.status).toEqual(500);
        expect(res.body.message).toEqual('Internal error, please try again');
      });
    });
  });

  describe('as a parent user without a client', () => {
    let userParent;
    let parentUserNoClient;

    beforeEach(() => {
      userParent = { ...baseUser, parentId: 'parentId' };
      parentUserNoClient = jwt.sign(userParent, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({ title: 'Changed Title' });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      it('should not update the work', async () => {
        await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({ title: 'Changed Title' });

        const updatedWork = await Work.findById(work1._id);
        expect(updatedWork.title).toEqual(work1.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      it('should not delete the work', async () => {
        await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({ ids: [work1._id] });

        const workCount = await Work.countDocuments({ _id: work1._id });
        expect(workCount).toEqual(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({ title: 'Changed Title' });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      it('should not create a work', async () => {
        await request(server)
          .post('/works}')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({ title: 'Changed Title' });

        const workCount = await Work.countDocuments({ clientId: client._id.toString() });
        expect(workCount).toEqual(3);
      });
    });

    describe('/import POST', () => {
      it('should not import a work', async () => {
        await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .attach('file', `${process.env.APP_ROOT_DIR}/test/test-data/test_work.xlsx`);

        const workCount = await Work.countDocuments({ clientId: client._id.toString() });
        expect(workCount).toEqual(3);
      });
    });

    describe('/export POST', () => {
      it('should return a 403', async () => {
        const res = await request(server)
          .post('/works/export')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/:id/source GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/duplicates GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/duplicates/overview POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/duplicates/merge POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient)
          .send({
            primaryWorkId: work3._id,
            data: { title: randomString() },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/:id/deliveries_from_merged_works GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', parentUserNoClient);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
  });

  describe('as a payee user', () => {
    let userPayee;
    let payeeUser;

    beforeEach(() => {
      userPayee = { ...baseUser, payeeId: payee._id };
      payeeUser = jwt.sign(userPayee, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return a 200 response', async () => {
        const res = await request(server)
          .get('/works')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);

        expect(res.status).toEqual(200);
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ title: 'Changed Title' });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      it('should not update the work', async () => {
        await request(server)
          .put(`/works/${work1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ title: 'Changed Title' });

        const updatedWork = await Work.findById(work1._id);
        expect(updatedWork.title).toEqual(work1.title);
      });
    });

    describe('/:id DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ ids: [work1._id] });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      it('should not delete the work', async () => {
        await request(server)
          .delete('/works')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ ids: [work1._id] });

        const workCount = await Work.countDocuments({ _id: work1._id });
        expect(workCount).toEqual(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ title: randomString() });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });

      it('should not create a work', async () => {
        await request(server)
          .post('/works')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ title: randomString() });

        const workCount = await Work.countDocuments({ clientId: client._id.toString() });
        expect(workCount).toEqual(3);
      });
    });

    describe('/import POST', () => {
      it('should return 200 but import no data', async () => {
        const res = await request(server)
          .post('/works/import')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .attach('file', `${process.env.APP_ROOT_DIR}/test/test-data/test_work.xlsx`);

        expect(res.status).toEqual(200);
        const workCount = await Work.countDocuments({ clientId: client._id.toString() });
        expect(workCount).toEqual(3);
      });
    });

    describe('/export POST', () => {
      it('should return 403', async () => {
        const res = await request(server)
          .post('/works/export')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);

        expect(res.status).toEqual(403);
      });
    });

    describe('/:id/source GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/source`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/duplicates GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get('/works/duplicates')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/duplicates/overview POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/works/duplicates/overview')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({
            primaryWorkId: work3._id,
            duplicateWorks: [
              { id: work1._id, selected: true },
              { id: work2._id, selected: true },
              { id: work3._id, selected: true },
            ],
          });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/duplicates/merge POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .post('/works/duplicates/merge')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({
            primaryWorkId: work3._id,
            data: { title: randomString() },
            deleteWorkIds: [work1._id],
            blacklistedDuplicateIds: [work2._id],
          });

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });

    describe('/:id/deliveries_from_merged_works GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await request(server)
          .get(`/works/${work1._id}/deliveries_from_merged_works`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);

        expect(res.status).toEqual(403);
        expect(res.body.message).toEqual('Forbidden');
      });
    });
  });

  describe('POST /works/raw-export', () => {
    let clientUser;

    beforeEach(() => {
      mockCSVRawExport.mockClear();
      jest.spyOn(AtlasSearch, 'buildSearchAggregation').mockResolvedValue({ aggregation: [] });
      const userToken = {
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { catalogue: 'Edit' } },
      };
      clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    it('should return 403 when user has no catalogue rights', async () => {
      const noRightsToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { catalogue: 'None' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', noRightsToken)
        .send({ filter: {} });

      expect(res.status).toBe(403);
    });

    it('should call CSVRawExport with correct parameters when sync is false', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      const res = await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: false, filter: {} });

      expect(res.status).toBe(200);
      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        collectionName: 'works',
      }));
    });

    it('should call CSVRawExport with sync=true and return csvPublicLink', async () => {
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://example.com/export.csv' });

      const res = await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toBe('https://example.com/export.csv');
      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        sync: true,
      }));
    });

    it('should handle CSVRawExport errors gracefully', async () => {
      mockCSVRawExport.mockRejectedValue(new Error('Export failed'));

      const res = await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Export failed');
    });

    it('should call CSVRawExport with customCursor instead of filter', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        collectionName: 'works',
        customCursor: expect.anything(),
      }));
      const callArg = mockCSVRawExport.mock.calls[0][0];
      expect(callArg.filter).toBeUndefined();
    });

    it('should allow View rights users to export', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      const viewRightsToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { catalogue: 'View' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', viewRightsToken)
        .send({ filter: {} });

      expect(res.status).toBe(200);
    });

    it('should export specific work IDs when provided', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      const workIds = [work1._id.toString(), work2._id.toString()];

      await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ ids: workIds });

      expect(AtlasSearch.buildSearchAggregation).toHaveBeenCalledWith(
        expect.objectContaining({ filterInput: { ids: workIds } }),
      );
    });

    it('should prefer specific IDs over filter when both provided', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      const workIds = [work1._id.toString()];

      await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ ids: workIds, filter: { createdAfter: '2024-01-01' } });

      expect(AtlasSearch.buildSearchAggregation).toHaveBeenCalledWith(
        expect.objectContaining({ filterInput: { ids: workIds } }),
      );
      const { filterInput } = AtlasSearch.buildSearchAggregation.mock.calls[0][0];
      expect(filterInput.createdAfter).toBeUndefined();
    });

    it('should export all works for client when no filter or IDs provided', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      const res = await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({});

      expect(res.status).toBe(200);
      expect(AtlasSearch.buildSearchAggregation).toHaveBeenCalled();
      const { filterInput } = AtlasSearch.buildSearchAggregation.mock.calls[0][0];
      expect(filterInput.ids).toBeUndefined();
    });

    it('should export all works for client when empty filter object provided', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      const res = await request(server)
        .post('/works/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      expect(res.status).toBe(200);
      expect(AtlasSearch.buildSearchAggregation).toHaveBeenCalled();
      const { filterInput } = AtlasSearch.buildSearchAggregation.mock.calls[0][0];
      expect(filterInput.ids).toBeUndefined();
    });

    describe('date filtering', () => {
      let buildSearchAggregationSpy;

      beforeEach(() => {
        buildSearchAggregationSpy = jest.spyOn(AtlasSearch, 'buildSearchAggregation').mockResolvedValue({ aggregation: [] });
        mockCSVRawExport.mockResolvedValue({});
      });

      it('should pass createdAfter filter to Atlas Search', async () => {
        await request(server)
          .post('/works/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { createdAfter: '2022-01-01' } });

        expect(buildSearchAggregationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ filterInput: expect.objectContaining({ createdAfter: '2022-01-01' }) }),
        );
      });

      it('should pass createdBefore filter to Atlas Search', async () => {
        await request(server)
          .post('/works/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { createdBefore: '2022-06-15' } });

        expect(buildSearchAggregationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ filterInput: expect.objectContaining({ createdBefore: '2022-06-15' }) }),
        );
      });

      it('should pass updatedAfter filter to Atlas Search', async () => {
        await request(server)
          .post('/works/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { updatedAfter: '2022-01-01' } });

        expect(buildSearchAggregationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ filterInput: expect.objectContaining({ updatedAfter: '2022-01-01' }) }),
        );
      });

      it('should pass updatedBefore filter to Atlas Search', async () => {
        await request(server)
          .post('/works/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { updatedBefore: '2022-06-15' } });

        expect(buildSearchAggregationSpy).toHaveBeenCalledWith(
          expect.objectContaining({ filterInput: expect.objectContaining({ updatedBefore: '2022-06-15' }) }),
        );
      });

      it('should pass combined date range filters to Atlas Search', async () => {
        await request(server)
          .post('/works/raw-export')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({ filter: { createdAfter: '2021-01-01', createdBefore: '2023-01-01' } });

        expect(buildSearchAggregationSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            filterInput: expect.objectContaining({
              createdAfter: '2021-01-01',
              createdBefore: '2023-01-01',
            }),
          }),
        );
      });
    });
  });
});
