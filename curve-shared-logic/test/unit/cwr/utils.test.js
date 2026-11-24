process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const { randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const CwrUtils = require('../../../libs/cwr/utils');
const { CISAC_COUNTRIES_EUROPE, CISAC_APPROVED_COUNTRIES_CODES, CISAC_APPROVED_TERRITORIES_REVERSED } = require('../../../libs/cwr/territories');

describe('CwrUtils', () => {
  describe('#consolidateGroups', () => {
    it('should not modify distinct territory groups with unique territories', (done) => {
      const territoryGroups = {
        GBNL: ['GB', 'NL'],
        SE: ['SE'],
        CA: ['CA'],
      };
      expect(CwrUtils.consolidateGroups(territoryGroups)).to.eql(territoryGroups);
      done();
    });

    it('should remove duplicate territories and leave only the most specific group', (done) => {
      const territoryGroups = {
        BENLDELV: ['BE', 'NL', 'DE', 'LV'],
        GBNL: ['GB', 'NL'],
        NL: ['NL'],
      };
      expect(CwrUtils.consolidateGroups(territoryGroups)).to.eql({
        NL: ['NL'],
        GB: ['GB'],
        BEDELV: ['BE', 'DE', 'LV'],
      });
      done();
    });

    it('should remove duplicate territories and leave only the most specific group when continent is included', (done) => {
      const europe = Object.values(CISAC_COUNTRIES_EUROPE);
      const europeExcludingSpecific = europe.filter((t) => !['GB', 'DE', 'NL', 'LV', 'NO', 'SE'].includes(t));
      const territoryGroups = {
        [europe.join('')]: europe,
        GBDENLLV: ['GB', 'DE', 'NL', 'LV'],
        GBNL: ['GB', 'NL'],
        NOSE: ['NO', 'SE'],
        NL: ['NL'],
      };
      expect(CwrUtils.consolidateGroups(territoryGroups)).to.eql({
        NL: ['NL'],
        GB: ['GB'],
        NOSE: ['NO', 'SE'],
        DELV: ['DE', 'LV'],
        [europeExcludingSpecific.join('')]: europeExcludingSpecific,
      });
      done();
    });

    it('should remove duplicate territories from all world and leave them as specific groups', (done) => {
      const allWorld = CISAC_APPROVED_COUNTRIES_CODES;
      const europe = Object.values(CISAC_COUNTRIES_EUROPE);
      const allWorldExcludingEurope = allWorld.filter((t) => !europe.includes(t));
      const europeExcludingSpecific = europe.filter((t) => t !== 'NL');
      const territoryGroups = {
        [allWorld.join('')]: allWorld,
        [europe.join('')]: europe,
        NL: ['NL'],
      };
      expect(CwrUtils.consolidateGroups(territoryGroups)).to.eql({
        NL: ['NL'],
        [europeExcludingSpecific.join('')]: europeExcludingSpecific,
        [allWorldExcludingEurope.join('')]: allWorldExcludingEurope,
      });
      done();
    });

    it('should not remove an overlapping territory code', (done) => {
      const territoryGroups = {
        // Function must not look for OM within the key name, only exactly every 2 chars OR inside the values array
        NOMT: ['NO', 'MT'],
        OM: ['OM'],
      };
      expect(CwrUtils.consolidateGroups(territoryGroups)).to.eql(territoryGroups);
      done();
    });
  });

  describe('#consolidatePublisherTerritories', () => {
    it('should do nothing if no changes are needed to the original publisher territory chains', (done) => {
      // This usually contains much more data from the CWR file but is unecessary for testing this method
      const publisherTerritories = {
        '01': [{ P0000001: [
          { territories: '0752' }, // SE
          { territories: '0578' }, // NO
          { territories: '0208' }, // DK
        ] }],
      };
      const groupedTerritories = {
        SENODK: ['SE', 'NO', 'DK'],
      };
      const output = {
        '01': [{ P0000001: [
          { territories: '0752' }, // SE
          { territories: '0578' }, // NO
          { territories: '0208' }, // DK
        ] }],
      };
      expect(CwrUtils.consolidatePublisherTerritories(publisherTerritories, groupedTerritories)).to.eql(output);
      done();
    });

    it('should consolidate publisher territory chains to match the grouped territories', (done) => {
      // This usually contains much more data from the CWR file but is unecessary for testing this method
      const publisherTerritories = {
        '01': [{ P0000001: [
          { territories: '0752' }, // SE
          { territories: '0578' }, // NO
          { territories: '0208' }, // DK
        ] }],
        '02': [{ P0000002: [
          { territories: '0752' }, // SE
          { territories: '0578' }, // NO
          { territories: '0208' }, // DK
        ] }],
        '03': [{ P0000003: [
          { territories: '0208' }, // DK
        ] }],
      };
      const groupedTerritories = {
        SENO: ['SE', 'NO'],
        DK: ['DK'],
      };
      const output = {
        '01': [{ P0000001: [
          { territories: '0752' }, // SE
          { territories: '0578' }, // NO
        ] }],
        '02': [{ P0000002: [
          { territories: '0752' }, // SE
          { territories: '0578' }, // NO
        ] }],
        '03': [{ P0000003: [
          { territories: '0208' }, // DK
        ] }],
      };
      expect(CwrUtils.consolidatePublisherTerritories(publisherTerritories, groupedTerritories)).to.eql(output);
      done();
    });

    it('should consolidate territories for a world > continent > specific chain setup', (done) => {
      // Publisher territories setup
      const allWorld = Object.keys(CISAC_APPROVED_TERRITORIES_REVERSED).map((t) => ({ territories: t.toString().padStart(4, '0') }));
      const europe = Object.keys(CISAC_COUNTRIES_EUROPE).map((t) => ({ territories: t.toString().padStart(4, '0') }));
      const denmark = '0208';

      // Territory groups setup
      const europeExcludingDenmarkGroup = Object.values(CISAC_COUNTRIES_EUROPE).filter((t) => t !== 'DK');
      const allWorldExcludingEuropeGroup = CISAC_APPROVED_COUNTRIES_CODES.filter((t) => !europeExcludingDenmarkGroup.includes(t));

      // This usually contains much more data from the CWR file but is unecessary for testing this method
      const publisherTerritories = {
        '01': [{ P0000001: allWorld }],
        '02': [{ P0000002: europe }],
        '03': [{ P0000003: [{ territories: denmark }] }],
      };
      const groupedTerritories = {
        [allWorldExcludingEuropeGroup.join('')]: allWorldExcludingEuropeGroup,
        [europeExcludingDenmarkGroup.join('')]: europeExcludingDenmarkGroup,
        DK: ['DK'],
      };
      // We are expecting that Denmark is removed from all world + europe as it has it's own specific group
      const output = {
        '01': [{ P0000001: allWorld.filter(({ territories }) => territories !== denmark) }],
        '02': [{ P0000002: europe.filter(({ territories }) => territories !== denmark) }],
        '03': [{ P0000003: [{ territories: denmark }] }],
      };
      expect(CwrUtils.consolidatePublisherTerritories(publisherTerritories, groupedTerritories)).to.eql(output);
      done();
    });
  });

  describe('#getNewAndUpdatedWorks', () => {
    const mockDeliveryPartnerId = randomId();
    let Work; let DeliveryPartner; let work1;

    beforeEach(() => {
      work1 = {
        _id: randomId(),
        significantUpdateToPartnerChains: [
          { date: '2024-11-28T21:55:05.926+00:00', deliveryPartnerId: mockDeliveryPartnerId },
        ],
        deliveredTo: [
          { deliveryPartnerId: mockDeliveryPartnerId, deliveredAt: '2024-11-27T20:02:07.026+00:00' },
        ],
      };

      Work = {
        aggregate: jest.fn().mockResolvedValue([work1]), // Mock the aggregation pipeline
        find: jest.fn().mockImplementation(() => ({
          select: jest.fn().mockResolvedValue([
            work1,
          ]),
        })),
        paginate: jest.fn(),
        select: jest.fn().mockResolvedValue([
          work1,
        ]),
      };

      DeliveryPartner = {
        findById: jest.fn().mockResolvedValue({ _id: mockDeliveryPartnerId, territories: ['US', 'CA'] }),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should construct the aggregation pipeline with significantUpdatePartnerId and significantUpdateDateChain conditions'
      + 'and return works where significantUpdateDateChain is more recent than delivery to that partner', async () => {
      const results = await CwrUtils.getNewAndUpdatedWorks({
        Work,
        DeliverySchedule: {},
        CwrDelivery: {},
        DeliveryPartner,
        TerritoryGroup: {},
        clientId: 'mockClientId',
        deliveryPartnerId: mockDeliveryPartnerId,
        paginationParams: null,
        onlyReturnFilter: false,
        deliveryFilter: {},
      });
      // Spy on the aggregation pipeline
      const aggregationCall = Work.aggregate.mock.calls[0][0];
      const stageToCheck = aggregationCall[5].$match.$or[1].$and[1].$or[1].$and[1];
      // Use deep include to check the nested object
      expect(stageToCheck).to.deep.include({ $expr: { $gt: ['$significantUpdateDateChain', '$deliveredAt'] } });
      expect(results[0]._id).to.eql(work1._id);
      expect(new Date(results[0].significantUpdateToPartnerChains[0].date)).to.be.greaterThan(
        new Date(results[0].deliveredTo[0].deliveredAt),
      );
    });
  });
});
