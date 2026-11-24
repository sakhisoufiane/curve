const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { supportScriptModule } = require('./libs/support/supportScripts/index');
// const { runFlushContractToWorksFromIpChain } = require('./libs/support/supportScripts/suite/flushContractsToWorksFromIPChain');

// The script object defined below replicates the mongo object stored in app settings
const script = {
  email: 'tom@curveroyaltysystems.com',
  script: 'recreateStatements',
  scriptParams: [
    { name: 'periodId', type: 'string', value: '5e5e7e7bbdb09339fe86b70d' },
  ],
};

supportScriptModule(null, script.script, script.scriptParams, script.email, (err) => {
  if (err) {
    logger.error(err);
  } else {
    logger.debug(`${script.script} completed`);
  }
  process.exit(0);
});

// Test Flush Contract with filter

// const task = {
//   email: 'arjun@curveroyaltysystems.com',
//   value: {
//     clientId: '617fbaa426d00d002445118d',
//     filter: {
//       clientId: '617fbaa426d00d002445118d',
//       $or: [
//         { title: { $regex: /identifierTest123/i } },
//         { composer: { $regex: /identifierTest123/i } },
//         { identifier: { $regex: /identifierTest123/i } },
//         { iswc: { $regex: /identifierTest123/i } },
//         { tunecode: { $regex: /identifierTest123/i } },
//         { aliases: { $regex: /identifierTest123/i } },
//         { 'societyIdentifiers.identifier': { $regex: /identifierTest123/i } },
//       ],
//     },
//   },
// };

// Task Scenario 2
// const task = {
//   email: 'arjun@curveroyaltysystems.com',
//   value: {
//     clientId: '617fbaa426d00d002445118d',
//     filter: {
//       clientId: '617fbaa426d00d002445118d',
//       usedComposerIds: {
//         $in: ['622727831a1bdc00261ad953'],
//       },
//     },
//   },
// };

// runFlushContractToWorksFromIpChain(null, task.email, task.value.clientId, task.value.filter, (err) => {
//   if (err) { logger.error(err); }
//   logger.info('Task Completed');
//   process.exit(0);
// });
