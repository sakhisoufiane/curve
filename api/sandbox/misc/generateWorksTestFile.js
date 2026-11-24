require('dotenv').config();
require('../../models/db');
const fs = require('fs');
const _ = require('lodash');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliveryPartner = require('../../models/deliveryPartner');

// const id = '66a1452b81cc8022e031ba8f'; // P3
// const deliveryPartnerId = '66a1452b81cc8022e031ba8f'; // P3

const id = '66a145422434dc9531328256'; // P4
const deliveryPartnerId = '66a145062434dc9531327d60'; // P4

async function main() {
  const [cwrDelivery, deliveryPartner] = await Promise.all([
    CwrDelivery.findById(id),
    DeliveryPartner.findById(deliveryPartnerId),
  ]);

  const { works, updatedTerritory } = await new Promise((resolve, reject) => {
    cwrDelivery.works(cwrDelivery.filterType, cwrDelivery.filter, {}, (err, result) => {
      if (err) reject(err);
      else {
        const workIds = result.works.map((w) => w._id);
        cwrDelivery.getWorksForDelivery({ _id: workIds }, [cwrDelivery.territory], deliveryPartner, 10_000, null, (err, works, updatedTerritory) => {
          if (err) reject(err);
          else resolve({ works, updatedTerritory });
        });
      }
    });
  });

  const worksById = _.keyBy(works, (w) => w.identifier);
  fs.writeFileSync('works.json', JSON.stringify(worksById));

  process.exit(0);
}

main();
