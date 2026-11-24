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
const changedAltTitles = [];
let whatWasUpdated;
let worksWithNonStringAltTitlesExist = false;

const updateAltTitlesFromStringsToObjects = async (clients) => {
  await async.eachLimit(clients, 50, async (client) => {
    const worksWithNonStringAltTitles = await checkForNonStringAlternateTitles(client);
    if (worksWithNonStringAltTitles && worksWithNonStringAltTitles.length) {
      worksWithNonStringAltTitlesExist = true;
      log(`Client: ${client._id} - Found ${worksWithNonStringAltTitles.length} works with non-standard Alternate Titles`);
      async.eachLimit(worksWithNonStringAltTitles, 50, async (work) => {
        await processAlternateTitle(work);
      });
    }
  });
  if (!worksWithNonStringAltTitlesExist) {
    log('No Works with non-string or non-object Alternate Titles found');
    process.exit(0);
  }
};
const processAlternateTitle = async (work) => {
  let alternateTitlesToBeUpdated = [];
  let nullTitlesToBeRemoved = [];
  for (const altTitle of work.alternateTitles) {
    if (isNullTitle(altTitle)) {
      processNullAltTitles(altTitle, nullTitlesToBeRemoved);
    }
    else if (typeof altTitle !== 'object') {
      processNonObjectAltTitles(altTitle, alternateTitlesToBeUpdated);
    } 
    else {
      if (typeof altTitle.title !== 'string') {
        processNonStringAltTitles(altTitle, alternateTitlesToBeUpdated);
      }
    }
  }
  updateOrRemoveAltTitle(work, nullTitlesToBeRemoved, alternateTitlesToBeUpdated);
};

const isNullTitle = (altTitle) => {
  if (altTitle === null) return true;
  if (typeof altTitle === 'object' && (!altTitle.title || altTitle.title === '')) return true;
  return false;
};

const processNullAltTitles = (altTitle, nullTitlesToBeRemoved) => {
  whatWasUpdated = 'Removed null Alternate Title';
  nullTitlesToBeRemoved.push(altTitle);
};

const processNonObjectAltTitles = (altTitle, alternateTitlesToBeUpdated) => {
  whatWasUpdated = 'Converted Alternate Title to Object';
  alternateTitlesToBeUpdated.push({ title: altTitle.toString(), language: '' });
};

const processNonStringAltTitles = (altTitle, alternateTitlesToBeUpdated) => {
  altTitle.title = altTitle.title.toString();
  whatWasUpdated = 'Converted Alternate Titles to String';
  alternateTitlesToBeUpdated.push(altTitle);
};


const updateOrRemoveAltTitle = async (work, nullTitlesToBeRemoved, alternateTitlesToBeUpdated) => {
  if (nullTitlesToBeRemoved.length) {
    await removeNullTitles(work, nullTitlesToBeRemoved);
  }
  if (alternateTitlesToBeUpdated.length) {
    await updateAlternateTitles(alternateTitlesToBeUpdated, work);
  }
};

const removeNullTitles = async (work, nullTitlesToBeRemoved) => {
  await Work.updateOne({ _id: work._id }, { $pull: { alternateTitles: { $in: nullTitlesToBeRemoved } } }, { timestamps: false });
  changedAltTitles.push({ clientId: work.clientId, workId: work._id, whatWasUpdated: whatWasUpdated });
};

const updateAlternateTitles = async (alternateTitlesToBeUpdated, work) => {
  const updatedWork = await Work.findByIdAndUpdate(work._id, { $set: { alternateTitles: alternateTitlesToBeUpdated } }, { timestamps: false });
  if (updatedWork) {
    log(`Updated Alternate Title: Work ID: ${work._id}`);
    changedAltTitles.push({ clientId: work.clientId, workId: work._id, whatWasUpdated: whatWasUpdated });
  } else {
    logErr(`Error updating Alternate Titles for Work: ${work._id}`);
  }
};

const checkForNonStringAlternateTitles = async (client) => {
  const query = [
    {
      $match: {
        clientId: client._id.toString(),
        $or: [
        // Requirement A: Non-string title
          {
            alternateTitles: {
              $elemMatch: {
                title: { $exists: true, $not: { $type: 2 } }
              }
            }
          },
          { // Requirement B: Non-object element in alternateTitles
            alternateTitles: {
              $elemMatch: {
                $not: { $type: 3 }  // Type 3 corresponds to an object
              }
            }
          }
        ]
      }
    },
    {
      $project: {
        clientId: 1,
        alternateTitles: 1
      }
    }
  ];
  return await Work.aggregate(query);
};

function prepareReport() {
  const outputLocation = `${appRootDir}/tmp/updatedAlternateTitleTypes.csv`;
  const writer = new WriteCsv({
    headers: ["CLIENT ID", "WORK ID", "WHAT WAS UPDATED"],
    outputLocation,
  });
  const outputData = changedAltTitles.map((line) => {
    return [line.clientId, line.workId, line.whatWasUpdated];
  });
  writer.addData(outputData, () => {
    writer.write((err, location) => {
      if (err){
        logErr(`Error writing CSV: ${err}`);
      } else {
        log(`Script Complete: ${location}`);
        process.exit(0)
      }
    });
  });
};

const runScript = async () => {
  const clients = await Client.find({ clientType: 'Publisher' }, {_id: 1, name: 1});
  await updateAltTitlesFromStringsToObjects(clients);
  prepareReport();
};

runScript().catch((err) => {
  logErr(`Error: ${err}`);
});