const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');

// Mock CSVRawExport for raw-export tests
const mockCSVRawExport = jest.fn();
jest.mock('../../libs/mongodb-export', () => ({
  CSVRawExport: mockCSVRawExport,
}));

const Client = require('../../models/client');
const UnmappedWork = require('../../models/unmappedWork');
const User = require('../../models/user');
const Work = require('../../models/work');

const server = supertest(require('../../index'));

jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  TaskHelpers: { createTaskAndSendMessage: jest.fn().mockResolvedValue({}) },
}));

const [applicationToken] = config.applicationTokens;
const FORBIDDEN_ERROR = 'Forbidden';
describe('Unmapped Works Integration Tests - Date Filtering and Create Works', () => {
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
    userToken.rights[client._id.toString()] = { catalogue: 'Edit' };
    clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
  });
  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('POST /unmappedWorks/export', () => {
    let client;
    let user;
    let token;
    let unmappedIdentifier;
    let workTitle;
    let source;

    beforeEach(async () => {
    // Create test client
      client = new Client({
        name: randomString(),
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
        bigQuerySalesTable: randomString(),
      });
      await client.save();

      // Create test user with edit rights
      user = new User({
        email: `${randomString()}@curveroyaltysystems.com`,
        clientId: client._id,
      });
      await user.save();

      // Create JWT token
      token = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: user.email,
        rights: {
          [client._id.toString()]: {
            catalogue: 'Edit',
          },
        },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      // Generate common test data
      unmappedIdentifier = randomString();
      workTitle = randomString();
      source = randomString();
    });

    afterEach(async () => {
      await Work.deleteMany({ clientId: client._id });
      await UnmappedWork.deleteMany({ clientId: client._id });
      await User.deleteMany({ _id: user._id });
      await Client.deleteMany({ _id: client._id });
    });
    it('should create an export task successfully', async () => {
    // Arrange
      const unmappedWork = new UnmappedWork({
        clientId: client._id,
        identifier: unmappedIdentifier,
        source,
        title: workTitle,
        complete: false,
      });
      await unmappedWork.save();

      // Act
      const response = await server
        .post('/unmappedWorks/export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          workIds: [unmappedWork._id.toString()],
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Export task created');
    });

    it('should export with filter parameters', async () => {
    // Arrange
      const unmappedWork = new UnmappedWork({
        clientId: client._id,
        identifier: unmappedIdentifier,
        source,
        title: workTitle,
        complete: false,
      });
      await unmappedWork.save();

      // Act
      const response = await server
        .post('/unmappedWorks/export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          filter: {
            source,
            complete: 'false',
          },
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Export task created');
    });

    it('should deny export without catalogue edit rights', async () => {
    // Arrange - Create user without edit rights
      const limitedUser = new User({
        email: `${randomString()}@curveroyaltysystems.com`,
        clientId: client._id,
      });
      await limitedUser.save();

      const limitedToken = jwt.sign({
        id: limitedUser._id,
        internal: false,
        parentId: null,
        clientId: client._id.toString(),
        email: limitedUser.email,
        rights: {
          [client._id.toString()]: {
            catalogue: 'Read',
          },
        },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      // Act
      const response = await server
        .post('/unmappedWorks/export')
        .set('applicationToken', applicationToken)
        .set('token', limitedToken)
        .send({
          workIds: [],
        });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(FORBIDDEN_ERROR);

      // Cleanup
      await User.deleteMany({ _id: limitedUser._id });
    });

    it('should export with text filter', async () => {
    // Arrange
      const unmappedWork = new UnmappedWork({
        clientId: client._id,
        identifier: unmappedIdentifier,
        source,
        title: workTitle,
        complete: false,
      });
      await unmappedWork.save();

      // Act
      const response = await server
        .post('/unmappedWorks/export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          filter: {
            text: workTitle,
          },
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Export task created');
    });

    it('should export with empty workIds array using filters', async () => {
    // Arrange
      const unmappedWork1 = new UnmappedWork({
        clientId: client._id,
        identifier: unmappedIdentifier,
        source,
        title: workTitle,
        complete: false,
      });
      await unmappedWork1.save();

      // Act
      const response = await server
        .post('/unmappedWorks/export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          workIds: [],
          filter: {
            complete: 'false',
          },
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Export task created');
    });

    it('should export with multiple workIds', async () => {
    // Arrange
      const unmappedWork1 = new UnmappedWork({
        clientId: client._id,
        identifier: randomString(),
        source,
        title: randomString(),
        complete: false,
      });
      await unmappedWork1.save();

      const unmappedWork2 = new UnmappedWork({
        clientId: client._id,
        identifier: randomString(),
        source,
        title: randomString(),
        complete: false,
      });
      await unmappedWork2.save();

      // Act
      const response = await server
        .post('/unmappedWorks/export')
        .set('applicationToken', applicationToken)
        .set('token', token)
        .send({
          workIds: [unmappedWork1._id.toString(), unmappedWork2._id.toString()],
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Export task created');
    });
  });

  describe('Date filtering - createdAfter', () => {
    let oldWork;
    let recentWork;

    beforeEach(async () => {
      oldWork = new UnmappedWork({
        clientId: client._id,
        title: 'Old Work',
        identifier: 'OLD001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldWork.save();

      recentWork = new UnmappedWork({
        clientId: client._id,
        title: 'Recent Work',
        identifier: 'NEW001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentWork.save();
    });

    it('should return only unmapped works created on or after the specified date', async () => {
      const res = await server
        .get('/unmappedWorks?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('NEW001');
      expect(returnedIdentifiers).not.toContain('OLD001');
    });

    it('should include unmapped works created exactly on the specified date', async () => {
      const exactDateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Exact Date Work',
        identifier: 'EXACT001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-01-01T23:59:59Z'),
        updatedAt: new Date('2024-01-01T23:59:59Z'),
      });
      await exactDateWork.save();

      const res = await server
        .get('/unmappedWorks?createdAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('EXACT001');
    });
  });

  describe('Date filtering - createdBefore', () => {
    let oldWork;
    let recentWork;

    beforeEach(async () => {
      oldWork = new UnmappedWork({
        clientId: client._id,
        title: 'Old Work',
        identifier: 'OLD001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-15T10:30:00Z'),
        updatedAt: new Date('2023-01-15T10:30:00Z'),
      });
      await oldWork.save();

      recentWork = new UnmappedWork({
        clientId: client._id,
        title: 'Recent Work',
        identifier: 'NEW001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-06-20T14:45:00Z'),
        updatedAt: new Date('2024-06-20T14:45:00Z'),
      });
      await recentWork.save();
    });

    it('should return only unmapped works created before the specified date', async () => {
      const res = await server
        .get('/unmappedWorks?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('OLD001');
      expect(returnedIdentifiers).not.toContain('NEW001');
    });

    it('should include unmapped works created exactly on the specified date', async () => {
      const exactDateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Exact Date Work',
        identifier: 'EXACT001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      });
      await exactDateWork.save();

      const res = await server
        .get('/unmappedWorks?createdBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('EXACT001');
    });
  });

  describe('Date filtering - updatedAfter', () => {
    let oldUpdateWork;
    let recentUpdateWork;

    beforeEach(async () => {
      oldUpdateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Old Update Work',
        identifier: 'OLD001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateWork.save();
      await UnmappedWork.updateOne({ _id: oldUpdateWork._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Recent Update Work',
        identifier: 'NEW001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateWork.save();
      await UnmappedWork.updateOne({ _id: recentUpdateWork._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only unmapped works updated on or after the specified date', async () => {
      const res = await server
        .get('/unmappedWorks?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('NEW001');
      expect(returnedIdentifiers).not.toContain('OLD001');
    });

    it('should include unmapped works updated exactly on the specified date', async () => {
      const exactDateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Exact Update Work',
        identifier: 'EXACT001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateWork.save();
      await UnmappedWork.updateOne({ _id: exactDateWork._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/unmappedWorks?updatedAfter=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('EXACT001');
    });
  });

  describe('Date filtering - updatedBefore', () => {
    let oldUpdateWork;
    let recentUpdateWork;

    beforeEach(async () => {
      oldUpdateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Old Update Work',
        identifier: 'OLD001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await oldUpdateWork.save();
      await UnmappedWork.updateOne({ _id: oldUpdateWork._id }, { updatedAt: new Date('2023-03-15T10:30:00Z') }, { timestamps: false });

      recentUpdateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Recent Update Work',
        identifier: 'NEW001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await recentUpdateWork.save();
      await UnmappedWork.updateOne({ _id: recentUpdateWork._id }, { updatedAt: new Date('2024-08-20T14:45:00Z') }, { timestamps: false });
    });

    it('should return only unmapped works updated before the specified date', async () => {
      const res = await server
        .get('/unmappedWorks?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('OLD001');
      expect(returnedIdentifiers).not.toContain('NEW001');
    });

    it('should include unmapped works updated exactly on the specified date', async () => {
      const exactDateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Exact Update Work',
        identifier: 'EXACT001',
        source: 'test',
        complete: false,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      });
      await exactDateWork.save();
      await UnmappedWork.updateOne({ _id: exactDateWork._id }, { updatedAt: new Date('2024-01-01T12:00:00Z') }, { timestamps: false });

      const res = await server
        .get('/unmappedWorks?updatedBefore=2024-01-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('EXACT001');
    });
  });

  describe('Date filtering - combinations', () => {
    let earlyWork;
    let midWork;
    let lateWork;

    beforeEach(async () => {
      earlyWork = new UnmappedWork({
        clientId: client._id,
        title: 'Early Work',
        identifier: 'EARLY001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });
      await earlyWork.save();

      midWork = new UnmappedWork({
        clientId: client._id,
        title: 'Mid Work',
        identifier: 'MID001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
        updatedAt: new Date('2024-06-15T10:00:00Z'),
      });
      await midWork.save();

      lateWork = new UnmappedWork({
        clientId: client._id,
        title: 'Late Work',
        identifier: 'LATE001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-12-15T10:00:00Z'),
        updatedAt: new Date('2024-12-15T10:00:00Z'),
      });
      await lateWork.save();
    });

    it('should apply createdAfter and createdBefore together for a date range', async () => {
      const res = await server
        .get('/unmappedWorks?createdAfter=2024-03-01&createdBefore=2024-09-01')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('MID001');
      expect(returnedIdentifiers).not.toContain('EARLY001');
      expect(returnedIdentifiers).not.toContain('LATE001');
    });

    it('should combine date filters with text search', async () => {
      const matchingWork = new UnmappedWork({
        clientId: client._id,
        title: 'Searchable Work',
        identifier: 'SEARCH001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await matchingWork.save();

      const nonMatchingWork = new UnmappedWork({
        clientId: client._id,
        title: 'Different Title',
        identifier: 'DIFF001',
        source: 'test',
        complete: false,
        createdAt: new Date('2024-06-15T10:00:00Z'),
      });
      await nonMatchingWork.save();

      const res = await server
        .get('/unmappedWorks?createdAfter=2024-03-01&text=Searchable')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      const returnedIdentifiers = res.body.unmappedWorks.map((w) => w._id.identifier);
      expect(returnedIdentifiers).toContain('SEARCH001');
      expect(returnedIdentifiers).not.toContain('DIFF001');
    });
  });

  describe('GET /unmappedWorks - response fields', () => {
    it('should include createdAt and updatedAt fields in the response', async () => {
      const expectedCreatedAt = new Date('2024-05-10T12:00:00Z');
      const expectedUpdatedAt = new Date('2024-05-15T14:30:00Z');

      const unmappedWork = new UnmappedWork({
        clientId: client._id,
        title: 'Test Work',
        identifier: 'TEST001',
        source: 'test',
        complete: false,
        createdAt: expectedCreatedAt,
      });
      await unmappedWork.save();
      await UnmappedWork.updateOne({ _id: unmappedWork._id }, { updatedAt: expectedUpdatedAt }, { timestamps: false });

      const res = await server
        .get('/unmappedWorks')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(res.status).toBe(200);
      expect(res.body.unmappedWorks).toHaveLength(1);

      const returnedWork = res.body.unmappedWorks[0];
      expect(returnedWork.createdAt).toBeDefined();
      expect(returnedWork.updatedAt).toBeDefined();
      expect(new Date(returnedWork.createdAt).toISOString()).toBe(expectedCreatedAt.toISOString());
      expect(new Date(returnedWork.updatedAt).toISOString()).toBe(expectedUpdatedAt.toISOString());
    });
  });

  describe('POST /unmappedWorks/create_works', () => {
    let prefix;
    let unmappedIdentifier;
    let workTitle;
    let source;

    beforeEach(async () => {
      client.createdBigQueryTables = true;
      client.createdBigQueryBackups = true;
      client.bigQuerySalesTable = randomString();
      await client.save();

      prefix = randomString();
      unmappedIdentifier = randomString();
      workTitle = randomString();
      source = randomString();
    });

    afterEach(async () => {
      await Work.deleteMany({ clientId: client._id });
    });

    describe('When Issue Identifier is Enabled', () => {
      it('should use incremental identifier when issueIdentifier is enabled', async () => {
        // Arrange
        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 1000;
        await client.save();

        const unmappedWork = new UnmappedWork({
          clientId: client._id,
          identifier: unmappedIdentifier,
          source,
          title: workTitle,
          complete: false,
        });
        await unmappedWork.save();

        // Act
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: { identifier: unmappedIdentifier, source },
              title: workTitle,
            }],
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.created).toHaveLength(1);

        const createdWork = await Work.findOne({ clientId: client._id });
        expect(createdWork).toBeDefined();
        expect(createdWork.identifier).toBe(`${prefix}1000`);
        expect(createdWork.identifierNo).toBe(1000);
        expect(createdWork.identifier).not.toBe(unmappedIdentifier);
      });

      it('should use identifierPrefix when provided', async () => {
        // Arrange
        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 5000;
        await client.save();

        const unmappedWork = new UnmappedWork({
          clientId: client._id,
          identifier: unmappedIdentifier,
          source,
          title: workTitle,
          complete: false,
        });
        await unmappedWork.save();

        // Act
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: { identifier: unmappedIdentifier, source },
              title: workTitle,
            }],
          });

        // Assert
        expect(response.status).toBe(200);

        const createdWork = await Work.findOne({ clientId: client._id });
        expect(createdWork.identifier).toBe(`${prefix}5000`);
        expect(createdWork.identifierNo).toBe(5000);
      });
    });

    describe('Society Identifier Retention', () => {
      it('should store unmapped identifier as society identifier', async () => {
        // Arrange
        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 1000;
        await client.save();

        const unmappedWork = new UnmappedWork({
          clientId: client._id,
          identifier: unmappedIdentifier,
          source,
          title: workTitle,
          complete: false,
        });
        await unmappedWork.save();

        // Act
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: { identifier: unmappedIdentifier, source },
              title: workTitle,
            }],
          });

        // Assert
        expect(response.status).toBe(200);

        const createdWork = await Work.findOne({ clientId: client._id });
        expect(createdWork.societyIdentifiers).toBeDefined();
        expect(createdWork.societyIdentifiers.length).toBeGreaterThan(0);
        const matchingSocietyId = createdWork.societyIdentifiers.find(
          (si) => si.society === source && si.identifier === unmappedIdentifier,
        );
        expect(matchingSocietyId).toBeDefined();
      });

      it('should mark unmapped work as complete and link to created work', async () => {
        // Arrange
        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        await client.save();

        const unmappedWork = new UnmappedWork({
          clientId: client._id,
          identifier: unmappedIdentifier,
          source,
          title: workTitle,
          complete: false,
        });
        await unmappedWork.save();

        // Act
        await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: { identifier: unmappedIdentifier, source },
              title: workTitle,
            }],
          });

        // Assert
        const updatedUnmappedWork = await UnmappedWork.findById(unmappedWork._id);
        const createdWork = await Work.findOne({ clientId: client._id });

        expect(updatedUnmappedWork.complete).toBe(true);
        expect(updatedUnmappedWork.workId).toBe(createdWork._id.toString());
      });
    });

    describe('When Issue Identifier is Disabled', () => {
      it('should use unmapped identifier when issueIdentifier is disabled', async () => {
        // Arrange
        client.issueIdentifier = false;
        await client.save();

        const unmappedWork = new UnmappedWork({
          clientId: client._id,
          identifier: unmappedIdentifier,
          source,
          title: workTitle,
          complete: false,
        });
        await unmappedWork.save();

        // Act
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: { identifier: unmappedIdentifier, source },
              title: workTitle,
            }],
          });

        // Assert
        expect(response.status).toBe(200);

        const createdWork = await Work.findOne({ clientId: client._id });
        expect(createdWork.identifier).toBe(unmappedIdentifier);
      });

      it('should still store society identifier when issueIdentifier disabled', async () => {
        // Arrange
        client.issueIdentifier = false;
        await client.save();

        const unmappedWork = new UnmappedWork({
          clientId: client._id,
          identifier: unmappedIdentifier,
          source,
          title: workTitle,
          complete: false,
        });
        await unmappedWork.save();

        // Act
        await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: { identifier: unmappedIdentifier, source },
              title: workTitle,
            }],
          });

        // Assert
        const createdWork = await Work.findOne({ clientId: client._id });
        expect(createdWork.identifier).toBe(unmappedIdentifier);
        const matchingSocietyId = createdWork.societyIdentifiers.find(
          (si) => si.society === source && si.identifier === unmappedIdentifier,
        );
        expect(matchingSocietyId).toBeDefined();
      });
    });

    describe('Edge Cases', () => {
      it('should create multiple works with sequential incremental identifiers', async () => {
        // Arrange
        const identifier1 = randomString();
        const identifier2 = randomString();
        const identifier3 = randomString();
        const title1 = randomString();
        const title2 = randomString();
        const title3 = randomString();

        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 100;
        await client.save();

        await UnmappedWork.create([
          { clientId: client._id, identifier: identifier1, source, title: title1, complete: false },
          { clientId: client._id, identifier: identifier2, source, title: title2, complete: false },
          { clientId: client._id, identifier: identifier3, source, title: title3, complete: false },
        ]);

        // Act
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [
              { _id: { identifier: identifier1, source }, title: title1 },
              { _id: { identifier: identifier2, source }, title: title2 },
              { _id: { identifier: identifier3, source }, title: title3 },
            ],
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.created).toHaveLength(3);

        const works = await Work.find({ clientId: client._id }).sort({ identifierNo: 1 });
        expect(works).toHaveLength(3);
        expect(works[0].identifier).toBe(`${prefix}100`);
        expect(works[1].identifier).toBe(`${prefix}101`);
        expect(works[2].identifier).toBe(`${prefix}102`);
      });

      it('should handle unmapped work with fallback identifier (iswc)', async () => {
        // Arrange
        const iswc = randomString();

        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 2000;
        await client.save();

        const unmappedWork = new UnmappedWork({
          clientId: client._id,
          iswc,
          source,
          title: workTitle,
          complete: false,
        });
        await unmappedWork.save();

        // Act
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: { identifier: undefined, source },
              iswc,
              title: workTitle,
            }],
          });

        // Assert
        expect(response.status).toBe(200);

        const createdWork = await Work.findOne({ clientId: client._id });
        expect(createdWork.identifier).toBe(`${prefix}2000`);
        expect(createdWork.identifierNo).toBe(2000);
        expect(createdWork.societyIdentifiers).toBeDefined();
        expect(createdWork.societyIdentifiers[0].identifier).toBe(iswc);
      });

      it('should only mark unmapped works with ALL matching grouping fields as complete', async () => {
        // Arrange
        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 3000;
        await client.save();

        const source1 = randomString();
        const title1 = randomString();
        const title2 = randomString();
        const iswc1 = randomString();

        // Create two unmapped works with null identifier, same source, but different titles
        const unmappedWork1 = new UnmappedWork({
          clientId: client._id,
          identifier: null,
          source: source1,
          title: title1,
          iswc: iswc1,
          tunecode: null,
          songcode: null,
          complete: false,
        });
        await unmappedWork1.save();

        const unmappedWork2 = new UnmappedWork({
          clientId: client._id,
          identifier: null,
          source: source1,
          title: title2,
          iswc: null,
          tunecode: null,
          songcode: null,
          complete: false,
        });
        await unmappedWork2.save();

        // Act - Create a work from the first unmapped work
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: {
                identifier: null,
                iswc: iswc1,
                tunecode: null,
                songcode: null,
                source: source1,
                title: title1,
              },
              title: title1,
              iswc: iswc1,
            }],
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.created).toHaveLength(1);

        // unmappedWork1 should be marked complete (it matches all grouping fields)
        const updatedUnmappedWork1 = await UnmappedWork.findById(unmappedWork1._id);
        expect(updatedUnmappedWork1.complete).toBe(true);
        expect(updatedUnmappedWork1.workId).toBeDefined();

        // unmappedWork2 should NOT be marked complete (different title)
        const updatedUnmappedWork2 = await UnmappedWork.findById(unmappedWork2._id);
        expect(updatedUnmappedWork2.complete).toBe(false);
        expect(updatedUnmappedWork2.workId).toBeUndefined();
      });

      it('should not mark unmapped works with different ISWC as complete even if identifier and source match', async () => {
        // Arrange
        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 4000;
        await client.save();

        const source1 = randomString();
        const title1 = randomString();
        const iswc1 = randomString();
        const iswc2 = randomString();

        // Create two unmapped works with null identifier, same source and title, but different ISWCs
        const unmappedWork1 = new UnmappedWork({
          clientId: client._id,
          identifier: null,
          source: source1,
          title: title1,
          iswc: iswc1,
          tunecode: null,
          songcode: null,
          complete: false,
        });
        await unmappedWork1.save();

        const unmappedWork2 = new UnmappedWork({
          clientId: client._id,
          identifier: null,
          source: source1,
          title: title1,
          iswc: iswc2,
          tunecode: null,
          songcode: null,
          complete: false,
        });
        await unmappedWork2.save();

        // Act - Create a work from the first unmapped work
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: {
                identifier: null,
                iswc: iswc1,
                tunecode: null,
                songcode: null,
                source: source1,
                title: title1,
              },
              title: title1,
              iswc: iswc1,
            }],
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.created).toHaveLength(1);

        // unmappedWork1 should be marked complete
        const updatedUnmappedWork1 = await UnmappedWork.findById(unmappedWork1._id);
        expect(updatedUnmappedWork1.complete).toBe(true);
        expect(updatedUnmappedWork1.workId).toBeDefined();

        // unmappedWork2 should NOT be marked complete (different iswc)
        const updatedUnmappedWork2 = await UnmappedWork.findById(unmappedWork2._id);
        expect(updatedUnmappedWork2.complete).toBe(false);
        expect(updatedUnmappedWork2.workId).toBeUndefined();
      });

      it('should mark all unmapped works with identical grouping fields as complete', async () => {
        // Arrange
        client.issueIdentifier = true;
        client.identifierPrefix = prefix;
        client.identifierStartFrom = 5000;
        await client.save();

        const source1 = randomString();
        const title1 = randomString();
        const iswc1 = randomString();

        // Create three unmapped works with ALL identical grouping fields
        const unmappedWork1 = new UnmappedWork({
          clientId: client._id,
          identifier: null,
          source: source1,
          title: title1,
          iswc: iswc1,
          tunecode: null,
          songcode: null,
          complete: false,
        });
        await unmappedWork1.save();

        const unmappedWork2 = new UnmappedWork({
          clientId: client._id,
          identifier: null,
          source: source1,
          title: title1,
          iswc: iswc1,
          tunecode: null,
          songcode: null,
          complete: false,
        });
        await unmappedWork2.save();

        const unmappedWork3 = new UnmappedWork({
          clientId: client._id,
          identifier: null,
          source: source1,
          title: title1,
          iswc: iswc1,
          tunecode: null,
          songcode: null,
          complete: false,
        });
        await unmappedWork3.save();

        // Act - Create a work from the aggregated group
        const response = await server
          .post('/unmappedWorks/create_works')
          .set('applicationToken', applicationToken)
          .set('token', clientUser)
          .send({
            works: [{
              _id: {
                identifier: null,
                iswc: iswc1,
                tunecode: null,
                songcode: null,
                source: source1,
                title: title1,
              },
              title: title1,
              iswc: iswc1,
            }],
          });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.created).toHaveLength(1);

        // All three should be marked complete (all fields match)
        const updatedUnmappedWork1 = await UnmappedWork.findById(unmappedWork1._id);
        expect(updatedUnmappedWork1.complete).toBe(true);
        expect(updatedUnmappedWork1.workId).toBeDefined();

        const updatedUnmappedWork2 = await UnmappedWork.findById(unmappedWork2._id);
        expect(updatedUnmappedWork2.complete).toBe(true);
        expect(updatedUnmappedWork2.workId).toBeDefined();

        const updatedUnmappedWork3 = await UnmappedWork.findById(unmappedWork3._id);
        expect(updatedUnmappedWork3.complete).toBe(true);
        expect(updatedUnmappedWork3.workId).toBeDefined();

        // All should have the same workId
        expect(updatedUnmappedWork1.workId).toBe(updatedUnmappedWork2.workId);
        expect(updatedUnmappedWork2.workId).toBe(updatedUnmappedWork3.workId);
      });
    });
  });

  describe('POST /unmappedWorks/raw-export', () => {
    beforeEach(() => {
      mockCSVRawExport.mockClear();
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

      const res = await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', noRightsToken)
        .send({ filter: {} });

      expect(res.status).toBe(403);
    });

    it('should call CSVRawExport with correct parameters when sync is false', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      const res = await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: false, filter: {} });

      expect(res.status).toBe(200);
      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        collectionName: 'unmappedworks',
      }));
    });

    it('should call CSVRawExport with sync=true and return csvPublicLink', async () => {
      mockCSVRawExport.mockResolvedValue({ csvPublicLink: 'https://example.com/export.csv' });

      const res = await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(200);
      expect(res.body.csvPublicLink).toBe('https://example.com/export.csv');
      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        sync: true,
      }));
    });

    it('should pass text filter to CSVRawExport', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { text: 'searchterm' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ title: expect.any(Object) }),
          ]),
        }),
      }));
    });

    it('should pass source filter to CSVRawExport', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { source: 'spotify' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          source: 'spotify',
        }),
      }));
    });

    it('should pass createdAfter filter to CSVRawExport', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { createdAfter: '2024-01-01' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: expect.objectContaining({
            $gte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should pass createdBefore filter to CSVRawExport', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { createdBefore: '2024-12-31' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          createdAt: expect.objectContaining({
            $lte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should pass updatedAfter filter to CSVRawExport', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { updatedAfter: '2024-01-01' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: expect.objectContaining({
            $gte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should pass updatedBefore filter to CSVRawExport', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: { updatedBefore: '2024-12-31' } });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          updatedAt: expect.objectContaining({
            $lte: expect.any(Date),
          }),
        }),
      }));
    });

    it('should handle CSVRawExport errors gracefully', async () => {
      mockCSVRawExport.mockRejectedValue(new Error('Export failed'));

      const res = await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ sync: true, filter: {} });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Export failed');
    });

    it('should include clientId in filter', async () => {
      mockCSVRawExport.mockResolvedValue({ message: 'Your report will be sent to you via email shortly' });

      await server
        .post('/unmappedWorks/raw-export')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ filter: {} });

      expect(mockCSVRawExport).toHaveBeenCalledWith(expect.objectContaining({
        filter: expect.objectContaining({
          clientId: expect.anything(),
        }),
      }));
    });
  });
});
