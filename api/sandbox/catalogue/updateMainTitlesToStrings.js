require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const border = '**************'
const log = (message) => { logger.info(`${border} ${message} ${border}`)};
const logErr = (message) => { logger.error(`${border} ${message} ${border}`)};
let worksWithNonStringTitlesExist = false;
const changedMainTitles = [];

const updateMainTitlesToStrings = async (clients) => {
  await async.eachLimit(clients, 50, async (client) => {
    const worksWithNonStringTitles = await checkForNonStringMainTitles(client);  
    if (worksWithNonStringTitles && worksWithNonStringTitles.length) {
      worksWithNonStringTitlesExist = true;
      log(`Found ${worksWithNonStringTitles.length} Works with non-string Titles for Client: ${client._id}`);
      async.eachLimit(worksWithNonStringTitles, 50, async (work) => {
        await processMainTitle(work);
      });
    }
  });
  if (!worksWithNonStringTitlesExist) {
    log('No Works with non-string Titles found');
    process.exit(0);
  }
};

const processMainTitle = async (work) => {
  if (typeof work.title !== 'string') {
    work.title = work.title.toString();
    const updatedWork = await Work.findByIdAndUpdate(work._id, { $set: { title: work.title } }, { timestamps: false });

    if (updatedWork) {
      log(`Successfully updated Main Title for Work: ${work._id}`);
      changedMainTitles.push({ 
        clientId: work.clientId, 
        workId: work._id, 
        workTitle: work.title,
        newType: 'String'
      });
    } 
    else {
      logErr(`Error updating Main Title for Work: ${work._id}`);
    }
  }
};

const checkForNonStringMainTitles = async (client) => {
  const query = [
    {
      $match: {
        clientId: client._id.toString(),
        title: { $exists: true, $not: { $type: 2 }, $ne: null }
      }
    },
    {
      $project: {
        title: 1,
        clientId: 1
      }
    }
  ];
  return await Work.aggregate(query);
};

function prepareReport() {
  const outputLocation = `${appRootDir}/tmp/updatedMainTitleTypes.csv`;
  const writer = new WriteCsv({
    headers: ['CLIENT ID', 'WORK ID', 'WORK TITLE', 'NEW TITLE TYPE'],
    outputLocation,
  });
  const outputData = changedMainTitles.map((line) => {
    return [line.clientId, line.workId, line.workTitle, line.newType];
  });
  writer.addData(outputData, () => {
    writer.write((err, location) => {
      if (err) {
        logErr(`Error writing CSV: ${err}`);
      } else {
        log(`Script Complete: ${location}`);
        process.exit(0);
      }
    });
  });
}

const runScript = async () => {
  const clients = await Client.find({ clientType: 'Publisher' }, {_id: 1, name: 1});
  await updateMainTitlesToStrings(clients);
  prepareReport();
};

runScript().catch((err) => {
  logErr(`Error: ${err}`);
});
