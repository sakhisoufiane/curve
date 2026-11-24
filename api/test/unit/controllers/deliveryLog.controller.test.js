process.env.NODE_ENV = 'test';
require('../../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { randomString, randomId } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const sinon = require('sinon');
const { expect } = require('chai');

const moment = require('moment');

const { DeliveryLogController } = require('@curveroyaltysystems/curve-shared-logic');
const DeliveryLog = require('../../../models/deliveryLog');

describe('Delivery Log Controller', () => {
  logger.info('\n\n**** .test/unit/controllers/deliveryLog.controller.test.js');

  describe('#addLog', () => {
    let clientId; let deliveryPartnerId; let workId; let deliveredWorkId; let cwrDeliveryId; let cwrAcknowledgementId; let status; let action;
    beforeEach((done) => {
      clientId = randomId();
      deliveryPartnerId = randomId();
      workId = randomId();
      deliveredWorkId = randomId();
      cwrDeliveryId = randomId();
      cwrAcknowledgementId = randomId();
      status = randomString();
      action = randomString();

      // Stubs
      sinon.stub(DeliveryLog, 'updateOne').resolves([]);
      done();
    });

    afterEach((done) => {
      sinon.restore();
      done();
    });

    it('should call Delivery.updateOne', async () => {
      // Act
      await DeliveryLogController.addLog({ DeliveryLog, clientId, deliveryPartnerId, workId, deliveredWorkId, cwrDeliveryId, cwrAcknowledgementId, status, action });
      // Assert
      expect(DeliveryLog.updateOne.called).to.be.true;
    });
    it('should call Delivery.updateOne with the correct params', async () => {
      // Arrange
      const filter = { clientId, deliveryPartnerId, workId };

      const update = {
        $push: {
          log: {
            deliveredWorkId,
            cwrDeliveryId,
            cwrAcknowledgementId,
            status,
            action,
            date: moment().format(),
          },
        },
        $setOnInsert: { clientId, deliveryPartnerId, workId },
      };

      const options = { upsert: true };

      // Act
      await DeliveryLogController.addLog({ DeliveryLog, clientId, deliveryPartnerId, workId, deliveredWorkId, cwrDeliveryId, cwrAcknowledgementId, status, action });
      // Assert
      expect(DeliveryLog.updateOne.calledWith(filter, update, options)).to.be.true;
    });
    it('should return log', async () => {
      // Act
      const log = await DeliveryLogController.addLog({ DeliveryLog, clientId, deliveryPartnerId, workId, deliveredWorkId, cwrDeliveryId, cwrAcknowledgementId, status, action });
      // Assert
      expect(log).to.deep.eq([]);
    });
    describe('Delivery.UpdateOne does not find a log', async () => {
      it('should return undefined', async () => {
        // Arrange
        DeliveryLog.updateOne.resolves(undefined);
        // Act
        const log = await DeliveryLogController.addLog({ DeliveryLog, clientId, deliveryPartnerId, workId, deliveredWorkId, cwrDeliveryId, cwrAcknowledgementId, status, action });
        // Assert
        expect(log).to.deep.eq(undefined);
      });
    });
  });
});
