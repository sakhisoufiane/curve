jest.mock('../contract');
jest.mock('../publisher/publisher');

const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { testUtils } = require('@curveroyaltysystems/platform-shared-utils');

const Composer = require('./composer');
const Contract = require('../contract');
const Publisher = require('../publisher/publisher');

describe('Composer', () => {
  describe('convertComposersForXlsx', () => {
    beforeEach(() => {
      jest.spyOn(Contract, 'find').mockResolvedValue([]);
      jest.spyOn(Publisher, 'findOne').mockResolvedValue([]);
      jest.spyOn(Composer.prototype, 'exportData').mockReturnValue();
      jest.spyOn(Exports, 'getTemplate').mockResolvedValue('test');
    });

    it('should return an error if composers is not an array', (done) => {
      Composer.convertComposersForXlsx('Test', 'clientId', (err, result) => {
        expect(err.message).toEqual('Must be passed an Array of Composers');
        done();
      });
    });

    it('should include interestedPartyId in the converted composers', (done) => {
      const interestedPartyId = testUtils.randomString();
      const composer = new Composer({
        _id: testUtils.randomId(),
        name: testUtils.randomString(),
        interestedPartyId,
        publisherAgreements: [
          {
            publisherId: '6155c0fa1fb5af3bd04cd24f',
          },
        ],
      });
      const mockComposers = [composer];

      // Mock clientId
      const clientId = testUtils.randomString();
      // Call convertComposersForXlsx
      Composer.convertComposersForXlsx(mockComposers, clientId, (err, result) => {
        expect(mockComposers).toBeInstanceOf(Array);
        expect(Contract.find).toHaveBeenCalled();
        expect(Publisher.findOne).toHaveBeenCalled();
        expect(Composer.prototype.exportData).toHaveBeenCalled();
        done();
      });
    });
  });
});
