/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
require('../models/db');
const Client = require('../models/client');

// Set to true/false
const FEATURE_FLAG_STATUS = true

const main = async () => {
  console.log('Updating feature flag to ', FEATURE_FLAG_STATUS);
  
  await Client.updateMany({ }, {
    $set: {
      'features.refactoredSalesCalculation': FEATURE_FLAG_STATUS,
    }
  });

  console.log('Done');
}

main();