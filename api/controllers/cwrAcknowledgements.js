const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { DeliveredWorkController, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { Document } = require('@curveroyaltysystems/models/mongoose');

const CwrDelivery = require('../models/cwrDelivery');
const DeliveredWork = require('../models/deliveredWork');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const Payee = require('../models/payee');

const CwrAcknowledgementController = this;

const populateLinkedDelivery = async (cwrAcknowledgement) => {
  let obj = cwrAcknowledgement;
  if (cwrAcknowledgement instanceof Document) {
    obj = cwrAcknowledgement.toObject();
  }

  const deliveredWork = await DeliveredWork.findOne({ cwrDeliveryId: cwrAcknowledgement.cwrDeliveryId, deliveryDate: { $exists: true } });
  if (deliveredWork) { obj.linkedDeliveryDate = deliveredWork.deliveryDate; }

  const cwrDelivery = await CwrDelivery.findById(cwrAcknowledgement.cwrDeliveryId);
  if (cwrDelivery) { obj.linkedDeliveryName = cwrDelivery.name; }
  return obj;
};

CwrAcknowledgementController.getCwrAcknowledgement = async (params, curveUser) => {
  logger.debug(`Fetching CwrAcknowledgement: ${params.id} ...`);

  let cwrAcknowledgement = await CwrAcknowledgement.findById(params.id).populate('deliveryPartnerId', 'name');
  if (!cwrAcknowledgement) {
    const error = new Error(`Could not find Delivery with ID ${params.id}`);
    error.status = 404;
    throw error;
  }
  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: cwrAcknowledgement, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  logger.debug('Fetching Rejected Deliveries...');
  // Check if it contains rejected works
  const rejectedDeliveries = await DeliveredWorkController.count(
    {
      DeliveredWork,
      filter: {
        clientId: cwrAcknowledgement.clientId,
        $or: [
          { cwrAcknowledgementId: cwrAcknowledgement._id },
          { cwrDeliveryId: cwrAcknowledgement.cwrDeliveryId },
        ],
        status: { $in: ['Rejected', 'Claim Rejected', 'Conflict'] },
      },
    },
  );
  if (rejectedDeliveries) {
    cwrAcknowledgement = JSON.parse(JSON.stringify(cwrAcknowledgement));
    cwrAcknowledgement.containsRejected = true;
  }

  logger.debug('Populating Linked Delivery ...');
  if (cwrAcknowledgement.cwrDeliveryId) { cwrAcknowledgement = await populateLinkedDelivery(cwrAcknowledgement); }

  return cwrAcknowledgement;
};

module.exports = CwrAcknowledgementController;
