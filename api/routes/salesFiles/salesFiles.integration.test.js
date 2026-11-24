const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: (...args) => mockCSVRawExport(...args),
}));

const Client = require('../../models/client');
const SalesFile = require('../../models/salesFile');
const User = require('../../models/user');

const server = supertest(require('../../index'));

describe('/salesFiles', () => {
  logger.info('>>>file>>>> routes/salesFiles/salesFiles.integration.test .....................');

  const applicationToken = config.applicationTokens[0];
  let client;
  let user;
  let clientUser;

  beforeEach(async () => {
    client = new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    });
    await client.save();

    user = new User({ _id: randomId(), email: `${randomString()}@curve.com` });
    await user.save();

    const userToken = {
      id: user._id,
      internal: false,
      parentId: null,
      clientId: client._id,
      email: user.email,
      rights: {},
    };
    userToken.rights[client._id.toString()] = { contracts: 'Edit', sales: 'Edit' };
    clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });

  describe('Date filtering - createdAfter', () => {
    let oldSalesFile;
    let recentSalesFile;

    beforeEach(async () => {
      oldSalesFile = new SalesFile({
        clientId: client._id,
        name: `Old Sales File ${randomString()}`,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldSalesFile.save();

      recentSalesFile = new SalesFile({
        clientId: client._id,
        name: `Recent Sales File ${randomString()}`,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentSalesFile.save();
    });

    it('should return only sales files created on or after the specified date', async () => {
      const res = await server
        .get('/salesFiles?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(recentSalesFile._id.toString());
      expect(returnedIds).not.toContain(oldSalesFile._id.toString());
    });

    it('should include sales files created exactly on the specified date', async () => {
      const exactDateSalesFile = new SalesFile({
        clientId: client._id,
        name: `Exact Date Sales File ${randomString()}`,
        createdAt: new Date('2024-01-01T23:59:59Z'),
        updatedAt: new Date('2024-01-01T23:59:59Z'),
      });
      await exactDateSalesFile.save();

      const res = await server
        .get('/salesFiles?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(exactDateSalesFile._id.toString());
    });
  });

  describe('Date filtering - createdBefore', () => {
    let oldSalesFile;
    let recentSalesFile;

    beforeEach(async () => {
      oldSalesFile = new SalesFile({
        clientId: client._id,
        name: `Old Sales File ${randomString()}`,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldSalesFile.save();

      recentSalesFile = new SalesFile({
        clientId: client._id,
        name: `Recent Sales File ${randomString()}`,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentSalesFile.save();
    });

    it('should return only sales files created before the specified date', async () => {
      const res = await server
        .get('/salesFiles?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(oldSalesFile._id.toString());
      expect(returnedIds).not.toContain(recentSalesFile._id.toString());
    });

    it('should include sales files created exactly on the specified date', async () => {
      const exactDateSalesFile = new SalesFile({
        clientId: client._id,
        name: `Exact Date Sales File ${randomString()}`,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      });
      await exactDateSalesFile.save();

      const res = await server
        .get('/salesFiles?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(exactDateSalesFile._id.toString());
    });
  });

  describe('Date filtering - updatedAfter', () => {
    let oldUpdateSalesFile;
    let recentUpdateSalesFile;

    beforeEach(async () => {
      oldUpdateSalesFile = new SalesFile({
        clientId: client._id,
        name: `Old Update Sales File ${randomString()}`,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateSalesFile.save();
      await SalesFile.updateOne({ _id: oldUpdateSalesFile._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateSalesFile = new SalesFile({
        clientId: client._id,
        name: `Recent Update Sales File ${randomString()}`,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateSalesFile.save();
      await SalesFile.updateOne({ _id: recentUpdateSalesFile._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only sales files updated on or after the specified date', async () => {
      const res = await server
        .get('/salesFiles?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(recentUpdateSalesFile._id.toString());
      expect(returnedIds).not.toContain(oldUpdateSalesFile._id.toString());
    });

    it('should include sales files updated exactly on the specified date', async () => {
      const exactDateSalesFile = new SalesFile({
        clientId: client._id,
        name: 'Exact Update Sales File',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateSalesFile.save();
      await SalesFile.updateOne({ _id: exactDateSalesFile._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/salesFiles?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(exactDateSalesFile._id.toString());
    });
  });

  describe('Date filtering - updatedBefore', () => {
    let oldUpdateSalesFile;
    let recentUpdateSalesFile;

    beforeEach(async () => {
      oldUpdateSalesFile = new SalesFile({
        clientId: client._id,
        name: `Old Update Sales File ${randomString()}`,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateSalesFile.save();
      await SalesFile.updateOne({ _id: oldUpdateSalesFile._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateSalesFile = new SalesFile({
        clientId: client._id,
        name: `Recent Update Sales File ${randomString()}`,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateSalesFile.save();
      await SalesFile.updateOne({ _id: recentUpdateSalesFile._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only sales files updated before the specified date', async () => {
      const res = await server
        .get('/salesFiles?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(oldUpdateSalesFile._id.toString());
      expect(returnedIds).not.toContain(recentUpdateSalesFile._id.toString());
    });

    it('should include sales files updated exactly on the specified date', async () => {
      const exactDateSalesFile = new SalesFile({
        clientId: client._id,
        name: 'Exact Update Sales File',
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateSalesFile.save();
      await SalesFile.updateOne({ _id: exactDateSalesFile._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/salesFiles?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(exactDateSalesFile._id.toString());
    });
  });

  describe('Date filtering - combinations', () => {
    let earlySalesFile;
    let midSalesFile;
    let lateSalesFile;

    beforeEach(async () => {
      earlySalesFile = new SalesFile({
        clientId: client._id,
        name: `Early Sales File ${randomString()}`,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });
      await earlySalesFile.save();

      midSalesFile = new SalesFile({
        clientId: client._id,
        name: `Mid Sales File ${randomString()}`,
        createdAt: new Date('2024-06-15T10:00:00Z'),
        updatedAt: new Date('2024-06-15T10:00:00Z'),
      });
      await midSalesFile.save();

      lateSalesFile = new SalesFile({
        clientId: client._id,
        name: `Late Sales File ${randomString()}`,
        createdAt: new Date('2024-12-15T10:00:00Z'),
        updatedAt: new Date('2024-12-15T10:00:00Z'),
      });
      await lateSalesFile.save();
    });

    it('should apply createdAfter and createdBefore together for a date range', async () => {
      const res = await server
        .get('/salesFiles?createdAfter=2024-03-01&createdBefore=2024-09-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(midSalesFile._id.toString());
      expect(returnedIds).not.toContain(earlySalesFile._id.toString());
      expect(returnedIds).not.toContain(lateSalesFile._id.toString());
    });

    it('should combine date filters with text search', async () => {
      const matchingSalesFile = new SalesFile({
        clientId: client._id,
        name: 'Searchable Sales File',
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await matchingSalesFile.save();

      const nonMatchingSalesFile = new SalesFile({
        clientId: client._id,
        name: 'Different Name',
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await nonMatchingSalesFile.save();

      const res = await server
        .get('/salesFiles?createdAfter=2024-03-01&text=Searchable')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((sf) => sf._id.toString());
      expect(returnedIds).toContain(matchingSalesFile._id.toString());
      expect(returnedIds).not.toContain(nonMatchingSalesFile._id.toString());
    });
  });

  describe('/raw-export POST', () => {
    beforeEach(() => {
      mockCSVRawExport.mockReset();
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://s3.amazonaws.com/test-export.csv' });
    });

    it('should return 200 with async message when sync is not set', async () => {
      const res = await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Your report will be sent to you via email shortly');
    });

    it('should return 200 with csvPublicLink when sync=true', async () => {
      const res = await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toBe('https://s3.amazonaws.com/test-export.csv');
    });

    it('should call CSVRawExport with sync=true when body param set', async () => {
      await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        sync: true,
      }));
    });

    it('should return 500 when CSVRawExport throws in sync mode', async () => {
      mockCSVRawExport.mockRejectedValue(new Error('Export failed'));

      const res = await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Export failed');
    });

    it('should apply updatedAfter filter to updatedAt.$gte', async () => {
      await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { updatedAfter: '2025-01-15' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: { $gte: new Date('2025-01-15T00:00:00.000Z') },
        }),
      }));
    });

    it('should apply updatedBefore filter to updatedAt.$lte', async () => {
      await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { updatedBefore: '2025-01-20' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: { $lte: new Date('2025-01-20T23:59:59.999Z') },
        }),
      }));
    });

    it('should apply createdAfter filter to createdAt.$gte', async () => {
      await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { createdAfter: '2025-01-10' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: { $gte: new Date('2025-01-10T00:00:00.000Z') },
        }),
      }));
    });

    it('should apply createdBefore filter to createdAt.$lte', async () => {
      await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { createdBefore: '2025-01-25' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: { $lte: new Date('2025-01-25T23:59:59.999Z') },
        }),
      }));
    });

    it('should apply combined updatedAfter and updatedBefore as date range', async () => {
      await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { updatedAfter: '2025-01-10', updatedBefore: '2025-01-20' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: {
            $gte: new Date('2025-01-10T00:00:00.000Z'),
            $lte: new Date('2025-01-20T23:59:59.999Z'),
          },
        }),
      }));
    });

    it('should return 403 when user has None sales rights', async () => {
      const userToken = {
        id: user._id.toString(),
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: user.email,
        rights: { [client._id.toString()]: { sales: 'None' } },
      };
      const noneToken = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', noneToken)
        .send({ filter: {} });

      expect(res.status).toBe(403);
    });

    it('should allow View user to export', async () => {
      const userToken = {
        id: user._id.toString(),
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: user.email,
        rights: { [client._id.toString()]: { sales: 'View' } },
      };
      const viewToken = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .post('/salesFiles/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', viewToken)
        .send({ filter: {} });

      expect(res.status).toBe(200);
    });
  });

  describe('search with target period filter', () => {
    const searchKeyword = 'SearchKeyword';
    let matchingWithPeriodUnassigned;
    let matchingWithPeriodAssigned;
    let notMatchingWithPeriodUnassigned;
    let notMatchingWithPeriodAssigned;

    beforeEach(async () => {
      matchingWithPeriodUnassigned = new SalesFile({
        clientId: client._id,
        name: `${searchKeyword} File ${randomString()}`,
      });
      await matchingWithPeriodUnassigned.save();

      matchingWithPeriodAssigned = new SalesFile({
        clientId: client._id,
        name: `${searchKeyword} File ${randomString()}`,
        targetPeriod: '2024-Q1',
      });
      await matchingWithPeriodAssigned.save();

      notMatchingWithPeriodUnassigned = new SalesFile({
        clientId: client._id,
        name: `Other File ${randomString()}`,
      });
      await notMatchingWithPeriodUnassigned.save();

      notMatchingWithPeriodAssigned = new SalesFile({
        clientId: client._id,
        name: `Other File ${randomString()}`,
        targetPeriod: '2024-Q1',
      });
      await notMatchingWithPeriodAssigned.save();
    });

    it('should return all files matching the text regardless of targetPeriod if no target period param provided', async () => {
      const res = await server
        .get(`/salesFiles?text=${searchKeyword}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);

      const returnedIds = res.body.salesFiles.map((file) => file._id.toString());

      expect(returnedIds).toContain(matchingWithPeriodUnassigned._id.toString());
      expect(returnedIds).toContain(matchingWithPeriodAssigned._id.toString());
      expect(returnedIds).not.toContain(notMatchingWithPeriodUnassigned._id.toString());
      expect(returnedIds).not.toContain(notMatchingWithPeriodAssigned._id.toString());
    });

    it('should return only files with no targetPeriod when filtering by unassigned', async () => {
      const res = await server
        .get('/salesFiles?targetPeriod=unassigned')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((file) => file._id.toString());
      expect(returnedIds).toContain(matchingWithPeriodUnassigned._id.toString());
      expect(returnedIds).toContain(notMatchingWithPeriodUnassigned._id.toString());
      expect(returnedIds).not.toContain(matchingWithPeriodAssigned._id.toString());
      expect(returnedIds).not.toContain(notMatchingWithPeriodAssigned._id.toString());
    });

    it('should return only files matching text AND with no targetPeriod when both filters are combined', async () => {
      const res = await server
        .get(`/salesFiles?text=${searchKeyword}&targetPeriod=unassigned`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString());

      expect(res.status).toBe(200);
      const returnedIds = res.body.salesFiles.map((file) => file._id.toString());
      expect(returnedIds).toContain(matchingWithPeriodUnassigned._id.toString());
      expect(returnedIds).not.toContain(matchingWithPeriodAssigned._id.toString());
      expect(returnedIds).not.toContain(notMatchingWithPeriodUnassigned._id.toString());
      expect(returnedIds).not.toContain(notMatchingWithPeriodAssigned._id.toString());
    });
  });

  describe('PUT /:id', () => {
    let salesFile;
    const originalFile = () => `salesFiles/${randomId()}/original.xls`;

    beforeEach(async () => {
      salesFile = new SalesFile({
        clientId: client._id,
        name: `Sales File ${randomString()}`,
        file: originalFile(),
        publicLink: `https://example.com/${randomString()}`,
      });
      await salesFile.save();
    });

    it('ignores a file value supplied in the payload (path is immutable)', async () => {
      const res = await server
        .put(`/salesFiles/${salesFile._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString())
        .send({ file: `salesFiles/${randomId()}/attackers-target.xls` });

      expect(res.status).toBe(200);

      const reloaded = await SalesFile.findById(salesFile._id);
      expect(reloaded.file).toBe(salesFile.file);
    });

    it('updates allowed fields while ignoring file in the same request', async () => {
      const newName = `Renamed ${randomString()}`;

      const res = await server
        .put(`/salesFiles/${salesFile._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString())
        .send({ name: newName, file: `salesFiles/${randomId()}/attackers-target.xls` });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(newName);

      const reloaded = await SalesFile.findById(salesFile._id);
      expect(reloaded.name).toBe(newName);
      expect(reloaded.file).toBe(salesFile.file);
    });

    it('updates normally when no file is supplied', async () => {
      const newName = `Renamed ${randomString()}`;

      const res = await server
        .put(`/salesFiles/${salesFile._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString())
        .send({ name: newName });

      expect(res.status).toBe(200);

      const reloaded = await SalesFile.findById(salesFile._id);
      expect(reloaded.name).toBe(newName);
      expect(reloaded.file).toBe(salesFile.file);
    });

    it('continues to strip clientId so the file cannot be moved to another tenant', async () => {
      const otherClientId = randomId();

      const res = await server
        .put(`/salesFiles/${salesFile._id}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString())
        .send({ name: `Renamed ${randomString()}`, clientId: otherClientId.toString() });

      expect(res.status).toBe(200);

      const reloaded = await SalesFile.findById(salesFile._id);
      expect(reloaded.clientId.toString()).toBe(client._id.toString());
    });

    it('returns 403 when the user lacks sales Edit rights', async () => {
      const viewerToken = {
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: {},
      };
      viewerToken.rights[client._id.toString()] = { contracts: 'View', sales: 'View' };
      const viewer = jwt.sign(viewerToken, process.env.jsonSecretToken, { expiresIn: 86400 });

      const res = await server
        .put(`/salesFiles/${salesFile._id}`)
        .set('applicationToken', applicationToken)
        .set('token', viewer)
        .set('clientId', client._id.toString())
        .send({ name: `Renamed ${randomString()}` });

      expect(res.status).toBe(403);
    });

    it('returns 404 when the sales file does not exist', async () => {
      const res = await server
        .put(`/salesFiles/${randomId()}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .set('clientId', client._id.toString())
        .send({ name: `Renamed ${randomString()}` });

      expect(res.status).toBe(404);
    });
  });
});
