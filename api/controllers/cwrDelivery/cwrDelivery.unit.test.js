jest.mock('@curveroyaltysystems/platform-shared-utils', () => ({
  ...jest.requireActual('@curveroyaltysystems/platform-shared-utils'),
  TaskHelpers: { createTaskAndSendMessage: jest.fn().mockResolvedValue({}) },
}));

const { CwrDeliveryController, CWR } = require('@curveroyaltysystems/curve-shared-logic');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const moment = require('moment');

const Client = require('../../models/client');
const CwrDeliveryLib = require('../../libs/deliveries/cwr');
const { prepareDelivery } = require('./cwrDelivery');

// Factory mocks prevent Jest auto-mock from loading the real modules,
// which would fail trying to load @curveroyaltysystems/models (needs DB config at import time).
jest.mock('@curveroyaltysystems/curve-shared-logic', () => ({
  CWR: jest.fn(),
  CwrDeliveryController: {
    buildWorksFilter: jest.fn(),
    getUncontrolledWorks: jest.fn(),
    getWorksForDelivery: jest.fn(),
  },
}));

jest.mock('../../models/client', () => ({ findById: jest.fn() }));
jest.mock('../../models/cwrDelivery', () => ({}));
jest.mock('../../models/work', () => ({ find: jest.fn(), updateMany: jest.fn() }));
jest.mock('../../models/deliveredWork', () => ({ find: jest.fn() }));
jest.mock('../../models/publisher', () => ({ findById: jest.fn(), find: jest.fn() }));
jest.mock('../../models/task', () => jest.fn().mockImplementation(() => ({ save: jest.fn() })));
jest.mock('../../models/user', () => ({ findById: jest.fn() }));
jest.mock('../../models/deliverySchedule', () => ({}));
jest.mock('../../models/deliveryPartner', () => ({ findById: jest.fn() }));
jest.mock('../../models/territoryGroup', () => ({ findById: jest.fn() }));
jest.mock('../../models/track', () => ({}));
jest.mock('../../models/composer', () => ({ findById: jest.fn() }));
jest.mock('../../models/release', () => ({}));
jest.mock('../../models/notification', () => ({}));
jest.mock('../../libs/deliveries/cwr', () => ({ createCWRDeliveryWork: jest.fn() }));
jest.mock('../../libs/deliveries/mlc', () => jest.fn());
jest.mock('../../libs/deliveries/catShipment', () => jest.fn());
jest.mock('../../libs/deliveries/catShipmentSimple', () => jest.fn());
jest.mock('../../libs/deliveries/youtube', () => jest.fn());
jest.mock('../../libs/deliveries/iswcRegistration', () => jest.fn());
jest.mock('../../libs/deliveries/iswc', () => ({ createISWCRegistrationWork: jest.fn() }));
jest.mock('../../libs/deliveries/library', () => ({ createLibDeliveryWork: jest.fn() }));

const client = {
  _id: randomId(),
  name: 'Test Client',
};

const deliveryPartner = {
  _id: randomId(),
  territory: ['WW'],
  insertion: {},
};

const curveUser = {
  _id: randomId(),
  internal: false,
  clientId: client._id,
};

let delivery;
let work;

describe('CWR Delivery', () => {
  beforeEach(() => {
    work = {
      _id: randomId(),
      title: randomString(),
      rightsChain: [
        {
          territory: ['WW'],
          children: [
            {
              type: 'Publisher',
              publisherId: randomId(),
            },
          ],
        },
      ],
    };
    delivery = {
      _id: randomId(),
      clientId: client._id,
      deliveryPartnerId: deliveryPartner._id,
      workIds: [work._id.toString()],
      outputFormat: 'CWR',
      fileName: undefined,
    };

    jest.spyOn(fileManager, 'uploadToS3').mockImplementation((s3Path, location, cb) => cb(null, null));
  });

  describe('prepareDelivery', () => {
    let mockCwrInstance;

    beforeEach(() => {
      Client.findById.mockResolvedValue({
        _id: client._id,
        name: client.name,
        features: { partnerChains: true },
      });

      CwrDeliveryController.buildWorksFilter.mockResolvedValue({});
      CwrDeliveryController.getUncontrolledWorks.mockResolvedValue([]);

      mockCwrInstance = {
        setup: jest.fn((cb) => cb()),
        addHeader: jest.fn(),
        close: jest.fn((cb) => cb()),
        writeToFile: jest.fn((path, cb) => cb(null)),
        addTrailer: jest.fn(),
        fileName: jest.fn(() => `CW${moment().format('YY')}0000XXX_000.V22`),
      };
      CWR.mockImplementation(() => mockCwrInstance);

      CwrDeliveryLib.createCWRDeliveryWork.mockResolvedValue();
    });

    afterEach(() => {
      delivery.fileName = undefined;
    });

    it('should throw an error if the delivery format is unknown', async () => {
      delivery.outputFormat = 'CWI';
      await expect(prepareDelivery({ delivery, deliveryPartner, curveUser })).rejects.toThrow('Delivery type unknown');
    });

    it('should create a delivery for the specified works', async () => {
      const filePath = 'deliveryFiles/cwr/CW240000XXX_000.V22';
      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((s3Path, location, cb) => cb(null, filePath));
      const res = await prepareDelivery({ delivery, deliveryPartner, curveUser });
      expect(res).toBe(filePath);
    });

    it('should use partner chains if the feature is enabled', async () => {
      await prepareDelivery({ delivery, deliveryPartner, curveUser });
      expect(CwrDeliveryLib.createCWRDeliveryWork).toHaveBeenCalledWith(
        expect.objectContaining({ options: { partnerChainsEnabled: true } }),
      );
    });

    it('should use custom fileName if a fileName has already been set on the delivery', async () => {
      const s3PathPrefix = 'deliveryFiles/cwr/';
      const deliveryFilename = randomString();
      delivery.fileName = deliveryFilename;
      await prepareDelivery({ delivery, deliveryPartner, curveUser });
      expect(fileManager.uploadToS3.mock.calls[0][0]).toBe(`${s3PathPrefix}${deliveryFilename}`);
    });

    it('should use autogenerated fileName if fileName is NOT set on the delivery', async () => {
      const s3PathPrefix = 'deliveryFiles/cwr/';
      const fileName = `CW${moment().format('YY')}0000XXX_000.V22`;
      await prepareDelivery({ delivery, deliveryPartner, curveUser });
      expect(fileManager.uploadToS3.mock.calls[0][0]).toBe(`${s3PathPrefix}${fileName}`);
    });
  });
});
