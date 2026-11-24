require('dotenv').config();
require('../models/db');
const fs = require('fs');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall, map, } = require('async');
const appRootDir = require('app-root-dir').get();
const Delivery = require('../models/cwrDelivery');
const DeliveryPartner = require('../models/deliveryPartner');
const Client = require('../models/client');
const Work = require('../models/work');
const TerritoryGroup = require('../models/territoryGroup');
const IswcRegistration = require('../libs/deliveries/iswcRegistration');

Delivery.findById('62cf3fae1616ed68841f884f', (err, delivery) => {
  Client.findById(delivery.clientId, (err, client) => {
    DeliveryPartner.findById(delivery.deliveryPartnerId, (err, deliveryPartner) => {
      const clientId = client._id.toString();
      const clientName = client.name;
      let territory = [delivery.territory];
      let worksFilter = {};
      waterfall([
        function (cb) {
          logger.info(`Delivery: ${delivery._id} - Building works filter`);
          // Get filter
          delivery.buildWorksFilter('All', cb);
        },
        function (filter, cb) {
          // Get works
          logger.info(`Delivery: ${delivery._id} - Getting all works for filter`);
          logger.debug(filter);
          worksFilter = filter;
          Work.find(filter, cb);
        },
        function (works, cb) {
          // Get CWR works data
          logger.info(`Delivery: ${delivery._id} - No of Works for Delivery: ${works.length}`);
          // Check if territory is a group
          TerritoryGroup.findById(delivery.territory, (err, territoryGroup) => {
            if (territoryGroup) {
              territory = territoryGroup.territories;
            }
            logger.info(`Delivery: ${delivery._id} - Getting delivery data for works`);
            map(works, (work, workCb) => {
              work.deliveryData(territory, delivery.outputFormat === 'Catalogue Shipment', deliveryPartner, (delErr, workDelData) => {
                if (delErr) { logger.error(`Delivery: ${delivery._id} - Error while getting deliveryData for work ${work?._id} - ${delErr}`); }
                workCb(delErr, workDelData);
              });
            }, (mapErr, works) => {
              if (mapErr) {
                cb(mapErr);
              } else {
                works = works.filter(Boolean);
                cb(null, works);
              }
            });
          });
        },
        function (works, cb) {
          const senderName = client.cwrPartyName ? client.cwrPartyName : client.name;
          let { ipiNo } = client;
          if (deliveryPartner && deliveryPartner.ipiNo) {
            ipiNo = deliveryPartner.ipiNo;
          }
          const iswcRegistration = new IswcRegistration();
          iswcRegistration.createData(works, {
            senderName,
            sendingParty: client.cwrPartyId,
            receivingParty: delivery.receivingParty,
            ipiNo,
            sequenceNo: delivery.sequenceNo,
            email: 'tom@curveroyaltysystems.com',
            role: 'AM',
          }, (err, data) => {
            const json = JSON.stringify(data);
            fs.writeFileSync(`${appRootDir}/tmp/jsonoutout.json`, json);
            console.log(json);
          });
        }
      ]);
    });
  });
});

