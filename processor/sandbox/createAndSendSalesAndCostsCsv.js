require('../models/db');
const Period = require('../models/period');

if (process.argv[2] && process.argv[3]) {
  const periodId = process.argv[2];
  const email = process.argv[3];
  Period.findById(periodId, (err, period) => {
    if (err) { console.error(err); }
    console.log(`Processing Period: ${period}`);
    if (period) {
      period.createSalesCsv(email, (err) => {
        if (err) {
          console.error(err);
        } else {
          period.createCostsCsv(email, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log('complete');
              process.exit(-1);
            }
          });
        }
      });
    } else {
      console.error(`No Period found with ID ${periodId}`);
    }
  });
} else {
  console.error('ERROR: Supply periodId and email address as arguments.\n[e.g. node createAndSendSalesCsv.js 5f8b59f8263bdd2372220057 user@email.com]');
  process.exit(-1);
}
