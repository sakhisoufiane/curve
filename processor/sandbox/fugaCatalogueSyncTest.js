require('dotenv').config();
require('../models/db');
const fugaCatalogueSync = require('../libs/fuga/fugaCatalogueSync');

(async () => {
  try {
    await fugaCatalogueSync.syncClient({ clientId: '686b9369103ffbc0cb45ba29', userEmail: 'test@curveroyaltysystems.com' });
    console.log('Fuga catalogue sync completed successfully.');
  } catch (error) {
    console.error('Error during Fuga catalogue sync:', error);
  }
})();
