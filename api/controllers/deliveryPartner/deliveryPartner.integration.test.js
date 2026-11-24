const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const DeliveryPartnerController = require('.');
const DeliveryPartner = require('../../models/deliveryPartner');
const IswcDelivery = require('../../models/iswcDelivery');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliverySchedule = require('../../models/deliverySchedule');
const User = require('../../models/user');
const Work = require('../../models/work');

let user;

describe('DeliveryPartnerController', () => {
  logger.info('\n\n**** controllers/deliveryPartner.integration.test.js');

  beforeEach(async () => {
    user = new User({ clientId: randomId(), email: randomString() });
    await user.save();
  });

  describe('getDeliveryPartners', () => {
    it('should fetch and return delivery partners with the correct fields', async () => {
      const req = {
        query: {
          page: '1',
          limit: '2',
          orderBy: 'createdAt',
          orderDir: 'desc',
        },
        curveUser: user,
      };

      const mockDeliveryPartnerDocs = [
        {
          _id: randomId(),
          clientId: randomId(),
          name: 'Partner One',
          outputFormat: 'ISWC Resolution (IRS)',
          createdAt: new Date('2023-01-01'),
        },
        {
          _id: randomId(),
          clientId: randomId(),
          name: 'Partner Two',
          outputFormat: 'CWR',
          createdAt: new Date('2023-02-02'),
        },
      ];

      jest.spyOn(DeliveryPartner, 'paginate').mockResolvedValue({
        docs: mockDeliveryPartnerDocs,
      });

      jest.spyOn(IswcDelivery, 'findOne').mockResolvedValue({
        _id: 'iswcDel1',
        deliveredDate: new Date('2023-03-01'),
      });
      jest.spyOn(CwrDelivery, 'findOne').mockResolvedValue({
        _id: 'cwrDel1',
        createdAt: new Date('2023-03-05'),
      });

      jest.spyOn(DeliverySchedule, 'find').mockResolvedValue([
        {
          _id: randomId(),
          clientId: randomId(),
          deliveryPartnerId: 'dp1',
          active: true,
          frequency: 7,
        },
      ]);

      const result = await DeliveryPartnerController.getDeliveryPartners({ req });
      expect(DeliveryPartner.paginate).toHaveBeenCalledTimes(1);
      expect(IswcDelivery.findOne).toHaveBeenCalled();
      expect(CwrDelivery.findOne).toHaveBeenCalled();
      expect(DeliverySchedule.find).toHaveBeenCalledTimes(2);
      expect(Array.isArray(result.deliveryPartners)).toBe(true);
      expect(result.deliveryPartners.length).toBe(2);
      expect(result.deliveryPartners[0]._id).toBe(mockDeliveryPartnerDocs[0]._id);
      expect(result.deliveryPartners[0].lastDeliveryId).toBe('iswcDel1');
      expect(result.deliveryPartners[0].status).toBe('active');
      expect(result.deliveryPartners[1]._id).toBe(mockDeliveryPartnerDocs[1]._id);
      expect(result.deliveryPartners[1].lastDeliveryId).toBe('cwrDel1');
    });
  });

  describe('getTotalReferences', () => {
    let deliveryPartner1;
    const clientId = randomId();

    beforeEach(async () => {
      deliveryPartner1 = new DeliveryPartner({
        clientId,
        cwrVersion: '2.2',
        extraPartners: [],
        insertionTerritory: [],
        name: randomString(),
        outputFormat: 'CWR',
        receivingParty: 'PRS',
        subPartners: [],
        territory: 'GB',
        type: 'Export Only',
      });

      const work = new Work({
        clientId,
        title: '4. - Linked Publisher for All',
        partnerRightsChains: [
          {
            deliveryPartnerId: deliveryPartner1._id.toString(),
            rightsChain: [
              {
                territory: 'specific',
                territoryCodes: {
                  name: 'GB',
                  codes: [
                    'GB',
                  ],
                },
                children: [
                  {
                    type: 'Publisher',
                    publisherId: '686e39e9475777b8b440faea',
                    contractType: 'Admin',
                    controlled: true,
                    name: '5a. Publisher',
                    performanceOwnership: 0,
                    performanceCollection: 50,
                    mechanicalOwnership: 0,
                    mechanicalCollection: 50,
                    children: [
                      {
                        type: 'Publisher',
                        publisherId: '686e39fa911d82bc820c7ce1',
                        contractType: 'Original Publisher',
                        controlled: true,
                        name: '5. Publisher',
                        performanceOwnership: 50,
                        performanceCollection: 0,
                        mechanicalOwnership: 50,
                        mechanicalCollection: 0,
                        children: [
                          {
                            type: 'Composer',
                            composerId: '686bdea8ae2456b7881ad3c3',
                            contractType: 'Lyrics and Music',
                            controlled: true,
                            name: 'Composer 5',
                            caeNumber: '00000000000',
                            mechanicalOwnership: 50,
                            performanceOwnership: 50,
                            mechanicalCollection: 50,
                            performanceCollection: 50,
                          },
                        ],
                        multiplier: 1,
                      },
                    ],
                    multiplier: 1,
                  },
                ],
                isDefaultChain: true,
                totalMechanicalOwnership: 100,
                totalPerformanceOwnership: 100,
                totalMechanicalCollection: 100,
                totalPerformanceCollection: 100,
              },
            ],
          },
        ],
      });

      await deliveryPartner1.save();
      await work.save();
    });

    it('It should return an array with a single element', async () => {
      const references = await DeliveryPartnerController.getTotalReferences(clientId, deliveryPartner1._id.toString());
      expect(references.length).toBe(1);
      expect(references).toEqual([
        {
          count: 1,
          document: 'work',
          field: 'partnerRightsChains',
          label: 'Delivery Partner',
        },
      ]);
    });

    it('It should return an empty array', async () => {
      const references = await DeliveryPartnerController.getTotalReferences(clientId, randomId());
      expect(references.length).toBe(0);
    });
  });
});
