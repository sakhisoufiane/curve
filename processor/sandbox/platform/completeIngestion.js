require('../../models/db');

const SalesFile = require('../../models/salesFile');

const { completeIngestSalesFileProcess } = require('../../libs/platform/salesIngestion');

// Platform task id
const taskId = '6672a7991e1062bcd4acfe0d';
const salesFileId = '66702626ff707ab6580aafd0';


SalesFile.findById(salesFileId, async (err, salesFile) => {
  await completeIngestSalesFileProcess(salesFile, taskId);
  console.log('Done')
  process.exit();
});

