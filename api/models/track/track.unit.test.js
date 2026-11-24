const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const Track = require('./track');
const Client = require('../client');

describe('Track Model Tests', () => {
  let client;

  describe('validateSubclientRestrictions', () => {
    let baseTrackData;
    let consistentSalesReturnsRightsId;

    beforeEach(() => {
      client = new Client({
        name: randomString(),
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      });
      consistentSalesReturnsRightsId = new ObjectId('000000000000000000000456');
      baseTrackData = {
        clientId: client._id,
        title: randomString(),
        totalParticipation: 100,
        duration: 180,
        isrc: `US${randomString().substring(0, 10).toUpperCase()}`,
        salesReturnsRights: [{ contractId: '123', percentage: 100, _id: consistentSalesReturnsRightsId }],
      };
    });

    describe('when no existing track is provided', () => {
      it('should return empty array', () => {
        const track = new Track(baseTrackData);
        const errors = track.validateSubclientRestrictions(null);
        expect(errors).toEqual([]);
      });

      it('should return empty array when undefined is passed', () => {
        const track = new Track(baseTrackData);
        const errors = track.validateSubclientRestrictions(undefined);
        expect(errors).toEqual([]);
      });
    });

    describe('salesReturnsRights field restrictions', () => {
      it('should detect salesReturnsRights modification when contractId is different', () => {
        const mongoBaseTrack = new Track(baseTrackData);
        const updatedTrackData = {
          ...mongoBaseTrack.toObject(),
          salesReturnsRights: [{ contractId: '1234', percentage: 100, _id: consistentSalesReturnsRightsId }],
        };
        const updatedTrack = new Track(updatedTrackData);
        const errors = updatedTrack.validateSubclientRestrictions(mongoBaseTrack);
        expect(errors).toContain('This participation rate was created as part of an automation and cannot be edited.');
      });
      it('should detect salesReturnsRights modification when percentage is different', () => {
        const mongoBaseTrack = new Track(baseTrackData);
        const updatedTrackData = {
          ...mongoBaseTrack.toObject(),
          salesReturnsRights: [{ contractId: '123', percentage: 80, _id: consistentSalesReturnsRightsId }],
        };
        const updatedTrack = new Track(updatedTrackData);
        const errors = updatedTrack.validateSubclientRestrictions(mongoBaseTrack);
        expect(errors).toContain('This participation rate was created as part of an automation and cannot be edited.');
      });

      it('should handle same salesReturnsRights value (no modification)', () => {
        const mongoBaseTrack = new Track(baseTrackData);
        const updatedTrackData = {
          ...mongoBaseTrack.toObject(),
          salesReturnsRights: baseTrackData.salesReturnsRights,
        };
        const updatedTrack = new Track(updatedTrackData);
        const errors = updatedTrack.validateSubclientRestrictions(mongoBaseTrack);
        expect(errors).toEqual([]);
      });
    });
  });
});
