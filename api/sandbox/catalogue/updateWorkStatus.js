// Description: This updates the status of works in the database to Approved, by ingesting a csv file.
// Time to run: 5 minutes
// Ticket No: SUP-1368
// Category: Update Works
// Author: Arjun Doel

const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

require('../../models/db');
const Work = require('../../models/work');
const importXlsx = require('../../libs/importXlsx');

const importData = ({ file }) => new Promise((resolve, reject) => {
  const headers = [{ key: "id" }];
  const date = new Date();

  importXlsx.getDataByTemplate(file, headers, 0, 1, date, (err, works) => {
    if (err) { 
      reject(err);
    } else {
      resolve(works);
    }
  })
});

const updateStatus = async () => {
  const file = '/Users/arjundoel/Downloads/Ninja Tune - Work Status Updates.csv'; //! Please provide the path to the file
  const works = await importData({ file });

  logger.info(`Imported ${works.length} works from file.`);

  let count = 0;
  await eachLimit(works, 200, async (work) => {
    await Work.findByIdAndUpdate(
      work.id, 
      { $set: { approvalStatus: 'Approved', approvedDate: Date.now() } }, 
      { timestamps: true, createPatch: false },
    );

    count += 1;
    process.stdout.write(`\r${count} records updated`);
  });
}

updateStatus().then(() => {
  console.log('Success');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
