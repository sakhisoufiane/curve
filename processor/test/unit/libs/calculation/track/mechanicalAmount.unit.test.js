const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId, randomInt } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

logger.info('\n\n**** .test/unit/libs/calculation/track/mechanicalAmount.unit.test.js');

const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

describe('contractsForCostsCalculation unit tests', () => {
  let MechanicalAmount;
  let track;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    MechanicalAmount = rewire('../../../../../libs/calculation/track/mechanicalAmount');
    track = { _id: randomId() };
    done();
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  describe('#get', () => {
    describe('when no track.reportMechanicals', () => {
      it('should return { US: 0, CA: 0, duration, mechanicalCalculationBasis }', (done) => {
        // Arrange
        track.reportMechanicals = false;
        track.duration = randomInt();
        track.mechanicalCalculationBasis = randomString();
        const expectedResult = {
          US: 0,
          CA: 0,
          duration: track.duration,
          mechanicalCalculationBasis: track.mechanicalCalculationBasis,
        };
        // Act
        MechanicalAmount.get(track, (err, result) => {
          // Assert
          expect(result).to.deep.eq(expectedResult);
          done();
        });
      });
    });

    describe('when track.reportMechanicals', () => {
      describe('when no track.mechanicalLicenses', () => {
        it('should use use 100% of stat rate', (done) => {
          // Arrange
          track.reportMechanicals = true;
          track.mechanicalLicenses = [];
          track.statutoryRate = randomInt();
          track.canadianStatutoryRate = randomInt();
          track.duration = randomInt();
          track.mechanicalCalculationBasis = randomString();
          const expectedResult = {
            US: track.statutoryRate,
            CA: track.canadianStatutoryRate,
            duration: track.duration,
            mechanicalCalculationBasis: track.mechanicalCalculationBasis,
            reportMechanicals: true,
          };
          // Act
          MechanicalAmount.get(track, (err, result) => {
            // Assert
            expect(result).to.deep.eq(expectedResult);
            done();
          });
        });
      });
      describe('when track.mechanicalLicenses', () => {
        it('should return the right rates', (done) => {
          // Arrange
          track.reportMechanicals = true;
          track.statutoryRate = randomInt();
          track.canadianStatutoryRate = randomInt();
          track.duration = randomInt();
          track.mechanicalCalculationBasis = randomString();
          track.mechanicalLicenses = [
            { rate: randomInt() },
            { rate: randomInt() },
          ];

          const multiplierSum = (parseFloat(track.mechanicalLicenses[0].rate) + parseFloat(track.mechanicalLicenses[1].rate)) / 100;

          const expectedResult = {
            US: track.statutoryRate,
            CA: track.canadianStatutoryRate,
            duration: track.duration,
            licenseCount: track.mechanicalLicenses.length,
            mechanicalCalculationBasis: track.mechanicalCalculationBasis,
            multiplierSum,
            reportMechanicals: true,
          };
          // Act
          MechanicalAmount.get(track, (err, result) => {
            // Assert
            expect(result).to.deep.eq(expectedResult);
            done();
          });
        });

        describe('when multiplierSum is 0', () => {
          it('should return the right rates', (done) => {
            // Arrange
            track.reportMechanicals = true;
            track.statutoryRate = randomInt();
            track.canadianStatutoryRate = randomInt();
            track.duration = randomInt();
            track.mechanicalCalculationBasis = randomString();
            track.mechanicalLicenses = [
              { rate: 0 },
              { rate: 0 },
            ];

            const expectedResult = {
              US: track.statutoryRate,
              CA: track.canadianStatutoryRate,
              duration: track.duration,
              licenseCount: 0,
              mechanicalCalculationBasis: track.mechanicalCalculationBasis,
              multiplierSum: 0,
              reportMechanicals: true,
            };
            // Act
            MechanicalAmount.get(track, (err, result) => {
              // Assert
              expect(result).to.deep.eq(expectedResult);
              done();
            });
          });
        });
      });
    });
  });
});
