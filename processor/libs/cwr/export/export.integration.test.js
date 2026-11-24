const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');

const { TerritoryHelper } = require('@curveroyaltysystems/curve-shared-logic');
const CwrExport = require('./export');
const ExportNotification = require('../../exportNotification/exportNotification');
const Client = require('../../../models/client');
const CwrDelivery = require('../../../models/cwrDelivery');
const DeliveryPartner = require('../../../models/deliveryPartner');
const Work = require('../../../models/work');
const DeliveredWork = require('../../../models/deliveredWork');
const DeliveryLog = require('../../../models/deliveryLog');
const Delivery = require('./delivery');

let client;
let email;
let deliveryPartner;
let delivery;

beforeEach(async () => {
  client = new Client({ name: randomString(), ipiNo: randomString() });
  email = randomString();
  await client.save();

  deliveryPartner = new DeliveryPartner({
    clientId: client._id.toString(),
    name: randomString(),
    territory: 'WW',
  });
  await deliveryPartner.save();

  delivery = new CwrDelivery({
    clientId: client._id.toString(),
    deliveryPartnerId: deliveryPartner._id.toString(),
    territory: 'WW',
    outputFormat: 'Export Only',
  });
  await delivery.save();

  jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, path, cb) => cb());
  jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => cb(null, randomString()));
  jest.spyOn(ExportNotification, 'sendCwrExportNotification').mockResolvedValue();
});

it('should throw an error when CWR Delivery not found', async () => {
  const invalidDeliveryId = randomId();
  await expect(CwrExport.exportCwrDelivery({ deliveryId: invalidDeliveryId, markWorksAsDelivered: false, email }))
    .rejects
    .toThrow(`CWR Delivery with ID ${invalidDeliveryId} not found`);
});

describe('when markWorksAsDelivered is false', () => {
  describe('when no Works are found with the Delivery filter', () => {
    it('should throw an error', async () => {
      await expect(CwrExport.exportCwrDelivery({ deliveryId: delivery._id, markWorksAsDelivered: false, email }))
        .rejects
        .toThrow('No Works found with Delivery filter');
    });
  });

  describe('when the Delivery has a Works filter', () => {
    it('should complete the export without marking Works as delivered', async () => {
      // Arrange
      const works = [
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          valid: true,
          approvalStatus: 'Approved',
          approvedDate: new Date(),
          onHold: false,
          territories: TerritoryHelper.allTerritories,
        }),
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          valid: true,
          approvalStatus: 'Approved',
          approvedDate: new Date(),
          onHold: false,
          territories: TerritoryHelper.allTerritories,
        }),
      ];
      await Work.insertMany(works);

      delivery.workIds = [];
      delivery.filter = {};
      delivery.filterType = 'newAndUpdated';
      await delivery.save();

      // Act
      await CwrExport.exportCwrDelivery({ deliveryId: delivery._id, markWorksAsDelivered: false, email });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalled();
      expect(fileManager.publicLink24Hours).toHaveBeenCalled();
      expect(ExportNotification.sendCwrExportNotification).toHaveBeenCalled();

      const [[_, filePath]] = fileManager.uploadToS3.mock.calls;
      expect(filePath.endsWith('.V22')).toEqual(true);

      const file = fs.readFileSync(filePath, 'utf-8');
      expect(file.split('\n').length).toEqual(works.length + 5); // 2 work + 2 header + 2 trailer + 1 empty lines

      // No DeliveredWorks should have been saved
      const deliveredWorksCount = await DeliveredWork.countDocuments({ cwrDeliveryId: delivery._id });
      expect(deliveredWorksCount).toEqual(0);
    });
  });

  describe('when the Delivery has specific Work IDs', () => {
    it('should complete the export without marking Works as delivered', async () => {
      // Arrange
      const works = [
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          valid: true,
        }),
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          valid: true,
        }),
      ];
      await Work.insertMany(works);

      delivery.workIds = works.map((work) => work._id.toString());
      await delivery.save();

      // Act
      await CwrExport.exportCwrDelivery({ deliveryId: delivery._id, markWorksAsDelivered: false, email });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalled();
      expect(fileManager.publicLink24Hours).toHaveBeenCalled();
      expect(ExportNotification.sendCwrExportNotification).toHaveBeenCalled();

      const [[_, filePath]] = fileManager.uploadToS3.mock.calls;
      expect(filePath.endsWith('.V22')).toEqual(true);

      const file = fs.readFileSync(filePath, 'utf-8');
      expect(file.split('\n').length).toEqual(works.length + 5); // 2 work + 2 header + 2 trailer + 1 empty lines

      // No DeliveredWorks should have been saved
      const deliveredWorksCount = await DeliveredWork.countDocuments({ cwrDeliveryId: delivery._id });
      expect(deliveredWorksCount).toEqual(0);
    });
  });
});

