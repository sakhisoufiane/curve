process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const async = require('async');
const sinon = require('sinon');
const UnmappedRelease = require('../../../models/unmappedRelease');
const Release = require('../../../models/release');

describe('UnmappedReleases', () => {
  logger.info('::::file:::: unit/models/unmappedReleases .....................');

  let clientId;
  let unmappedReleaseFields;
  let unmappedRelease1;

  before((done) => {
    sinon.restore();
    done();
  });

  beforeEach((done) => {
    async.series([
      (cb) => {
        // Set up Stubs
        clientId = testUtils.randomId();
        cb();
      },
      (cb) => {
        unmappedReleaseFields = {
          clientId,
          salesFileId: testUtils.randomId(),
          title: testUtils.randomString(),
          version: testUtils.randomString(),
          catNo: testUtils.randomISWC(),
          barcode: testUtils.randomISWC(),
          releaseId: testUtils.randomId(),
          complete: testUtils.randomBoolean(),
        };
        unmappedRelease1 = new UnmappedRelease(unmappedReleaseFields);
        cb();
      },
      (cb) => {
        sinon.restore();
        cb();
      },
    ], done);
  });

  afterEach((done) => {
    sinon.restore();
    done();
  });

  after((done) => {
    sinon.restore();
    done();
  });

  describe('checkForCompletion', () => {
    describe('when unmappedRelease.releaseId contains value & no previousUnmappedRelease was found', () => {
      beforeEach((done) => {
        sinon.stub(UnmappedRelease.prototype, 'save').resolves(unmappedRelease1);
        done();
      });
      it('should update complete status', async () => {
        // Arrange
        const release = new Release();
        sinon.stub(Release, 'findById').resolves(release);
        sinon.stub(Release.prototype, 'save').resolves(release);

        // Act
        await unmappedRelease1.checkForCompletion(null);
        // Assert
        expect(unmappedRelease1.complete).to.eq(true);
      });
      it('should map umappedRelease catNo as an alias to the specified release', async () => {
        // Arrange
        const release = new Release();
        sinon.stub(Release, 'findById').resolves(release);
        sinon.stub(Release.prototype, 'save').resolves(release);

        // Act
        await unmappedRelease1.checkForCompletion(null);
        // Assert
        expect(unmappedRelease1.catNo).to.eq(release.aliases[0]);
      });
      it('should map umappedRelease barcode as an alias to the specified release', async () => {
        // Arrange
        const release = new Release();
        unmappedRelease1.catNo = null;
        sinon.stub(Release, 'findById').resolves(release);
        sinon.stub(Release.prototype, 'save').resolves(release);

        // Act
        await unmappedRelease1.checkForCompletion(null);
        // Assert
        expect(unmappedRelease1.barcode).to.eq(release.aliases[0]);
      });
    });

    describe('if previousunmappedRelease.releaseId is different to currentUnmappedReleaseId', () => {
      let previousunmappedRelease;
      beforeEach((done) => {
        previousunmappedRelease = new UnmappedRelease({ releaseId: testUtils.randomId() });
        done();
      });
      it('checkPreviousReleaseAliases should be called', async () => {
        // Arrange
        sinon.stub(UnmappedRelease.prototype, 'checkPreviousReleaseAliases').resolves(null);

        // Act
        await unmappedRelease1.checkForCompletion(previousunmappedRelease);
        // Assert
        expect(unmappedRelease1.checkPreviousReleaseAliases.called).to.equal(true);
      });
    });

    describe('checkPreviousReleaseAliases', () => {
      describe('if the current unmappedRelease does not contain a releaseId', () => {
        let previousUnmappedRelease; let currentUnmappedRelease; let release;
        beforeEach((done) => {
          previousUnmappedRelease = new UnmappedRelease({ releaseId: testUtils.randomId() });
          currentUnmappedRelease = new UnmappedRelease({ releaseId: null, catNo: testUtils.randomString() });
          release = new Release({ aliases: [currentUnmappedRelease.catNo] });

          sinon.stub(UnmappedRelease.prototype, 'save').resolves(null);
          sinon.stub(UnmappedRelease.prototype, 'mapRelease').resolves(null);
          sinon.stub(Release.prototype, 'save').resolves(null);
          done();
        });
        it('release.findById should be called', async () => {
          // Arrange
          sinon.stub(Release, 'findById').resolves(null);
          // Act
          await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
          // Assert
          expect(Release.findById.called).to.eq(true);
        });
        describe('release.findById returns no release', () => {
          beforeEach((done) => {
            sinon.stub(Release, 'findById').resolves(null);
            done();
          });
          it('release.save should not be called', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(release.save.called).to.eq(false);
          });
          it('unmappedRelease.save should not be called', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.save.called).to.eq(false);
          });
          it('unmappedRelease.mapRelease should not be called', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.mapRelease.called).to.eq(false);
          });
        });
        describe('release.findById returns a release', () => {
          beforeEach((done) => {
            sinon.stub(Release, 'findById').resolves(release);
            done();
          });
          it('previous release aliase should be cleared from release.aliases', async () => {
            // Arrange
            const filteredIsrc = release.aliases
              .filter((alias) => alias !== currentUnmappedRelease.catNo);
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(filteredIsrc).to.deep.eq(release.aliases);
          });
          it('release.save should be called', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(release.save.called).to.eq(true);
          });
          it('unmappedRelease completed status should be set to false', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.complete).to.eq(false);
          });
          it('unmappedRelease should call the save method', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.save.called).to.eq(true);
          });
          it('unmappedRelease should call the mapRelease method', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.mapRelease.called).to.eq(true);
          });
        });
      });

      describe('if the current unmappedRelease does contain a releaseId', () => {
        let previousUnmappedRelease; let currentUnmappedRelease; let release;
        beforeEach((done) => {
          previousUnmappedRelease = new UnmappedRelease({ releaseId: testUtils.randomId() });
          currentUnmappedRelease = new UnmappedRelease({ releaseId: testUtils.randomId(), catNo: testUtils.randomString() });
          release = new Release({ catNo: currentUnmappedRelease.catNo });

          sinon.stub(UnmappedRelease.prototype, 'save').resolves(null);
          sinon.stub(UnmappedRelease.prototype, 'mapRelease').resolves(null);
          sinon.stub(Release.prototype, 'save').resolves(null);
          done();
        });
        it('release.findById should be called', async () => {
          // Arrange
          sinon.stub(Release, 'findById').resolves(release);
          // Act
          await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
          // Assert
          expect(Release.findById.called).to.eq(true);
        });
        describe('release.findById returns no release', () => {
          beforeEach((done) => {
            sinon.stub(Release, 'findById').resolves(null);
            done();
          });
          it('release.save should not be called', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(release.save.called).to.eq(false);
          });
          it('unmappedRelease.save should not be called', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.save.called).to.eq(false);
          });
          it('unmappedRelease.mapRelease should not be called', async () => {
            // Act
            currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.mapRelease.called).to.eq(false);
          });
        });
        describe('release.findById returns a release', () => {
          let exampleIsrc;
          beforeEach((done) => {
            exampleIsrc = testUtils.randomString();
            release.aliases = [exampleIsrc, currentUnmappedRelease.catNo,
            ];
            sinon.stub(Release, 'findById').resolves(release);
            done();
          });
          describe('When unmappedRelease contains catNo', () => {
            let unmappedRelease2;
            beforeEach((done) => {
              unmappedRelease2 = new UnmappedRelease({ catNo: unmappedReleaseFields.catNo, releaseId: unmappedReleaseFields.releaseId });
              done();
            });
            it('Should only filter out any aliases which match the catNo', async () => {
              // Arrange
              const filteredIsrc = [exampleIsrc, currentUnmappedRelease.catNo];
              // Act
              await unmappedRelease2.checkPreviousReleaseAliases(previousUnmappedRelease);
              // Assert
              expect(filteredIsrc).to.deep.eq(release.aliases);
            });
          });
          it('release.save should be called', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(release.save.called).to.eq(true);
          });
          it('unmappedRelease completed status should be set to true', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.complete).to.eq(true);
          });
          it('unmappedRelease should call the save method', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.save.called).to.eq(true);
          });
          it('unmappedRelease should call the mapRelease method', async () => {
            // Act
            await currentUnmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
            // Assert
            expect(currentUnmappedRelease.mapRelease.called).to.eq(true);
          });
        });
      });
    });
  });
});
