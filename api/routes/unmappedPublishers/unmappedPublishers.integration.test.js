const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const supertest = require('supertest');
const config = require('../../config.json');
const Client = require('../../models/client');
const Publisher = require('../../models/publisher');
const UnmappedPublisher = require('../../models/unmappedPublisher');
const User = require('../../models/user');

const server = supertest(require('../../index'));

const [applicationToken] = config.applicationTokens;

describe('/unmappedPublishers', () => {
  let client;
  let user;
  let clientUser;
  let salesFileId;

  beforeEach(async () => {
    client = await new Client({
      _id: randomId(),
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
    }).save();

    user = await new User({ _id: randomId(), email: `${randomString()}@curve.com` }).save();

    salesFileId = randomId().toString();

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
    await UnmappedPublisher.deleteMany({ clientId: client._id });
    await Publisher.deleteMany({ clientId: client._id });
    await User.deleteMany({ _id: user._id });
    await Client.deleteMany({ _id: client._id });
  });

  describe('GET /', () => {
    it('should return unmapped publishers for the authenticated client', async () => {
      const unmappedName = randomString();
      await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: unmappedName,
        complete: false,
      }).save();

      // Record belonging to a different client — should NOT be returned
      const otherClientId = randomId();
      await new UnmappedPublisher({
        clientId: otherClientId,
        salesFileId,
        name: randomString(),
        complete: false,
      }).save();

      const response = await server
        .get('/unmappedPublishers')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(response.status).toBe(200);
      expect(response.body.unmappedPublishers).toHaveLength(1);
      expect(response.body.unmappedPublishers[0].name).toBe(unmappedName);
      expect(response.body.meta).toMatchObject({ currentPage: 1 });

      await UnmappedPublisher.deleteMany({ clientId: otherClientId });
    });

    it('should filter by salesFileId', async () => {
      const targetSalesFileId = randomId().toString();
      const otherSalesFileId = randomId().toString();

      await new UnmappedPublisher({ clientId: client._id, salesFileId: targetSalesFileId, name: randomString(), complete: false }).save();
      await new UnmappedPublisher({ clientId: client._id, salesFileId: otherSalesFileId, name: randomString(), complete: false }).save();

      const response = await server
        .get(`/unmappedPublishers?salesFileId=${targetSalesFileId}`)
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(response.status).toBe(200);
      expect(response.body.unmappedPublishers).toHaveLength(1);
      expect(response.body.unmappedPublishers[0].salesFileId).toBe(targetSalesFileId);
    });

    it('should filter by complete status', async () => {
      await new UnmappedPublisher({ clientId: client._id, salesFileId, name: randomString(), complete: false }).save();
      await new UnmappedPublisher({ clientId: client._id, salesFileId, name: randomString(), complete: true }).save();

      const response = await server
        .get('/unmappedPublishers?complete=false')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(response.status).toBe(200);
      expect(response.body.unmappedPublishers).toHaveLength(1);
      expect(response.body.unmappedPublishers[0].complete).toBe(false);
    });

    it('should include records where the complete field is absent when filtering complete=false', async () => {
      // Records created by the processor do not set complete at all — the $ne: true
      // query must match these as well as records explicitly saved with complete: false
      const absentComplete = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: randomString(),
        // complete intentionally omitted
      }).save();
      await new UnmappedPublisher({ clientId: client._id, salesFileId, name: randomString(), complete: true }).save();

      const response = await server
        .get('/unmappedPublishers?complete=false')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(response.status).toBe(200);
      expect(response.body.unmappedPublishers).toHaveLength(1);
      expect(response.body.unmappedPublishers[0]._id).toBe(absentComplete._id.toString());
    });

    it('should filter by text search', async () => {
      const uniqueName = `JIM${randomString()}`;
      await new UnmappedPublisher({ clientId: client._id, salesFileId, name: uniqueName, complete: false }).save();
      await new UnmappedPublisher({ clientId: client._id, salesFileId, name: `UNRELATED${randomString()}`, complete: false }).save();

      const response = await server
        .get('/unmappedPublishers?text=JIM')
        .set('applicationToken', applicationToken)
        .set('token', clientUser);

      expect(response.status).toBe(200);
      expect(response.body.unmappedPublishers).toHaveLength(1);
      expect(response.body.unmappedPublishers[0].name).toBe(uniqueName);
    });

    it('should return 403 for users without catalogue read access', async () => {
      const restrictedToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { catalogue: 'None' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const response = await server
        .get('/unmappedPublishers')
        .set('applicationToken', applicationToken)
        .set('token', restrictedToken);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /map_to_existing', () => {
    it('should add the unrecognized name as an alias on an existing publisher and mark as complete', async () => {
      const unrecognizedName = `JIM'S PUBLISHING ${randomString()}`;
      const unmappedPublisher = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: unrecognizedName,
        complete: false,
      }).save();

      const existingPublisher = await new Publisher({
        clientId: client._id,
        name: `Jim's Publishing Inc. ${randomString()}`,
        lowerCaseName: 'jim\'s publishing inc.',
        aliases: [],
      }).save();

      const response = await server
        .post('/unmappedPublishers/map_to_existing')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({
          unmappedPublisherId: unmappedPublisher._id.toString(),
          publisherId: existingPublisher._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Publisher mapped successfully');
      expect(response.body.unmappedPublisher.complete).toBe(true);
      expect(response.body.unmappedPublisher.publisherId).toBe(existingPublisher._id.toString());

      // Verify alias was added to the publisher
      const updatedPublisher = await Publisher.findById(existingPublisher._id);
      expect(updatedPublisher.aliases).toContain(unrecognizedName);
    });

    it('should return 409 when the alias already exists on a different publisher', async () => {
      const conflictingAlias = `JIM'S PUBLISHING ${randomString()}`;

      // Publisher A already has this alias
      await new Publisher({
        clientId: client._id,
        name: `Publisher A ${randomString()}`,
        lowerCaseName: 'publisher a',
        aliases: [conflictingAlias],
      }).save();

      // Publisher B — we're trying to map to this one
      const publisherB = await new Publisher({
        clientId: client._id,
        name: `Publisher B ${randomString()}`,
        lowerCaseName: 'publisher b',
        aliases: [],
      }).save();

      const unmappedPublisher = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: conflictingAlias,
        complete: false,
      }).save();

      const response = await server
        .post('/unmappedPublishers/map_to_existing')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({
          unmappedPublisherId: unmappedPublisher._id.toString(),
          publisherId: publisherB._id.toString(),
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/already has the alias/);
      expect(response.body.message).toContain(conflictingAlias);

      // Confirm unmapped publisher is still incomplete
      const stillIncomplete = await UnmappedPublisher.findById(unmappedPublisher._id);
      expect(stillIncomplete.complete).toBe(false);
    });

    it('should succeed (200) when the target publisher already has the name as its own alias', async () => {
      // The name is already an alias on the target publisher — skip $addToSet and mark complete
      const aliasName = `SOME PUBLISHER ${randomString()}`;

      const targetPublisher = await new Publisher({
        clientId: client._id,
        name: `Target Publisher ${randomString()}`,
        lowerCaseName: 'target publisher',
        aliases: [aliasName],
      }).save();

      const unmappedPublisher = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: aliasName,
        complete: false,
      }).save();

      const response = await server
        .post('/unmappedPublishers/map_to_existing')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({
          unmappedPublisherId: unmappedPublisher._id.toString(),
          publisherId: targetPublisher._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.unmappedPublisher.complete).toBe(true);

      // Alias count on the target publisher should remain unchanged
      const unchanged = await Publisher.findById(targetPublisher._id);
      expect(unchanged.aliases).toHaveLength(1);
      expect(unchanged.aliases[0]).toBe(aliasName);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await server
        .post('/unmappedPublishers/map_to_existing')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ unmappedPublisherId: randomId().toString() }); // missing publisherId

      expect(response.status).toBe(400);
    });

    it('should return 404 when unmapped publisher is not found', async () => {
      const existingPublisher = await new Publisher({
        clientId: client._id,
        name: randomString(),
        aliases: [],
      }).save();

      const response = await server
        .post('/unmappedPublishers/map_to_existing')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({
          unmappedPublisherId: randomId().toString(),
          publisherId: existingPublisher._id.toString(),
        });

      expect(response.status).toBe(404);
    });

    it('should return 404 when the target publisher is not found', async () => {
      const unmappedPublisher = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: randomString(),
        complete: false,
      }).save();

      const response = await server
        .post('/unmappedPublishers/map_to_existing')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({
          unmappedPublisherId: unmappedPublisher._id.toString(),
          publisherId: randomId().toString(),
        });

      expect(response.status).toBe(404);
    });

    it('should return 403 for users without edit rights', async () => {
      const viewOnlyToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { catalogue: 'View' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const response = await server
        .post('/unmappedPublishers/map_to_existing')
        .set('applicationToken', applicationToken)
        .set('token', viewOnlyToken)
        .send({
          unmappedPublisherId: randomId().toString(),
          publisherId: randomId().toString(),
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /create_new', () => {
    it('should create a new publisher and mark the unmapped record as complete', async () => {
      const newPublisherName = `New Publisher LLC ${randomString()}`;
      const unmappedPublisher = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: newPublisherName,
        complete: false,
      }).save();

      const response = await server
        .post('/unmappedPublishers/create_new')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ unmappedPublisherId: unmappedPublisher._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Publisher created successfully');
      expect(response.body.publisher.name).toBe(newPublisherName);
      expect(response.body.publisher.clientId).toBe(client._id.toString());
      expect(response.body.unmappedPublisher.complete).toBe(true);
      expect(response.body.unmappedPublisher.publisherId).toBe(response.body.publisher._id);

      // Verify publisher exists in the database
      const createdPublisher = await Publisher.findOne({ clientId: client._id, name: newPublisherName });
      expect(createdPublisher).not.toBeNull();
      expect(createdPublisher.lowerCaseName).toBe(newPublisherName.toLowerCase());
    });

    it('should return 409 when a publisher with that name already exists', async () => {
      const existingName = `Existing Publisher ${randomString()}`;

      await new Publisher({
        clientId: client._id,
        name: existingName,
        lowerCaseName: existingName.toLowerCase(),
        aliases: [],
      }).save();

      const unmappedPublisher = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: existingName,
        complete: false,
      }).save();

      const response = await server
        .post('/unmappedPublishers/create_new')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ unmappedPublisherId: unmappedPublisher._id.toString() });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/already exists/);

      // Unmapped publisher should remain incomplete
      const stillIncomplete = await UnmappedPublisher.findById(unmappedPublisher._id);
      expect(stillIncomplete.complete).toBe(false);
    });

    it('should return 409 when a publisher with that name exists as an alias on another publisher', async () => {
      const aliasName = `Some Alias ${randomString()}`;

      await new Publisher({
        clientId: client._id,
        name: `Parent Publisher ${randomString()}`,
        lowerCaseName: 'parent publisher',
        aliases: [aliasName],
      }).save();

      const unmappedPublisher = await new UnmappedPublisher({
        clientId: client._id,
        salesFileId,
        name: aliasName,
        complete: false,
      }).save();

      const response = await server
        .post('/unmappedPublishers/create_new')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ unmappedPublisherId: unmappedPublisher._id.toString() });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/already exists/);
    });

    it('should return 400 when unmappedPublisherId is missing', async () => {
      const response = await server
        .post('/unmappedPublishers/create_new')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 when the unmapped publisher record is not found', async () => {
      const response = await server
        .post('/unmappedPublishers/create_new')
        .set('applicationToken', applicationToken)
        .set('token', clientUser)
        .send({ unmappedPublisherId: randomId().toString() });

      expect(response.status).toBe(404);
    });

    it('should return 403 for users without edit rights', async () => {
      const viewOnlyToken = jwt.sign({
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        email: user.email,
        rights: { [client._id.toString()]: { catalogue: 'View' } },
      }, process.env.jsonSecretToken, { expiresIn: 86400 });

      const response = await server
        .post('/unmappedPublishers/create_new')
        .set('applicationToken', applicationToken)
        .set('token', viewOnlyToken)
        .send({ unmappedPublisherId: randomId().toString() });

      expect(response.status).toBe(403);
    });
  });
});