describe('when markWorksAsDelivered is true', () => {
  describe('when no Works are found with the Delivery filter', () => {
    it('should throw an error and set the Delivery status to Errored', async () => {
      // Arrange
      jest.spyOn(Delivery, 'markWorksAsDelivered').mockResolvedValueOnce();

      // Act / Assert
      await expect(CwrExport.exportCwrDelivery({ deliveryId: delivery._id, markWorksAsDelivered: true, email }))
        .rejects
        .toThrow();

      // Assert
      const updatedDelivery = await CwrDelivery.findById(delivery._id);
      expect(updatedDelivery.status).toEqual('Errored');
      expect(updatedDelivery.errorMessage).toEqual('No Works found with Delivery filter');
    });
  });

  describe('when an error occurs during export', () => {
    it('should throw an error and set the Delivery status to Errored', async () => {
      // Arrange
      const mockError = new Error(randomString());
      jest.spyOn(Delivery, 'markWorksAsDelivered').mockRejectedValueOnce(mockError);

      // Act / Assert
      await expect(CwrExport.exportCwrDelivery({ deliveryId: delivery._id, markWorksAsDelivered: true, email }))
        .rejects
        .toThrow(mockError);

      // Assert
      const updatedDelivery = await CwrDelivery.findById(delivery._id);
      expect(updatedDelivery.status).toEqual('Errored');
      expect(updatedDelivery.errorMessage).toEqual(mockError.message);
    });
  });

  describe('when the Delivery has valid Works', () => {
    it('should complete the export and mark the Delivery & Works as delivered', async () => {
      // Arrange
      const works = [
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          valid: true,
        }),
        new Work({
          clientId: client._id.toString(),
          title: randomString(),
          valid: true,
        }),
      ];
      await Work.insertMany(works);

      delivery.workIds = works.map((work) => work._id.toString());
      await delivery.save();

      // Act
      await CwrExport.exportCwrDelivery({ deliveryId: delivery._id, markWorksAsDelivered: true, email });

      // Assert
      expect(fileManager.uploadToS3).toHaveBeenCalled();
      expect(fileManager.publicLink24Hours).toHaveBeenCalled();
      expect(ExportNotification.sendCwrExportNotification).toHaveBeenCalled();

      const [[_, filePath]] = fileManager.uploadToS3.mock.calls;
      expect(filePath.endsWith('.V22')).toEqual(true);

      const file = fs.readFileSync(filePath, 'utf-8');
      expect(file.split('\n').length).toEqual(works.length + 5); // 2 work + 2 header + 2 trailer + 1 empty lines

      // DeliveredWorks should have been created
      const deliveredWorks = await DeliveredWork.find({ clientId: client._id.toString(), cwrDeliveryId: delivery._id });
      expect(deliveredWorks.length).toEqual(works.length);
      expect(deliveredWorks.map((dw) => dw.workId.toString())).toEqual(
        expect.arrayContaining(works.map((w) => w._id.toString())),
      );

      // Delivery logs should have been created
      const deliveryLogs = await DeliveryLog.find({ clientId: client._id.toString(), deliveryPartnerId: deliveryPartner._id });
      expect(deliveryLogs.length).toEqual(works.length);
      expect(deliveryLogs.map((dl) => dl.workId.toString())).toEqual(
        expect.arrayContaining(works.map((w) => w._id.toString())),
      );

      // Works should now include a reference to the Delivery Partner
      const updatedWorks = await Work.find({ _id: { $in: works.map((w) => w._id) } }).lean();
      for (const work of updatedWorks) {
        expect(work.deliveredTo).toEqual([
          expect.objectContaining({
            deliveryPartnerId: deliveryPartner._id,
          }),
        ]);
      }
    });
  });
});
