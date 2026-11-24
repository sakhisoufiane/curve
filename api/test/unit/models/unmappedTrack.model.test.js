process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { expect } = require('chai');
const async = require('async');
const sinon = require('sinon');
const UnmappedTrack = require('../../../models/unmappedTrack');
const Track = require('../../../models/track');

describe('UnmappedTracks', () => {
  logger.info('::::file:::: unit/models/unmappedTracks .....................');

  let clientId;
  let unmappedTrackFields;
  let unmappedTrack1;

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
        unmappedTrackFields = {
          clientId,
          salesFileId: testUtils.randomId(),
          title: testUtils.randomString(),
          version: testUtils.randomString(),
          isrc: testUtils.randomISWC(),
          trackId: testUtils.randomId(),
          complete: testUtils.randomBoolean(),
        };
        unmappedTrack1 = new UnmappedTrack(unmappedTrackFields);
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
    describe('when unmappedTrack.trackId contains value & no previousUnmappedTrack was found', () => {
      beforeEach((done) => {
        sinon.stub(UnmappedTrack.prototype, 'save').resolves(unmappedTrack1);
        done();
      });
      it('should update complete status', async () => {
        // Arrange
        const track = new Track();
        sinon.stub(Track, 'findById').resolves(track);
        sinon.stub(Track.prototype, 'save').resolves(track);

        // Act
        await unmappedTrack1.checkForCompletion(null);
        // Assert
        expect(unmappedTrack1.complete).to.eq(true);
      });
      it('should map umappedTrack isrc as an isrc to the specified track', async () => {
        // Arrange
        const track = new Track();
        sinon.stub(Track, 'findById').resolves(track);
        sinon.stub(Track.prototype, 'save').resolves(track);

        // Act
        await unmappedTrack1.checkForCompletion(null);
        // Assert
        expect(unmappedTrack1.isrc).to.eq(track.aliases[0]);
      });
    });

    describe('if previousunmappedTrack.trackId is different to currentUnmappedTrackId', () => {
      let previousunmappedTrack;
      beforeEach((done) => {
        previousunmappedTrack = new UnmappedTrack({ trackId: testUtils.randomId() });
        done();
      });
      it('checkPreviousTrackAliases should be called', async () => {
        // Arrange
        sinon.stub(UnmappedTrack.prototype, 'checkPreviousTrackAliases').resolves(null);

        // Act
        await unmappedTrack1.checkForCompletion(previousunmappedTrack);
        // Assert
        expect(unmappedTrack1.checkPreviousTrackAliases.called).to.equal(true);
      });
    });

    describe('checkPreviousTrackAliases', () => {
      describe('if the current unmappedTrack does not contain a trackId', () => {
        let previousUnmappedTrack; let currentUnmappedTrack; let track;
        beforeEach((done) => {
          previousUnmappedTrack = new UnmappedTrack({ trackId: testUtils.randomId() });
          currentUnmappedTrack = new UnmappedTrack({ trackId: null, isrc: testUtils.randomString() });
          track = new Track({ aliases: [currentUnmappedTrack.isrc] });

          sinon.stub(UnmappedTrack.prototype, 'save').resolves(null);
          sinon.stub(UnmappedTrack.prototype, 'mapTrack').resolves(null);
          sinon.stub(Track.prototype, 'save').resolves(null);
          done();
        });
        it('track.findById should be called', async () => {
          // Arrange
          sinon.stub(Track, 'findById').resolves(null);
          // Act
          await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
          // Assert
          expect(Track.findById.called).to.eq(true);
        });
        describe('track.findById returns no track', () => {
          beforeEach((done) => {
            sinon.stub(Track, 'findById').resolves(null);
            done();
          });
          it('track.save should not be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(track.save.called).to.eq(false);
          });
          it('unmappedTrack.save should not be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.save.called).to.eq(false);
          });
          it('unmappedTrack.mapTrack should not be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.mapTrack.called).to.eq(false);
          });
        });
        describe('track.findById returns a track', () => {
          beforeEach((done) => {
            sinon.stub(Track, 'findById').resolves(track);
            done();
          });
          it('previous track aliase should be cleared from track.aliases', async () => {
            // Arrange
            const filteredIsrc = track.aliases
              .filter((alias) => alias !== currentUnmappedTrack.isrc);
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(filteredIsrc).to.deep.eq(track.aliases);
          });
          it('track.save should be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(track.save.called).to.eq(true);
          });
          it('unmappedTrack completed status should be set to false', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.complete).to.eq(false);
          });
          it('unmappedTrack should call the save method', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.save.called).to.eq(true);
          });
          it('unmappedTrack should call the mapTrack method', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.mapTrack.called).to.eq(true);
          });
        });
      });

      describe('if the current unmappedTrack does contain a trackId', () => {
        let previousUnmappedTrack; let currentUnmappedTrack; let track;
        beforeEach((done) => {
          previousUnmappedTrack = new UnmappedTrack({ trackId: testUtils.randomId() });
          currentUnmappedTrack = new UnmappedTrack({ trackId: testUtils.randomId(), isrc: testUtils.randomString() });
          track = new Track({ isrc: currentUnmappedTrack.isrc });

          sinon.stub(UnmappedTrack.prototype, 'save').resolves(null);
          sinon.stub(UnmappedTrack.prototype, 'mapTrack').resolves(null);
          sinon.stub(Track.prototype, 'save').resolves(null);
          done();
        });
        it('track.findById should be called', async () => {
          // Arrange
          sinon.stub(Track, 'findById').resolves(track);
          // Act
          await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
          // Assert
          expect(Track.findById.called).to.eq(true);
        });
        describe('track.findById returns no track', () => {
          beforeEach((done) => {
            sinon.stub(Track, 'findById').resolves(null);
            done();
          });
          it('track.save should not be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(track.save.called).to.eq(false);
          });
          it('unmappedTrack.save should not be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.save.called).to.eq(false);
          });
          it('unmappedTrack.mapTrack should not be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.mapTrack.called).to.eq(false);
          });
        });
        describe('track.findById returns a track', () => {
          let exampleIsrc;
          beforeEach((done) => {
            exampleIsrc = testUtils.randomString();
            track.aliases = [exampleIsrc, currentUnmappedTrack.isrc,
            ];
            sinon.stub(Track, 'findById').resolves(track);
            done();
          });
          describe('When unmappedTrack contains isrc', () => {
            let unmappedTrack2;
            beforeEach((done) => {
              unmappedTrack2 = new UnmappedTrack({ isrc: unmappedTrackFields.isrc, trackId: unmappedTrackFields.trackId });
              done();
            });
            it('Should only filter out any aliases which match the isrc', async () => {
              // Arrange
              const filteredIsrc = [exampleIsrc, currentUnmappedTrack.isrc];
              // Act
              await unmappedTrack2.checkPreviousTrackAliases(previousUnmappedTrack);
              // Assert
              expect(filteredIsrc).to.deep.eq(track.aliases);
            });
          });
          it('track.save should be called', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(track.save.called).to.eq(true);
          });
          it('unmappedTrack completed status should be set to true', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.complete).to.eq(true);
          });
          it('unmappedTrack should call the save method', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.save.called).to.eq(true);
          });
          it('unmappedTrack should call the mapTrack method', async () => {
            // Act
            await currentUnmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
            // Assert
            expect(currentUnmappedTrack.mapTrack.called).to.eq(true);
          });
        });
      });
    });
  });
});
