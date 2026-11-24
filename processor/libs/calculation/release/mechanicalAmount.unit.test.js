const { randomId, randomInt, randomString, randomDate } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const Track = require('../../../models/track');

const MechanicalAmount = require('./mechanicalAmount');

describe('MechanicalAmount unit tests', () => {
  describe('get', () => {
    const usExpectedRatesResult = {
      '2009-03-01': { CA: 0, US: 0, minCA: 0, minUS: 0, usMinAmount: 0.091, usPerMinuteRate: 0.0175 },
      '2023-01-01': { CA: 0, US: 0, minCA: 0, minUS: 0, usMinAmount: 0.12, usPerMinuteRate: 0.0231 },
      '2024-01-01': { CA: 0, US: 0, minCA: 0, minUS: 0, usMinAmount: 0.124, usPerMinuteRate: 0.0238 },
      '2025-01-01': { CA: 0, US: 0, minCA: 0, minUS: 0, usMinAmount: 0.127, usPerMinuteRate: 0.0245 },
    };
    const caExpectedRatesResult = {
      '2009-03-01': { CA: 0, US: 0, minCA: 0, minUS: 0, caMinAmount: 0.091, caPerMinuteRate: 0.0175 },
      '2023-01-01': { CA: 0, US: 0, minCA: 0, minUS: 0, caMinAmount: 0.12, caPerMinuteRate: 0.0231 },
      '2024-01-01': { CA: 0, US: 0, minCA: 0, minUS: 0, caMinAmount: 0.124, caPerMinuteRate: 0.0238 },
      '2025-01-01': { CA: 0, US: 0, minCA: 0, minUS: 0, caMinAmount: 0.127, caPerMinuteRate: 0.0245 },
    };
    let release; let usClient; let caClient;

    beforeEach(() => {
      usClient = {
        _id: randomId(),
        usStatRates: [
          { startDate: '2009-03-01T00:00:00.000Z', minAmount: 0.091, perMinuteRate: 0.0175 },
          { startDate: '2024-01-01T00:00:00.000Z', minAmount: 0.124, perMinuteRate: 0.0238 },
          { startDate: '2023-01-01T00:00:00.000Z', minAmount: 0.12, perMinuteRate: 0.0231 },
          { startDate: '2025-01-01T00:00:00.000Z', minAmount: 0.127, perMinuteRate: 0.0245 },
        ],
      };
      caClient = {
        _id: randomId(),
        caStatRates: [
          { startDate: '2009-03-01T00:00:00.000Z', minAmount: 0.091, perMinuteRate: 0.0175 },
          { startDate: '2024-01-01T00:00:00.000Z', minAmount: 0.124, perMinuteRate: 0.0238 },
          { startDate: '2023-01-01T00:00:00.000Z', minAmount: 0.12, perMinuteRate: 0.0231 },
          { startDate: '2025-01-01T00:00:00.000Z', minAmount: 0.127, perMinuteRate: 0.0245 },
        ],
      };
      release = { _id: randomId(), trackIds: [randomString()] };

      Track.findById = jest.fn().mockResolvedValue();
    });

    it('should return client US rates when client.usStatRates is set', (done) => {
      MechanicalAmount.get(release, usClient, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(usExpectedRatesResult);
        done();
      });
    });

    it('should return client CA rates when client.caStatRates is set', (done) => {
      MechanicalAmount.get(release, caClient, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(caExpectedRatesResult);
        done();
      });
    });

    it('should return sorted rates', (done) => {
      MechanicalAmount.get(release, usClient, (err, result) => {
        expect(err).toBeNull();
        const resultKeys = Object.keys(result);
        expect(resultKeys[0]).toBe('2009-03-01');
        expect(resultKeys[1]).toBe('2023-01-01');
        expect(resultKeys[2]).toBe('2024-01-01');
        expect(resultKeys[3]).toBe('2025-01-01');
        done();
      });
    });

    it('should call Track.findById with the right args when release.mechanicalLicenses is set', (done) => {
      release.mechanicalLicenses = {};

      MechanicalAmount.get(release, usClient, (err, result) => {
        expect(err).toBeNull();
        expect(Track.findById).toHaveBeenCalledWith(release.trackIds[0]);
        done();
      });
    });

    it('should call Track.findById with the right args when release.mechanicalLicenses is not set', (done) => {
      MechanicalAmount.get(release, usClient, (err, result) => {
        expect(err).toBeNull();
        expect(Track.findById).toHaveBeenCalledWith(release.trackIds[0]);
        done();
      });
    });
  });

  describe('getMinStatRateForDate', () => {
    it('should return 0 when no statRates', () => {
      const statRates = null;
      const date = randomDate();

      const result = MechanicalAmount.getMinStatRateForDate(statRates, date);
      expect(result).toBe(0);
    });

    it('should return latestStatRates.minAmount when statRates is passed', () => {
      const date = randomDate();
      const statRates = [
        { startDate: moment(date).subtract(1, 'month').format(), minAmount: randomInt() },
        { startDate: moment(date).subtract(2, 'months').format(), minAmount: randomInt() },
      ];

      const result = MechanicalAmount.getMinStatRateForDate(statRates, date);

      expect(result).toBe(statRates[0].minAmount);
    });
  });

  describe('calculateRates', () => {
    let statutoryRate; let canadianStatutoryRate; let release; let trackId; let track;

    beforeEach((done) => {
      release = { mechanicalLicenses: {}, trackIds: [] };
      statutoryRate = randomInt();
      canadianStatutoryRate = randomInt();
      trackId = randomId();
      track = { _id: trackId, duration: 1000 * 60 * 4 };
      release.mechanicalLicenses[trackId] = {
        reportMechanicals: true,
        licenses: [{
          share: randomInt(),
          rate: randomInt(),
          trackCapOverride: 1 + randomInt(),
        }],
      };
      done();
    });

    it('should return the US and CA rate when release has track mechanical licenses and report mechanical is true', (done) => {
      const totalShare = release.mechanicalLicenses[trackId].licenses[0].share;
      const mechanicalBasisSum = 100;
      const calc = (parseFloat(release.mechanicalLicenses[trackId].licenses[0].rate) / 100) * parseFloat(release.mechanicalLicenses[trackId].licenses[0].share) / totalShare * mechanicalBasisSum / 100;
      const expectResult = {
        US: parseFloat(statutoryRate) * calc,
        CA: parseFloat(canadianStatutoryRate) * calc,
      };
      const expectedRelease = { ...release };
      const expectedTrack = { _id: track._id, duration: track.duration };

      MechanicalAmount.calculateRates(expectResult, release, track, (result) => {
        expect(release).toEqual(expectedRelease);
        expect(track).toEqual(expectedTrack);
        done();
      });
    });

    it('should return zero US and CA rate when release has track mechanical licenses and report mechanical is false', (done) => {
      const expectedResult = { US: 0, CA: 0 };
      const expectedRelease = { ...release };
      const expectedTrack = { _id: track._id, duration: track.duration };

      MechanicalAmount.calculateRates(expectedResult, release, track, (result) => {
        expect(release).toEqual(expectedRelease);
        expect(track).toEqual(expectedTrack);
        done();
      });
    });

    it('should return the US and CA rate when release has no track mechanical licenses', (done) => {
      const cap = (parseFloat(release.mechanicalTrackCap / release.trackIds.length));
      const expectedRelease = { ...release };
      const expectedTrack = { _id: track._id, duration: track.duration };
      const expectedResult = {
        US: parseFloat(statutoryRate) * cap,
        CA: parseFloat(canadianStatutoryRate) * cap,
      };

      MechanicalAmount.calculateRates(expectedResult, release, track, (result) => {
        expect(release).toEqual(expectedRelease);
        expect(track).toEqual(expectedTrack);
        done();
      });
    });
  });

  describe('totalUniqueTracks', () => {
    let release;

    beforeEach(() => {
      release = { trackIds: [randomId(), randomId()] };
      release.trackIds.push(release.trackIds[0]);
      Track.countDocuments = jest.fn().mockResolvedValue();
    });

    it('should call Track.countDocuments with the right args', (done) => {
      const expectedFilter = { _id: { $in: [new ObjectId(release.trackIds[0]), new ObjectId(release.trackIds[1])] } };

      MechanicalAmount.totalUniqueTracks(release, () => {
        expect(Track.countDocuments).toHaveBeenCalledWith(expectedFilter);
        done();
      });
    });

    it('should call the total unique IDs', (done) => {
      const expectedCount = randomInt();
      Track.countDocuments = jest.fn().mockResolvedValue(expectedCount);

      MechanicalAmount.totalUniqueTracks(release, (err, result) => {
        expect(result).toEqual(expectedCount);
        done();
      });
    });
  });
});
