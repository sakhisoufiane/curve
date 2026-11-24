const mongoose = require('@curveroyaltysystems/models/mongoose');
const { DeliveryPartner: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate-v2');
const _ = require('lodash');
const modelHistory = require('../libs/modelHistory');

const deliveryPartnerSchema = schema;

deliveryPartnerSchema.plugin(modelHistory, { mongoose, name: 'deliveryPartnerPatches' });
deliveryPartnerSchema.plugin(mongoosePaginate);

deliveryPartnerSchema.pre('save', async function (next) {
  const deliveryPartner = this;
  let error;
  if ((deliveryPartner.type === 'FTP' || deliveryPartner.type === 'SFTP' || deliveryPartner.type === 'FTPS')
  && (!deliveryPartner.ftpHost
    || !deliveryPartner.ftpUsername
    || (!deliveryPartner.ftpPassword && deliveryPartner.ftpAuthenticationType === 'Password')
    || !deliveryPartner.ftpRootDir)) {
    error = new Error('Please complete FTP details for this Delivery Partner');
  } else if (deliveryPartner.type === 'Email' && !deliveryPartner.notificationEmail) {
    error = new Error('Please add at least one email address for deliveries to this Partner');
  } else if (!deliveryPartner.receivingParty) {
    error = new Error('A Receiving Party is required');
  } else if (!deliveryPartner.territory && ['ISWC Allocation (IAS)', 'ISWC Resolution (IRS)'].indexOf(deliveryPartner.outputFormat) === -1) {
    error = new Error('A Territory is required');
  } else if (deliveryPartner.splitElection && (!deliveryPartner.splitElectionPRO || deliveryPartner.splitElectionPRO === '')) {
    error = new Error('Split Election Pro is required');
  } else if (!deliveryPartner.name) {
    error = new Error('A Name is required');
  } else if (!deliveryPartner.type) {
    error = new Error('A Delivery Type is required');
  }

  const regex = new RegExp(`^${_.escapeRegExp(deliveryPartner.name)}$`, 'i');
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    clientId: deliveryPartner.clientId,
    name: {
      $regex: regex,
    },
    _id: { $ne: deliveryPartner._id },
  });

  if (existingDeliveryPartner) {
    error = new Error('Could not save Delivery Partner - Name needs to be unique');
  }

  if (error) {
    error.showToUser = true;
  }

  next(error);
});

const DeliveryPartner = mongoose.model(name, deliveryPartnerSchema);

module.exports = DeliveryPartner;
