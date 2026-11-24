require('dotenv').config();
require('../models/db');
const { eachLimit } = require('async');
const { ObjectId } = require('mongodb');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const DeliveryLog = require('../models/deliveryLog');
const DeliveredWork = require('../models/deliveredWork');

// Function to remove entries from the MongoDB collection
async function removeAckEntries() {
  const clientId = '5fbfc8e0b218a2000f1a5d99';
  const acknowledgementIds = [
    '655f64493481ca6dfa92858b',
    '655f644a3481ca6dfa92859a',
    '655f644c3481ca6dfa9285b8',
    '655f644d3481ca6dfa9285c7',
    '655f64533481ca6dfa928612',
    '655f645a3481ca6dfa928699',
    '655f64603481ca6dfa928711',
    '655f64613481ca6dfa928720',
    '655f64633481ca6dfa92873e',
    '655f64643481ca6dfa92874d',
    '655f64683481ca6dfa9287a7',
    '655f64693481ca6dfa9287b6',
    '655f646d3481ca6dfa9287f2',
    '655f64703481ca6dfa92881f',
    '655f64753481ca6dfa92886a',
    '655f64793481ca6dfa9288b5',
    '655f647d3481ca6dfa928900',
    '655f648b3481ca6dfa9289f0',
    '655f648f3481ca6dfa928a2c',
    '655f64913481ca6dfa928a59',
    '655f64943481ca6dfa928a86',
    '655f649b3481ca6dfa928afe',
    '655f649e3481ca6dfa928b49',
    '655f649f3481ca6dfa928b58',
    '655f64a13481ca6dfa928b76',
    '655f64a23481ca6dfa928b85',
    '655f64a73481ca6dfa928bc1',
    '655f64a93481ca6dfa928bdf',
    '655f64aa3481ca6dfa928bee',
    '655f64ac3481ca6dfa928c1b',
    '655f64b13481ca6dfa928c75',
    '655f64b23481ca6dfa928c84',
    '655f64bc3481ca6dfa928ced',
    '655f64be3481ca6dfa928d0b',
    '655f64c13481ca6dfa928d38',
    '655f64c13481ca6dfa928d47',
    '655f64c23481ca6dfa928d56',
    '655f64c53481ca6dfa928d83',
    '655f64cd3481ca6dfa928e0a',
    '655f64d43481ca6dfa928e64',
    '655f64d63481ca6dfa928e82',
    '655f64db3481ca6dfa928ecd',
    '655f64dd3481ca6dfa928eeb',
    '655f64e03481ca6dfa928f09',
    '655f64e33481ca6dfa928f36',
    '655f64e93481ca6dfa928f81',
    '655f64eb3481ca6dfa928f9f',
    '655f64ee3481ca6dfa928fcc',
    '655f64f33481ca6dfa929027',
    '655f64f63481ca6dfa929054',
    '655f64f73481ca6dfa929063',
    '655f64f93481ca6dfa929090',
    '655f64fa3481ca6dfa92909f',
    '655f644f3481ca6dfa9285e5',
    '655f64513481ca6dfa928603',
    '655f64553481ca6dfa92864e',
    '655f645e3481ca6dfa9286e4',
    '655f645f3481ca6dfa928702',
    '655f64653481ca6dfa92876b',
    '655f64663481ca6dfa92877a',
    '655f646c3481ca6dfa9287e3',
    '655f646e3481ca6dfa928801',
    '655f646f3481ca6dfa928810',
    '655f64733481ca6dfa92883d',
    '655f64733481ca6dfa92884c',
    '655f64773481ca6dfa928888',
    '655f64783481ca6dfa9288a6',
    '655f647f3481ca6dfa92891e',
    '655f64803481ca6dfa92892d',
    '655f64873481ca6dfa9289b4',
    '655f648a3481ca6dfa9289e1',
    '655f648e3481ca6dfa928a1d',
    '655f64933481ca6dfa928a77',
    '655f64953481ca6dfa928a95',
    '655f64983481ca6dfa928ad1',
    '655f64983481ca6dfa928ae0',
    '655f64a63481ca6dfa928bb2',
    '655f64ae3481ca6dfa928c2a',
    '655f64ae3481ca6dfa928c39',
    '655f64b93481ca6dfa928cc0',
    '655f64c63481ca6dfa928da1',
    '655f64c83481ca6dfa928dbf',
    '655f64cf3481ca6dfa928e28',
    '655f64d83481ca6dfa928ea0',
    '655f64ea3481ca6dfa928f90',
    '655f64ed3481ca6dfa928fbd',
    '655f64f43481ca6dfa929036',
    '655f644e3481ca6dfa9285d6',
    '655f64503481ca6dfa9285f4',
    '655f64543481ca6dfa928630',
    '655f64553481ca6dfa92863f',
    '655f64583481ca6dfa92867b',
    '655f645b3481ca6dfa9286a8',
    '655f64623481ca6dfa92872f',
    '655f64673481ca6dfa928789',
    '655f64783481ca6dfa928897',
    '655f647a3481ca6dfa9288c4',
    '655f647b3481ca6dfa9288d3',
    '655f647b3481ca6dfa9288e2',
    '655f647c3481ca6dfa9288f1',
    '655f647e3481ca6dfa92890f',
    '655f64843481ca6dfa928978',
    '655f64863481ca6dfa928996',
    '655f64873481ca6dfa9289a5',
    '655f64883481ca6dfa9289c3',
    '655f648c3481ca6dfa9289ff',
    '655f648e3481ca6dfa928a0e',
    '655f64903481ca6dfa928a3b',
    '655f64963481ca6dfa928aa4',
    '655f64963481ca6dfa928ab3',
    '655f64973481ca6dfa928ac2',
    '655f649a3481ca6dfa928aef',
    '655f649b3481ca6dfa928b0d',
    '655f64a03481ca6dfa928b67',
    '655f64a43481ca6dfa928b94',
    '655f64a43481ca6dfa928ba3',
    '655f64a83481ca6dfa928bd0',
    '655f64ab3481ca6dfa928bfd',
    '655f64af3481ca6dfa928c48',
    '655f64b03481ca6dfa928c57',
    '655f64b33481ca6dfa928c93',
    '655f64b73481ca6dfa928ca2',
    '655f64b83481ca6dfa928cb1',
    '655f64bd3481ca6dfa928cfc',
    '655f64c33481ca6dfa928d65',
    '655f64c73481ca6dfa928db0',
    '655f64c93481ca6dfa928dce',
    '655f64ca3481ca6dfa928ddd',
    '655f64cb3481ca6dfa928dec',
    '655f64ce3481ca6dfa928e19',
    '655f64d03481ca6dfa928e46',
    '655f64d73481ca6dfa928e91',
    '655f64d93481ca6dfa928eaf',
    '655f64de3481ca6dfa928efa',
    '655f64e13481ca6dfa928f18',
    '655f64e23481ca6dfa928f27',
    '655f64e43481ca6dfa928f45',
    '655f64e53481ca6dfa928f54',
    '655f64e83481ca6dfa928f72',
    '655f64ec3481ca6dfa928fae',
    '655f64ef3481ca6dfa928fdb',
    '655f64f03481ca6dfa928fea',
    '655f64f13481ca6dfa929009',
    '655f64f43481ca6dfa929045',
    '655f64f83481ca6dfa929081',
    '655f64fc3481ca6dfa9290ae',
    '655f644b3481ca6dfa9285a9',
    '655f64533481ca6dfa928621',
    '655f64563481ca6dfa92865d',
    '655f64573481ca6dfa92866c',
    '655f64593481ca6dfa92868a',
    '655f645b3481ca6dfa9286b7',
    '655f645c3481ca6dfa9286c6',
    '655f645d3481ca6dfa9286d5',
    '655f645e3481ca6dfa9286f3',
    '655f64643481ca6dfa92875c',
    '655f64683481ca6dfa928798',
    '655f646a3481ca6dfa9287c5',
    '655f646b3481ca6dfa9287d4',
    '655f64723481ca6dfa92882e',
    '655f64743481ca6dfa92885b',
    '655f64763481ca6dfa928879',
    '655f64813481ca6dfa92893c',
    '655f64823481ca6dfa92894b',
    '655f64833481ca6dfa92895a',
    '655f64833481ca6dfa928969',
    '655f64853481ca6dfa928987',
    '655f64893481ca6dfa9289d2',
    '655f64913481ca6dfa928a4a',
    '655f64923481ca6dfa928a68',
    '655f649c3481ca6dfa928b1c',
    '655f649d3481ca6dfa928b2b',
    '655f649d3481ca6dfa928b3a',
    '655f64ac3481ca6dfa928c0c',
    '655f64b13481ca6dfa928c66',
    '655f64bb3481ca6dfa928ccf',
    '655f64bb3481ca6dfa928cde',
    '655f64bf3481ca6dfa928d1a',
    '655f64c03481ca6dfa928d29',
    '655f64c43481ca6dfa928d74',
    '655f64c53481ca6dfa928d92',
    '655f64cc3481ca6dfa928dfb',
    '655f64d03481ca6dfa928e37',
    '655f64d23481ca6dfa928e55',
    '655f64d53481ca6dfa928e73',
    '655f64da3481ca6dfa928ebe',
    '655f64dc3481ca6dfa928edc',
    '655f64e63481ca6dfa928f63',
    '655f64f03481ca6dfa928ff9',
    '655f64f23481ca6dfa929018',
    '655f64f73481ca6dfa929072',
    '655f64fd3481ca6dfa9290bd',
    '655f64fe3481ca6dfa9290cc',
  ];

  try {
    for (const ackId of acknowledgementIds) {
      const filter = {
        clientId,
        log: {
          $elemMatch: {
            acknowledgementId: { $eq: ObjectId(ackId) },
            action: 'Acknowledgment'
          }
        }
      };

      const update = {
        $pull: {
          log: {
            acknowledgementId: { $eq: ObjectId(ackId) },
            action: 'Acknowledgment'
          }
        }
      };

      // Update the DeliveryLog collection to remove matching entries in log array
      const result = await DeliveryLog.updateMany(filter, update);
      console.log(`${result.modifiedCount} DeliveryLog document(s) matched and updated for ${ackId}`);


      // Delete the deliveredWorks doc created by this run for this Ack file
      const startDate = new Date('2023-11-23T00:00:00Z');
      const endDate = new Date('2023-11-24T00:00:00Z');

      const dwFilter = { clientId,
        createdAt: {
          $gte: startDate,
          $lt: endDate
        },
        cwrAcknowledgementId: ObjectId(ackId)
      }
      const removalDW = await DeliveredWork.deleteMany(dwFilter);
      console.log(`${removalDW.deletedCount} DeliveredWork document(s) matched and deleted for ${ackId}`);

      // Delete the main Ack document
      const removal = await CwrAcknowledgement.findByIdAndDelete(ackId);
      if (removal) {
        console.log(`${ackId} CwrAcknowledgement document deleted.`);
      }

      // What about the DeliveredWorks entries that were existing at the point of this ingestion? How do we know the status at this point?
      // Lets look for the deliveredWorks that still have an updated date of the 23rd and find the latest deliveryLog entry for these
      const dwUpdateFilter = { clientId: '5fbfc8e0b218a2000f1a5d99',
        updatedAt: {
          $gte: startDate,
          $lt: endDate
        },
        cwrAcknowledgementId: { $in: ObjectId(ackId) }
      }
      const toUpdatedDeliveredWorks = await DeliveredWork.find(dwUpdateFilter);
      await eachLimit(toUpdatedDeliveredWorks, 10, async (toUpdatedDeliveredWork) => {
        // for each deliveredWork find the delivery log for this partner and work - return the last log entry
        const logFilter = { clientId, deliveryPartnerId: toUpdatedDeliveredWork.deliveryPartnerId, workId: toUpdatedDeliveredWork.workId }
        const deliveryLog = await DeliveryLog.findOne(logFilter, { log: { $slice: -1 } });
        // if we have a log entry then we can use this to update the DeliveredWork to the last entry before 23rd
        if (deliveryLog?.log?.length) {
          const latest = deliveryLog.log[0];
          const updatedDeliveredWork = await DeliveredWork.findByIdAndUpdate(
            latest.deliveredWorkId,
            { $set: { status: latest.status, updatedAt: latest.date, cwrAcknowledgementId: latest?.acknowledgementId, partnerId: latest?.partnerId } },
            { timestamps: false }
          );
          console.log(`${latest.deliveredWorkId} DeliveredWork document updated.`);
        }
        // What should we do if we dont find a delivery log entry??? Mark the deliveredWork as Delivered only?
      });


      
    }
  } catch (err) {
    console.error("Error:", err);
  }
  
  process.exit(-1);
}

// Call the function to remove entries
removeAckEntries();
