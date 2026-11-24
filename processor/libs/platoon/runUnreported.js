require('../../models/db');
const createUnreportedFile = require('./createUnreportedFile');

// Pause for 2 seconds
setTimeout(() => {
  createUnreportedFile.updatePeriod();
}, 2000);
// createUnreportedFile.createUnreportedFromAllPreviousFiles();
