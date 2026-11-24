process.env.NODE_ENV = 'test';
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { ObjectId } = require('mongodb');
const async = require('async');
const config = require('../../../config.json');
const User = require('../../../models/user');
const Payee = require('../../../models/payee');
const Client = require('../../../models/client');
const ContractTermGroup = require('../../../models/contractTermGroup');
const server = require('../../../index');

const { expect } = chai;
chai.use(chaiHttp);

describe.skip('/contractTermGroups', function () {
  logger.info('>>>file>>>> int/routes/contractTermGroups .....................');
  const client = new Client({ _id: new ObjectId('111111111111111111111111'), name: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 15) });
  const user = new User({ _id: new ObjectId('222222222222222222222222'), email: 'test-upload@curve.com' });
  let contractTermGroup1; let contractTermGroup2; let contractTermGroup3;

  beforeEach(function (done) {
    async.parallel([
      function (callback) {
        client.save(callback);
      },
      function (callback) {
        user.save(callback);
      },
    ], done);
  });

  beforeEach(function (done) {
    async.parallel([
      function (callback) {
        client.save(callback);
      },
      function (callback) {
        user.save(callback);
      },
      function (callback) {
        contractTermGroup1 = new ContractTermGroup({ clientId: client._id, name: 'ContractTermGroup 1' });
        contractTermGroup1.save(callback);
      },
      function (callback) {
        contractTermGroup2 = new ContractTermGroup({ clientId: client._id, name: 'ContractTermGroup 2' });
        contractTermGroup2.save(callback);
      },
      function (callback) {
        contractTermGroup3 = new ContractTermGroup({ clientId: randomId(), name: 'ContractTermGroup 3' });
        contractTermGroup3.save(callback);
      },
    ], done);
  });

  afterEach(async function () {
    await ContractTermGroup.collection.drop();
  });

  after(async function () {
    await Client.collection.drop();
    await User.collection.drop();
  });

  describe('as a client user', function () {
    describe('as a user with full rights', function () {
      const clientUser = jwt.sign({
        id: user._id, internal: false, parentId: null, clientId: client._id, email: 'test-upload@curve.com',
      }, process.env.jsonSecretToken, { expiresIn: 86400 });
      describe('/ GET', function () {
        it('should return a list of contractTermGroups', function (done) {
          chai.request(server)
            .get('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.contractTermGroups).to.be.an('array');
              ContractTermGroup.find({ clientId: client._id }, function (e, contractTermGroups) {
                expect(res.body.contractTermGroups.length).to.be.eq(contractTermGroups.length);
                done();
              });
            });
        });
        it('should return metadata of contractTermGroups index on / GET', function (done) {
          chai.request(server)
            .get('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.meta).to.be.an('object');
              done();
            });
        });
        it('should return the first page if not passed a specific page', function (done) {
          chai.request(server)
            .get('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.currentPage).to.be.eq(1);
              done();
            });
        });
        it('should return the passed page when passed the parameter', function (done) {
          chai.request(server)
            .get('/contractTermGroups?page=3')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.currentPage).to.be.eq(3);
              done();
            });
        });
        it('should return the pages available', function (done) {
          chai.request(server)
            .get('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.totalPages).to.be.eq(1);
              done();
            });
        });
        it('should set the amount to be returned per page when passed a limit option', function (done) {
          chai.request(server)
            .get('/contractTermGroups?limit=1')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.contractTermGroups.length).to.eq(1);
              ContractTermGroup.countDocuments({ clientId: client._id }, function (e, count) {
                expect(res.body.meta.totalPages).to.be.eq(count);
                done();
              });
            });
        });
      });
      describe('/:id GET', function () {
        describe('when a contractTermGroup is found', function () {
          it('should return a contractTermGroup and 200 status', function (done) {
            ContractTermGroup.findOne({ name: 'ContractTermGroup 1' }, function (e, contractTermGroup) {
              chai.request(server)
                .get(`/contractTermGroups/${contractTermGroup._id}`)
                .set('applicationToken', config.applicationToken)
                .set('token', clientUser)
                .end(function (err, res) {
                  expect(res.status).to.eq(200);
                  expect(res.body).to.be.a('object');
                  expect(res.body.clientId).to.eq(contractTermGroup.clientId);
                  expect(res.body.name).to.eq(contractTermGroup.name);
                  expect(res.body.type).to.eq(contractTermGroup.type);
                  // expect(res.body.items).to.eql(contractTermGroup.items);
                  expect(res.body.lastModifiedBy).to.eq(contractTermGroup.lastModifiedBy);
                  done();
                });
            });
          });
        });
        describe('when a contractTermGroup is not found', function () {
          it('should return a 404 status', function (done) {
            const id = 'anything';
            chai.request(server)
              .get(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUser)
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find ContractTermGroup with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/:id PUT', function () {
        describe('when a contractTermGroup is found', function () {
          it('should update with passed values only', function (done) {
            ContractTermGroup.find({}, function (e, contractTermGroups) {
              const id = contractTermGroups[0]._id;
              const changedName = `${contractTermGroups[0].name}changed`;
              chai.request(server)
                .put(`/contractTermGroups/${id}`)
                .set('applicationToken', config.applicationToken)
                .set('token', clientUser)
                .send({ name: changedName })
                .end(function (err, res) {
                  expect(res.status).to.eq(200);
                  expect(res.body.name).to.eq(changedName);
                  done();
                });
            });
          });
          it('should not update clientId', function (done) {
            ContractTermGroup.find({ name: 'ContractTermGroup 1' }, function (e, contractTermGroups) {
              const id = contractTermGroups[0]._id;
              const changedName = `${contractTermGroups[0].name}changed`;
              chai.request(server)
                .put(`/contractTermGroups/${id}`)
                .set('applicationToken', config.applicationToken)
                .set('token', clientUser)
                .send({ name: changedName, clientId: 'changed' })
                .end(function (err, res) {
                  expect(res.body.clientId).to.eq(contractTermGroups[0].clientId);
                  done();
                });
            });
          });
          it("should not update any fields it isn't passed", function (done) {
            ContractTermGroup.find({ name: 'ContractTermGroup 1' }, function (e, contractTermGroups) {
              const id = contractTermGroups[0]._id;
              const changedName = `${contractTermGroups[0].name}changed`;
              chai.request(server)
                .put(`/contractTermGroups/${id}`)
                .set('applicationToken', config.applicationToken)
                .set('token', clientUser)
                .send({ name: changedName, clientId: 'changed' })
                .end(function (err, res) {
                  expect(res.body.foreignId).to.eq(contractTermGroups[0].foreignId);
                  done();
                });
            });
          });
        });
        describe('when a contractTermGroup is not found', function () {
          it('should return a 404 status', function (done) {
            const id = 'anything';
            chai.request(server)
              .put(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUser)
              .send({ title: 'Changed ContractTermGroup Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find ContractTermGroup with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/:id DELETE', function () {
        describe('when a contractTermGroup is found', function () {
          it('should delete the contractTermGroup and return a 200 status', function (done) {
            ContractTermGroup.find({}, function (e, contractTermGroups) {
              const id = contractTermGroups[0]._id;
              chai.request(server)
                .delete(`/contractTermGroups/${id}`)
                .set('applicationToken', config.applicationToken)
                .set('token', clientUser)
                .end(function (err, res) {
                  expect(res.status).to.eq(200);
                  ContractTermGroup.find({}, function (e, newPayees) {
                    expect(newPayees.length).to.eq(contractTermGroups.length - 1);
                    done();
                  });
                });
            });
          });
        });
        describe('when a contractTermGroup is not found', function () {
          it('should return a 404 status', function (done) {
            const id = 'anything';
            chai.request(server)
              .delete(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUser)
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find ContractTermGroup with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/ POST', function () {
        it('should return a contractTermGroup created with the passed parameters', function (done) {
          const params = {
            clientId: client._id.toString(),
            name: 'Name',
            type: 'Type',
            items: ['item1', 'item2', 'item3'],
          };
          chai.request(server)
            .post('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUser)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.clientId).to.eq(params.clientId);
              expect(res.body.name).to.eq(params.name);
              expect(res.body.type).to.eq(params.type);
              expect(res.body.items).to.eql(params.items);
              done();
            });
        });
        it('should add the contractTermGroup to the database', function (done) {
          ContractTermGroup.find({}, function (e, contractTermGroups) {
            const params = { clientId: '123', name: 'Post ContractTermGroup' };
            chai.request(server)
              .post('/contractTermGroups')
              .set('applicationToken', config.applicationToken)
              .set('token', clientUser)
              .send(params)
              .end(function (err, res) {
                ContractTermGroup.find({}, function (e, newContractTermGroup) {
                  expect(newContractTermGroup.length).to.eq(contractTermGroups.length + 1);
                  done();
                });
              });
          });
        });
      });
    });

    describe('as a user with None rights', function () {
      const userNone = {
        id: user._id, internal: false, parentId: null, clientId: null, rights: {},
      };
      userNone.rights[client._id] = {
        sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None',
      };
      describe('/ GET', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            // const id = contractTermGroups[0]._id;
            chai.request(server)
              .get('/contractTermGroups')
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserNone)
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          });
        });
      });
      describe('/:id GET', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .get(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserNone)
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          });
        });
      });
      describe('/:id PUT', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .put(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserNone)
              .send({ name: 'changedName' })
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          });
        });
      });
      describe('/:id DELETE', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({}, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .delete(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserNone)
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          });
        });
      });
      describe('/ POST', function () {
        it('should return 403', function (done) {
          const clientUserNone = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });
          const params = {
            clientId: client._id.toString(),
            name: 'Name',
            address: 'Address',
            country: 'Country',
            vatNo: 'VATNO',
          };
          chai.request(server)
            .post('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
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
      const userView = {
        id: user._id, internal: false, parentId: null, clientId: client._id, rights: {},
      };
      userView.rights[client._id] = {
        sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View',
      };
      describe('/ GET', function () {
        it('should return 200', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            // const id = contractTermGroups[0]._id;
            chai.request(server)
              .get('/contractTermGroups')
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserView)
              .end(function (err, res) {
                expect(res.status).to.eq(200);
                done();
              });
          });
        });
      });
      describe('/:id GET', function () {
        it('should return 200', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .get(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserView)
              .end(function (err, res) {
                expect(res.status).to.eq(200);
                done();
              });
          });
        });
      });
      describe('/:id PUT', function () {
        it('should return 403', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .put(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserView)
              .send({ name: 'changedName' })
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          });
        });
      });
      describe('/:id DELETE', function () {
        it('should return 403', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({}, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .delete(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserView)
              .end(function (err, res) {
                expect(res.status).to.eq(403);
                done();
              });
          });
        });
      });
      describe('/ POST', function () {
        it('should return 403', function (done) {
          const clientUserView = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });
          const params = {
            clientId: client._id.toString(),
            name: 'Name',
            address: 'Address',
            country: 'Country',
            vatNo: 'VATNO',
          };
          chai.request(server)
            .post('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
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
      const userEdit = {
        id: user._id, internal: false, parentId: null, clientId: client._id, rights: {},
      };
      userEdit.rights[client._id] = {
        sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit',
      };
      describe('/ GET', function () {
        it('should return 200', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            // const id = contractTermGroups[0]._id;
            chai.request(server)
              .get('/contractTermGroups')
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserEdit)
              .end(function (err, res) {
                expect(res.status).to.eq(200);
                done();
              });
          });
        });
      });
      describe('/:id PUT', function () {
        it('should return 200', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({ clientId: client._id.toString() }, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .put(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserEdit)
              .send({ name: 'changedName' })
              .end(function (err, res) {
                expect(res.status).to.eq(200);
                done();
              });
          });
        });
      });
      describe('/:id DELETE', function () {
        it('should return 200', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          ContractTermGroup.find({}, function (e, contractTermGroups) {
            const id = contractTermGroups[0]._id;
            chai.request(server)
              .delete(`/contractTermGroups/${id}`)
              .set('applicationToken', config.applicationToken)
              .set('token', clientUserEdit)
              .end(function (err, res) {
                expect(res.status).to.eq(200);
                done();
              });
          });
        });
      });
      describe('/ POST', function () {
        it('should return 200', function (done) {
          const clientUserEdit = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });
          const params = {
            clientId: client._id.toString(),
            name: 'Name',
            type: 'Type',
            items: ['item1', 'item2', 'item3'],
          };
          chai.request(server)
            .post('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', clientUserEdit)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.clientId).to.eq(params.clientId);
              expect(res.body.name).to.eq(params.name);
              expect(res.body.type).to.eq(params.type);
              expect(res.body.items).to.eql(params.items);
              done();
            });
        });
      });
    });
  });

  describe('as an internal user', function () {
    const internal = jwt.sign({ internal: true }, process.env.jsonSecretToken, { expiresIn: 86400 });
    describe('/ GET', function () {
      it('should return a 403 forbidden response', function (done) {
        chai.request(server)
          .get('/contractTermGroups')
          .set('applicationToken', config.applicationToken)
          .set('token', internal)
          .end(function (err, res) {
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });
    describe('/:id GET', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .get(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', internal)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
    });
    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .put(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not update the contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .put(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              ContractTermGroup.find({ _id: contractTermGroups[0]._id }, function (err, newPayees) {
                expect(newPayees[0].title).to.eq(contractTermGroups[0].title);
                done();
              });
            });
        });
      });
    });
    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .delete(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', internal)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not delete the contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .delete(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', internal)
            .end(function (err, res) {
              ContractTermGroup.countDocuments({ _id: contractTermGroups[0]._id }, function (err, count) {
                expect(count).to.eq(1);
                done();
              });
            });
        });
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          // const id = contractTermGroups[0]._id;
          chai.request(server)
            .post('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not create a contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .post(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              ContractTermGroup.countDocuments({}, function (err, count) {
                expect(contractTermGroups.length).to.eq(count);
                done();
              });
            });
        });
      });
    });
  });

  describe('as a parent user without a client', function () {
    const parent = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });
    describe('/ GET', function () {
      it('should return a 403 forbidden response', function (done) {
        chai.request(server)
          .get('/contractTermGroups')
          .set('applicationToken', config.applicationToken)
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
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .get(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', parent)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
    });
    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .put(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not update the contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .put(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              ContractTermGroup.find({ _id: contractTermGroups[0]._id }, function (err, newPayees) {
                expect(newPayees[0].title).to.eq(contractTermGroups[0].title);
                done();
              });
            });
        });
      });
    });
    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .delete(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', parent)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not delete the contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .delete(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', parent)
            .end(function (err, res) {
              ContractTermGroup.countDocuments({ _id: contractTermGroups[0]._id }, function (err, count) {
                expect(count).to.eq(1);
                done();
              });
            });
        });
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          // const id = contractTermGroups[0]._id;
          chai.request(server)
            .post('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not create a contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .post(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              ContractTermGroup.countDocuments({}, function (err, count) {
                expect(contractTermGroups.length).to.eq(count);
                done();
              });
            });
        });
      });
    });
  });

  describe('as a payee user', function () {
    const contractId = '345';
    const contractIds = [contractId, '678'];
    let payeeToken;
    beforeEach(function (done) {
      const payee = new Payee({ name: 'Payee Login', clientId: client._id });
      payee.save(function (err, savedPayee) {
        payeeToken = jwt.sign({
          internal: false, parentId: null, payeeId: payee._id, contractIds,
        }, process.env.jsonSecretToken, { expiresIn: 86400 });
        done();
      });
    });
    describe('/ GET', function () {
      it('should return a 403 forbidden response', function (done) {
        chai.request(server)
          .get('/contractTermGroups')
          .set('applicationToken', config.applicationToken)
          .set('token', payeeToken)
          .end(function (err, res) {
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });
    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .put(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', payeeToken)
            .send({ name: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not update the contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .put(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', payeeToken)
            .send({ name: 'Changed Title' })
            .end(function (err, res) {
              ContractTermGroup.find({ _id: contractTermGroups[0]._id }, function (err, newPayees) {
                expect(newPayees[0].name).to.eq(contractTermGroups[0].name);
                done();
              });
            });
        });
      });
    });
    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .delete(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', payeeToken)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not delete the contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .delete(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', payeeToken)
            .end(function (err, res) {
              ContractTermGroup.countDocuments({ _id: contractTermGroups[0]._id }, function (err, count) {
                expect(count).to.eq(1);
                done();
              });
            });
        });
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          // const id = contractTermGroups[0]._id;
          chai.request(server)
            .post('/contractTermGroups')
            .set('applicationToken', config.applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not create a contractTermGroup', function (done) {
        ContractTermGroup.find({}, function (err, contractTermGroups) {
          const id = contractTermGroups[0]._id;
          chai.request(server)
            .post(`/contractTermGroups/${id}`)
            .set('applicationToken', config.applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              ContractTermGroup.countDocuments({}, function (err, count) {
                expect(contractTermGroups.length).to.eq(count);
                done();
              });
            });
        });
      });
    });
  });
});
