const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/allCostsCsv.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { MongoClient } = require('mongodb');

const Client = require('../../../../../models/client');
const Period = require('../../../../../models/period');
const Notification = require('../../../../../models/notification');

describe('allCostsCsv unit tests', () => {
  let AllCostsCsv;
  let period; let client; let email;
  let mongoDb; let mongoClient; let mongoDBName; let mongoUrl; let mongoConnectOpts;
  let bigQuery; let getBigQueryOpts;
  let fileManager; let s3Key; let publicKey;
  let config;
  let moment; let momentDate;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    AllCostsCsv = rewire('../../../../../libs/calculation/period/allCostsCsv');

    period = new Period({
      _id: randomId(),
      name: randomString(),
      clientId: randomId(),
    });

    email = randomString();

    client = {
      _id: randomId(),
      name: randomString(),
      bigQueryPeriodCosts: randomString(),
    };

    sinon.stub(Client, 'findById');
    Client.findById.resolves(client);

    mongoDb = { name: randomString() };
    mongoClient = {
      db: sinon.stub().returns(mongoDb),
      close: sinon.stub().returns(),
    };

    sinon.stub(MongoClient, 'connect').resolves(mongoClient);

    mongoDBName = randomString();
    mongoUrl = randomString();
    mongoConnectOpts = randomString();
    getBigQueryOpts = randomString();
    sinon.stub(databaseUtils, 'getMongoDBName').returns(mongoDBName);
    sinon.stub(databaseUtils, 'getMongoUrl').returns(mongoUrl);
    sinon.stub(databaseUtils, 'getMongoConnectOpts').returns(mongoConnectOpts);
    sinon.stub(databaseUtils, 'getBigQueryOpts').returns(getBigQueryOpts);

    bigQuery = randomString();
    AllCostsCsv.__set__('BigQuery', sinon.stub().returns(bigQuery));

    publicKey = randomString();
    fileManager = { publicLink24Hours: sinon.stub().yields(null, publicKey) };
    AllCostsCsv.__set__('fileManager', fileManager);

    s3Key = randomString();
    AllCostsCsv.__set__('writeCsv', sinon.stub().yields(null, s3Key));

    sinon.stub(Notification, 'generate');
    Notification.generate.yields();

    config = {
      exportTemplates: {
        costs: [randomString(), randomString()],
      },
    };
    AllCostsCsv.__set__('config', config);

    momentDate = randomDate();
    moment = sinon.stub().returns({ format: sinon.stub().returns(momentDate) });
    AllCostsCsv.__set__('moment', moment);
    AllCostsCsv.__set__('config', config);

    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('create', () => {
    it('should call MongoClient.connect with the right args', (done) => {
      // Arrange
      MongoClient.connect.resolves(randomString());
      // Act
      AllCostsCsv.create(period, email, () => {
        // Assert
        expect(MongoClient.connect.calledWith(mongoUrl, mongoConnectOpts)).to.be.true;
        done();
      });
    });

    describe('when MongoClient.connect returns an error', () => {
      it('should not call mongoClient.db', (done) => {
        // Arrange
        MongoClient.connect.resolves(randomString());
        // Act
        AllCostsCsv.create(period, email, () => {
          // Assert
          expect(mongoClient.db.called).to.be.false;
          done();
        });
      });
    });

    describe('when MongoClient.connect returns a client', () => {
      it('should call mongoClient.db with the right args', (done) => {
        // Act
        AllCostsCsv.create(period, email, () => {
          // Assert
          expect(mongoClient.db.calledWith(mongoDBName)).to.be.true;
          done();
        });
      });

      it('should call Client.findById with the right args', (done) => {
        // Act
        AllCostsCsv.create(period, email, () => {
          // Assert
          expect(Client.findById.calledWith(period.clientId)).to.be.true;
          done();
        });
      });

      describe('when Client.findById returns an error', () => {
        it('should not call BigQuery', () => {
          // Arrange
          Client.findById.rejects(randomString());
          // Act
          AllCostsCsv.create(period, email, () => {
            // Assert
            expect(AllCostsCsv.__get__('BigQuery').called).to.be.false;
          });
        });
      });

      describe('when Client.findById returns a client', () => {
        it('should call BigQuery with the right args', (done) => {
          // Act
          AllCostsCsv.create(period, email, () => {
            // Assert
            expect(AllCostsCsv.__get__('BigQuery').calledWith(getBigQueryOpts)).to.be.true;
            done();
          });
        });

        it('should call writeCsv with the right args', (done) => {
          // Arrange
          const s3AccessKey = randomString();
          const s3SecretKey = randomString();
          const s3Region = randomString();
          const s3Bucket = randomString();
          process.env.S3_access_key = s3AccessKey;
          process.env.S3_secret_key = s3SecretKey;
          process.env.S3_region = s3Region;
          process.env.S3_bucket = s3Bucket;
          // Act
          AllCostsCsv.create(period, email, () => {
            // Assert
            const object = AllCostsCsv.__get__('writeCsv').args[0][0];
            expect(object.db).to.eq(mongoDb);
            expect(object.databaseTable).to.eq(client.bigQueryPeriodCosts);
            expect(object.filter).to.deep.eq({ periodId: period._id.toString() });
            expect(object.template).to.deep.eq(config.exportTemplates.costs);
            expect(object.noConsolidation).to.be.true;
            expect(object.s3WriteKey).to.eq(`periods/${period._id.toString()}/${period.name} All Calculated Costs Export ${moment().format('YYYYMMDDHHmmSSssss')}.csv`);
            expect(object.s3AccessKey).to.eq(s3AccessKey);
            expect(object.s3SecretKey).to.eq(s3SecretKey);
            expect(object.s3Region).to.eq(s3Region);
            expect(object.s3Bucket).to.eq(s3Bucket);
            expect(object.bigQuery).to.exist;
            done();
          });
        });

        describe('when writeCsv returns an error', () => {
          let expectedError;
          beforeEach((done) => {
            expectedError = randomString();
            AllCostsCsv.__get__('writeCsv').yields(expectedError);
            done();
          });

          it('should call mongoClient.close', (done) => {
            // Act
            AllCostsCsv.create(period, email, () => {
              // Assert
              expect(mongoClient.close.called).to.be.true;
              done();
            });
          });

          it('should return the error to the callback', (done) => {
            // Act
            AllCostsCsv.create(period, email, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });

        describe('when writeCsv returns an s3', () => {
          it('should call mongoClient.close', (done) => {
            // Act
            AllCostsCsv.create(period, email, () => {
              // Assert
              expect(mongoClient.close.called).to.be.true;
              done();
            });
          });

          it('should call fileManager.publicLink24Hours with the right args', (done) => {
            // Act
            AllCostsCsv.create(period, email, () => {
              // Assert
              expect(fileManager.publicLink24Hours.calledWith(s3Key)).to.be.true;
              done();
            });
          });

          it('should call Notification.generate with the right args', (done) => {
            // Arrange
            const expectedSubject = `Your All Costs Export for ${period.name} is Ready for Download`;
            const expectedGenerateOptions = {
              identifier: 'reportDownload',
              client,
              subject: expectedSubject,
              email,
              link: publicKey,
            };
            // Act
            AllCostsCsv.create(period, email, () => {
              // Assert
              expect(Notification.generate.calledWith('All Costs Export Ready', expectedSubject, publicKey, expectedGenerateOptions)).to.be.true;
              done();
            });
          });
        });
      });
    });
  });
});
