process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const chai = require('chai');
const async = require('async');
const sinon = require('sinon');
const supertest = require('supertest');
const moment = require('moment');

const Contract = require('../../../models/contract');
const Cost = require('../../../models/cost');
const Work = require('../../../models/work');
const Track = require('../../../models/track');
const Release = require('../../../models/release');
const Transaction = require('../../../models/transaction');
const Client = require('../../../models/client');
const Payee = require('../../../models/payee');
const User = require('../../../models/user');

const config = require('../../../config.json');
const ContractsImporter = require('../../../libs/imports/contracts');

const applicationToken = config.applicationTokens[0];
const { expect } = chai;

const server = supertest(require('../../../index'));

describe('/contracts', function () {
  logger.info('>>>file>>>> int/routes/contracts .....................');
  let importFromExcel; let sendExport; let clientStub;
  let client;
  let user;
  let contract1; let contract2; let contract3; let contract4;
  let cost1;
  let track1;
  let work1;
  let release1; let release2;
  let transaction1; let transaction2; let transaction3; let transaction4; let transaction5;
  let matchContractToLabels;

  before((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  beforeEach(function (done) {
    async.series([
      function (callback) {
        clientStub = sinon.stub(Client.prototype, 'createBigQueryTables');
        clientStub.yields();
        sinon.stub(Client.prototype, 'createBigQueryBackups').yields();

        matchContractToLabels = sinon.stub(Contract.prototype, 'matchContractToLabels');
        matchContractToLabels.yields();

        importFromExcel = sinon.stub(ContractsImporter, 'import');
        sendExport = sinon.stub(Contract, 'sendExport');
        callback();
      },
      async function () {
        client = new Client({ name: testUtils.randomString(), createdBigQueryTables: true, createdBigQueryBackups: true });
        await client.save();
      },
      async function () {
        user = new User({
          email: `${testUtils.randomString()}@curve.com`,
        });
        await user.save();
      },
      async function () {
        contract1 = new Contract({
          clientId: client._id,
          name: testUtils.randomString(),
          active: testUtils.randomBoolean(),
          foreignId: testUtils.randomString(),
          projectId: testUtils.randomString(),
          licenseNo: testUtils.randomString(),
          currency: testUtils.randomString(),
          type: testUtils.randomString(),
          salesTerms: [],
        });
        await contract1.save();
      },
      async function () {
        contract2 = new Contract({ clientId: client._id, name: testUtils.randomString(), status: 'Expired' });
        await contract2.save();
      },
      async function () {
        contract3 = new Contract({ clientId: client._id, name: testUtils.randomString(), status: 'Collection' });
        await contract3.save();
      },
      async function () {
        contract4 = new Contract({ clientId: client._id, name: testUtils.randomString(), type: 'Profit Share', status: 'Retention' });
        await contract4.save();
      },
      async function () {
        work1 = new Work({
          clientId: client._id,
          title: testUtils.randomString(),
          invoiceNo: testUtils.randomString(),
          file: testUtils.randomString(),
          salesReturnsRights: {
            contractId: contract1._id,
            percentage: testUtils.randomInt(),
          },
        });
        await work1.save();
      },
      async function () {
        cost1 = new Cost({
          clientId: client._id,
          name: testUtils.randomString(),
          type: 'Royalty',
          invoiceNo: testUtils.randomString(),
          file: testUtils.randomString(),
          contractIds: [contract1._id],
        });
        await cost1.save();
      },
      async function () {
        track1 = new Track({
          clientId: client._id,
          title: testUtils.randomString(),
          isrc: testUtils.randomString(),
          salesReturnsRights: {
            contractId: contract1._id,
            percentage: testUtils.randomInt(),
          },
        });
        await track1.save();
      },
      async function () {
        release1 = new Release({
          clientId: client._id,
          title: testUtils.randomString(),
          trackIds: [track1._id],
          label: contract1.name,
          salesReturnsRights: {
            contractId: contract1._id,
            percentage: testUtils.randomInt(),
          },
        });

        await release1.save();
      },
      async function (callback) {
        release2 = new Release({
          clientId: client._id,
          title: testUtils.randomString(),
          trackIds: [track1._id],
          label: contract2.name,
          salesReturnsRights: [],
          costsRights: [],
        });

        await release2.save();
      },
      async function () {
        transaction1 = new Transaction({
          clientId: client._id,
          name: testUtils.randomString(),
          userCreated: false,
          amount: testUtils.randomInt(),
          date: moment().subtract(1, 'years').format(),
          contractId: contract1._id,
        });

        await transaction1.save();
      },
      async function () {
        transaction2 = new Transaction({
          clientId: client._id,
          name: testUtils.randomString(),
          userCreated: false,
          amount: testUtils.randomInt(),
          date: moment().add(1, 'years').format(),
          contractId: contract2._id,
        });

        await transaction2.save();
      },
      async function () {
        transaction3 = new Transaction({
          clientId: client._id,
          name: testUtils.randomString(),
          userCreated: false,
          amount: testUtils.randomInt(),
          date: moment().add(1, 'years').format(),
          contractId: contract4._id,
          isReserveRelease: true,
        });
        await transaction3.save();
      },
      async function () {
        transaction4 = new Transaction({
          clientId: client._id,
          name: testUtils.randomString(),
          userCreated: false,
          amount: testUtils.randomInt(),
          date: moment().add(1, 'years').format(),
          contractId: contract4._id,
          isReserveWithholding: true,
        });
        await transaction4.save();
      },
      async function () {
        transaction5 = new Transaction({
          clientId: client._id,
          name: testUtils.randomString(),
          userCreated: false,
          amount: testUtils.randomInt(),
          date: moment().add(1, 'years').format(),
          contractId: contract4._id,
        });

        await transaction5.save();
      },
    ], done);
  });

  afterEach(function (done) {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  after((done) => {
    sinon.restore();
    testUtils.cleanUp(done);
  });

  describe('as a client user', function () {
    describe('as a user with full rights', function () {
      // Arrange
      let token;

      beforeEach((done) => {
        const userToken = {
          id: user._id,
          internal: false,
          parentId: null,
          clientId: client._id,
          email: `${testUtils.randomString()}@curve.com`,
          rights: {},
        };
        userToken.rights[client._id.toString()] = { contracts: 'Edit' };
        token = jwt.sign(userToken, process.env.jsonSecretToken, { expiresIn: 86400 });

        done();
      });

      describe('/ GET', function () {
        it('should return a list of contracts', function (done) {
          // Act
          server
            .get('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.contracts).to.be.an('array');
              Contract.find({ clientId: client._id })
                .then((contracts) => {
                  expect(res.body.contracts.length).to.be.eq(contracts.length);
                  done();
                })
                .catch((err) => {
                  expect.fail(err);
                  done();
                });
            });
        });

        it('should return metadata of contracts index on / GET', function (done) {
          // Act
          server
            .get('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.meta).to.be.an('object');
              done();
            });
        });

        it('should return the first page if not passed a specific page', function (done) {
          // Act
          server
            .get('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.body.meta.currentPage).to.be.eq(1);
              done();
            });
        });

        it('should return the passed page when passed the parameter', function (done) {
          // Act
          server
            .get('/contracts?page=3')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.body.meta.currentPage).to.be.eq(3);
              done();
            });
        });

        it('should return the pages available', function (done) {
          // Act
          server
            .get('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.body.meta.totalPages).to.be.eq(1);
              done();
            });
        });

        it('should set the amount to be returned per page when passed a limit option', function (done) {
          // Act
          server
            .get('/contracts?limit=1')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.body.contracts.length).to.eq(1);
              Contract.countDocuments({ clientId: client._id })
                .then((count) => {
                  expect(res.body.meta.totalPages).to.be.eq(count);
                  done();
                })
                .catch((err) => {
                  expect.fail(err);
                  done();
                });
            });
        });

        it('should return crossContracts for contracts that have them', async function () {
          // Arrange
          const crossContractEntry = { contractId: contract2._id.toString(), condition: 'Positive', process: 'Add To', percentage: '100' };
          const contractWithCrossContract = new Contract({
            clientId: client._id,
            name: testUtils.randomString(),
            crossContracts: [crossContractEntry],
          });
          await contractWithCrossContract.save();

          // Act
          const res = await server
            .get('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token);

          // Assert
          expect(res.status).to.eq(200);
          const returned = res.body.contracts.find((c) => c._id === contractWithCrossContract._id.toString());
          expect(returned).to.exist;
          expect(returned.crossContracts).to.be.an('array').with.lengthOf(1);
          expect(returned.crossContracts[0].contractId).to.eq(contract2._id.toString());
        });
      });

      describe('/:id GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body).to.be.a('object');
                expect(res.body.clientId).to.eq(contract1.clientId);
                expect(res.body.active).to.eq(contract1.active);
                expect(res.body.foreignId).to.eq(contract1.foreignId);
                expect(res.body.projectId).to.eq(contract1.projectId);
                expect(res.body.licenseNo).to.eq(contract1.licenseNo);
                expect(res.body.currency).to.eq(contract1.currency);
                expect(res.body.type).to.eq(contract1.type);
                expect(res.body.name).to.eq(contract1.name);
                expect(res.body.openingBalance).to.eq(contract1.openingBalance);
                done();
              });
          });
        });

        describe('when a contract is not found', function () {
          it('should return a 404 status', function (done) {
            const id = new ObjectId();
            // Act
            server
              .get(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find Contract with ID ${id}`);
                done();
              });
          });
        });
      });

      describe('/:id/flush_labels_to_catalogue GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.message).to.eq('Flushing contracts onto catalogue');
                done();
              });
          });

          it('should call matchContractToLabels', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function () {
                // Assert
                expect(matchContractToLabels.called);
                done();
              });
          });
        });
      });

      describe('/:id PUT', function () {
        describe('when a contract is found', function () {
          it('should update with passed values only', function (done) {
            // Arrange
            const id = contract1._id;
            // Act
            const changedName = `${contract1.name}changed`;
            server
              .put(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ name: changedName })
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.name).to.eq(changedName);
                done();
              });
          });

          it('should not update clientId', function (done) {
            // Arrange
            const id = contract1._id;
            const changedTitle = `${contract1.title}changed`;

            // Act
            server
              .put(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ name: changedTitle, clientId: 'changed' })
              .end(function (err, res) {
                // Assert
                expect(res.body.clientId).to.eq(contract1.clientId);
                done();
              });
          });

          it("should not update any fields it isn't passed", function (done) {
            // Arrange
            const id = contract1._id;
            const changedTitle = `${contract1.title}changed`;

            // Act
            server
              .put(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ name: changedTitle, clientId: 'changed' })
              .end(function (err, res) {
                // Assert
                expect(res.body.foreignId).to.eq(contract1.foreignId);
                done();
              });
          });
        });

        describe('when a contract is not found', function () {
          it('should return a 404 status', function (done) {
            // Arrange
            const id = new ObjectId();

            // Act
            server
              .put(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ title: 'Changed Contract Title' })
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq(`Could not find Contract with ID ${id}`);
                done();
              });
          });
        });

        describe('when a cross contract has an invalid ID', function () {
          it('should return a 400 status', function (done) {
            // Arrange
            const id = contract1._id;

            // Act
            server
              .put(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({
                crossContracts: [
                  {
                    condition: 'Always transfer Income',
                    process: 'Add To',
                    contractId: 'sdfsdfsdfsdfsd',
                    percentage: '50',
                  },
                  {
                    condition: 'Always transfer Income',
                    process: 'Add To',
                    contractId: contract2._id,
                    percentage: '50',
                  },
                ],
              })
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(400);
                expect(res.body.message).to.eq('Invalid ID for cross contracts');
                done();
              });
          });
        });
      });

      describe('/ DELETE', function () {
        describe('when a contract is found', function () {
          // @todo Resolve & Remove skip here
          it.skip('should delete the contract and return a 200 status', function (done) {
            // Arrange
            const params = {
              ids: [contract2._id],
              type: 'single',
            };
            // Act
            server
              .delete('/contracts')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send(params)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                Contract.findById(contract2._id)
                  .then((contract) => {
                    expect(contract).to.not.exist;
                    done();
                  })
                  .catch((err) => {
                    expect.fail(err);
                    done();
                  });
              });
          });
        });

        describe('when a contract is not passed', function () {
          it('should return a 404 status', function (done) {
            // Arrange
            const params = {};

            // Act
            server
              .delete('/contracts')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send(params)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(404);
                expect(res.body.message).to.eq('Could not find Contracts');
                done();
              });
          });
        });
      });

      describe('/ POST', function () {
        it('should return a contract created with the passed parameters', function (done) {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            name: 'name',
            type: 'type',
            active: true,
            foreignId: 'foreignId',
            projectId: 'projectId',
            licenseNo: 'licenseNo',
            currency: 'currency',
          };

          // Act
          server
            .post('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.clientId).to.eq(params.clientId);
              expect(res.body.name).to.eq(params.name);
              expect(res.body.type).to.eq(params.type);
              expect(res.body.active).to.eq(params.active);
              expect(res.body.foreignId).to.eq(params.foreignId);
              expect(res.body.projectId).to.eq(params.projectId);
              expect(res.body.licenseNo).to.eq(params.licenseNo);
              expect(res.body.currency).to.eq(params.currency);
              done();
            });
        });

        it('should add the contract to the database', function (done) {
          // Arrange
          Contract.find({})
            .then((contracts) => {
              const params = {
                clientId: client._id.toString(),
                name: 'name',
                type: 'type',
                active: true,
                foreignId: 'foreignId',
                projectId: 'projectId',
                licenseNo: 'licenseNo',
                currency: 'currency',
              };

              // Act
              server
                .post('/contracts')
                .set('applicationToken', applicationToken)
                .set('token', token)
                .send(params)
                .end(function () {
                  // Assert
                  Contract.find({})
                    .then((newContract) => {
                      expect(newContract.length).to.eq(contracts.length + 1);
                      done();
                    })
                    .catch((err) => {
                      chai.assert.fail(err);
                      done();
                    });
                });
            })
            .catch((err) => {
              chai.assert.fail(err);
              done();
            });
        });

        it('should return a 400 status when cross contract has invalid ID', function (done) {
          // Arrange
          const id = contract1._id;
          const params = {
            clientId: client._id.toString(),
            name: 'name',
            type: 'type',
            active: true,
            foreignId: 'foreignId',
            projectId: 'projectId',
            licenseNo: 'licenseNo',
            currency: 'currency',
            crossContracts: [
              {
                condition: 'Always transfer Income',
                process: 'Add To',
                contractId: 'sdfsdfsdfsdfsd',
                percentage: '50',
              },
              {
                condition: 'Always transfer Income',
                process: 'Add To',
                contractId: contract2._id,
                percentage: '50',
              },
            ],
          };

          // Act
          server
            .put(`/contracts/${id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(400);
              expect(res.body.message).to.eq('Invalid ID for cross contracts');
              done();
            });
        });
      });

      describe('/import POST', function () {
        describe('when a file is passed', function () {
          it('should give a 200', function (done) {
            // Act
            server
              .post('/contracts/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .attach('file', 'test/test-data/test_contract.xlsx')
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.message).to.eq('Contracts are importing, and a report will be sent to you shortly.');
                done();
              });
          });

          it('should call importFromExcel with the uploaded file', function (done) {
            // Act
            server
              .post('/contracts/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .attach('file', 'test/test-data/test_contract.xlsx')
              .end(function () {
                // Assert
                expect(importFromExcel.called).to.be.true;
                done();
              });
          });
        });

        describe('when no file is uploaded', function () {
          it('should return an error without a file in the request', function (done) {
            // Act
            server
              .post('/contracts/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(400);
                expect(res.body.errors).to.deep.eq(['Requires a file to be uploaded']);
                done();
              });
          });
        });
      });

      describe('/export POST', function () {
        it('should return 200', function (done) {
          // Arrange
          const id = contract1._id;

          // Act
          server
            .post('/contracts/export')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ ids: [id] })
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });

        it('should call sendExport', function (done) {
          // Act
          server
            .post('/contracts/export')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ filter: {} })
            .end(function () {
              // Assert
              expect(sendExport.called).to.be.true;
              done();
            });
        });
      });

      describe('/:id/upload_complete PUT', function () {
        it.skip('should upload the file and save key to contract files', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}/upload`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ filename: 'filename', type: 'docx' })
            .end(function (err, res) {
              const fileKey = res.body.credentials.fields.key;
              server
                .put(`/contracts/${contract1._id}/upload_complete`)
                .set('applicationToken', applicationToken)
                .set('token', token)
                .send({ key: res.body.credentials.fields.key })
                .end(function (err, res) {
                  // Arrange
                  expect(res.status).to.eq(200);
                  expect(res.body.files[0].key).to.eq(fileKey);
                  done();
                });
            });
        });
      });

      describe('/:id/file/:key DELETE', function () {
        it.skip('should delete the uploaded file', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}/upload`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ filename: 'filenamed', type: 'docx' })
            .end(function (err, res) {
              const fileKey = res.body.credentials.fields.key;
              const transformedKey = fileKey.replace(/\//g, '-');
              server
                .put(`/contracts/${contract1._id}/upload_complete`)
                .set('applicationToken', applicationToken)
                .set('token', token)
                .send({ key: fileKey })
                .end(function () {
                  server
                    .delete(`/contracts/${contract1._id}/file/${transformedKey}`)
                    .set('applicationToken', applicationToken)
                    .set('token', token)
                    .end(function (err, res) {
                      // Assert
                      expect(res.status).to.eq(200);
                      expect(res.body.files.length).to.eq(0);
                      done();
                    });
                });
            });
        });
      });

      describe('/:id/costs GET', function () {
        it('should return a contract cost and 200 status', function (done) {
          // Arrange
          const id = contract1._id;
          server
            .get(`/contracts/${id}/costs`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.costs).to.have.length(1);
              done();
            });
        });
      });

      describe('/:id/tracks GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract track and 200 status', function (done) {
            // Arrange
            server
              .get(`/contracts/${contract1._id}/tracks`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.tracks).to.have.length(1);
                done();
              });
          });
        });
      });

      describe('/:id/releases GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/releases`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.releases).to.have.length(1);
                done();
              });
          });
        });
      });

      describe('/:id/transactions GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Arrange
            server
              .get(`/contracts/${contract1._id}/transactions`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.transactions).to.have.length(1);
                done();
              });
          });
        });
      });

      describe('/:id/future_transactions GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Arrange
            server
              .get(`/contracts/${contract2._id}/future_transactions`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.transactions).to.have.length(1);
                done();
              });
          });
        });
        describe('when the contract is Profit Share & there are reserve payments included', () => {
          it('should filter these out and not include them in the response', (done) => {
            // Arrange
            server
              .get(`/contracts/${contract4._id}/future_transactions`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.transactions).to.have.length(1);
                done();
              });
          });
        });
      });

      describe('/:id/works GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Arrange
            server
              .get(`/contracts/${contract1._id}/works`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.works).to.have.length(1);
                done();
              });
          });
        });
      });
    });

    describe('as a user with None rights', function () {
      // Arrange
      let userNone;
      let token;

      beforeEach((done) => {
        userNone = {
          id: user._id, internal: false, parentId: null, clientId: null, rights: {},
        };
        userNone.rights[client._id] = {
          sales: 'None', contracts: 'None', periods: 'None', catalogue: 'None',
        };

        token = jwt.sign(userNone, process.env.jsonSecretToken, { expiresIn: 86400 });

        done();
      });

      describe('/:id GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/flush_labels_to_catalogue GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });
      describe('/:id PUT', function () {
        it('should return 403', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ name: 'changedName' })
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/ DELETE', function () {
        it('should return 403', function (done) {
          // Act
          server
            .delete('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/ POST', function () {
        it('should return 403', function (done) {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            projectId: 'projectId',
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
            contractAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          // Act
          server
            .post('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/import POST', function () {
        it('should give a 403', function (done) {
          // Act
          server
            .post('/contracts/import')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .attach('file', 'test/test-data/test_contract.xlsx')
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/export POST', function () {
        it('should return 403', function (done) {
          // Act
          server
            .post('/contracts/export')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/costs GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/costs`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/tracks GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/tracks`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });
      describe('/:id/releases GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/releases`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/transactions GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/transactions`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/future_transactions GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/future_transactions`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/works GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/works`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/upload_complete PUT', function () {
        it('should give a 403', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}/upload_complete`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ key: 'key' })
            .end(function (err, res) {
              // Arrange
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/file/:key DELETE', function () {
        it('should give a 403', function (done) {
          // Act
          server
            .delete(`/contracts/${contract1._id}/file/key-name`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });
    });

    describe('as a user with View rights', function () {
      // Arrange
      let userView;
      let token;

      beforeEach((done) => {
        userView = {
          id: user._id, internal: false, parentId: null, clientId: client._id, rights: {},
        };
        userView.rights[client._id] = {
          sales: 'View', contracts: 'View', periods: 'View', catalogue: 'View',
        };

        token = jwt.sign(userView, process.env.jsonSecretToken, { expiresIn: 86400 });

        done();
      });

      describe('/:id GET', function () {
        it('should return 200', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });
      });

      describe('/:id/flush_labels_to_catalogue GET', function () {
        it('should return 403', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id PUT', function () {
        it('should return 403', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ name: 'changedName' })
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/ DELETE', function () {
        it('should return 403', function (done) {
          // Act
          server
            .delete('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/ POST', function () {
        it('should return 403', function (done) {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            foreignId: 'foreignId',
            projectId: 'projectId',
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
            contractAgreements: ['P1', 'P2', 'P3'],
            linkedContracts: ['L1', 'L2', 'L3'],
          };

          // Act
          server
            .post('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/import POST', function () {
        it('should give a 403', function (done) {
          // Act
          server
            .post('/contracts/import')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .attach('file', 'test/test-data/test_contract.xlsx')
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/export POST', function () {
        it('should return 200', function (done) {
          // Act
          server
            .post('/contracts/export')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ ids: [contract1._id] })
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });

        it('should call sendExport', function (done) {
          // Act
          server
            .post('/contracts/export')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ filter: {} })
            .end(function () {
              // Assert
              expect(sendExport.called).to.be.true;
              done();
            });
        });
      });

      describe('/:id/costs GET', function () {
        it('should return 200', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/costs`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });
      });

      describe('/:id/tracks GET', function () {
        it('should return 200', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/tracks`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.tracks).to.have.length(1);
              done();
            });
        });
      });

      describe('/:id/releases GET', function () {
        it('should return 200', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/releases`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.releases).to.have.length(1);
              done();
            });
        });
      });

      describe('/:id/transactions GET', function () {
        it('should return 200', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/transactions`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.transactions).to.have.length(1);
              done();
            });
        });
      });

      describe('/:id/future_transactions GET', function () {
        it('should return 200', function (done) {
          // Act
          server
            .get(`/contracts/${contract2._id}/future_transactions`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.transactions).to.have.length(1);
              done();
            });
        });
        describe('when the contract is Profit Share & there are reserve payments included', () => {
          it('should filter these out and not include them in the response', (done) => {
            // Arrange
            server
              .get(`/contracts/${contract4._id}/future_transactions`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.transactions).to.have.length(1);
                done();
              });
          });
        });
      });
      describe('/:id/works GET', function () {
        it('should return 200', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/works`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.works).to.have.length(1);
              done();
            });
        });
      });

      describe('/:id/upload_complete PUT', function () {
        // TODO: fix req.file issue
        it('should give a 403', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}/upload_complete`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ key: 'key' })
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });

      describe('/:id/file/:key DELETE', function () {
        it('should give a 403', function (done) {
          // Act
          server
            .delete(`/contracts/${contract1._id}/file/key-name`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(403);
              done();
            });
        });
      });
    });

    describe('as a user with Edit rights', function () {
      let userEdit;
      let token;

      beforeEach((done) => {
        userEdit = {
          id: user._id, internal: false, parentId: null, clientId: client._id, rights: {},
        };
        userEdit.rights[client._id] = {
          sales: 'Edit', contracts: 'Edit', periods: 'Edit', catalogue: 'Edit',
        };

        token = jwt.sign(userEdit, process.env.jsonSecretToken, { expiresIn: 86400 });

        done();
      });

      describe('/:id/flush_labels_to_catalogue GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.message).to.eq('Flushing contracts onto catalogue');
                done();
              });
          });

          it('should call matchContractToLabels', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function () {
                // Assert
                expect(matchContractToLabels.called);
                done();
              });
          });
        });
      });

      describe('/:id PUT', function () {
        it('should return 200', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ name: 'changedName' })
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });
      });

      describe('/ DELETE', function () {
        // @todo Resolve & Remove skip here
        it.skip('should return 200', function (done) {
          // Arrange
          const params = {
            ids: [contract2._id],
            type: 'single',
          };

          // Act
          server
            .delete('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });
      });

      describe('/ POST', function () {
        it('should return 200', function (done) {
          // Arrange
          const params = {
            clientId: client._id.toString(),
            name: 'name',
            type: 'type',
            active: true,
            foreignId: 'foreignId',
            projectId: 'projectId',
            licenseNo: 'licenseNo',
            currency: 'currency',
          };

          // Act
          server
            .post('/contracts')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send(params)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.clientId).to.eq(params.clientId);
              expect(res.body.name).to.eq(params.name);
              expect(res.body.type).to.eq(params.type);
              expect(res.body.active).to.eq(params.active);
              expect(res.body.foreignId).to.eq(params.foreignId);
              expect(res.body.projectId).to.eq(params.projectId);
              expect(res.body.licenseNo).to.eq(params.licenseNo);
              expect(res.body.currency).to.eq(params.currency);
              done();
            });
        });
      });

      describe('/import POST', function () {
        it('should give a 200', function (done) {
          // Act
          server
            .post('/contracts/import')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .attach('file', 'test/test-data/test_contract.xlsx')
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });
      });

      describe('/export POST', function () {
        it('should return 200', function (done) {
          // Act
          server
            .post('/contracts/export')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ ids: [contract1._id] })
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              done();
            });
        });

        it('should call sendExport', function (done) {
          // Act
          server
            .post('/contracts/export')
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ filter: {} })
            .end(function () {
              // Assert
              expect(sendExport.called).to.be.true;
              done();
            });
        });
      });

      describe('/:id/upload_complete PUT', function () {
        it.skip('should upload the file and save key to contract files', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}/upload`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ filename: 'filename', type: 'docx' })
            .end(function (err, res) {
              const fileKey = res.body.credentials.fields.key;
              server
                .put(`/contracts/${contract1._id}/upload_complete`)
                .set('applicationToken', applicationToken)
                .set('token', token)
                .send({ key: res.body.credentials.fields.key })
                .end(function (err, res) {
                  // Assert
                  expect(res.status).to.eq(200);
                  expect(res.body.files[0].key).to.eq(fileKey);
                  done();
                });
            });
        });
      });

      describe('/:id/file/:key DELETE', function () {
        it.skip('should delete the uploaded file', function (done) {
          // Act
          server
            .put(`/contracts/${contract1._id}/upload`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .send({ filename: 'filenamed', type: 'docx' })
            .end(function (err, res) {
              const fileKey = res.body.credentials.fields.key;
              const transformedKey = fileKey.replace(/\//g, '-');
              server
                .put(`/contracts/${contract1._id}/upload_complete`)
                .set('applicationToken', applicationToken)
                .set('token', token)
                .send({ key: fileKey })
                .end(function () {
                  server
                    .delete(`/contracts/${contract1._id}/file/${transformedKey}`)
                    .set('applicationToken', applicationToken)
                    .set('token', token)
                    .end(function (err, res) {
                      // Assert
                      expect(res.status).to.eq(200);
                      expect(res.body.files.length).to.eq(0);
                      done();
                    });
                });
            });
        });
      });

      describe('/:id/costs GET', function () {
        it('should return a contract costs and 200 status', function (done) {
          // Act
          server
            .get(`/contracts/${contract1._id}/costs`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.costs).to.have.length(1);
              done();
            });
        });
      });

      describe('/:id/tracks GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/tracks`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.tracks).to.have.length(1);
                done();
              });
          });
        });
      });

      describe('/:id/releases GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/releases`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.releases).to.have.length(1);
                done();
              });
          });
        });
      });
      describe('/:id/transactions GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/transactions`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.transactions).to.have.length(1);
                done();
              });
          });
        });
      });
      describe('/:id/future_transactions GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract2._id}/future_transactions`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.transactions).to.have.length(1);
                done();
              });
          });
          describe('when the contract is Profit Share & there are reserve payments included', () => {
            it('should filter these out and not include them in the response', (done) => {
              // Arrange
              server
                .get(`/contracts/${contract4._id}/future_transactions`)
                .set('applicationToken', applicationToken)
                .set('token', token)
                .end(function (err, res) {
                  // Assert
                  expect(res.status).to.eq(200);
                  expect(res.body.transactions).to.have.length(1);
                  done();
                });
            });
          });
        });
      });
      describe('/:id/works GET', function () {
        describe('when a contract is found', function () {
          it('should return a contract and 200 status', function (done) {
            // Act
            server
              .get(`/contracts/${contract1._id}/works`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .end(function (err, res) {
                // Assert
                expect(res.status).to.eq(200);
                expect(res.body.works).to.have.length(1);
                done();
              });
          });
        });
      });
    });
  });

  describe('as an internal user', function () {
    let token;
    beforeEach((done) => {
      token = jwt.sign({ internal: true, clientId: client._id.toString() }, process.env.jsonSecretToken, { expiresIn: 86400 });

      done();
    });

    describe('/:id GET', function () {
      it('should return a 200', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/flush_labels_to_catalogue GET', function () {
      it('should return a 200', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id PUT', function () {
      it('should return a 200', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });

      it('should not update the contract', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ name: 'Changed Title' })
          .end(function () {
            Contract.find({ _id: contract1._id })
              .then((newPayees) => {
                // Assert
                expect(newPayees[0].title).to.eq(contract1.title);
                done();
              })
              .catch((err) => {
                chai.assert.fail(err);
                done();
              });
          });
      });
    });

    describe('/ DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        // Arrange
        const params = {
          ids: [contract1._id],
          type: 'single',
        };
        // Act
        server
          .delete('/contracts')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send(params)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not delete the contract', function (done) {
        // Act
        server
          .delete(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function () {
            Contract.countDocuments({ _id: contract1._id }).then((count) => {
              // Assert
              expect(count).to.eq(1);
              done();
            })
              .catch(done);
          });
      });
    });

    describe('/ POST', function () {
      it('should return a 200 response', function (done) {
        // Act
        server
          .post('/contracts')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ name: 'Changed Title' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });

      it('should not create a contract', function (done) {
        // Act
        Contract.find({})
          .then((contracts) => {
            server
              .post('/contracts/')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ title: 'Changed Title' })
              .end(function () {
                // Assert
                Contract.countDocuments({})
                  .then((count) => {
                    expect(contracts.length).to.eq(count);
                    done();
                  })
                  .catch((err) => {
                    chai.assert.fail(err);
                    done();
                  });
              });
          })
          .catch((err) => {
            chai.assert.fail(err);
            done();
          });
      });
    });
    describe('/import POST', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .post('/contracts/import')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .attach('file', 'test/test-data/test_contract.xlsx')
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not import a contract', function (done) {
        // Act
        Contract.find({})
          .then((contracts) => {
            server
              .post('/contracts/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .attach('file', 'test/test-data/test_contract.xlsx')
              .end(function () {
                // Assert
                Contract.countDocuments({})
                  .then((count) => {
                    expect(contracts.length).to.eq(count);
                    done();
                  })
                  .catch((err) => {
                    chai.assert.fail(err);
                    done();
                  });
              });
          })
          .catch((err) => {
            chai.assert.fail(err);
            done();
          });
      });
    });

    describe('/export POST', function () {
      it('should return a 403', function (done) {
        // Act
        server
          .post('/contracts/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/costs GET', function () {
      it('should return a 200 response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/tracks GET', function () {
      it('should return a 200 response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/tracks`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Act
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/releases GET', function () {
      it('should return a 200 response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/releases`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/transactions GET', function () {
      it('should return a 200 response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/transactions`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/future_transactions GET', function () {
      it('should return a 200 response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/future_transactions`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
      describe('when the contract is Profit Share & there are reserve payments included', () => {
        it('should filter these out and not include them in the response', (done) => {
          // Arrange
          server
            .get(`/contracts/${contract4._id}/future_transactions`)
            .set('applicationToken', applicationToken)
            .set('token', token)
            .end(function (err, res) {
              // Assert
              expect(res.status).to.eq(200);
              expect(res.body.transactions).to.have.length(1);
              done();
            });
        });
      });
    });

    describe('/:id/works GET', function () {
      it('should return a 200 response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/works`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/upload_complete PUT', function () {
      it('should give a 200', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}/upload_complete`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ key: 'key' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/file/:key DELETE', function () {
      it('should give a 200', function (done) {
        // Act
        server
          .delete(`/contracts/${contract1._id}/file/key-name`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });
  });

  describe('as a parent user without a client', function () {
    let token;
    beforeEach((done) => {
      token = jwt.sign({ internal: false, parentId: 'parentId' }, process.env.jsonSecretToken, { expiresIn: 86400 });
      done();
    });

    describe('/:id GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/flush_labels_to_catalogue GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/flush_labels_to_catalogue`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not update the contract', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' })
          .end(function () {
            Contract.find({ _id: contract1._id })
              .then((newPayees) => {
                // Assert
                expect(newPayees[0].title).to.eq(contract1.title);
                done();
              })
              .catch((err) => {
                chai.assert.fail(err);
                done();
              });
          });
      });
    });

    describe('/:id DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        // Arrange
        const params = {
          ids: [contract1._id],
          type: 'single',
        };
        // Act
        server
          .delete('/contracts')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send(params)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not delete the contract', function (done) {
        // Act
        server
          .delete(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function () {
            Contract.countDocuments({ _id: contract1._id }).then((count) => {
              // Assert
              expect(count).to.eq(1);
              done();
            })
              .catch(done);
          });
      });
    });

    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .post('/contracts')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not create a contract', function (done) {
        // Act
        Contract.find({})
          .then((contracts) => {
            const id = contracts[0]._id;
            server
              .post(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ title: 'Changed Title' })
              .end(function () {
                Contract.countDocuments({})
                  .then((count) => {
                    // Assert
                    expect(contracts.length).to.eq(count);
                    done();
                  })
                  .catch((err) => {
                    chai.assert.fail(err);
                    done();
                  });
              });
          })
          .catch((err) => {
            chai.assert.fail(err);
            done();
          });
      });
    });

    describe('/import POST', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .post('/contracts/import')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .attach('file', 'test/test-data/test_contract.xlsx')
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not import a contract', function (done) {
        // Act
        Contract.find({})
          .then((contracts) => {
            server
              .post('/contracts/import')
              .set('applicationToken', applicationToken)
              .set('token', token)
              .attach('file', 'test/test-data/test_contract.xlsx')
              .end(function () {
                Contract.countDocuments({})
                  .then((count) => {
                    // Assert
                    expect(contracts.length).to.eq(count);
                    done();
                  })
                  .catch((err) => {
                    chai.assert.fail(err);
                    done();
                  });
              });
          })
          .catch((err) => {
            chai.assert.fail(err);
            done();
          });
      });
    });

    describe('/export POST', function () {
      it('should return a 403', function (done) {
        // Act
        server
          .post('/contracts/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/costs GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/tracks GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/tracks`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/releases GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/releases`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/transactions GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/transactions`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/future_transactions GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/future_transactions`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/works GET', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/works`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });
    });

    describe('/:id/upload_complete PUT', function () {
      it('should give a 403', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}/upload_complete`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ key: 'key' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });

    describe('/:id/file/:key DELETE', function () {
      it('should give a 403', function (done) {
        // Act
        server
          .delete(`/contracts/${contract1._id}/file/key-name`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });
  });

  describe.skip('as a payee user', function () {
    const contractId = new ObjectId();
    const contractIds = [contractId, new ObjectId()];
    let payee;
    let token;

    beforeEach(function (done) {
      async.series([
        async function () {
          payee = new Payee({ name: testUtils.randomString(), clientId: client._id });
          await payee.save();
        },
        function (callback) {
          token = jwt.sign({
            internal: false, parentId: null, payeeId: payee._id, contractIds,
          }, process.env.jsonSecretToken, { expiresIn: 86400 });
          callback();
        },
        async function () {
          contract1.payees = [{ payeeId: payee._id.toString(), percentage: 100 }];
          await contract1.save();
        },
      ], done);
    });

    describe('/:id PUT', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ name: 'Changed Title', salesTerms: [], deductionsTerms: [], mechanicalTerms: [], withholdingTaxTerms: [], costsTerms: [] })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not update the contract', function (done) {
        // Act
        Contract.find({})
          .then((contracts) => {
            const id = contracts[0]._id;
            server
              .put(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ name: 'Changed Title' })
              .end(function () {
              // Assert
                Contract.find({ _id: contracts[0]._id })
                  .then((newPayees) => {
                    expect(newPayees[0].name).to.eq(contracts[0].name);
                    done();
                  })
                  .catch((err) => {
                    chai.assert.fail(err);
                    done();
                  });
              });
          })
          .catch((err) => {
            chai.assert.fail(err);
            done();
          });
      });
    });

    describe('/ DELETE', function () {
      it('should return a 403 forbidden response', function (done) {
        // Arrange
        const params = {
          ids: [contract1._id],
          type: 'single',
        };
        // Act
        server
          .delete('/contracts')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send(params)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not delete the contract', function (done) {
        // Act
        server
          .delete(`/contracts/${contract1._id}`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function () {
            Contract.countDocuments({ _id: contract1._id }, function (err, count) {
              // Assert
              expect(count).to.eq(1);
              done();
            });
          });
      });
    });

    describe('/ POST', function () {
      it('should return a 403 forbidden response', function (done) {
        // Act
        server
          .post('/contracts')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ title: 'Changed Title' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            expect(res.body.message).to.eq('Forbidden');
            done();
          });
      });

      it('should not create a contract', function (done) {
        // Act
        Contract.find({})
          .then((contracts) => {
            const id = contracts[0]._id;
            server
              .post(`/contracts/${id}`)
              .set('applicationToken', applicationToken)
              .set('token', token)
              .send({ title: 'Changed Title' })
              .end(function () {
                // Assert
                Contract.countDocuments({})
                  .then((count) => {
                    expect(contracts.length).to.eq(count);
                    done();
                  })
                  .catch((err) => {
                    chai.assert.fail(err);
                    done();
                  });
              });
          })
          .catch((err) => {
            chai.assert.fail(err);
            done();
          });
      });
    });

    describe('/import POST', function () {
      it('should return 403', function (done) {
        // Act
        server
          .post('/contracts/import')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .attach('file', 'test/test-data/test_contract.xlsx')
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });

    describe('/export POST', function () {
      it('should return 403', function (done) {
        // Act
        server
          .post('/contracts/export')
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });

    describe('/:id/costs GET', function () {
      it('should return a list of costs', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/costs`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/tracks GET', function () {
      it('should return 403 error', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/tracks`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });

    describe('/:id/releases GET', function () {
      it('should return a 403 error', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/releases`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });

    describe('/:id/transactions GET', function () {
      it('should return a list of transactions', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/transactions`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });
    describe('/:id/future_transactions GET', function () {
      it('should return a list of transactions', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/future_transactions`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(200);
            done();
          });
      });
    });

    describe('/:id/works GET', function () {
      it('should return a 403 error', function (done) {
        // Act
        server
          .get(`/contracts/${contract1._id}/works`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });

    describe('/:id/upload_complete PUT', function () {
      it('should give a 403', function (done) {
        // Act
        server
          .put(`/contracts/${contract1._id}/upload_complete`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .send({ key: 'key' })
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });
    describe('/:id/file/:key DELETE', function () {
      it('should give a 403', function (done) {
        // Act
        server
          .delete(`/contracts/${contract1._id}/file/key-name`)
          .set('applicationToken', applicationToken)
          .set('token', token)
          .end(function (err, res) {
            // Assert
            expect(res.status).to.eq(403);
            done();
          });
      });
    });
  });
});
