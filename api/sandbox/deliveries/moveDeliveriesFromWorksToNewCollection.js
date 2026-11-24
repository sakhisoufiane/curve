require('dotenv').config();
require('../models/db');
const { DeliveredWorkController } = require('@curveroyaltysystems/curve-shared-logic');
const { eachLimit } = require('async');
const Client = require('../models/client');
const Work = require('../models/work');
const DeliveryPartner = require('../models/deliveryPartner');
const { ObjectId } = require('mongodb');
const CwrDelivery = require('../models/cwrDelivery');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');

/*
* Configure section
*
*/ 
// const clientFilter = { $in: ['61e85abbf9e0510114187067', '61ba3c19fec82a05ecf1c1fa', '5f8ef7fd6d763b001524c783'] }; // select clients
// const doClientFilter = { _id: clientFilter, clientType: 'Publisher' }; // select clients
const doClientFilter = {}; // all publisher clients
// configure end

const migrateDeliveries = async () => {
  const clients = await Client.find(doClientFilter).select({ _id: 1, name: 1 }).sort({ _id: 1 });
  totalClients = clients.length;

  await eachLimit(clients, 10, async (client) => await processClientWorks(client._id.toString() ));

  console.log();
  console.log('Done processing clients.');
  process.exit(0);
}

const processClientWorks = async (clientId, lastId) => {
  const limit = 200;

  const filter = { clientId };
  if (lastId) { filter._id = { $gt: lastId } }

  const works = await Work.find(filter).select({ _id: 1, deliveries: 1 }).sort({ _id: 1 }).limit(limit);

  await eachLimit(works, 100, async (work) => {
    
    let { deliveries } = work;
    if (deliveries && deliveries !== {}) {
      deliveries = reorderDeliveriesByDate(deliveries);
      for (const deliveryId of Object.keys(deliveries)) {
        
        const delivery = {
          clientId,
          workId: work._id,
          receivingParty: deliveries[deliveryId].receivingParty,
          status: deliveries[deliveryId].status ? deliveries[deliveryId].status : 'Delivered',
          deliveryDate: deliveries[deliveryId].deliveryDate,
          partnerId: deliveries[deliveryId].partnerId,
          title: deliveries[deliveryId].title,
          iswc: deliveries[deliveryId].iswc,
          messages: deliveries[deliveryId].messages,
          createdAt: deliveries[deliveryId].deliveryDate,
        };

        // if no deliveries[deliveryId].status should we still set status to delivered?

        // Delivery ID can be a cwrDelivery or a cwrAcknowledgement, we need to make sure which one it points to.
        const cwrDelivery = await CwrDelivery.findById(ObjectId(deliveryId), '_id deliveryPartnerId');
        if (cwrDelivery) {
          delivery.cwrDeliveryId = cwrDelivery._id;
          if (cwrDelivery?.deliveryPartnerId) {
            delivery.deliveryPartnerId = cwrDelivery.deliveryPartnerId;
          }
        } else {
          const cwrAcknowledgement = await CwrAcknowledgement.findById(deliveryId, '_id cwrDeliveryId source');
          if (cwrAcknowledgement) {
            const ackCwrDelivery = cwrAcknowledgement?.cwrDeliveryId ? await CwrDelivery.findById(cwrAcknowledgement.cwrDeliveryId, '_id deliveryPartnerId') : null;
            delivery.cwrAcknowledgementId = cwrAcknowledgement._id;
            if (ackCwrDelivery?.deliveryPartnerId) {
              delivery.deliveryPartnerId = ackCwrDelivery.deliveryPartnerId;
            } else {
              if (cwrAcknowledgement?.source) {
                const deliveryPartnerCount = await DeliveryPartner.countDocuments({ clientId, name: new RegExp(`^${cwrAcknowledgement.source}$`, 'i') });
                if (deliveryPartnerCount === 1) {
                  const deliveryPartnerIdByName = await DeliveryPartner.findOne({ clientId, name: new RegExp(`^${cwrAcknowledgement.source}$`, 'i') }).select({ _id: 1 });
                  delivery.deliveryPartnerId = deliveryPartnerIdByName?._id;
                }
              }
            }
          } else {
            const deliveryPartnerCount = await DeliveryPartner.countDocuments({ clientId, name: new RegExp(`^${deliveries[deliveryId].receivingParty}$`, 'i') });
            if (deliveryPartnerCount === 1) {
              const deliveryPartnerIdByName = await DeliveryPartner.findOne({ clientId, name: new RegExp(`^${deliveries[deliveryId].receivingParty}$`, 'i') }).select({ _id: 1 });
              delivery.deliveryPartnerId = deliveryPartnerIdByName?._id;
            } else {
              console.log('ISSUE FOUND');
              console.log(`work ${work._id.toString()} delivery ${deliveryId} ${deliveries[deliveryId].receivingParty}`);
            }
          }
        }
  
        // Check if we need this extra check - checked and agreed with TOM
        // Only create a delivery if it matches a CWR delivery or CWR Acknowledgement.
        //if (delivery.cwrDeliveryId || delivery.cwrAcknowledgementId) {
        await DeliveredWorkController.create(delivery);
        //}
      }
    }
    
  });

  if (works?.length === limit) { await processClientWorks(clientId, works[works.length -  1]._id); }
}

function reorderDeliveriesByDate(deliveries) {
  // Convert the deliveries object into an array of [key, value] pairs
  const deliveryEntries = Object.entries(deliveries);

  // Sort the deliveryEntries array by deliveryDate in ascending order
  deliveryEntries.sort((a, b) => new Date(a[1].deliveryDate) - new Date(b[1].deliveryDate));

  // Convert the sorted deliveryEntries array back into an object
  const reorderedDeliveries = {};
  deliveryEntries.forEach(([key, value]) => {
    reorderedDeliveries[key] = value;
  });

  return reorderedDeliveries;
}


const removeDeliveriesFromWorks = async () => {
  let totalClientsProcessed = 0;
  const clients = await Client.find(doClientFilter).sort({ _id: 1 });
  totalClients = clients.length;

  await eachLimit(clients, 10, async (client) => {
    await Work.updateMany({ clientId: client._id.toString(), deliveries: { $exists: true } }, { $unset: { deliveries: 1 } });
    totalClientsProcessed += 1;
    process.stdout.write(`\rRemoving deliveries from works ${((totalClientsProcessed/clients.length)*100).toFixed(2)}% .. `)
  });

  console.log();
  console.log('Done clearing works');
  process.exit(0);
}

migrateDeliveries();

// removeDeliveriesFromWorks();