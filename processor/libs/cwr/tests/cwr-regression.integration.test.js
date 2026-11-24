// CWR files have a date value in the header
// This needs to be deterministic when comparing in the test suite
jest.mock('moment', () => jest.fn(() => ({ format: jest.fn((format) => {
  const moment = jest.requireActual('moment');
  return moment.utc('2025-01-01T00:00:00.000Z').format(format);
}) })));

const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const fs = require('fs');
const path = require('path');

const testData = require('./fixtures/regression-client-data.json');

const CwrExport = require('../export');
const ExportNotification = require('../../exportNotification/exportNotification');
const Client = require('../../../models/client');
const Work = require('../../../models/work');
const DeliveryPartner = require('../../../models/deliveryPartner');
const CwrDelivery = require('../../../models/cwrDelivery');
const TerritoryGroup = require('../../../models/territoryGroup');
const Publisher = require('../../../models/publisher');
const Composer = require('../../../models/composer');

for (const delivery of testData.deliveries) {
  describe(`CWR Regression Tests — Delivery ${delivery._id} ${delivery.name}`, () => {
    let deliveryId;
    let email;

    beforeEach(async () => {
      deliveryId = delivery._id;
      email = randomString();

      // Remove all test suite data from the database
      // Needs to be done per test run to avoid duplicate key errors on unique indexes
      await Promise.all([
        Client.deleteOne({ _id: testData.client._id }),
        Work.deleteMany({ _id: { $in: testData.works.map((w) => w._id) } }),
        DeliveryPartner.deleteMany({ _id: { $in: testData.deliveryPartners.map((d) => d._id) } }),
        CwrDelivery.deleteMany({ _id: { $in: testData.deliveries.map((d) => d._id) } }),
        TerritoryGroup.deleteMany({ _id: { $in: testData.territoryGroups.map((d) => d._id) } }),
        Publisher.deleteMany({ _id: { $in: testData.publishers.map((d) => d._id) } }),
        Composer.deleteMany({ _id: { $in: testData.composers.map((d) => d._id) } }),
      ]);

      // Insert all test suite data into the database
      await Promise.all([
        Client.insertMany([testData.client]),
        Work.insertMany(testData.works),
        DeliveryPartner.insertMany(testData.deliveryPartners),
        CwrDelivery.insertMany(testData.deliveries),
        TerritoryGroup.insertMany(testData.territoryGroups),
        Publisher.insertMany(testData.publishers),
        Composer.insertMany(testData.composers),
      ]);

      jest.spyOn(fileManager, 'uploadToS3').mockImplementation((key, path, cb) => cb());
      jest.spyOn(fileManager, 'publicLink24Hours').mockImplementation((key, cb) => cb(null, randomString()));
      jest.spyOn(ExportNotification, 'sendCwrExportNotification').mockResolvedValue();
    });

    it('should generate the expected CWR file', async () => {
      // Act
      await CwrExport.exportCwrDelivery({ deliveryId, markWorksAsDelivered: false, email });

      // Assert
      const [[_, filePath]] = fileManager.uploadToS3.mock.calls;
      const file = fs.readFileSync(filePath, 'utf-8');
      const expectedFilePath = `${__dirname}/fixtures/${deliveryId}${path.extname(filePath)}`;
      const expectedFile = fs.readFileSync(expectedFilePath, 'utf-8');

      const lines = file.split('\n');
      const expectedLines = expectedFile.split('\n');

      // Compare line-by-line to give better diffs on failure
      for (let i = 0; i < lines.length; i += 1) {
        try {
          expect(lines[i]).toEqual(expectedLines[i]);
        } catch (e) {
          // Prepend the line number to the existing Jest failure message
          e.message = `Line ${i + 1} of ${filePath} does not match the expected output in ${expectedFilePath}:\n\n${e.message}`;
          throw e;
        }
      }

      // Sanity check the entire file again without line-by-line comparison
      expect(file).toEqual(expectedFile);
    });
  });
}
