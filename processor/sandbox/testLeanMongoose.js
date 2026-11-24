require('../models/db');
const Client = require('../models/client');

if (process.argv[2]) {
  const clientId = process.argv[2];
  Client.findById(clientId, (err, client) => {
    getStats();
    console.log('--------------\nclient name: ', client.name);
    console.time('time to get catalogueOverwritingData');
    const options = { joinArraysToString: false };
    client.catalogueOverwritingData(options, (err, catalogueData) => {
      console.timeEnd('time to get catalogueOverwritingData');
      console.log('done');
      process.exit(-1);
    });
  });
} else {
  console.error('Please provide a client id');
  process.exit(-1);
}

function getStats() {
  const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`
  const memoryData = process.memoryUsage()
  const memoryUsage = {
    rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
    heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
    heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
    external: `${formatMemoryUsage(memoryData.external)} -> V8 external memory`,
  }
  console.log(memoryUsage)
  setTimeout(getStats, 10000)
}