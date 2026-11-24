const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');

const Client = require('../../models/client');
const Company = require('../../models/company');
const User = require('../../models/user');

const server = supertest(require('../../index'));

describe('/companies', () => {
  logger.info('>>>file>>>> routes/companies/companies.integration.test .....................');

  const applicationToken = config.applicationTokens[0];
  let client;
  let user;
  let company1;
  let company2;
  let company3;

  beforeEach(async () => {
    jest.spyOn(Client.prototype, 'createBigQueryTables').mockImplementation((callback) => callback());
    jest.spyOn(Client.prototype, 'createBigQueryBackups').mockImplementation((callback) => callback());

    client = new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: `${randomString()}@curve.com` });
    await user.save();

    company1 = new Company({
      clientId: client._id,
      name: 'Company 1',
      feesInvoiceCustomText: randomString(),
      createdBy: user._id,
      lastModifiedBy: user._id,
    });
    await company1.save();

    company2 = new Company({
      clientId: client._id,
      name: 'Company 2',
      feesInvoiceCustomText: randomString(),
      createdBy: user._id,
      lastModifiedBy: user._id,
    });
    await company2.save();

    company3 = new Company({
      clientId: randomId(),
      name: 'Company 3',
      feesInvoiceCustomText: randomString(),
      createdBy: user._id,
      lastModifiedBy: user._id,
    });
    await company3.save();
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      let clientUser;

      beforeEach(() => {
        const userToken = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          email: `${randomString()}@curve.com`,
          rights: {},
        };
        userToken.rights[client._id.toString()] = { contracts: 'Edit' };
        clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return a list of companies', async () => {
          const res = await server
            .get('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.companies).toBeInstanceOf(Array);
          const companies = await Company.find({ clientId: client._id });
          expect(res.body.companies.length).toBe(companies.length);
        });

        it('should return metadata of companies index on / GET', async () => {
          const res = await server
            .get('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.meta).toBeInstanceOf(Object);
          expect(res.body.meta.currentPage).toBeDefined();
          expect(res.body.meta.totalPages).toBeDefined();
          expect(res.body.meta.total).toBeDefined();
        });

        it('should return the first page if not passed a specific page', async () => {
          const res = await server
            .get('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(1);
        });

        it('should return the passed page when passed the parameter', async () => {
          const res = await server
            .get('/companies?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(3);
        });

        it('should filter companies by text search', async () => {
          const res = await server
            .get('/companies?text=Company 1')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.companies.length).toBeGreaterThan(0);
          expect(res.body.companies[0].name).toContain('Company 1');
        });
      });

      describe('Date filtering - createdAfter', () => {
        let oldCompany;
        let recentCompany;

        beforeEach(async () => {
          oldCompany = new Company({
            clientId: client._id,
            name: 'Old Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-15T10:30:00Z'),
            updatedAt: new Date('2023-01-15T10:30:00Z'),
          });
          await oldCompany.save();

          recentCompany = new Company({
            clientId: client._id,
            name: 'Recent Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-06-20T14:45:00Z'),
            updatedAt: new Date('2024-06-20T14:45:00Z'),
          });
          await recentCompany.save();
        });

        it('should return only companies created on or after the specified date', async () => {
          const res = await server
            .get('/companies?createdAfter=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(recentCompany._id.toString());
          expect(returnedIds).not.toContain(oldCompany._id.toString());
        });

        it('should include companies created exactly on the specified date', async () => {
          const exactDateCompany = new Company({
            clientId: client._id,
            name: 'Exact Date Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-01-01T23:59:59Z'),
            updatedAt: new Date('2024-01-01T23:59:59Z'),
          });
          await exactDateCompany.save();

          const res = await server
            .get('/companies?createdAfter=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(exactDateCompany._id.toString());
        });
      });

      describe('Date filtering - updatedAfter', () => {
        let oldUpdateCompany;
        let recentUpdateCompany;

        beforeEach(async () => {
          oldUpdateCompany = new Company({
            clientId: client._id,
            name: 'Old Update Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-01T10:00:00Z'),
          });
          await oldUpdateCompany.save();
          await Company.updateOne({ _id: oldUpdateCompany._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

          recentUpdateCompany = new Company({
            clientId: client._id,
            name: 'Recent Update Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-01T10:00:00Z'),
          });
          await recentUpdateCompany.save();
          await Company.updateOne({ _id: recentUpdateCompany._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
        });

        it('should return only companies updated on or after the specified date', async () => {
          const res = await server
            .get('/companies?updatedAfter=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(recentUpdateCompany._id.toString());
          expect(returnedIds).not.toContain(oldUpdateCompany._id.toString());
        });
      });

      describe('Date filtering - updatedBefore', () => {
        let oldUpdateCompany;
        let recentUpdateCompany;

        beforeEach(async () => {
          oldUpdateCompany = new Company({
            clientId: client._id,
            name: 'Old Update Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-01T10:00:00Z'),
          });
          await oldUpdateCompany.save();
          await Company.updateOne({ _id: oldUpdateCompany._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

          recentUpdateCompany = new Company({
            clientId: client._id,
            name: 'Recent Update Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-01T10:00:00Z'),
          });
          await recentUpdateCompany.save();
          await Company.updateOne({ _id: recentUpdateCompany._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
        });

        it('should return only companies updated before the specified date', async () => {
          const res = await server
            .get('/companies?updatedBefore=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(oldUpdateCompany._id.toString());
          expect(returnedIds).not.toContain(recentUpdateCompany._id.toString());
        });

        it('should include companies updated exactly on the specified date', async () => {
          const exactDateCompany = new Company({
            clientId: client._id,
            name: 'Exact Date Update Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-01T10:00:00Z'),
          });
          await exactDateCompany.save();
          await Company.updateOne({ _id: exactDateCompany._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

          const res = await server
            .get('/companies?updatedBefore=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(exactDateCompany._id.toString());
        });
      });

      describe('Date filtering - createdBefore', () => {
        let oldCompany;
        let recentCompany;

        beforeEach(async () => {
          oldCompany = new Company({
            clientId: client._id,
            name: 'Old Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-15T10:30:00Z'),
            updatedAt: new Date('2023-01-15T10:30:00Z'),
          });
          await oldCompany.save();

          recentCompany = new Company({
            clientId: client._id,
            name: 'Recent Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-06-20T14:45:00Z'),
            updatedAt: new Date('2024-06-20T14:45:00Z'),
          });
          await recentCompany.save();
        });

        it('should return only companies created before the specified date', async () => {
          const res = await server
            .get('/companies?createdBefore=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(oldCompany._id.toString());
          expect(returnedIds).not.toContain(recentCompany._id.toString());
        });

        it('should include companies created exactly on the specified date', async () => {
          const exactDateCompany = new Company({
            clientId: client._id,
            name: 'Exact Date Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-01-01T12:00:00Z'),
            updatedAt: new Date('2024-01-01T12:00:00Z'),
          });
          await exactDateCompany.save();

          const res = await server
            .get('/companies?createdBefore=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(exactDateCompany._id.toString());
        });
      });

      describe('Date filtering - edge cases', () => {
        it('should handle invalid date format gracefully', async () => {
          const res = await server
            .get('/companies?createdAfter=invalid-date')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.companies).toBeDefined();
          expect(Array.isArray(res.body.companies)).toBe(true);
        });

        it('should combine createdAfter and updatedAfter filters', async () => {
          const company1 = new Company({
            clientId: client._id,
            name: `Combined Test ${randomString()}`,
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-01-15T10:00:00Z'),
          });
          await company1.save();
          await Company.updateOne({ _id: company1._id }, { updatedAt: new Date('2024-06-20T10:00:00Z') }, { timestamps: false });

          const company2 = new Company({
            clientId: client._id,
            name: `Combined Test ${randomString()}`,
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-06-20T10:00:00Z'),
          });
          await company2.save();
          await Company.updateOne({ _id: company2._id }, { updatedAt: new Date('2024-06-25T10:00:00Z') }, { timestamps: false });

          const res = await server
            .get('/companies?createdAfter=2024-01-01&updatedAfter=2024-06-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(company2._id.toString());
          expect(returnedIds).not.toContain(company1._id.toString());
        });

        it('should combine createdBefore and createdAfter to create a date range', async () => {
          const beforeRangeCompany = new Company({
            clientId: client._id,
            name: 'Before Range',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2023-12-15T10:00:00Z'),
            updatedAt: new Date('2023-12-15T10:00:00Z'),
          });
          await beforeRangeCompany.save();

          const inRangeCompany = new Company({
            clientId: client._id,
            name: 'In Range',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-03-15T10:00:00Z'),
            updatedAt: new Date('2024-03-15T10:00:00Z'),
          });
          await inRangeCompany.save();

          const afterRangeCompany = new Company({
            clientId: client._id,
            name: 'After Range',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-07-15T10:00:00Z'),
            updatedAt: new Date('2024-07-15T10:00:00Z'),
          });
          await afterRangeCompany.save();

          const res = await server
            .get('/companies?createdAfter=2024-01-01&createdBefore=2024-06-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(inRangeCompany._id.toString());
          expect(returnedIds).not.toContain(beforeRangeCompany._id.toString());
          expect(returnedIds).not.toContain(afterRangeCompany._id.toString());
        });

        it('should combine all four date filters', async () => {
          const matchingCompany = new Company({
            clientId: client._id,
            name: 'Matching All Filters',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-02-15T10:00:00Z'),
          });
          await matchingCompany.save();
          await Company.updateOne({ _id: matchingCompany._id }, { updatedAt: new Date('2024-05-15T10:00:00Z') }, { timestamps: false });

          const nonMatchingCompany = new Company({
            clientId: client._id,
            name: 'Non-Matching',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-02-15T10:00:00Z'),
          });
          await nonMatchingCompany.save();
          await Company.updateOne({ _id: nonMatchingCompany._id }, { updatedAt: new Date('2024-07-15T10:00:00Z') }, { timestamps: false });

          const res = await server
            .get('/companies?createdAfter=2024-01-01&createdBefore=2024-06-01&updatedAfter=2024-04-01&updatedBefore=2024-06-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(matchingCompany._id.toString());
          expect(returnedIds).not.toContain(nonMatchingCompany._id.toString());
        });

        it('should combine date filters with text search', async () => {
          const matchingCompany = new Company({
            clientId: client._id,
            name: 'Special Company Name',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-06-20T10:00:00Z'),
            updatedAt: new Date('2024-06-20T10:00:00Z'),
          });
          await matchingCompany.save();

          const nonMatchingCompany = new Company({
            clientId: client._id,
            name: 'Other Company',
            createdBy: user._id,
            lastModifiedBy: user._id,
            createdAt: new Date('2024-06-20T10:00:00Z'),
            updatedAt: new Date('2024-06-20T10:00:00Z'),
          });
          await nonMatchingCompany.save();

          const res = await server
            .get('/companies?text=Special&createdAfter=2024-01-01')
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          const returnedIds = res.body.companies.map((c) => c._id.toString());
          expect(returnedIds).toContain(matchingCompany._id.toString());
          expect(returnedIds).not.toContain(nonMatchingCompany._id.toString());
        });
      });

      describe('/:id GET', () => {
        it('should return a single company by id', async () => {
          const res = await server
            .get(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body._id).toBe(company1._id.toString());
          expect(res.body.name).toBe(company1.name);
        });

        it('should return 404 for non-existent company', async () => {
          const nonExistentId = randomId();

          const res = await server
            .get(`/companies/${nonExistentId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(404);
        });
      });

      describe('/ POST', () => {
        it('should create a new company', async () => {
          const newCompany = {
            name: 'New Test Company',
            feesInvoiceCustomText: randomString(),
          };

          const res = await server
            .post('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(newCompany);

          expect(res.status).toBe(200);
          expect(res.body.name).toBe(newCompany.name);
          expect(res.body.clientId).toBe(client._id.toString());
          expect(res.body._id).toBeDefined();

          const savedCompany = await Company.findById(res.body._id);
          expect(savedCompany).toBeDefined();
          expect(savedCompany.name).toBe(newCompany.name);
        });
      });

      describe('/:id/upload POST', () => {
        it('should return an error without a file in the request', async () => {
          const res = await server
            .post(`/companies/${company1._id}/upload`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(400);
          expect(res.body.errors).toEqual(['Requires a file to be uploaded']);
        });
      });

      describe('/:id PUT', () => {
        it('should update an existing company', async () => {
          const updates = {
            name: 'Updated Company Name',
          };

          const res = await server
            .put(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(updates);

          expect(res.status).toBe(200);
          expect(res.body.name).toBe(updates.name);

          const updatedCompany = await Company.findById(company1._id);
          expect(updatedCompany.name).toBe(updates.name);
        });

        it('should not update clientId', async () => {
          const differentClientId = randomId();
          const updates = {
            name: 'Changed Name',
            clientId: differentClientId,
          };

          const res = await server
            .put(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(updates);

          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(client._id.toString());
          expect(res.body.clientId).not.toBe(differentClientId.toString());
        });

        it('should return 404 for non-existent company', async () => {
          const nonExistentId = randomId();
          const updates = { name: 'Changed Name' };

          const res = await server
            .put(`/companies/${nonExistentId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(updates);

          expect(res.status).toBe(404);
        });
      });

      describe('/:id DELETE', () => {
        it('should delete a company', async () => {
          const res = await server
            .delete(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(200);

          const deletedCompany = await Company.findById(company1._id);
          expect(deletedCompany).toBeNull();
        });

        it('should return 404 for non-existent company', async () => {
          const nonExistentId = randomId();

          const res = await server
            .delete(`/companies/${nonExistentId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUser);

          expect(res.status).toBe(404);
        });
      });
    });

    describe('as a user with None rights', () => {
      let clientUserNone;

      beforeEach(() => {
        const userToken = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: null,
          rights: {},
        };
        userToken.rights[client._id] = { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' };
        clientUserNone = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 403', async () => {
          const res = await server
            .get('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id GET', () => {
        it('should return 403', async () => {
          const res = await server
            .get(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const res = await server
            .put(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ name: 'Changed Name' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          const res = await server
            .delete(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const newCompany = {
            name: 'New Company',
            feesInvoiceCustomText: randomString(),
          };

          const res = await server
            .post('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(newCompany);

          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with View rights', () => {
      let clientUserView;

      beforeEach(() => {
        const userToken = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          rights: {},
        };
        userToken.rights[client._id] = { sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View' };
        clientUserView = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(200);
          expect(res.body.feesInvoiceCustomText).toBe(company1.feesInvoiceCustomText);
        });
      });

      describe('/:id PUT', () => {
        it('should return 403', async () => {
          const res = await server
            .put(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ name: 'Changed Name' });

          expect(res.status).toBe(403);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 403', async () => {
          const res = await server
            .delete(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);

          expect(res.status).toBe(403);
        });
      });

      describe('/ POST', () => {
        it('should return 403', async () => {
          const newCompany = {
            name: 'New Company',
            feesInvoiceCustomText: randomString(),
          };

          const res = await server
            .post('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(newCompany);

          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with Edit rights', () => {
      let clientUserEdit;

      beforeEach(() => {
        const userToken = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          rights: {},
        };
        userToken.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
        clientUserEdit = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return 200', async () => {
          const res = await server
            .get('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toBe(200);
        });
      });

      describe('/:id PUT', () => {
        it('should return 200', async () => {
          const res = await server
            .put(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ name: 'Changed Name' });

          expect(res.status).toBe(200);
        });
      });

      describe('/:id DELETE', () => {
        it('should return 200', async () => {
          const res = await server
            .delete(`/companies/${company1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);

          expect(res.status).toBe(200);
        });
      });

      describe('/ POST', () => {
        it('should return 200', async () => {
          const newCompany = {
            name: 'New Company',
            feesInvoiceCustomText: randomString(),
          };

          const res = await server
            .post('/companies')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(newCompany);

          expect(res.status).toBe(200);
        });
      });
    });
  });

  describe('as an internal user', () => {
    let internalUser;

    beforeEach(() => {
      const userToken = {
        internal: true,
      };
      internalUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get('/companies')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id GET', () => {
      it('should return 403', async () => {
        const res = await server
          .get(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const res = await server
          .put(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ name: 'Changed Name' });

        expect(res.status).toBe(403);
      });

      it('should not update the company', async () => {
        await server
          .put(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ name: 'Changed Name' });

        const company = await Company.findById(company1._id);
        expect(company.name).toBe(company1.name);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const res = await server
          .delete(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);

        expect(res.status).toBe(403);
      });

      it('should not delete the company', async () => {
        await server
          .delete(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);

        const company = await Company.findById(company1._id);
        expect(company).not.toBeNull();
      });
    });

    describe('/ POST', () => {
      it('should return 200', async () => {
        const newCompany = {
          name: `New Company ${randomString()}`,
          feesInvoiceCustomText: randomString(),
        };

        const res = await server
          .post('/companies')
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send(newCompany);

        expect(res.status).toBe(200);
      });

      it('should create a company', async () => {
        const countBefore = await Company.countDocuments();

        await server
          .post('/companies')
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ name: `New Company ${randomString()}`, feesInvoiceCustomText: randomString() });

        const countAfter = await Company.countDocuments();
        expect(countAfter).toBe(countBefore + 1);
      });
    });
  });

  describe('as a parent user without a client', () => {
    let parentUser;

    beforeEach(() => {
      const userToken = {
        id: user._id,
        internal: false,
        parentId: randomId(),
        clientId: null,
        rights: {},
      };
      parentUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 403', async () => {
        const res = await server
          .get('/companies')
          .set('applicationToken', applicationToken)
          .set('token', parentUser);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id GET', () => {
      it('should return 403', async () => {
        const res = await server
          .get(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id PUT', () => {
      it('should return 403', async () => {
        const res = await server
          .put(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ name: 'Changed Name' });

        expect(res.status).toBe(403);
      });

      it('should not update the company', async () => {
        await server
          .put(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ name: 'Changed Name' });

        const company = await Company.findById(company1._id);
        expect(company.name).toBe(company1.name);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 403', async () => {
        const res = await server
          .delete(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);

        expect(res.status).toBe(403);
      });

      it('should not delete the company', async () => {
        await server
          .delete(`/companies/${company1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);

        const company = await Company.findById(company1._id);
        expect(company).not.toBeNull();
      });
    });

    describe('/ POST', () => {
      it('should return 403', async () => {
        const newCompany = {
          name: 'New Company',
          feesInvoiceCustomText: randomString(),
        };

        const res = await server
          .post('/companies')
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send(newCompany);

        expect(res.status).toBe(403);
      });

      it('should not create a company', async () => {
        const countBefore = await Company.countDocuments();

        await server
          .post('/companies')
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ name: 'New Company', feesInvoiceCustomText: randomString() });

        const countAfter = await Company.countDocuments();
        expect(countAfter).toBe(countBefore);
      });
    });
  });
});
