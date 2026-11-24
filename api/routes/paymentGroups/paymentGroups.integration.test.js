const jwt = require('jsonwebtoken');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const supertest = require('supertest');
const config = require('../../config.json');
const PaymentGroup = require('../../models/paymentGroup');
const Payment = require('../../models/payment');
const Client = require('../../models/client');
const User = require('../../models/user');
const FeatureFlag = require('../../libs/featureFlag');

const server = supertest(require('../../index'));

describe('/payment_groups', () => {
  logger.info('>>>file>>>> routes/paymentGroups .....................');

  let client; let user; let paymentGroup1;

  beforeEach(async () => {
    client = new Client({ name: testUtils.randomString(), email: testUtils.randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
    user = new User({ _id: testUtils.randomId(), email: testUtils.randomString() });
    await client.save();
    await user.save();

    PaymentGroup.sendExport = jest.fn().mockResolvedValue();
    PaymentGroup.importFromExcel = jest.fn().mockResolvedValue();

    client.createBigQueryTables = jest.fn((callback) => callback());
    client.createBigQueryBackups = jest.fn((callback) => callback());

    FeatureFlag.allowAccess = jest.fn().mockResolvedValue({ allow: true });

    paymentGroup1 = await new PaymentGroup({ clientId: client._id, name: 'Payment Group 1' }).save();
    await new PaymentGroup({ clientId: client._id, name: 'Payment Group 2' }).save();
    await new PaymentGroup({ clientId: client._id, name: 'Payment Group 3' }).save();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await testUtils.cleanUpAsync(client._id.toString());
  });

  describe('as a client user', () => {
    describe('as a user with full rights', () => {
      let clientUser;

      beforeEach(() => {
        const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id, email: 'test-upload@curve.com', rights: {} };
        userToken.rights[client._id.toString()] = { admin: true, periods: 'Edit' };
        clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      describe('/ GET', () => {
        it('should return a list of paymentGroups', async () => {
          const res = await server
            .get('/payment_groups')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.paymentGroups).toBeInstanceOf(Array);
          const paymentGroups = await PaymentGroup.find({ clientId: client._id });
          expect(res.body.paymentGroups).toHaveLength(paymentGroups.length);
        });

        it('should return metadata of paymentGroups index on / GET', async () => {
          const res = await server
            .get('/payment_groups')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.meta).toBeInstanceOf(Object);
        });

        it('should return the first page if not passed a specific page', async () => {
          const res = await server
            .get('/payment_groups')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(1);
        });

        it('should return the passed page when passed the parameter', async () => {
          const res = await server.get('/payment_groups?page=3')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.body.meta.currentPage).toBe(3);
        });

        it('should return the pages available', async () => {
          const res = await server.get('/payment_groups')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(typeof res.body.meta.totalPages).toBe('number');
          expect(res.body.meta.totalPages).toBeGreaterThan(0);
        });

        it('should set the amount to be returned per page when passed a limit option', async () => {
          const res = await server.get('/payment_groups?limit=1')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.body.paymentGroups.length).toBe(1);

          const count = await PaymentGroup.countDocuments({ clientId: client._id });
          expect(res.body.meta.totalPages).toBe(count);
        });
      });

      describe('/:id GET', () => {
        describe('when a paymentGroup is found', () => {
          it('should return a paymentGroup and 200 status', async () => {
            const res = await server
              .get(`/payment_groups/${paymentGroup1._id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser);

            expect(res.status).toBe(200);
            expect(res.body).toBeDefined();
            expect(res.body.clientId).toEqual(paymentGroup1.clientId.toString());
          });
        });

        describe('when a paymentGroup is not found', () => {
          it('should return a 404 status', async () => {
            const id = testUtils.randomId();
            const res = await server
              .get(`/payment_groups/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe(`Could not find PaymentGroup with ID ${id}`);
          });
        });
      });

      describe('/:id/history GET', () => {
        it('should return the history of a paymentGroup', async () => {
          const res = await server
            .get(`/payment_groups/${paymentGroup1._id}/history`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.modelHistory)).toBe(true);
        });

        it('should return 404 if the paymentGroup is not found', async () => {
          const id = testUtils.randomId();

          const res = await server
            .get(`/payment_groups/${id}/history`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find PaymentGroup with ID ${id}`);
        });
      });

      describe('/:id/payments GET', () => {
        it('should return a list of payments for the paymentGroup', async () => {
          const res = await server
            .get(`/payment_groups/${paymentGroup1._id}/payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.payments)).toBe(true);
        });

        it('should return an empty array if no payments are found', async () => {
          const id = testUtils.randomId();

          const res = await server
            .get(`/payment_groups/${id}/payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.payments)).toBe(true);
          expect(res.body.payments).toHaveLength(0);
        });
      });

      describe('/:id PUT', () => {
        describe('when a paymentGroup is found', () => {
          it('should update with passed values only', async () => {
            const changedName = `${paymentGroup1.name}changed`;

            const res = await server
              .put(`/payment_groups/${paymentGroup1._id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser)
              .send({ name: changedName });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe(changedName);
          });

          it('should not update clientId', async () => {
            const changedTitle = `${paymentGroup1.title}changed`;

            const res = await server
              .put(`/payment_groups/${paymentGroup1._id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser)
              .send({ name: changedTitle, clientId: 'changed' });

            expect(res.status).toBe(200);
            expect(res.body.clientId).toBe(paymentGroup1.clientId.toString());
          });

          it("should not update any fields it isn't passed", async () => {
            const changedTitle = `${paymentGroup1.title}changed`;

            const res = await server
              .put(`/payment_groups/${paymentGroup1._id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser)
              .send({ name: changedTitle, clientId: 'changed' });

            expect(res.status).toBe(200);
            expect(res.body.foreignId).toBe(paymentGroup1.foreignId);
          });
        });
      });

      describe('when a paymentGroup is not found', () => {
        it('should return a 404 status', async () => {
          const id = testUtils.randomId();

          const res = await server
            .put(`/payment_groups/${id}`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send({ title: 'Changed PaymentGroup Title' });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find payment group with ID ${id}`);
        });
      });

      describe('/:id DELETE', () => {
        describe('when a paymentGroup is found', () => {
          it('should delete the paymentGroup and return a 200 status', async () => {
            const paymentGroups = await PaymentGroup.find({ clientId: client._id });
            const id = paymentGroups[0]._id;

            const res = await server
              .delete('/payment_groups')
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser)
              .send({ ids: [id] });

            expect(res.status).toBe(200);

            const newPaymentGroups = await PaymentGroup.find({ clientId: client._id });
            expect(newPaymentGroups.length).toBe(paymentGroups.length - 1);
          });
        });
      });

      describe('/ POST', () => {
        it('should return a paymentGroup created with the passed parameters', async () => {
          const params = { clientId: client._id.toString(), name: 'paymentGroup name' };

          const res = await server
            .post('/payment_groups')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send(params);

          expect(res.status).toBe(200);
          expect(res.body.clientId).toBe(params.clientId);
          expect(res.body.name).toBe(params.name);
          expect(res.body.contractId).toBe(params.contractId);
          expect(res.body.statementId).toBe(params.statementId);
          expect(res.body.payeeId).toBe(params.payeeId);
        });

        it('should add the paymentGroup to the database', async () => {
          const params = { clientId: client._id.toString(), name: 'paymentGroup name' };
          const initial = await PaymentGroup.find({});

          await server
            .post('/payment_groups')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send(params);

          const updated = await PaymentGroup.find({});
          expect(updated.length).toBe(initial.length + 1);
        });
      });

      describe('/:id/export_payments POST', () => {
        it('should return 200 and call sendExport', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/export_payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(PaymentGroup.sendExport).toHaveBeenCalled();
        });
      });

      describe('/:id/import_payments POST', () => {
        it('should return 200 and should call importFromExcel', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/import_payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .attach('file', 'test/test-data/import-test.xlsx');

          expect(res.status).toBe(200);
          expect(PaymentGroup.importFromExcel).toHaveBeenCalled();
        });
      });

      describe('/:id/pay_selected POST', () => {
        it('should trigger payments for selected payment IDs', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/pay_selected`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send({ ids: [] });

          expect(res.status).toBe(200);
          expect(res.body.message).toBe('Payments have been sent for payment');
        });
      });

      describe('/:id/pay_all POST', () => {
        it('should trigger payments for all eligible payments', async () => {
          const mockPayments = [
            {
              _id: testUtils.randomId(),
              clientId: paymentGroup1.clientId,
              paymentGroupId: paymentGroup1._id.toString(),
              status: 'Pending',
            },
          ];
          await Payment.insertMany(mockPayments);

          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(200);
          expect(res.body.message).toBe('Payments have been sent for payment');
        });

        it('should return 409 when there are no payments to process', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser);

          expect(res.status).toBe(409);
          expect(res.body.message).toBe('There are currently no Payments to process');
        });
      });

      describe('/:id/mark_payments POST', () => {
        it('should mark selected payments with a new status', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send({ status: 'Paid Offline', ids: [] });

          expect(res.status).toBe(200);
          expect(res.body.message).toContain('payment(s) marked as Paid Offline successfully.');
        });

        it('should return 404 if the paymentGroup is not found', async () => {
          const id = testUtils.randomId();

          const res = await server
            .post(`/payment_groups/${id}/mark_payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send({ status: 'Paid Offline', ids: ['randomId1', 'randomId2'] });

          expect(res.status).toBe(404);
          expect(res.body.message).toBe(`Could not find PaymentGroup with ID ${id}`);
        });

        it('should handle an empty list of IDs gracefully', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send({ status: 'Paid Offline', ids: [] });

          expect(res.status).toBe(200);
          expect(res.body.message).toContain('0 payment(s) marked as Paid Offline successfully.');
        });

        it('should successfully mark payments as "Paid Offline" if they have valid statuses', async () => {
          const mockPayments = [
            { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Pending' },
            { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Payment Error' },
            { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Missing Info' },
            { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Paid', paymentDetails: { provider: 'Standard CSV' } },
          ];

          await Payment.insertMany(mockPayments);

          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send({
              status: 'Paid Offline',
              ids: [
                mockPayments[0]._id,
                mockPayments[1]._id,
                mockPayments[2]._id,
                mockPayments[3]._id,
              ],
            });

          expect(res.status).toBe(200);
          expect(res.body.message).toContain('4 payment(s) marked as Paid Offline successfully.');

          const payment1 = await Payment.findById(mockPayments[0]._id);
          expect(payment1.status).toBe('Paid');
          expect(payment1.paymentDetails.paidOffline).toBe(true);

          const payment2 = await Payment.findById(mockPayments[1]._id);
          expect(payment2.status).toBe('Paid');
          expect(payment2.paymentDetails.paidOffline).toBe(true);

          const payment3 = await Payment.findById(mockPayments[2]._id);
          expect(payment3.status).toBe('Paid');
          expect(payment3.paymentDetails.paidOffline).toBe(true);

          const payment4 = await Payment.findById(mockPayments[3]._id);
          expect(payment4.status).toBe('Paid');
          expect(payment4.paymentDetails.paidOffline).toBe(true);
        });
      });

      it('should successfully mark payments as "Pending" if they have valid statuses', async () => {
        const mockPayments = [
          { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Paid', paymentDetails: { paidOffline: true } },
          { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Paid', paymentDetails: { provider: 'Standard CSV' } },
        ];

        await Payment.insertMany(mockPayments);

        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUser)
          .send({ status: 'Pending', ids: [mockPayments[0]._id, mockPayments[1]._id] });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('2 payment(s) marked as Pending successfully.');

        const payment1 = await Payment.findById(mockPayments[0]._id);
        expect(payment1.status).toBe('Pending');

        const payment2 = await Payment.findById(mockPayments[1]._id);
        expect(payment2.status).toBe('Pending');
      });

      it('should return 400 if payments have invalid statuses for "Paid Offline"', async () => {
        const mockPayments = [
          { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Paid', paymentDetails: { provider: 'Other' } },
          { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Processing' },
          { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Pending' },
        ];

        await Payment.insertMany(mockPayments);

        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUser)
          .send({ status: 'Paid Offline', ids: [mockPayments[0]._id, mockPayments[1]._id] });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('The following payments cannot be marked as Paid Offline');
        expect(res.body.message).toContain(mockPayments[0]._id.toString());
        expect(res.body.message).toContain(mockPayments[1]._id.toString());

        const payment1 = await Payment.findById(mockPayments[0]._id);
        expect(payment1.status).not.toBe('Paid Offline');

        const payment2 = await Payment.findById(mockPayments[1]._id);
        expect(payment2.status).not.toBe('Paid Offline');
      });

      it('should return 400 if payments have invalid statuses for "Pending"', async () => {
        const mockPayments = [
          { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Payment Error' },
          { _id: testUtils.randomId(), clientId: paymentGroup1.clientId, paymentGroupId: paymentGroup1._id.toString(), status: 'Processing' },
        ];
        await Payment.insertMany(mockPayments);

        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUser)
          .send({ status: 'Pending', ids: [mockPayments[0]._id, mockPayments[1]._id] });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('The following payments cannot be marked as Pending');
        expect(res.body.message).toContain(mockPayments[0]._id.toString());
        expect(res.body.message).toContain(mockPayments[1]._id.toString());

        const payment1 = await Payment.findById(mockPayments[0]._id);
        expect(payment1.status).not.toBe('Pending');

        const payment2 = await Payment.findById(mockPayments[1]._id);
        expect(payment2.status).not.toBe('Pending');
      });
    });

    describe('as a user with None rights', () => {
      let userNone;
      let clientUserNone;

      beforeEach(() => {
        userNone = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: null,
          rights: {
            [client._id]: { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' },
          },
        };
        clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      it('GET /payment_groups should return 403', async () => {
        const res = await server
          .get('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone);

        expect(res.status).toBe(403);
      });

      it('GET /payment_groups/:id/payments should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone);

        expect(res.status).toBe(403);
      });

      it('GET /payment_groups/:id/payer_balance should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payer_balance`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone);

        expect(res.status).toBe(403);
      });

      it('PUT /payment_groups/:id should return 403', async () => {
        const res = await server
          .put(`/payment_groups/${paymentGroup1._id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone)
          .send({ name: 'changedName' });

        expect(res.status).toBe(403);
      });

      it('POST /payment_groups should return 403', async () => {
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
          paymentAgreements: ['P1', 'P2', 'P3'],
          linkedContracts: ['L1', 'L2', 'L3'],
        };

        const res = await server
          .post('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone)
          .send(params);

        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/export_payments should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/export_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone);

        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/import_payments should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/import_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone)
          .attach('file', 'test/test-data/import-test.xlsx');

        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/pay_selected should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_selected`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserNone)
          .send({ ids: [] });

        expect(res.status).toBe(403);
      });

      describe('/:id/pay_all POST', () => {
        it('should return 403', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserNone);

          expect(res.status).toBe(403);
        });
      });

      describe('/:id/mark_payments POST', () => {
        it('should return 403', async () => {
          const res = await server
            .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserNone)
            .send({ status: 'Paid Offline', ids: [] });

          expect(res.status).toBe(403);
        });
      });
    });

    describe('as a user with View rights', () => {
      let userView;
      let clientUserView;

      beforeEach(() => {
        userView = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          rights: {
            [client._id]: { sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View' },
          },
        };
        clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
      });

      it('GET /payment_groups should return 403', async () => {
        const res = await server
          .get('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView);
        expect(res.status).toBe(403);
      });

      it('GET /payment_groups/:id should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView);
        expect(res.status).toBe(403);
      });

      it('GET /payment_groups/:id/history should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView);
        expect(res.status).toBe(403);
      });

      it('GET /payment_groups/:id/payments should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView);
        expect(res.status).toBe(403);
      });

      it('GET /payment_groups/:id/payer_balance should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payer_balance`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView);
        expect(res.status).toBe(403);
      });

      it('PUT /payment_groups/:id should return 403', async () => {
        const res = await server
          .put(`/payment_groups/${paymentGroup1._id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView)
          .send({ name: 'changedName' });
        expect(res.status).toBe(403);
      });

      it('POST /payment_groups should return 403', async () => {
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
          paymentAgreements: ['P1', 'P2', 'P3'],
          linkedContracts: ['L1', 'L2', 'L3'],
        };

        const res = await server
          .post('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView)
          .send(params);
        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/export_payments should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/export_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView);
        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/import_payments should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/import_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView)
          .attach('file', 'test/test-data/import-test.xlsx');
        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/pay_selected should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_selected`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView)
          .send({ ids: [] });
        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/pay_all should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView);
        expect(res.status).toBe(403);
      });

      it('POST /payment_groups/:id/mark_payments should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserView)
          .send({ status: 'Paid Offline', ids: [] });
        expect(res.status).toBe(403);
      });
    });
  });

  describe('as a user with Edit rights', () => {
    let userEdit;
    let clientUserEdit;

    beforeEach(() => {
      userEdit = {
        id: user._id,
        internal: false,
        parentId: null,
        clientId: client._id,
        rights: {
          [client._id]: { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit', admin: true },
        },
      };
      clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
    });

    describe('/ GET', () => {
      it('should return 200', async () => {
        const res = await server
          .get('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
      });
    });

    describe('/:id GET', () => {
      it('should return a paymentGroup and 200 status', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
        expect(res.body).toBeInstanceOf(Object);
        expect(res.body.clientId).toBe(paymentGroup1.clientId);
        expect(res.body.contractId).toBe(paymentGroup1.contractId);
        expect(res.body.statementId).toBe(paymentGroup1.statementId);
      });

      it('should return 404 if paymentGroup not found', async () => {
        const id = testUtils.randomId();

        const res = await server
          .get(`/payment_groups/${id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find PaymentGroup with ID ${id}`);
      });
    });

    describe('/:id/history GET', () => {
      it('should return history of a paymentGroup', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.modelHistory)).toBe(true);
      });

      it('should return 404 if not found', async () => {
        const id = testUtils.randomId();

        const res = await server
          .get(`/payment_groups/${id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Could not find PaymentGroup with ID ${id}`);
      });
    });

    describe('/:id/payments GET', () => {
      it('should return a list of payments', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.payments)).toBe(true);
      });

      it('should return an empty array if no payments are found', async () => {
        const id = testUtils.randomId();

        const res = await server
          .get(`/payment_groups/${id}/payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.payments)).toBe(true);
        expect(res.body.payments).toHaveLength(0);
      });
    });

    describe('/:id PUT', () => {
      it('should return 200', async () => {
        const [paymentGroup] = await PaymentGroup.find({ clientId: client._id.toString() });
        const id = paymentGroup._id;

        const res = await server
          .put(`/payment_groups/${id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit)
          .send({ name: 'changedName' });

        expect(res.status).toBe(200);
      });
    });

    describe('/:id DELETE', () => {
      it('should return 200', async () => {
        const [paymentGroup] = await PaymentGroup.find({});
        const id = paymentGroup._id;

        const res = await server
          .delete('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit)
          .send({ ids: [id] });

        expect(res.status).toBe(200);
      });
    });

    describe('/ POST', () => {
      it('should return 200 and match the posted data', async () => {
        const params = { clientId: client._id.toString(), name: 'paymentGroup name' };

        const res = await server
          .post('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit)
          .send(params);

        expect(res.status).toBe(200);
        expect(res.body.clientId).toBe(params.clientId);
        expect(res.body.contractId).toBe(params.contractId);
        expect(res.body.statementId).toBe(params.statementId);
        expect(res.body.payeeId).toBe(params.payeeId);
        expect(res.body.name).toBe(params.name);
      });
    });

    describe('/:id/export_payments POST', () => {
      it('should return 200 and call sendExport', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/export_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
        expect(PaymentGroup.sendExport).toHaveBeenCalled();
      });
    });

    describe('/:id/import_payments POST', () => {
      it('should return 200 and call importFromExcel', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/import_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit)
          .attach('file', 'test/test-data/import-test.xlsx');

        expect(res.status).toBe(200);
        expect(PaymentGroup.importFromExcel).toHaveBeenCalled();
      });
    });

    describe('/:id/pay_selected POST', () => {
      it('should trigger payments for selected payment IDs', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_selected`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit)
          .send({ ids: [] });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Payments have been sent for payment');
      });
    });

    describe('/:id/pay_all POST', () => {
      it('should trigger payments for all eligible payments', async () => {
        const mockPayments = [
          {
            _id: testUtils.randomId(),
            clientId: paymentGroup1.clientId,
            paymentGroupId: paymentGroup1._id.toString(),
            status: 'Pending',
          },
        ];
        await Payment.insertMany(mockPayments);

        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Payments have been sent for payment');
      });

      it('should return 409 if no payments to process', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit);

        expect(res.status).toBe(409);
        expect(res.body.message).toBe('There are currently no Payments to process');
      });
    });

    describe('/:id/mark_payments POST', () => {
      it('should mark selected payments with new status', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', clientUserEdit)
          .send({ status: 'Paid Offline', ids: [] });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('payment(s) marked as Paid Offline successfully.');
      });
    });
  });

  describe('as an internal user', function () {
    const internal = jwt.sign({ internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/payment_groups GET', () => {
      it('should return a 403 response', async () => {
        const res = await server
          .get('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id GET', () => {
      it('should return a 403 response', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/history GET', () => {
      it('should return a 403 response', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/payments GET', () => {
      it('should return a 403 response', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/payer_balance GET', () => {
      it('should return a 403 response', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payer_balance`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 response', async () => {
        const res = await server
          .put(`/payment_groups/${paymentGroup1._id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
      });

      it('should not update the payment group', async () => {
        const paymentGroup = await PaymentGroup.findOne();
        const originalTitle = paymentGroup.title;

        await server
          .put(`/payment_groups/${paymentGroup._id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .send({ title: 'Changed Title' });

        const updated = await PaymentGroup.findById(paymentGroup._id);
        expect(updated.title).toBe(originalTitle);
      });
    });

    describe('/:id DELETE', () => {
      it('should not delete the payment group', async () => {
        const paymentGroup = await PaymentGroup.findOne();
        await server
          .delete('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .send({ ids: [paymentGroup._id] })
          .set('token', internal);

        const count = await PaymentGroup.countDocuments({ _id: paymentGroup._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 response', async () => {
        const res = await server
          .post('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .send({ name: 'Changed Title' });

        expect(res.status).toBe(403);
      });

      it('should not create a payment group', async () => {
        const beforeCount = await PaymentGroup.countDocuments();

        await server
          .post('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .send({ name: 'Changed Title' });

        const afterCount = await PaymentGroup.countDocuments();
        expect(afterCount).toBe(beforeCount);
      });
    });

    describe('/:id/export_payments POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/export_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/import_payments POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/import_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .attach('file', 'test/test-data/import-test.xlsx');

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/pay_selected POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_selected`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .send({ ids: [] });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/pay_all POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/mark_payments POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .send({ status: 'Paid Offline', ids: [] });

        expect(res.status).toBe(403);
      });
    });
  });

  describe('as a parent user', function () {
    const parent = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });

    it('should return a 403 forbidden response for GET /payment_groups', async () => {
      const res = await server
        .get('/payment_groups')
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return a 403 forbidden response for GET /payment_groups/:id', async () => {
      const res = await server
        .get(`/payment_groups/${paymentGroup1._id}`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should return 403 for GET /payment_groups/:id/history', async () => {
      const res = await server
        .get(`/payment_groups/${paymentGroup1._id}/history`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent);

      expect(res.status).toBe(403);
    });

    it('should return 403 for GET /payment_groups/:id/payments', async () => {
      const res = await server
        .get(`/payment_groups/${paymentGroup1._id}/payments`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent);

      expect(res.status).toBe(403);
    });

    it('should return 403 for GET /payment_groups/:id/payer_balance', async () => {
      const res = await server
        .get(`/payment_groups/${paymentGroup1._id}/payer_balance`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent);

      expect(res.status).toBe(403);
    });

    it('should return a 403 forbidden response for PUT /payment_groups/:id', async () => {
      const res = await server
        .put(`/payment_groups/${paymentGroup1._id}`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .send({ title: 'Changed Title' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should not update the paymentGroup', async () => {
      const paymentGroups = await PaymentGroup.find({});
      const original = paymentGroups[0];

      await server
        .put(`/payment_groups/${original._id}`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .send({ title: 'Changed Title' });

      const updated = await PaymentGroup.findById(original._id);

      expect(updated.title).toBe(original.title);
    });

    it('should not delete the paymentGroup', async () => {
      const paymentGroups = await PaymentGroup.find({});
      const id = paymentGroups[0]._id;

      await server
        .delete('/payment_groups')
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .send({ ids: [id] });

      const count = await PaymentGroup.countDocuments({ _id: id });
      expect(count).toBe(1);
    });

    it('should return a 403 forbidden response for POST /payment_groups', async () => {
      const res = await server
        .post('/payment_groups')
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .send({ title: 'Changed Title' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Forbidden');
    });

    it('should not create a paymentGroup', async () => {
      const existing = await PaymentGroup.find({});
      const initialCount = existing.length;
      const id = existing[0]._id;

      await server
        .post(`/payment_groups/${id}`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .send({ title: 'Changed Title' });

      const newCount = await PaymentGroup.countDocuments({});
      expect(newCount).toBe(initialCount);
    });

    it('should return 403 on /:id/export_payments', async () => {
      const res = await server
        .post(`/payment_groups/${paymentGroup1._id}/export_payments`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent);

      expect(res.status).toBe(403);
    });

    it('should return 403 on /:id/import_payments', async () => {
      const res = await server
        .post(`/payment_groups/${paymentGroup1._id}/import_payments`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .attach('file', 'test/test-data/import-test.xlsx');

      expect(res.status).toBe(403);
    });

    it('should return 403 on /:id/pay_selected', async () => {
      const res = await server
        .post(`/payment_groups/${paymentGroup1._id}/pay_selected`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .send({ ids: [] });

      expect(res.status).toBe(403);
    });

    it('should return 403 on /:id/pay_all', async () => {
      const res = await server
        .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent);

      expect(res.status).toBe(403);
    });

    it('should return 403 on /:id/mark_payments', async () => {
      const res = await server
        .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
        .set('applicationToken', config.applicationTokens[0])
        .set('token', parent)
        .send({ status: 'Paid Offline', ids: [] });

      expect(res.status).toBe(403);
    });
  });

  describe('as a payee user', function () {
    const contractId = testUtils.randomId();
    const contractIds = [contractId, testUtils.randomId()];
    const payeeToken = jwt.sign({ internal: false, parentId: null, payeeId: testUtils.randomId(), contractIds }, process.env.jsonSecretToken, { expiresIn: 86400 });

    describe('/ GET', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .get('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken);

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });
    });

    describe('/:id GET', () => {
      it('should return 403', async () => {
        const paymentGroups = await PaymentGroup.find({ clientId: client._id.toString() });
        const id = paymentGroups[0]._id;

        const res = await server
          .get(`/payment_groups/${id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/history GET', () => {
      it('should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/history`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/payments GET', () => {
      it('should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/payer_balance GET', () => {
      it('should return 403', async () => {
        const res = await server
          .get(`/payment_groups/${paymentGroup1._id}/payer_balance`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id PUT', () => {
      it('should return a 403 forbidden response', async () => {
        const paymentGroups = await PaymentGroup.find({});
        const id = paymentGroups[0]._id;

        const res = await server
          .put(`/payment_groups/${id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not update the paymentGroup', async () => {
        const paymentGroups = await PaymentGroup.find({});
        const id = paymentGroups[0]._id;

        await server
          .put(`/payment_groups/${id}`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .send({ name: 'Changed Title' });

        const updatedPaymentGroups = await PaymentGroup.find({ _id: paymentGroups[0]._id });
        expect(updatedPaymentGroups[0].name).toBe(paymentGroups[0].name);
      });
    });

    describe('/:id DELETE', () => {
      it('should not delete the paymentGroup', async () => {
        const paymentGroups = await PaymentGroup.find({});
        const id = paymentGroups[0]._id;

        await server
          .delete('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .send({ ids: [id] });

        const count = await PaymentGroup.countDocuments({ _id: paymentGroups[0]._id });
        expect(count).toBe(1);
      });
    });

    describe('/ POST', () => {
      it('should return a 403 forbidden response', async () => {
        const res = await server
          .post('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        expect(res.status).toBe(403);
        expect(res.body.message).toBe('Forbidden');
      });

      it('should not create a paymentGroup', async () => {
        const paymentGroups = await PaymentGroup.find({});

        await server
          .post('/payment_groups')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .send({ title: 'Changed Title' });

        const newPaymentGroups = await PaymentGroup.find({});
        expect(newPaymentGroups.length).toBe(paymentGroups.length);
      });
    });

    describe('/:id/export_payments POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/export_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/import_payments POST', () => {
      it('should give a 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/import_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .attach('file', 'test/test-data/import-test.xlsx');

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/pay_selected POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_selected`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .send({ ids: [] });

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/pay_all POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/pay_all`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken);

        expect(res.status).toBe(403);
      });
    });

    describe('/:id/mark_payments POST', () => {
      it('should return 403', async () => {
        const res = await server
          .post(`/payment_groups/${paymentGroup1._id}/mark_payments`)
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .send({ status: 'Paid Offline', ids: [] });

        expect(res.status).toBe(403);
      });
    });
  });
});
