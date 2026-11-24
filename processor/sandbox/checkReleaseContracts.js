require('../models/db');
const Release = require('../models/release');

Release.findById('59da524796a95e61da9ee6d1', (err, release) => {
  release.contractsForSalesCalculation('Quarterly', 'Mechanical', (err, data) => {
    console.log(release);
    console.log(err);
    console.log(data);
  });
});
