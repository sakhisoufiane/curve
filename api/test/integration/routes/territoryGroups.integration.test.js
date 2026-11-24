process.env.NODE_ENV = 'test';
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const chaiHttp = require('chai-http');
const async = require('async');
const config = require('../../../config.json');
const User = require('../../../models/user');
const Payee = require('../../../models/payee');
const Client = require('../../../models/client');
const TerritoryGroup = require('../../../models/territoryGroup');
const server = require('../../../index');

const applicationToken = config.applicationTokens[0];
const { expect } = chai;
chai.use(chaiHttp);

describe.skip('/territoryGroups', function () {
  logger.info('>>>file>>>> int/routes/territoryGroups .....................');
  const client = new Client({ _id: new ObjectId('111111111111111111111111'), name: Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 15) });
  const user = new User({ _id: new ObjectId('222222222222222222222222'), email: 'test-upload@curve.com' });
  let territoryGroup1; let territoryGroup2; let territoryGroup3;

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
        territoryGroup1 = new TerritoryGroup({ clientId: client._id, name: 'TerritoryGroup 1' });
        territoryGroup1.save(callback);
      },
      function (callback) {
        territoryGroup2 = new TerritoryGroup({ clientId: client._id, name: 'TerritoryGroup 2' });
        territoryGroup2.save(callback);
      },
      function (callback) {
        territoryGroup3 = new TerritoryGroup({ clientId: randomId(), name: 'TerritoryGroup 3' });
        territoryGroup3.save(callback);
      },
    ], done);
  });

  afterEach(async function () {
    await TerritoryGroup.collection.drop();
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
        it('should return a list of territoryGroups', function (done) {
          chai.request(server)
            .get('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.territoryGroups).to.be.an('array');
              TerritoryGroup.find({ clientId: client._id }, function (e, territoryGroups) {
                expect(res.body.territoryGroups.length).to.be.eq(territoryGroups.length);
                done();
              });
            });
        });
        it('should return metadata of territoryGroups index on / GET', function (done) {
          chai.request(server)
            .get('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.meta).to.be.an('object');
              done();
            });
        });
        it('should return the first page if not passed a specific page', function (done) {
          chai.request(server)
            .get('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.currentPage).to.be.eq(1);
              done();
            });
        });
        it('should return the passed page when passed the parameter', function (done) {
          chai.request(server)
            .get('/territoryGroups?page=3')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.currentPage).to.be.eq(3);
              done();
            });
        });
        it('should return the pages available', function (done) {
          chai.request(server)
            .get('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.meta.totalPages).to.be.eq(1);
              done();
            });
        });
        it('should set the amount to be returned per page when passed a limit option', function (done) {
          chai.request(server)
            .get('/territoryGroups?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .end(function (err, res) {
              expect(res.body.territoryGroups.length).to.eq(1);
              TerritoryGroup.countDocuments({ clientId: client._id }, function (e, count) {
                expect(res.body.meta.totalPages).to.be.eq(count);
                done();
              });
            });
        });
      });
      describe('/:id GET', function () {
        describe('when a territoryGroup is found', function () {
          it('should return a territoryGroup and 200 status', function (done) {
            TerritoryGroup.findOne({ name: 'TerritoryGroup 1' }, function (e, territoryGroup) {
              chai.request(server)
                .get(`/territoryGroups/${territoryGroup._id}`)
                .set('applicationToken', applicationToken)
                .set('token', clientUser)
                .end(function (err, res) {
                  expect(res.status).to.eq(200);
                  expect(res.body).to.be.a('object');
                  expect(res.body.clientId).to.eq(territoryGroup.clientId);
                  expect(res.body.name).to.eq(territoryGroup.name);
                  // expect(res.body.territories).to.eql(territoryGroup.territories);
                  expect(res.body.lastModifiedBy).to.eq(territoryGroup.lastModifiedBy);
                  done();
                });
            });
          });
        });
        describe('when a territoryGroup is not found', function () {
          it('should return a 404 status', function (done) {
            const id = 'anything';
            chai.request(server)
              .get(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find TerritoryGroup with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/:id PUT', function () {
        describe('when a territoryGroup is found', function () {
          it('should update with passed values only', function (done) {
            TerritoryGroup.find({}, function (e, territoryGroups) {
              const id = territoryGroups[0]._id;
              const changedName = `${territoryGroups[0].name}changed`;
              chai.request(server)
                .put(`/territoryGroups/${id}`)
                .set('applicationToken', applicationToken)
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
            TerritoryGroup.find({ name: 'TerritoryGroup 1' }, function (e, territoryGroups) {
              const id = territoryGroups[0]._id;
              const changedName = `${territoryGroups[0].name}changed`;
              chai.request(server)
                .put(`/territoryGroups/${id}`)
                .set('applicationToken', applicationToken)
                .set('token', clientUser)
                .send({ name: changedName, clientId: 'changed' })
                .end(function (err, res) {
                  expect(res.body.clientId).to.eq(territoryGroups[0].clientId);
                  done();
                });
            });
          });
          it("should not update any fields it isn't passed", function (done) {
            TerritoryGroup.find({ name: 'TerritoryGroup 1' }, function (e, territoryGroups) {
              const id = territoryGroups[0]._id;
              const changedName = `${territoryGroups[0].name}changed`;
              chai.request(server)
                .put(`/territoryGroups/${id}`)
                .set('applicationToken', applicationToken)
                .set('token', clientUser)
                .send({ name: changedName, clientId: 'changed' })
                .end(function (err, res) {
                  expect(res.body.foreignId).to.eq(territoryGroups[0].foreignId);
                  done();
                });
            });
          });
        });
        describe('when a territoryGroup is not found', function () {
          it('should return a 404 status', function (done) {
            const id = 'anything';
            chai.request(server)
              .put(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send({ title: 'Changed TerritoryGroup Title' })
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find TerritoryGroup with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/:id DELETE', function () {
        describe('when a territoryGroup is found', function () {
          it('should delete the territoryGroup and return a 200 status', function (done) {
            TerritoryGroup.find({}, function (e, territoryGroups) {
              const id = territoryGroups[0]._id;
              chai.request(server)
                .delete(`/territoryGroups/${id}`)
                .set('applicationToken', applicationToken)
                .set('token', clientUser)
                .end(function (err, res) {
                  expect(res.status).to.eq(200);
                  TerritoryGroup.find({}, function (e, newPayees) {
                    expect(newPayees.length).to.eq(territoryGroups.length - 1);
                    done();
                  });
                });
            });
          });
        });
        describe('when a territoryGroup is not found', function () {
          it('should return a 404 status', function (done) {
            const id = 'anything';
            chai.request(server)
              .delete(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .end(function (err, res) {
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find TerritoryGroup with ID ${id}`);
                done();
              });
          });
        });
      });
      describe('/ POST', function () {
        it('should return a territoryGroup created with the passed parameters', function (done) {
          const params = {
            clientId: client._id.toString(),
            name: 'Name',
            territories: ['T1', 'T2'],
          };
          chai.request(server)
            .post('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUser)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.clientId).to.eq(params.clientId);
              expect(res.body.name).to.eq(params.name);
              expect(res.body.territories).to.eql(params.territories);
              done();
            });
        });
        it('should add the territoryGroup to the database', function (done) {
          TerritoryGroup.find({}, function (e, territoryGroups) {
            const params = { clientId: '123', name: 'Post TerritoryGroup' };
            chai.request(server)
              .post('/territoryGroups')
              .set('applicationToken', applicationToken)
              .set('token', clientUser)
              .send(params)
              .end(function (err, res) {
                TerritoryGroup.find({}, function (e, newTerritoryGroup) {
                  expect(newTerritoryGroup.length).to.eq(territoryGroups.length + 1);
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            // const id = territoryGroups[0]._id;
            chai.request(server)
              .get('/territoryGroups')
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .get(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .put(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({}, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .delete(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
            .post('/territoryGroups')
            .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            // const id = territoryGroups[0]._id;
            chai.request(server)
              .get('/territoryGroups')
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .get(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .put(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({}, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .delete(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
            .post('/territoryGroups')
            .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            // const id = territoryGroups[0]._id;
            chai.request(server)
              .get('/territoryGroups')
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({ clientId: client._id.toString() }, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .put(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
          TerritoryGroup.find({}, function (e, territoryGroups) {
            const id = territoryGroups[0]._id;
            chai.request(server)
              .delete(`/territoryGroups/${id}`)
              .set('applicationToken', applicationToken)
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
            territories: ['T1', 'T2'],
          };
          chai.request(server)
            .post('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', clientUserEdit)
            .send(params)
            .end(function (err, res) {
              expect(res.status).to.eq(200);
              expect(res.body.clientId).to.eq(params.clientId);
              expect(res.body.name).to.eq(params.name);
              expect(res.body.territories).to.eql(params.territories);
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
          .get('/territoryGroups')
          .set('applicationToken', applicationToken)
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
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .get(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
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
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .put(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not update the territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .put(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              TerritoryGroup.find({ _id: territoryGroups[0]._id }, function (err, newPayees) {
                expect(newPayees[0].title).to.eq(territoryGroups[0].title);
                done();
              });
            });
        });
      });
    });
    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .delete(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not delete the territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .delete(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .end(function (err, res) {
              TerritoryGroup.countDocuments({ _id: territoryGroups[0]._id }, function (err, count) {
                expect(count).to.eq(1);
                done();
              });
            });
        });
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          // const id = territoryGroups[0]._id;
          chai.request(server)
            .post('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not create a territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .post(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', internal)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              TerritoryGroup.countDocuments({}, function (err, count) {
                expect(territoryGroups.length).to.eq(count);
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
          .get('/territoryGroups')
          .set('applicationToken', applicationToken)
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
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .get(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
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
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .put(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not update the territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .put(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              TerritoryGroup.find({ _id: territoryGroups[0]._id }, function (err, newPayees) {
                expect(newPayees[0].title).to.eq(territoryGroups[0].title);
                done();
              });
            });
        });
      });
    });
    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .delete(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not delete the territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .delete(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .end(function (err, res) {
              TerritoryGroup.countDocuments({ _id: territoryGroups[0]._id }, function (err, count) {
                expect(count).to.eq(1);
                done();
              });
            });
        });
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          // const id = territoryGroups[0]._id;
          chai.request(server)
            .post('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not create a territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .post(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', parent)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              TerritoryGroup.countDocuments({}, function (err, count) {
                expect(territoryGroups.length).to.eq(count);
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
          .get('/territoryGroups')
          .set('applicationToken', applicationToken)
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
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .put(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ name: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not update the territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .put(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ name: 'Changed Title' })
            .end(function (err, res) {
              TerritoryGroup.find({ _id: territoryGroups[0]._id }, function (err, newPayees) {
                expect(newPayees[0].name).to.eq(territoryGroups[0].name);
                done();
              });
            });
        });
      });
    });
    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .delete(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not delete the territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .delete(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .end(function (err, res) {
              TerritoryGroup.countDocuments({ _id: territoryGroups[0]._id }, function (err, count) {
                expect(count).to.eq(1);
                done();
              });
            });
        });
      });
    });
    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          // const id = territoryGroups[0]._id;
          chai.request(server)
            .post('/territoryGroups')
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              expect(res.status).to.eq(403);
              expect(res.body.message).to.eq('Forbidden');
              done();
            });
        });
      });
      it('should not create a territoryGroup', function (done) {
        TerritoryGroup.find({}, function (err, territoryGroups) {
          const id = territoryGroups[0]._id;
          chai.request(server)
            .post(`/territoryGroups/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', payeeToken)
            .send({ title: 'Changed Title' })
            .end(function (err, res) {
              TerritoryGroup.countDocuments({}, function (err, count) {
                expect(territoryGroups.length).to.eq(count);
                done();
              });
            });
        });
      });
    });
  });
});
