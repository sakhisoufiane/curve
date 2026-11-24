/* eslint-disable no-promise-executor-return */
const { CwrDeliveryController } = require('@curveroyaltysystems/curve-shared-logic');

const TerritoryGroup = require('../../models/territoryGroup');
const Work = require('../../models/work');
const Track = require('../../models/track');
const Publisher = require('../../models/publisher');
const Composer = require('../../models/composer');
const Release = require('../../models/release');

// Batch size for processing Works
const LIMIT = 50_000;

async function createISWCRegistrationWork({ iswcRegistration, filter, delivery, deliveryPartner, territory, client, email, submissionType, options }) {
  const senderName = client.cwrPartyName ? client.cwrPartyName : client.name;
  let { ipiNo } = client;
  if (deliveryPartner && deliveryPartner.ipiNo) {
    ({ ipiNo } = deliveryPartner);
  }

  // Get works
  const { works } = await CwrDeliveryController.getWorksForDelivery({
    delivery,
    deliveryPartner,
    filter,
    options,
    territory,
    limit: LIMIT,
    TerritoryGroup,
    Work,
    Track,
    Publisher,
    Composer,
    Release,
  });

  // Add data to output
  await new Promise((resolve) => iswcRegistration.createData(works, {
    senderName,
    sendingParty: client.cwrPartyId,
    receivingParty: delivery.receivingParty,
    ipiNo,
    sequenceNo: delivery.sequenceNo,
    email,
    role: 'AM',
    submissionType,
  }, resolve));

  if (works.length === LIMIT) {
    // If works total is limit, then we need to loop through filter again and grab next batch and repeat
    await createISWCRegistrationWork({
      iswcRegistration,
      filter,
      delivery,
      deliveryPartner,
      territory,
      client,
      email,
      submissionType,
      options: { lastId: works[works.length - 1]._id },
    });
  }
}

module.exports = {
  createISWCRegistrationWork,
};
