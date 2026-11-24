const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const jwt = require('jsonwebtoken');
const { randomString, randomId, randomArray, randomError, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const supertest = require('supertest');
const config = require('../../config.json');

const { salesGroupHelpers } = require('../../libs/helpers/salesGroupHelpers');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const SalesGroup = require('../../models/salesGroup');
const User = require('../../models/user');

const server = supertest(require('../../index'));
const { GENERIC_ERROR, FORBIDDEN_ERROR } = require('../constants');

describe('/salesGroups', () => {
  logger.info('>>>file>>>> routes/salesGroups/salesGroups.integration.test .....................');

  // stop logger from logging each api request
  logger.info = jest.fn();
  logger.error = jest.fn();

  const applicationToken = config.applicationTokens[0];
  const unknownObjectId = randomId();
  const payeeId = randomId();
  const contractId = randomId();
  const contractIds = [contractId, randomId()];

  let client; let user; let payee;
  let clientUserFull; let clientUserNone; let clientUserView; let clientUserEdit; let internalUser; let parentUser; let payeeUser;
  let salesGroup;

  beforeEach(async () => {
    client = new Client({
      name: randomString(),
      createdBigQueryTables: true,
      createdBigQueryBackups: true,
      cancelledSubscription: false,
    });
    await client.save();

    payee = new Payee({ clientId: client._id, name: 'Payee 1', iban: 'AB22689556566666' });
    await payee.save();

    user = new User({ email: randomString(), payeeIds: [payee._id.toString()] });
    await user.save();

    const baseUser = { id: user._id, email: 'test-upload@curve.com', internal: false, clientId: client._id, parentId: null, rights: {} };
    clientUserFull = jwt.sign({ ...baseUser, rights: { [client._id]: { admin: true, sales: 'Edit' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserNone = jwt.sign({ ...baseUser, rights: { [client._id]: { sales: 'None' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserView = jwt.sign({ ...baseUser, rights: { [client._id]: { sales: 'View' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    clientUserEdit = jwt.sign({ ...baseUser, rights: { [client._id]: { sales: 'Edit' } } }, process.env.jsonSecretToken, { expiresIn: 86400 });
    internalUser = jwt.sign({ ...baseUser, internal: true, clientId: client._id.toString() }, process.env.jsonSecretToken, { expiresIn: 86400 });
    parentUser = jwt.sign({ ...baseUser, clientId: null, parentId: randomId() }, process.env.jsonSecretToken, { expiresIn: 86400 });
    payeeUser = jwt.sign({ ...baseUser, clientId: null, payeeId, contractIds }, process.env.jsonSecretToken, { expiresIn: 86400 });

    salesGroup = new SalesGroup({ type: 'suspense', clientId: client._id, name: randomString() });
    await salesGroup.save();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await Client.findByIdAndDelete(client._id);
    await Payee.deleteMany({ clientId: client._id });
    await User.deleteMany({ clientId: client._id });
    await SalesGroup.deleteMany({ clientId: client._id });
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      describe('/ GET', () => {
        it('should return a list of salesGroups', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.salesGroups)).toBe(true);
          const salesGroups = await SalesGroup.find({ clientId: client._id.toString() });
          expect(res.body.salesGroups.length).toBe(salesGroups.length);
        });
        it('should return metadata of salesGroups index on / GET', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toBe(200);
          expect(typeof res.body.meta).toBe('object');
        });
        it('should return the first page if not passed a specific page', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toBe(1);
        });
        it('should return the passed page when passed the parameter', async () => {
          // Act
          const res = await server
            .get('/salesGroups?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.currentPage).toBe(3);
        });
        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.meta.totalPages).toBe(1);
        });
        it('should set the amount to be returned per page when passed a limit option', async () => {
          // Act
          const res = await server
            .get('/salesGroups?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.body.salesGroups.length).toBe(1);
          const count = await SalesGroup.countDocuments({ clientId: client._id.toString() });
          expect(res.body.meta.totalPages).toBe(count);
        });
      });
      describe('/:id GET', () => {
        it('should return a salesGroup and 200 status', async () => {
          // Act
          const res = await server
            .get(`/salesGroups/${salesGroup._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(salesGroup._id.toString());
          expect(res.body.type).toBe(salesGroup.type);
          expect(res.body.clientId).toBe(salesGroup.clientId);
          expect(res.body.name).toBe(salesGroup.name);
        });

        it('should return a 404 status when not found', async () => {
          // Act
          const res = await server
            .get(`/salesGroups/${unknownObjectId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull);
          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Group with ID ${unknownObjectId}`);
        });
      });
      describe('/ POST', () => {
        it('should return 200', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            name: randomString(),
            type: 'suspense',
          };
          // Act
          const res = await server
            .post('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send(params);
          // Assert
          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.name).toBe(params.name);
          expect(res.body.type).toBe(params.type);
        });
      });
      describe('/:id/add_multiple_sales_lines POST', () => {
        it('should return total lines added, if successful', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockReturnValueOnce({ totalAdded: salesLineIds.length });
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(200);
          expect(res.body.totalAdded).toBe(salesLineIds.length);
        });
        it('should return an error if not all sales lines to be resolved exist in suspense groups for the client', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          const error = new Error('All sales lines must be in suspense to be resolved');
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockRejectedValue(error);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe(error.message);
        });
        it('should return 500 error if an unhandled error is encountered while adding sales lines', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockRejectedValue(randomError);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(500);
          expect(res.body.message).toBe(GENERIC_ERROR);
        });
        it('should return 404 if the salesGroup is not found', async () => {
          // Arrange
          const id = randomId();
          const salesLineIds = randomArray();
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Group with ID ${id}`);
        });
        it('should return 400 if no salesLineIds are passed', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = undefined;
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No sales lines selected');
        });
        it('should return 400 if passed salesLineIds is an empty array', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = [];
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No sales lines selected');
        });
      });
      describe('/:id/add_filtered_sales_lines POST', () => {
        it('should return total lines added, if successful', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          const totalAdded = randomInt();
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockReturnValueOnce({ totalAdded });
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(200);
          expect(res.body.totalAdded).toBe(totalAdded);
        });
        it('should return an error if not all sales lines to be resolved exist in suspense groups for the client', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          const error = new Error('All sales lines must be in suspense to be resolved');
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(error);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe(error.message);
        });
        it('should return an error if no all sales lines are returned by the filter query', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          const error = new Error('No filtered sales lines to add to a Group');
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(error);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe(error.message);
        });
        it('should return 500 error if an unhandled error is encountered while adding sales lines', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(randomError);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(500);
          expect(res.body.message).toBe(GENERIC_ERROR);
        });
        it('should return 404 if the salesGroup is not found', async () => {
          // Arrange
          const id = randomId();
          const filter = {
            clientId: client._id.toString(),
          };
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Group with ID ${id}`);
        });
        it('should return 400 if no salesLineIds are passed', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = undefined;
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No filters provided');
        });
        it('should return 400 if passed salesLineIds is an empty array', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {};
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No filters provided');
        });
      });
      describe('/bulk DELETE', () => {
        it('should return 422 if no ids are passed', async () => {
          // Act
          const res = await server
            .delete('/salesGroups/bulk')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ ids: [] });
          // Assert
          expect(res.status).toBe(422);
          expect(res.body.message).toBe('Choose at least one group');
        });
        it('should call salesGroupHelpers.deleteSalesGroups with the passed ids', async () => {
          // Arrange
          const ids = [randomId(), randomId()];
          const deleteSalesGroupsSpy = jest.spyOn(salesGroupHelpers, 'deleteSalesGroups').mockResolvedValue({ code: 200, deletedCount: ids.length });
          // Act
          const res = await server
            .delete('/salesGroups/bulk')
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ ids });
          // Assert
          expect(deleteSalesGroupsSpy).toHaveBeenCalledWith({ curveUser: expect.objectContaining({ clientId: client._id.toString() }), ids });
          expect(res.status).toBe(200);
          expect(res.body.deletedCount).toBe(ids.length);
        });
        describe('when salesGroupHelpers.deleteSalesGroups fails due to associated locked periods', () => {
          it('should return a 409 status with the associations in the response body', async () => {
            // Arrange
            const ids = [randomId(), randomId()];
            const associations = [{ id: randomId(), name: randomString() }];
            const message = 'Some or all of these Sales Groups are part of one or more locked periods and so can\'t be deleted';
            jest.spyOn(salesGroupHelpers, 'deleteSalesGroups').mockResolvedValue({ code: 409, message, associations });
            // Act
            const res = await server
              .delete('/salesGroups/bulk')
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ ids });
            // Assert
            expect(res.status).toBe(409);
            expect(res.body.message).toBe(message);
            expect(res.body.associations).toEqual(associations);
          });
        });
        describe('when salesGroupHelpers.deleteSalesGroups throws an error with a code and message', () => {
          it('should return the error code and message', async () => {
            // Arrange
            const error = { code: 400, message: 'Bad Request' };
            jest.spyOn(salesGroupHelpers, 'deleteSalesGroups').mockRejectedValue(error);
            // Act
            const res = await server
              .delete('/salesGroups/bulk')
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ ids: [randomId()] });
            // Assert
            expect(res.status).toBe(error.code);
            expect(res.body.message).toBe(error.message);
          });
        });
        describe('when salesGroupHelpers.deleteSalesGroups throws an unknown error', () => {
          it('should return a 500 internal server error', async () => {
            // Arrange
            const error = randomError();
            jest.spyOn(salesGroupHelpers, 'deleteSalesGroups').mockRejectedValue(error);
            // Act
            const res = await server
              .delete('/salesGroups/bulk')
              .set('applicationToken', applicationToken)
              .set('token', clientUserFull)
              .send({ ids: [randomId()] });
            // Assert
            expect(res.status).toBe(500);
            expect(res.body.message).toBe(GENERIC_ERROR);
          });
        });
      });
    });

    describe('as a user with None rights', () => {
      describe('/ GET', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
      describe('/:id GET', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .get(`/salesGroups/${salesGroup._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone);
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
      describe('/ POST', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            name: randomString(),
            type: 'suspense',
          };
          // Act
          const res = await server
            .post('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send(params);
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
      describe('/:id/add_multiple_sales_lines POST', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
      describe('/bulk DELETE', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .delete('/salesGroups/bulk')
            .set('applicationToken', applicationToken)
            .set('token', clientUserNone)
            .send({ ids: [randomId()] });
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
    });

    describe('as a user with View rights', () => {
      describe('/ GET', () => {
        it('should return a list of salesGroups', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.salesGroups)).toBe(true);
          const salesGroups = await SalesGroup.find({ clientId: client._id.toString() });
          expect(res.body.salesGroups.length).toBe(salesGroups.length);
        });
        it('should return metadata of salesGroups index on / GET', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toBe(200);
          expect(typeof res.body.meta).toBe('object');
        });
        it('should return the first page if not passed a specific page', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.body.meta.currentPage).toBe(1);
        });
        it('should return the passed page when passed the parameter', async () => {
          // Act
          const res = await server
            .get('/salesGroups?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.body.meta.currentPage).toBe(3);
        });
        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.body.meta.totalPages).toBe(1);
        });
        it('should set the amount to be returned per page when passed a limit option', async () => {
          // Act
          const res = await server
            .get('/salesGroups?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.body.salesGroups.length).toBe(1);
          const count = await SalesGroup.countDocuments({ clientId: client._id.toString() });
          expect(res.body.meta.totalPages).toBe(count);
        });
      });
      describe('/:id GET', () => {
        it('should return a salesGroup and 200 status', async () => {
          // Act
          const res = await server
            .get(`/salesGroups/${salesGroup._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(salesGroup._id.toString());
          expect(res.body.type).toBe(salesGroup.type);
          expect(res.body.clientId).toBe(salesGroup.clientId);
          expect(res.body.name).toBe(salesGroup.name);
        });

        it('should return a 404 status when not found', async () => {
          // Act
          const res = await server
            .get(`/salesGroups/${unknownObjectId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView);
          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Group with ID ${unknownObjectId}`);
        });
      });
      describe('/ POST', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            name: randomString(),
            type: 'suspense',
          };
          // Act
          const res = await server
            .post('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send(params);
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
      describe('/:id/add_multiple_sales_lines POST', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
      describe('/:id/add_filtered_sales_lines POST', () => {
        it('should return a 403 forbidden response', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ filter });
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
      describe('/bulk DELETE', () => {
        it('should return a 403 forbidden response', async () => {
          // Act
          const res = await server
            .delete('/salesGroups/bulk')
            .set('applicationToken', applicationToken)
            .set('token', clientUserView)
            .send({ ids: [randomId()] });
          // Assert
          expect(res.status).toBe(403);
          expect(res.body.message).toBe(FORBIDDEN_ERROR);
        });
      });
    });

    describe('as a user with Edit rights', () => {
      describe('/ GET', () => {
        it('should return a list of salesGroups', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.salesGroups)).toBe(true);
          const salesGroups = await SalesGroup.find({ clientId: client._id.toString() });
          expect(res.body.salesGroups.length).toBe(salesGroups.length);
        });
        it('should return metadata of salesGroups index on / GET', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toBe(200);
          expect(typeof res.body.meta).toBe('object');
        });
        it('should return the first page if not passed a specific page', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.body.meta.currentPage).toBe(1);
        });
        it('should return the passed page when passed the parameter', async () => {
          // Act
          const res = await server
            .get('/salesGroups?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.body.meta.currentPage).toBe(3);
        });
        it('should return the pages available', async () => {
          // Act
          const res = await server
            .get('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.body.meta.totalPages).toBe(1);
        });
        it('should set the amount to be returned per page when passed a limit option', async () => {
          // Act
          const res = await server
            .get('/salesGroups?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.body.salesGroups.length).toBe(1);
          const count = await SalesGroup.countDocuments({ clientId: client._id.toString() });
          expect(res.body.meta.totalPages).toBe(count);
        });
      });
      describe('/:id GET', () => {
        it('should return a salesGroup and 200 status', async () => {
          // Act
          const res = await server
            .get(`/salesGroups/${salesGroup._id.toString()}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toBe(200);
          expect(res.body).toBeInstanceOf(Object);
          expect(res.body._id).toBe(salesGroup._id.toString());
          expect(res.body.type).toBe(salesGroup.type);
          expect(res.body.clientId).toBe(salesGroup.clientId);
          expect(res.body.name).toBe(salesGroup.name);
        });

        it('should return a 404 status when not found', async () => {
          // Act
          const res = await server
            .get(`/salesGroups/${unknownObjectId}`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit);
          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Group with ID ${unknownObjectId}`);
        });
      });
      describe('/ POST', () => {
        it('should return 200', async () => {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            name: randomString(),
            type: 'suspense',
          };
          // Act
          const res = await server
            .post('/salesGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(params);
          // Assert
          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.name).toBe(params.name);
          expect(res.body.type).toBe(params.type);
        });
      });
      describe('/:id/add_multiple_sales_lines POST', () => {
        it('should return total lines added, if successful', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockReturnValueOnce({ totalAdded: salesLineIds.length });
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(200);
          expect(res.body.totalAdded).toBe(salesLineIds.length);
        });
        it('should return an error if not all sales lines to be resolved exist in suspense groups for the client', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          const error = new Error('All sales lines must be in suspense to be resolved');
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockRejectedValue(error);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe(error.message);
        });
        it('should return 500 error if an unhandled error is encountered while adding sales lines', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = randomArray();
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockRejectedValue(randomError);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(500);
          expect(res.body.message).toBe(GENERIC_ERROR);
        });
        it('should return 404 if the salesGroup is not found', async () => {
          // Arrange
          const id = randomId();
          const salesLineIds = randomArray();
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Group with ID ${id}`);
        });
        it('should return 400 if no salesLineIds are passed', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = undefined;
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No sales lines selected');
        });
        it('should return 400 if passed salesLineIds is an empty array', async () => {
          // Arrange
          const id = salesGroup._id;
          const salesLineIds = [];
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_multiple_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ salesLineIds });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No sales lines selected');
        });
      });
      describe('/:id/add_filtered_sales_lines POST', () => {
        it('should return total lines added, if successful', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          const totalAdded = randomInt();
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockReturnValueOnce({ totalAdded });
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ filter });
          // Assert
          expect(res.status).toBe(200);
          expect(res.body.totalAdded).toBe(totalAdded);
        });
        it('should return an error if not all sales lines to be resolved exist in suspense groups for the client', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          const error = new Error('All sales lines must be in suspense to be resolved');
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(error);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe(error.message);
        });
        it('should return an error if no all sales lines are returned by the filter query', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          const error = new Error('No filtered sales lines to add to a Group');
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(error);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserFull)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe(error.message);
        });
        it('should return 500 error if an unhandled error is encountered while adding sales lines', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {
            clientId: client._id.toString(),
          };
          jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(randomError);
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ filter });
          // Assert
          expect(res.status).toBe(500);
          expect(res.body.message).toBe(GENERIC_ERROR);
        });
        it('should return 404 if the salesGroup is not found', async () => {
          // Arrange
          const id = randomId();
          const filter = {
            clientId: client._id.toString(),
          };
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ filter });
          // Assert
          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find Group with ID ${id}`);
        });
        it('should return 400 if no salesLineIds are passed', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = undefined;
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No filters provided');
        });
        it('should return 400 if passed salesLineIds is an empty array', async () => {
          // Arrange
          const id = salesGroup._id;
          const filter = {};
          // Act
          const res = await server
            .post(`/salesGroups/${id}/add_filtered_sales_lines`)
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ filter });
          // Assert
          expect(res.status).toBe(400);
          expect(res.body.message).toBe('No filters provided');
        });
      });
      describe('/bulk DELETE', () => {
        it('should call salesGroupHelpers.deleteSalesGroups with the passed ids', async () => {
          // Arrange
          const ids = [randomId(), randomId()];
          const deleteSalesGroupsSpy = jest.spyOn(salesGroupHelpers, 'deleteSalesGroups').mockResolvedValue({ code: 200, deletedCount: ids.length });
          // Act
          const res = await server
            .delete('/salesGroups/bulk')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send({ ids });
          // Assert
          expect(deleteSalesGroupsSpy).toHaveBeenCalledWith({ curveUser: expect.objectContaining({ clientId: client._id.toString() }), ids });
          expect(res.status).toBe(200);
          expect(res.body.deletedCount).toBe(ids.length);
        });
      });
    });
  });

  describe('as an internal user', () => {
    describe('/ GET', () => {
      it('should return a list of salesGroups', async () => {
        // Act
        const res = await server
          .get('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.salesGroups)).toBe(true);
        const salesGroups = await SalesGroup.find({ clientId: client._id.toString() });
        expect(res.body.salesGroups.length).toBe(salesGroups.length);
      });
      it('should return metadata of salesGroups index on / GET', async () => {
        // Act
        const res = await server
          .get('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.status).toBe(200);
        expect(typeof res.body.meta).toBe('object');
      });
      it('should return the first page if not passed a specific page', async () => {
        // Act
        const res = await server
          .get('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.body.meta.currentPage).toBe(1);
      });
      it('should return the passed page when passed the parameter', async () => {
        // Act
        const res = await server
          .get('/salesGroups?page=3')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.body.meta.currentPage).toBe(3);
      });
      it('should return the pages available', async () => {
        // Act
        const res = await server
          .get('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.body.meta.totalPages).toBe(1);
      });
      it('should set the amount to be returned per page when passed a limit option', async () => {
        // Act
        const res = await server
          .get('/salesGroups?limit=1')
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.body.salesGroups.length).toBe(1);
        const count = await SalesGroup.countDocuments({ clientId: client._id.toString() });
        expect(res.body.meta.totalPages).toBe(count);
      });
    });
    describe('/:id GET', () => {
      it('should return a salesGroup and 200 status', async () => {
        // Act
        const res = await server
          .get(`/salesGroups/${salesGroup._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body._id).toBe(salesGroup._id.toString());
        expect(res.body.type).toBe(salesGroup.type);
        expect(res.body.clientId).toBe(salesGroup.clientId);
        expect(res.body.name).toBe(salesGroup.name);
      });

      it('should return a 404 status when not found', async () => {
        // Act
        const res = await server
          .get(`/salesGroups/${unknownObjectId}`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser);
          // Assert
        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Group with ID ${unknownObjectId}`);
      });
    });
    describe('/ POST', () => {
      it('should return 200', async () => {
        // Arrange
        const params = {
          clientId: client._id.toString(),
          name: randomString(),
          type: 'suspense',
        };
          // Act
        const res = await server
          .post('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send(params);
          // Assert
        expect(res.status).toBe(200);
        expect(res.body.clientId).toBe(params.clientId);
        expect(res.body.name).toBe(params.name);
        expect(res.body.type).toBe(params.type);
      });
    });
    describe('/:id/add_multiple_sales_lines POST', () => {
      it('should return total lines added, if successful', async () => {
        // Arrange
        const id = salesGroup._id;
        const salesLineIds = randomArray();
        jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockReturnValueOnce({ totalAdded: salesLineIds.length });
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ salesLineIds });
          // Assert
        expect(res.status).toBe(200);
        expect(res.body.totalAdded).toBe(salesLineIds.length);
      });
      it('should return an error if not all sales lines to be resolved exist in suspense groups for the client', async () => {
        // Arrange
        const id = salesGroup._id;
        const salesLineIds = randomArray();
        const error = new Error('All sales lines must be in suspense to be resolved');
        jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockRejectedValue(error);
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ salesLineIds });
          // Assert
        expect(res.status).toBe(400);
        expect(res.body.message).toBe(error.message);
      });
      it('should return 500 error if an unhandled error is encountered while adding sales lines', async () => {
        // Arrange
        const id = salesGroup._id;
        const salesLineIds = randomArray();
        jest.spyOn(salesGroupHelpers, 'addSalesLinesByIds').mockRejectedValue(randomError);
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ salesLineIds });
          // Assert
        expect(res.status).toBe(500);
        expect(res.body.message).toBe(GENERIC_ERROR);
      });
      it('should return 404 if the salesGroup is not found', async () => {
        // Arrange
        const id = randomId();
        const salesLineIds = randomArray();
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ salesLineIds });
          // Assert
        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Group with ID ${id}`);
      });
      it('should return 400 if no salesLineIds are passed', async () => {
        // Arrange
        const id = salesGroup._id;
        const salesLineIds = undefined;
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ salesLineIds });
          // Assert
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('No sales lines selected');
      });
      it('should return 400 if passed salesLineIds is an empty array', async () => {
        // Arrange
        const id = salesGroup._id;
        const salesLineIds = [];
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ salesLineIds });
          // Assert
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('No sales lines selected');
      });
    });
    describe('/:id/add_filtered_sales_lines POST', () => {
      it('should return total lines added, if successful', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = {
          clientId: client._id.toString(),
        };
        const totalAdded = randomInt();
        jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockReturnValueOnce({ totalAdded });
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ filter });
          // Assert
        expect(res.status).toBe(200);
        expect(res.body.totalAdded).toBe(totalAdded);
      });
      it('should return an error if not all sales lines to be resolved exist in suspense groups for the client', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = {
          clientId: client._id.toString(),
        };
        const error = new Error('All sales lines must be in suspense to be resolved');
        jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(error);
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ filter });
          // Assert
        expect(res.status).toBe(400);
        expect(res.body.message).toBe(error.message);
      });
      it('should return an error if no all sales lines are returned by the filter query', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = {
          clientId: client._id.toString(),
        };
        const error = new Error('No filtered sales lines to add to a Group');
        jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(error);
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ filter });
          // Assert
        expect(res.status).toBe(400);
        expect(res.body.message).toBe(error.message);
      });
      it('should return 500 error if an unhandled error is encountered while adding sales lines', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = {
          clientId: client._id.toString(),
        };
        jest.spyOn(salesGroupHelpers, 'addSalesLinesByFilter').mockRejectedValue(randomError);
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ filter });
          // Assert
        expect(res.status).toBe(500);
        expect(res.body.message).toBe(GENERIC_ERROR);
      });
      it('should return 404 if the salesGroup is not found', async () => {
        // Arrange
        const id = randomId();
        const filter = {
          clientId: client._id.toString(),
        };
          // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ filter });
          // Assert
        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find Group with ID ${id}`);
      });
      it('should return 400 if no salesLineIds are passed', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = undefined;
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ filter });
          // Assert
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('No filters provided');
      });
      it('should return 400 if passed salesLineIds is an empty array', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = {};
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ filter });
          // Assert
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('No filters provided');
      });
    });
    describe('/bulk DELETE', () => {
      it('should call salesGroupHelpers.deleteSalesGroups with the passed ids', async () => {
        // Arrange
        const ids = [randomId(), randomId()];
        const deleteSalesGroupsSpy = jest.spyOn(salesGroupHelpers, 'deleteSalesGroups').mockResolvedValue({ code: 200, deletedCount: ids.length });
        // Act
        const res = await server
          .delete('/salesGroups/bulk')
          .set('applicationToken', applicationToken)
          .set('token', internalUser)
          .send({ ids });
        // Assert
        expect(deleteSalesGroupsSpy).toHaveBeenCalledWith({ curveUser: expect.objectContaining({ clientId: client._id.toString() }), ids });
        expect(res.status).toBe(200);
        expect(res.body.deletedCount).toBe(ids.length);
      });
    });
  });

  describe('as a parent user without a client', () => {
    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/salesGroups/${salesGroup._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser);
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const params = {
          clientId: client._id.toString(),
          name: randomString(),
          type: 'suspense',
        };
        // Act
        const res = await server
          .post('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send(params);
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/:id/add_multiple_sales_lines POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const id = salesGroup._id;
        const salesLineIds = randomArray();
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ salesLineIds });
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/:id/add_filtered_sales_lines POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = {
          clientId: client._id.toString(),
        };
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ filter });
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/bulk DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .delete('/salesGroups/bulk')
          .set('applicationToken', applicationToken)
          .set('token', parentUser)
          .send({ ids: [randomId()] });
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
  });

  describe('as a payee user', () => {
    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/:id GET', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .get(`/salesGroups/${salesGroup._id.toString()}`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser);
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const params = {
          clientId: client._id.toString(),
          name: randomString(),
          type: 'suspense',
        };
        // Act
        const res = await server
          .post('/salesGroups')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send(params);
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/:id/add_multiple_sales_lines POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const id = salesGroup._id;
        const salesLineIds = randomArray();
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_multiple_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ salesLineIds });
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/:id/add_filtered_sales_lines POST', () => {
      it('should return a 403 forbidden response', async () => {
        // Arrange
        const id = salesGroup._id;
        const filter = {
          clientId: client._id.toString(),
        };
        // Act
        const res = await server
          .post(`/salesGroups/${id}/add_filtered_sales_lines`)
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ filter });
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
    describe('/bulk DELETE', () => {
      it('should return a 403 forbidden response', async () => {
        // Act
        const res = await server
          .delete('/salesGroups/bulk')
          .set('applicationToken', applicationToken)
          .set('token', payeeUser)
          .send({ ids: [randomId()] });
        // Assert
        expect(res.status).toBe(403);
        expect(res.body.message).toBe(FORBIDDEN_ERROR);
      });
    });
  });
});
