const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/period/calculateCosts.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const Period = require('../../../../../models/period');
const Cost = require('../../../../../models/cost');
const Contract = require('../../../../../models/contract');
const Release = require('../../../../../models/release');
const Track = require('../../../../../models/track');
const Client = require('../../../../../models/client');

describe('CalculateCosts Unit Tests', () => {
  let CalculateCosts;
  let period; let client; let contracts;
  let db; let bigQuery;
  let catalogueOverwritingDataGet; let catalogueData;
  let cost;
  before(() => {
    sinon.restore();
  });

  beforeEach(() => {
    CalculateCosts = rewire('../../../../../libs/calculation/period/calculateCosts');

    catalogueData = [{ _id: randomId() }];
    catalogueOverwritingDataGet = sinon.stub().yields(null, catalogueData);
    CalculateCosts.__set__('CatalogueOverwritingData', { get: catalogueOverwritingDataGet });

    CalculateCosts.__set__('runCostCalculations', sinon.stub());
    CalculateCosts.__get__('runCostCalculations').yields();

    period = {
      _id: randomId(),
      name: randomString(),
      clientId: randomId(),
      costIds: [randomId(), randomId()],
      recalculation: {
        salesFiles: [randomString(), randomString()],
        contractIds: [randomString(), randomString()],
      },
    };
    sinon.stub(Period, 'findById').resolves(period);

    client = new Client({ _id: randomId(), name: randomString() });

    contracts = [
      { _id: randomId(), name: randomString() },
    ];
    sinon.stub(Contract, 'find');

    Contract.find.resolves(contracts);

    db = { name: randomString() };
    bigQuery = {
      setupFile: sinon.stub().yields(),
      writeFileToDb: sinon.stub().yields(),
    };
    CalculateCosts.__set__('BigQuery', bigQuery);

    cost = new Cost({ name: randomString(), _id: randomId(), type: randomString() });
    sinon.stub(Cost, 'find').resolves([cost]);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#calculate', () => {
    beforeEach(() => {
      sinon.stub(CalculateCosts, 'recalculateCosts').yields();
      sinon.stub(CalculateCosts, 'calculateFullCosts').yields();
    });

    describe('when no costIds', () => {
      beforeEach(() => {
        period.costIds = [];
      });

      it('should not call recalculateCosts', (done) => {
        // Act
        CalculateCosts.calculate(period, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.recalculateCosts.called).to.be.false;
          done();
        });
      });

      it('should not call calculateFullCosts', (done) => {
        // Act
        CalculateCosts.calculate(period, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.calculateFullCosts.called).to.be.false;
          done();
        });
      });
    });

    describe('when salesFiles and no contractIds', () => {
      beforeEach(() => {
        period.recalculation = {
          salesFiles: [randomString(), randomString()],
          contractIds: null,
        };
      });

      it('should not call recalculateCosts', (done) => {
        // Act
        CalculateCosts.calculate(period, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.recalculateCosts.called).to.be.false;
          done();
        });
      });

      it('should not call calculateFullCosts', (done) => {
        // Act
        CalculateCosts.calculate(period, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.calculateFullCosts.called).to.be.false;
          done();
        });
      });
    });

    describe('when recalculation.contractIds.length > 0', () => {
      it('should call recalculateCosts with the right args', (done) => {
        // Arrange
        period.recalculation = {
          salesFiles: [randomString(), randomString()],
          contractIds: [randomString(), randomString()],
        };
        // Act
        CalculateCosts.calculate(period, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.recalculateCosts.called).to.be.true;
          expect(CalculateCosts.calculateFullCosts.called).to.be.false;
          done();
        });
      });
    });
    describe('when recalculation.contractIds.length = 0', () => {
      it('should call calculateFullCosts with the right args', (done) => {
        // Arrange
        period.recalculation = {
          salesFiles: [randomString(), randomString()],
          contractIds: [],
        };
        // Act
        CalculateCosts.calculate(period, db, bigQuery, client, () => {
          // Assert
          expect(CalculateCosts.recalculateCosts.called).to.be.false;
          expect(CalculateCosts.calculateFullCosts.called).to.be.true;
          done();
        });
      });
    });
  });

  describe('#recalculateCosts', () => {
    let releaseDistinctValues; let trackDistinctValues;
    beforeEach(() => {
      releaseDistinctValues = [randomId(), randomId()];
      trackDistinctValues = [randomId(), randomId()];
      sinon.stub(Release, 'distinct').resolves(releaseDistinctValues);
      sinon.stub(Track, 'distinct').resolves(trackDistinctValues);
    });

    it('should call Period.findById with the right args', (done) => {
      // Arrange
      Contract.find.resolves(randomString());
      // Act
      CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
        // Assert
        expect(Period.findById.calledWith(period._id)).to.be.true;
        done();
      });
    });

    describe('when Contract.find returns an error', () => {
      it('should call return the error to the callback', () => {
        // Arrange
        const expectedError = randomString();
        Contract.find.rejects(expectedError);
        // Act
        CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
          // Assert
          expect(err).to.eq(expectedError);
        });
      });
    });

    describe('when Contract.find returns', () => {
      it('should call CatalogueOverwritingData with the rights args', (done) => {
        // Arrange
        catalogueOverwritingDataGet.yields(randomString());
        // Act
        CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
          // Assert
          expect(catalogueOverwritingDataGet.calledWith(client, { joinArraysToString: true })).to.be.true;
          done();
        });
      });

      it('should call Release.distinct with the rights args', (done) => {
        // Arrange
        Release.distinct.resolves(randomString());
        // Act
        CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
          // Assert
          expect(Release.distinct.calledWith('_id', { clientId: period.clientId, 'costsRights.contractId': contracts[0]._id })).to.be.true;
          done();
        });
      });

      describe('when Release.distinct returns an error', () => {
        it('should call return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          Release.distinct.rejects(expectedError);
          // Act
          CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
          });
        });
      });

      describe('when Release.distinct returns distinct values', () => {
        it('should add the distinct values to affectedReleaseIds', (done) => {
          // Arrange
          Cost.find.resolves(randomString());
          // Act
          CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
            // Assert
            expect(Release.distinct.calledWith('_id', { clientId: period.clientId, 'costsRights.contractId': contracts[0]._id })).to.be.true;
            done();
          });
        });
      });

      it('should call Track.distinct with the rights args', (done) => {
        // Arrange
        Cost.find.resolves(randomString());
        // Act
        CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
          // Assert
          expect(Track.distinct.calledWith('_id', { clientId: period.clientId, 'costsRights.contractId': contracts[0]._id })).to.be.true;
          done();
        });
      });

      describe('when Release.distinct returns an error', () => {
        it('should call return the error to the callback', () => {
          // Arrange
          const expectedError = randomString();
          Release.distinct.rejects(expectedError);
          // Act
          CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
          });
        });
      });

      describe('when Track.distinct returns distinct values', () => {
        it('should add the distinct values to affectedTrackIds', () => {
          // Arrange
          const expectedError = randomString();
          Track.distinct.rejects(expectedError);
          // Act
          CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
          });
        });
      });

      it('should call bigQuery.setupFile', (done) => {
        // Act
        CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
          // Assert
          expect(bigQuery.setupFile.called).to.be.true;
          done();
        });
      });

      describe('when bigQuery.setupFile returns an error', () => {
        it('should call return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          bigQuery.setupFile.yields(expectedError);
          // Act
          CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
            // Assert
            expect(bigQuery.setupFile.called).to.be.true;
            done();
          });
        });
      });

      describe('when bigQuery.setupFile returns', () => {
        it('should call Cost.find with the right args', (done) => {
          // Arrange
          const expectedArgs = {
            clientId: period.clientId,
            _id: { $in: period.costIds.map((id) => ObjectId.createFromHexString(id)) }, // can we get more granular here ... probably not
            $or: [
              { contractIds: { $in: [contracts[0]._id] } },
              { releaseIds: { $in: releaseDistinctValues } },
              { trackIds: { $in: trackDistinctValues } },
            ],
          };
          // Act
          CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
            // Assert
            expect(Cost.find.calledWith(expectedArgs)).to.be.true;
            done();
          });
        });

        describe('when Cost.find returns an error', () => {
          it('should call return the error to the callback', () => {
            // Arrange
            const expectedError = randomString();
            Cost.find.rejects(expectedError);
            // Act
            CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
            });
          });
        });

        describe('when Cost.find returns', () => {
          it('should call call runCostCalculations with the right args', (done) => {
            // Act
            CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
              // Assert
              expect(CalculateCosts.__get__('runCostCalculations').calledWith(cost, db, bigQuery, client, period, catalogueData, null)).to.be.true;
              done();
            });
          });

          describe('when runCostCalculations returns an error', () => {
            it('should call return the error to the callback', (done) => {
              // Arrange
              const expectedError = randomString();
              CalculateCosts.__get__('runCostCalculations').yields(expectedError);
              // Act
              CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
                // Assert
                expect(err).to.eq(expectedError);
                done();
              });
            });
          });

          describe('when runCostCalculations returns', () => {
            it('should call bigQuery.writeFileToDb with the right args', (done) => {
              // Act
              CalculateCosts.recalculateCosts(period, db, bigQuery, client, () => {
                // Assert
                expect(bigQuery.writeFileToDb.called).to.be.true;
                done();
              });
            });

            describe('when bigQuery.writeFileToDb returns an error', () => {
              it('should call return the error to the callback', (done) => {
                // Arrange
                const expectedError = randomString();
                bigQuery.writeFileToDb.yields(expectedError);
                // Act
                CalculateCosts.recalculateCosts(period, db, bigQuery, client, (err) => {
                  // Assert
                  expect(err).to.eq(expectedError);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('#calculateFullCosts', () => {
    let sortStub; let limitStub; let skipStub;

    beforeEach(() => {
      skipStub = sinon.stub().resolves([cost]);
      limitStub = sinon.stub().returns({ skip: skipStub });
      sortStub = sinon.stub().returns({ limit: limitStub });
      Cost.find.returns({ sort: sortStub });
    });

    it('should call Period.findById with the right args', (done) => {
      // Arrange
      Period.findById.resolves(randomString());
      // Act
      CalculateCosts.calculateFullCosts(period, db, bigQuery, client, () => {
        // Assert
        expect(Period.findById.calledWith(period._id)).to.be.true;
        done();
      });
    });

    describe('when no costIds', () => {
      it('should not call CatalogueOverwritingData', (done) => {
        // Arrange
        period.costIds = [];
        // Act
        CalculateCosts.calculateFullCosts(period, db, bigQuery, client, () => {
          // Assert
          expect(catalogueOverwritingDataGet.called).to.be.false;
          done();
        });
      });
    });

    describe('when costIds are passed', () => {
      it('should call CatalogueOverwritingData with the right args', (done) => {
        // Arrange
        catalogueOverwritingDataGet.yields(randomString());
        // Act
        CalculateCosts.calculateFullCosts(period, db, bigQuery, client, () => {
          // Assert
          expect(catalogueOverwritingDataGet.calledWith(client, { joinArraysToString: true })).to.be.true;
          done();
        });
      });

      describe('when CatalogueOverwritingData returns an error', () => {
        it('should call return the error to the callback', (done) => {
          // Arrange
          const expectedError = randomString();
          catalogueOverwritingDataGet.yields(expectedError);
          // Act
          CalculateCosts.calculateFullCosts(period, db, bigQuery, client, (err) => {
            // Assert
            expect(err).to.eq(expectedError);
            done();
          });
        });
      });

      describe('when CatalogueOverwritingData returns', () => {
        it('should call bigQuery.setupFile with the right args', (done) => {
          // Arrange
          bigQuery.setupFile.yields(randomString());
          // Act
          CalculateCosts.calculateFullCosts(period, db, bigQuery, client, () => {
            // Assert
            expect(bigQuery.setupFile.called).to.be.true;
            done();
          });
        });

        describe('when bigQuery.setupFile returns an error', () => {
          it('should call return the error to the callback', (done) => {
            // Arrange
            const expectedError = randomString();
            bigQuery.setupFile.yields(expectedError);
            // Act
            CalculateCosts.calculateFullCosts(period, db, bigQuery, client, (err) => {
              // Assert
              expect(err).to.eq(expectedError);
              done();
            });
          });
        });

        describe('when bigQuery.setupFile returns', () => {
          it('should call Cost.find with the right args', (done) => {
            // Act
            CalculateCosts.calculateFullCosts(period, db, bigQuery, client, () => {
              // Assert
              expect(Cost.find.calledWith({ _id: { $in: period.costIds } })).to.be.true;
              expect(sortStub.calledWith({ _id: 1 })).to.be.true;
              expect(limitStub.calledWith(1000)).to.be.true;
              expect(skipStub.calledWith(0)).to.be.true;
              done();
            });
          });

          describe('when Cost.find returns an error', () => {
            it('should call return the error to the callback', () => {
              // Arrange
              const expectedError = randomString();
              skipStub.rejects(expectedError);
              // Act
              CalculateCosts.calculateFullCosts(period, db, bigQuery, client, (err) => {
                // Assert
                expect(err).to.eq(expectedError);
              });
            });
          });

          describe('when Cost.find returns', () => {
            it('should call runCostCalculations with the args', (done) => {
              // Act
              CalculateCosts.calculateFullCosts(period, db, bigQuery, client, () => {
                // Assert
                expect(CalculateCosts.__get__('runCostCalculations').calledWith(cost, db, bigQuery, client, period, catalogueData, null)).to.be.true;
                done();
              });
            });

            describe('when runCostCalculations returns an error', () => {
              it('should call return the error to the callback', (done) => {
                // Arrange
                const expectedError = randomString();
                CalculateCosts.__get__('runCostCalculations').yields(expectedError);
                // Act
                CalculateCosts.calculateFullCosts(period, db, bigQuery, client, (err) => {
                  // Assert
                  expect(err).to.eq(err);
                  done();
                });
              });
            });

            describe('when runCostCalculations returns', () => {
              it('should call bigQuery.writeFileToDb with the right args', (done) => {
                // Act
                CalculateCosts.calculateFullCosts(period, db, bigQuery, client, () => {
                  // Assert
                  expect(bigQuery.writeFileToDb.called).to.be.true;
                  done();
                });
              });

              describe('when bigQuery.writeFileToDb returns an error', () => {
                it('should call return the error to the callback', (done) => {
                  // Arrange
                  const expectedError = randomString();
                  bigQuery.writeFileToDb.yields(expectedError);
                  // Act
                  CalculateCosts.calculateFullCosts(period, db, bigQuery, client, (err) => {
                    // Assert
                    expect(err).to.eq(err);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
