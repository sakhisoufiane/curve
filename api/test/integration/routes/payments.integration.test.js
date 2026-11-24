/* eslint-disable max-len */
process.env.NODE_ENV = 'test';
const jwt = require('jsonwebtoken');
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const config = require('../../../config.json');
const server = require('../../../index');
const PaymentGroup = require('../../../models/paymentGroup');
const Payment = require('../../../models/payment');
const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const Statement = require('../../../models/statement');
const Payee = require('../../../models/payee');
const User = require('../../../models/user');
const FeatureFlag = require('../../../libs/featureFlag');

const { expect } = chai;

chai.use(chaiHttp);

describe('/payments', function () {
  logger.info('>>>file>>>> int/routes/payment_groups .....................');
  let client;
  let user;
  let contract; let contract2; let statement; let payee; let paymentGroup;

  before(function (done) {
    // Clean up
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach(async function () {
    sinon.stub(FeatureFlag, 'allowAccess').resolves({ allow: true });
    sinon.stub(Client.prototype, 'createBigQueryTables').yields();
    sinon.stub(Client.prototype, 'createBigQueryBackups').yields();
    client = await new Client({ name: testUtils.randomString(), homeCurrency: 'GBP' }).save();
    user = await new User({ _id: testUtils.randomId(), email: 'test-upload@curve.com' }).save();
    payee = await new Payee({ clientId: client._id, name: 'Payee 1', iban: 'AB22689556566666' }).save();
    contract = await new Contract({ clientId: client._id, payeeId: payee._id, name: 'Contract 1', currency: 'GBP' }).save();
    contract2 = await new Contract({ clientId: client._id, payeeId: payee._id, name: 'Contract 2', currency: 'GBP' }).save();
    statement = await new Statement({ clientId: client._id, name: 'Statement 1', contractId: contract._id, analysis: 'analysis' }).save();
    paymentGroup = await new PaymentGroup({ clientId: client._id, name: 'Payment Group 1' }).save();
    await new Payment({ clientId: client._id, name: 'Payment 1', contractId: contract._id, statementId: statement._id, payeeId: payee._id, paymentGroupId: paymentGroup._id, amount: testUtils.randomInt(), currency: 'GBP' }).save();
    await new Payment({ clientId: client._id, name: 'Payment 2', contractId: contract._id, statementId: statement._id, payeeId: payee._id, paymentGroupId: paymentGroup._id, amount: testUtils.randomInt(), currency: 'GBP' }).save();
    await new Payment({ clientId: client._id, name: 'Payment 3', contractId: contract2._id, statementId: statement._id, payeeId: payee._id, paymentGroupId: paymentGroup._id, amount: testUtils.randomInt(), currency: 'GBP' }).save();
  });

  afterEach(function (done) {
    // Clean up
    sinon.restore();
    testUtils.cleanUp(done);
  });

  after(function (done) {
    // Clean up
    sinon.restore();
    testUtils.cleanUp(done);
  });

  describe('as a client user', function () {
    describe('as a user with full rights', function () {
      let clientUser;

      beforeEach((done) => {
        const userToken = { id: user._id, internal: false, parentId: null, clientId: client._id.toString(), email: 'test-upload@curve.com', rights: {} };
        userToken.rights[client._id.toString()] = { admin: true, periods: 'Edit' };
        clientUser = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });
        done();
      });

      describe('/ GET', function () {
        it('should return a list of payments', function (done) {
          chai.request(server)
            .get('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.payments).to.be.an('array');
              Payment.find({ clientId: client._id })
                .then((payments) => {
                  expect(res.body.payments.length).to.be.eq(payments.length);
                  done();
                })
                .catch(done);
            });
        });
        it('should return metadata of payments index on / GET', function (done) {
          chai.request(server)
            .get('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.meta).to.be.an('object');
              done();
            });
        });
        it('should return the first page if not passed a specific page', function (done) {
          chai.request(server)
            .get('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.currentPage).to.be.eq(1);
              done();
            });
        });
        it('should return the passed page when passed the parameter', function (done) {
          chai.request(server)
            .get('/payments?page=3')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.currentPage).to.be.eq(3);
              done();
            });
        });
        it('should return the pages available', function (done) {
          chai.request(server)
            .get('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.totalPages).to.be.eq(1);
              done();
            });
        });
        it('should set the amount to be returned per page when passed a limit option', function (done) {
          chai.request(server)
            .get('/payments?limit=1')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.payments.length).to.eq(1);
              Payment.countDocuments({ clientId: client._id })
                .then((count) => {
                  expect(res.body.meta.totalPages).to.be.eq(count);
                  done();
                })
                .catch(done);
            });
        });
      });
      describe('/:id GET', function () {
        describe('when a payment is found', function () {
          it('should return a payment and 200 status', function (done) {
            Payment.findOne({ name: 'Payment 1' })
              .then((payment) => {
                chai.request(server)
                  .get(`/payments/${payment._id}`)
                  .set('applicationToken', config.applicationTokens[0])
                  .set('token', clientUser)
                  .end(function (err, res) {
                    expect(res.status).to.eq(200);
                    expect(res.body).to.be.a('object');
                    expect(res.body.clientId).to.eq(payment.clientId);
                    expect(res.body.contractId).to.eq(payment.contractId);
                    expect(res.body.statementId).to.deep.eq({ _id: statement._id.toString(), name: statement.name });
                    done();
                  });
              })
              .catch(done);
          });
        });
        describe('when a payment is not found', function () {
          it('should return a 404 status', function (done) {
            const id = testUtils.randomId();
            chai.request(server)
              .get(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser)
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find Payment with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/:id PUT', function () {
        describe('when a payment is found', function () {
          it('should update with passed values only', function (done) {
            Payment.find({ name: 'Payment 1' })
              .then((payments) => {
                const id = payments[0]._id;
                const changedName = `${payments[0].name}changed`;
                chai.request(server)
                  .put(`/payments/${id}`)
                  .set('applicationToken', config.applicationTokens[0])
                  .set('token', clientUser)
                  .send({ name: changedName })
                  .end(function (err, res) {
                    expect(res.status).to.eq(200);
                    expect(res.body.name).to.eq(changedName);
                    done();
                  });
              })
              .catch(done);
          });
          it('should not update clientId', function (done) {
            Payment.find({ name: 'Payment 1' })
              .then((payments) => {
                const id = payments[0]._id;
                const changedTitle = `${payments[0].title}changed`;
                chai.request(server)
                  .put(`/payments/${id}`)
                  .set('applicationToken', config.applicationTokens[0])
                  .set('token', clientUser)
                  .send({ name: changedTitle, clientId: 'changed' })
                  .end(function (err, res) {
                    expect(res.body.clientId).to.eq(payments[0].clientId);
                    done();
                  });
              })
              .catch(done);
          });
          it("should not update any fields it isn't passed", function (done) {
            Payment.find({})
              .then((payments) => {
                const id = payments[0]._id;
                const changedTitle = `${payments[0].title}changed`;
                chai.request(server)
                  .put(`/payments/${id}`)
                  .set('applicationToken', config.applicationTokens[0])
                  .set('token', clientUser)
                  .send({ name: changedTitle, clientId: 'changed' })
                  .end(function (err, res) {
                    expect(res.body.foreignId).to.eq(payments[0].foreignId);
                    done();
                  });
              })
              .catch(done);
          });
        });
        describe('when a payment is not found', function () {
          it('should return a 404 status', function (done) {
            const id = testUtils.randomId();
            chai.request(server)
              .put(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUser)
              .send({ title: 'Changed Payment Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find Payment with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/:id DELETE', function () {
        describe('when a payment is found', function () {
          it('should delete the payment and return a 200 status', function (done) {
            Payment.find({})
              .then((payments) => {
                const id = payments[0]._id;
                chai.request(server)
                  .delete('/payments')
                  .set('applicationToken', config.applicationTokens[0])
                  .set('token', clientUser)
                  .send({ ids: [id] })
                  .end(function (err, res) {
                    expect(res.status).to.eq(200);
                    Payment.find({})
                      .then((newPayees) => {
                        expect(newPayees.length).to.eq(payments.length - 1);
                        done();
                      })
                      .catch(done);
                  });
              })
              .catch(done);
          });
        });
      });
      describe('/ POST', function () {
        it('should return a payment created with the passed parameters', function (done) {
          const params = {
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            statementId: statement._id.toString(),
            payeeId: payee._id.toString(),
            paymentGroupId: paymentGroup._id.toString(),
            name: 'payment name',
            amount: testUtils.randomInt(),
            currency: 'GBP',
          };
          chai.request(server)
            .post('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUser)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.clientId).to.eq(params.clientId);
              expect(res.body.contractId).to.eq(params.contractId);
              expect(res.body.statementId).to.eq(params.statementId);
              expect(res.body.paymentGroupId).to.eq(params.paymentGroupId);
              expect(res.body.payeeId).to.eq(params.payeeId);
              expect(res.body.name).to.eq(params.name);
              expect(res.body.amount).to.eq(params.amount);
              expect(res.body.currency).to.eq(params.currency);
              done();
            });
        });
        it('should add the payment to the database', function (done) {
          const params = {
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            statementId: statement._id.toString(),
            paymentGroupId: paymentGroup._id.toString(),
            payeeId: payee._id.toString(),
            name: 'payment name',
            amount: testUtils.randomInt(),
            currency: 'GBP',
          };
          Payment.find({})
            .then((payments) => {
              chai.request(server)
                .post('/payments')
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUser)
                .send(params)
                .end(function (err, res) {
                  Payment.find({})
                    .then((newPayment) => {
                      expect(newPayment.length).to.eq(payments.length + 1);
                      done();
                    })
                    .catch(done);
                });
            })
            .catch(done);
        });
      });
    });

    describe('as a user with None rights', function () {
      let userNone;

      beforeEach((done) => {
        userNone = { id: user._id, internal: false, parentId: null, clientId: null, rights: {} };
        userNone.rights[client._id] = { sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None' };
        done();
      });
      describe('/ GET', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString() })
            .then((payments) => {
              chai.request(server)
                .get('/payments')
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserNone)
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/:id GET', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString() })
            .then((payments) => {
              const id = payments[0]._id;
              chai.request(server)
                .get(`/payments/${id}`)
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserNone)
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/:id PUT', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString() })
            .then((payments) => {
              const id = payments[0]._id;
              chai.request(server)
                .put(`/payments/${id}`)
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserNone)
                .send({ name: 'changedName' })
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/ POST', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
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
          chai.request(server)
            .post('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserNone)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              done();
            });
        });
      });
    });

    describe('as a user with View rights', function () {
      let userView;

      beforeEach((done) => {
        userView = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {}, adminType: 'Admin' };
        userView.rights[client._id] = { sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View' };
        done();
      });

      describe('/ GET', function () {
        it('should return 403', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString() })
            .then((payments) => {
              chai.request(server)
                .get('/payments')
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserView)
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/:id GET', function () {
        it('should return 403', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString() })
            .then((payments) => {
              const id = payments[0]._id;
              chai.request(server)
                .get(`/payments/${id}`)
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserView)
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/:id PUT', function () {
        it('should return 403', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString(), name: 'Payment 3' })
            .then((payments) => {
              const id = payments[0]._id;
              chai.request(server)
                .put(`/payments/${id}`)
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserView)
                .send({ name: 'changedName' })
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/ POST', function () {
        it('should return 403', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
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
          chai.request(server)
            .post('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserView)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              done();
            });
        });
      });
    });

    describe('as a user with Edit rights', function () {
      let userEdit;

      beforeEach((done) => {
        userEdit = { id: user._id, internal: false, parentId: null, clientId: client._id, rights: {} };
        userEdit.rights[client._id] = { sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit' };
        done();
      });

      describe('/ GET', function () {
        it('should return 403', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString() })
            .then((payments) => {
              chai.request(server)
                .get('/payments')
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserEdit)
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/:id GET', function () {
        describe('when a payment is found', function () {
          it('should return a payment and 403 status', function (done) {
            const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
            Payment.findOne({ name: 'Payment 1' })
              .then((payment) => {
                chai.request(server)
                  .get(`/payments/${payment._id.toString()}`)
                  .set('applicationToken', config.applicationTokens[0])
                  .set('token', clientUserEdit)
                  .end(function (err, res) {
                    expect(res.status).to.eq(403);
                    done();
                  });
              })
              .catch(done);
          });
        });
        describe('when a payment is not found', function () {
          it('should return a 404 status', function (done) {
            const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
            const id = testUtils.randomId();
            chai.request(server)
              .get(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', clientUserEdit)
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find Payment with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/:id PUT', function () {
        it('should return 403', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({ clientId: client._id.toString() })
            .then((payments) => {
              const id = payments[0]._id;
              chai.request(server)
                .put(`/payments/${id}`)
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserEdit)
                .send({ name: 'changedName' })
                .end(function (err, res) {
                  expect(res.status).to.eq(403);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/:id DELETE', function () {
        it('should return 200', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          Payment.find({})
            .then((payments) => {
              const id = payments[0]._id;
              chai.request(server)
                .delete('/payments')
                .set('applicationToken', config.applicationTokens[0])
                .set('token', clientUserEdit)
                .send({ ids: [id] })
                .end(function (err, res) {
                  expect(res.status).to.eq(200);
                  done();
                });
            })
            .catch(done);
        });
      });
      describe('/ POST', function () {
        it('should return 403', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          const params = {
            clientId: client._id.toString(),
            contractId: contract._id.toString(),
            statementId: statement._id.toString(),
            paymentGroupId: paymentGroup._id.toString(),
            payeeId: payee._id.toString(),
            name: 'payment name',
            amount: testUtils.randomInt(),
            currency: 'GBP',
          };
          chai.request(server)
            .post('/payments')
            .set('applicationToken', config.applicationTokens[0])
            .set('token', clientUserEdit)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              done();
            });
        });
      });
    });
  });

  describe('as an internal user', function () {
    const internal = jwt.sign({ internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });
    describe('/ GET', function () {
      it('should return a 403 response', function (done) {
        chai.request(server)
          .get('/payments')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', internal)
          .end(function (err, res) {
            expect(res.status).to.eq(403);
            done();
          });
      });
    });
    describe('/:id GET', function () {
      it('should return a 403 forbidden response', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .get(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', internal)
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          })
          .catch(done);
      });
    });
    describe('/:id PUT', function () {
      it('should return a 200 forbidden response', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .put(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', internal)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          })
          .catch(done);
      });
      it('should not update the payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .put(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', internal)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                Payment.find({ _id: payments[0]._id })
                  .then((newPayees) => {
                    expect(newPayees[0].title).to.eq(payments[0].title);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
    describe('/:id DELETE', function () {
      it('should not delete the payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .delete('/payments')
              .set('applicationToken', config.applicationTokens[0])
              .send({ ids: [id] })
              .set('token', internal)
              .end(function (err, res) {
                Payment.countDocuments({ _id: payments[0]._id })
                  .then((count) => {
                    expect(count).to.eq(1);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
  });

  describe('as a parent user', function () {
    let parent;
    beforeEach((done) => {
      parent = jwt.sign({ internal: false, parentId: testUtils.randomId() }, process.env.jsonSecretToken, { expiresIn: 86400 });
      done();
    });

    describe('/ GET', function () {
      it('should return a 403 forbidden response', function (done) {
        chai.request(server)
          .get('/payments')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', parent)
          .end(function (err, res) {
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });
    describe('/:id GET', function () {
      it('should return a 403 forbidden response', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .get(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', parent)
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                expect(res.body.message).to.eq('Forbidden');
                done();
              });
          })
          .catch(done);
      });
    });
    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .put(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', parent)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                expect(res.body.message).to.eq('Forbidden');
                done();
              });
          })
          .catch(done);
      });
      it('should not update the payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .put(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', parent)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                Payment.find({ _id: payments[0]._id })
                  .then((newPayees) => {
                    expect(newPayees[0].title).to.eq(payments[0].title);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
    describe('/:id DELETE', function () {
      it('should not delete the payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .delete('/payments')
              .set('applicationToken', config.applicationTokens[0])
              .set('token', parent)
              .send({ ids: [id] })
              .end(function (err, res) {
                Payment.countDocuments({ _id: payments[0]._id })
                  .then((count) => {
                    expect(count).to.eq(1);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        Payment.find({})
          .then((payments) => {
            chai.request(server)
              .post('/payments')
              .set('applicationToken', config.applicationTokens[0])
              .set('token', parent)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                expect(res.body.message).to.eq('Forbidden');
                done();
              });
          })
          .catch(done);
      });
      it('should not create a payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .post(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', parent)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                Payment.countDocuments({})
                  .then((count) => {
                    expect(payments.length).to.eq(count);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
  });

  describe('as a payee user', function () {
    const contractId = testUtils.randomId();
    const contractIds = [contractId, testUtils.randomId()];
    let payeeToken;
    beforeEach(function (done) {
      const payee = new Payee({ name: 'Payee Login', clientId: client._id });
      payee.save()
        .then((payee) => {
          payeeToken = jwt.sign({ internal: false, parentId: null, payeeId: payee._id, contractIds }, process.env.jsonSecretToken, { expiresIn: 86400 });
          done();
        })
        .catch(done);
    });
    describe('/ GET', function () {
      it('should return a 403 forbidden response', function (done) {
        chai.request(server)
          .get('/payments')
          .set('applicationToken', config.applicationTokens[0])
          .set('token', payeeToken)
          .end(function (err, res) {
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });
    describe('/:id PUT', function () {
      it('should return a 403 response', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .put(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', payeeToken)
              .send({ name: 'Changed Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          })
          .catch(done);
      });
      it('should not update the payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .put(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', payeeToken)
              .send({ name: 'Changed Title' })
              .end(function (err, res) {
                Payment.find({ _id: payments[0]._id })
                  .then((newPayees) => {
                    expect(newPayees[0].name).to.eq(payments[0].name);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
    describe('/:id DELETE', function () {
      it('should not delete the payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .delete('/payments')
              .set('applicationToken', config.applicationTokens[0])
              .set('token', payeeToken)
              .send({ ids: [id] })
              .end(function (err, res) {
                Payment.countDocuments({ _id: payments[0]._id })
                  .then((count) => {
                    expect(count).to.eq(1);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        Payment.find({})
          .then((payments) => {
            chai.request(server)
              .post('/payments')
              .set('applicationToken', config.applicationTokens[0])
              .set('token', payeeToken)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                expect(res.body.message).to.eq('Forbidden');
                done();
              });
          })
          .catch(done);
      });
      it('should not create a payment', function (done) {
        Payment.find({})
          .then((payments) => {
            const id = payments[0]._id;
            chai.request(server)
              .post(`/payments/${id}`)
              .set('applicationToken', config.applicationTokens[0])
              .set('token', payeeToken)
              .send({ title: 'Changed Title' })
              .end(function (err, res) {
                Payment.countDocuments({})
                  .then((count) => {
                    expect(payments.length).to.eq(count);
                    done();
                  })
                  .catch(done);
              });
          })
          .catch(done);
      });
    });
  });
});
