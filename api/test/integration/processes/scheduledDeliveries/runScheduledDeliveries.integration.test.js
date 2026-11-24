/* eslint-disable quotes */
process.env.NODE_ENV = 'test';
require('../../../../models/db');

const fs = require('fs');
const { expect } = require('chai');
const sinon = require('sinon');
const moment = require('moment');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { cleanUp, randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

process.env.environmentName = "test";
const RunScheduledDeliveries = require('../../../../processes/scheduledDeliveries/runScheduledDeliveries');
const SendEmail = require('../../../../libs/sendEmail');
const Client = require('../../../../models/client');
const DeliverySchedule = require('../../../../models/deliverySchedule');
const DeliveryPartner = require('../../../../models/deliveryPartner');
const Work = require('../../../../models/work');
const CwrDelivery = require('../../../../models/cwrDelivery');

describe('process: runScheduledDeliveries', () => {
  logger.info(
    '>>>file>>>> int/processes/scheduledDeliveries/runScheduledDeliveries .....................',
  );
  let client;
  let deliveryPartner;
  let deliverySchedule;
  let works;

  beforeEach((done) => {
    sinon.stub(SendEmail, 'deliveryComplete');
    SendEmail.deliveryComplete.yields();

    sinon.stub(SendEmail, 'cwrDelivery');
    SendEmail.cwrDelivery.yields();

    sinon.stub(fileManager, 'uploadToS3');
    fileManager.uploadToS3.yields(null);
    sinon.stub(fileManager, 'publicLink7Days');
    fileManager.publicLink7Days.yields(null, "fake-s3-link", deliveryPartner);

    sinon.spy(DeliverySchedule, 'findByIdAndUpdate');

    done();
  });

  describe("runScheduledDeliveries", () => {
    beforeEach(async () => {
      client = new Client({
        _id: randomId(),
        name: randomString(),
        deliveryEmails: [randomString()],
        createdBigQueryTables: true,
        createdBigQueryBackups: true,
      });
      await client.save();

      deliveryPartner = await new DeliveryPartner({
        _id: randomId(),
        clientId: client._id.toString(),
        name: randomString(),
        receivingParty: "ASCAP",
        territory: "WW",
        type: 'Email',
        outputFormat: "CWR",
        notificationEmail: randomString(),
      }).save();

      deliverySchedule = await new DeliverySchedule({
        _id: randomId(),
        clientId: client._id.toString(),
        name: randomString(),
        deliveryPartnerId: deliveryPartner._id.toString(),
        filterType: "newAndUpdated",
        filter: [],
        additionalCustomFilters: null,
        active: true,
        scheduleType: 'Month',
        scheduleDay: moment().startOf('day').format('DD'),
      }).save();

      works = [
        await new Work({
          _id: randomId(),
          clientId: client._id.toString(),
          inFutureDelivery: deliverySchedule._id.toString(),
          title: randomString(),
          territories: ['WW'],
          rightsChain: [
            {
              territory: 'WW',
              totalMechanicalOwnership: 100,
              totalPerformanceOwnership: 100,
              totalMechanicalCollection: 100,
              totalPerformanceCollection: 100,
              mechanicalCollection: 0,
              mechanicalOwnership: 0,
              performanceCollection: 0,
              performanceOwnership: 0,
              children: [
                {
                  type: 'Publisher',
                  contractType: 'Original Publisher',
                  controlled: true,
                  mechanicalCollection: 100,
                  performanceCollection: 50,
                  mechanicalOwnership: 100,
                  performanceOwnership: 50,
                  children: [
                    {
                      type: 'Composer',
                      contractType: 'Music',
                      controlled: true,
                      performanceOwnership: 50,
                      performanceCollection: 50,
                      mechanicalCollection: 0,
                      mechanicalOwnership: 0,
                      composerId: randomId(),
                    },
                  ],
                  publisherId: randomId(),
                },
              ],
            },
          ],
        }).save(),
      ];

      deliverySchedule.filter = works.map((work) => work._id.toString());
      await deliverySchedule.save();
    });

    describe("delivery type is Export Only", () => {
      it('should not run a scheduled delivery', async () => {
        // Arrange
        deliveryPartner.type = "Export Only";
        await deliveryPartner.save();
        // Act
        await RunScheduledDeliveries.run();
        // Assert
        // It should have given up before reaching this DB call
        expect(CwrDelivery.findByIdAndUpdate.args).to.be.undefined;
      });
    });

    describe("delivery type is Email", () => {
      it('should send scheduled deliveries for any valid deliveries & works', async () => {
        // Act
        await RunScheduledDeliveries.run();
        // Assert
        // It should send the delivery to the partner specified email
        expect(SendEmail.cwrDelivery.args[0][0]).to.equal(deliveryPartner.notificationEmail);
        // It should be for the correct client
        expect(SendEmail.cwrDelivery.args[0][2]._id).to.eql(client._id);
        // It should be for the correct scheduled delivery
        expect(SendEmail.cwrDelivery.args[0][5]).to.include({
          clientId: client._id.toString(),
          deliveryPartnerId: deliveryPartner._id.toString(),
          territory: deliveryPartner.territory,
          outputFormat: deliveryPartner.outputFormat,
        });
        // It should include the correct work ids
        expect(SendEmail.cwrDelivery.args[0][5].workIds).to.eql(works.map((work) => work._id.toString()));

        // Check the correct works have been added to the CWR output file
        expect(fileManager.uploadToS3.callCount).to.equal(1);

        const tempPath = fileManager.uploadToS3.args[0][1];
        const file = fs.readFileSync(tempPath).toString();
        const lines = file.split('\n');
        const workLine = lines.find((line) => line.startsWith("REV") && line.includes(works[0].title.toUpperCase()));

        expect(lines.filter((line) => line.startsWith("REV")).length).to.equal(works.length);
        expect(workLine).to.not.be.undefined;
      });
    });
  });

  afterEach((done) => {
    sinon.restore();
    cleanUp(done);
  });
});
