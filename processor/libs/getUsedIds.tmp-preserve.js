const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');

module.exports = function (event, callback) {
  /* event = {
    db: db,
    bigQuery: bigQuery,
    costsDatabaseTable: "someSales",
    salesFileIds: [123, 234],
    costIds: [123, 234],
    clientType: 'Publisher',
  }
  */
  // Setup output arrays
  const outputReleaseIds = [];
  const outputTrackIds = [];
  const outputWorkIds = [];
  const outputContractIds = [];
  const outputPartitionNos = [];
  // Prepare cost IDs to ObjectIds
  const costIds = event.costIds ? event.costIds.map((id) => new ObjectId(id)) : [];
  // Loop through processes
  async.eachSeries([
    {
      table: event.bigQuery.inputTable,
      filter: { salesFileId: { $in: event.salesFileIds } },
      fields: ['releaseId', 'trackId', 'workId', 'contractId', 'partitionNo'],
      type: 'BigQuery',
    },
    {
      table: event.costsDatabaseTable,
      filter: { _id: { $in: costIds } },
      fields: ['releaseIds', 'trackIds', 'workIds'],
      type: 'Mongo',
    },
  ], (database, databaseCb) => {
    // Call get IDs
    getIdsForDbAndTable(event, database.table, database.filter, database.fields, database.type, (err, result) => {
      // Update output results
      if (err) {
        return databaseCb(err);
      }
      if (result.releaseIds) {
        result.releaseIds.forEach((item) => {
          outputReleaseIds.push(toString(item));
        });
      }
      if (result.trackIds) {
        result.trackIds.forEach((item) => {
          outputTrackIds.push(toString(item));
        });
      }
      if (result.workIds) {
        result.workIds.forEach((item) => {
          outputWorkIds.push(toString(item));
        });
      }
      if (result.contractIds) {
        result.contractIds.forEach((item) => {
          outputContractIds.push(toString(item));
        });
      }
      if (result.partitionNos) {
        result.partitionNos.forEach((item) => {
          outputPartitionNos.push(item);
        });
      }

      return databaseCb();

      function toString(value) {
        // Forces every value into a string
        try {
          return value.toString();
        } catch (e) {
          return value;
        }
      }
    });
  }, (err) => {
    function onlyUnique(value, index, self) {
      return self.indexOf(value) === index;
    }
    if (err) { logger.error(err); }
    callback(err, {
      releaseIds: outputReleaseIds.filter(onlyUnique),
      trackIds: outputTrackIds.filter(onlyUnique),
      workIds: outputWorkIds.filter(onlyUnique),
      contractIds: outputContractIds.filter(onlyUnique),
      partitionNos: outputPartitionNos.filter(onlyUnique),
    });
  });
};

function getIdsForDbAndTable(event, databaseTable, filter, fields, type, callback) {
  if (type === 'Mongo') {
    getMongoIds(event, databaseTable, filter, fields, callback);
  } else if (type === 'BigQuery') {
    getBigQueryIds(event, databaseTable, filter, fields, callback);
  } else {
    callback(new Error('Undefined query type'));
  }
}

function getMongoIds(event, databaseTable, filter, fields, callback) {
  let releaseIds; let trackIds; let workIds; let inputCollection;
  if (databaseTable) {
    async.waterfall([
      function (cb) {
        inputCollection = event.db.collection(databaseTable);
        cb();
      },
      function (cb) {
        inputCollection.distinct(fields[0], filter)
          .then((values) => {
            releaseIds = values;
            cb();
          })
          .catch(cb);
      },
      function (cb) {
        inputCollection.distinct(fields[1], filter)
          .then((values) => {
            trackIds = values;
            cb();
          })
          .catch(cb);
      },
      function (cb) {
        if (event.clientType === 'Publisher') {
          inputCollection.distinct(fields[2], filter)
            .then((values) => {
              workIds = values;
              cb();
            })
            .catch(cb);
        } else {
          cb();
        }
      },
    ], (err) => {
      if (err) {
        logger.error(err);
      }
      callback(err, {
        releaseIds, trackIds, workIds, contractIds: [],
      });
    });
  } else {
    callback(null, {
      releaseIds: [], trackIds: [], workIds: [], contractIds: [],
    });
  }
}

function getBigQueryIds(event, databaseTable, filter, fields, callback) {
  let releaseIds; let trackIds; let workIds; let contractIds; let partitionNos;
  if (databaseTable) {
    async.waterfall([
      function (cb) {
        event.bigQuery.getDistinct(databaseTable, fields[0], filter, (err, values) => {
          if (values) {
            releaseIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
          }
          cb(err);
        });
      },
      function (cb) {
        event.bigQuery.getDistinct(databaseTable, fields[1], filter, (err, values) => {
          if (values) {
            trackIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
          }
          cb(err);
        });
      },
      function (cb) {
        if (event.clientType === 'Publisher') {
          event.bigQuery.getDistinct(databaseTable, fields[2], filter, (err, values) => {
            if (values) {
              workIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
            }
            cb(err);
          });
        } else {
          cb();
        }
      },
      function (cb) {
        event.bigQuery.getDistinct(databaseTable, fields[3], filter, (err, values) => {
          if (values) {
            contractIds = values.map((id) => { if (ObjectId.isValid(id)) { return id; } }).filter(Boolean);
          }
          cb();
        });
      },
      function (cb) {
        event.bigQuery.getMultiDistinct(databaseTable, [fields[4]], filter, (err, values) => {
          if (values) {
            partitionNos = values.map((item) => item.partitionNo);
          }
          cb();
        });
      },
    ], (err) => {
      if (err) { logger.error(err); }
      callback(err, {
        releaseIds, trackIds, workIds, contractIds, partitionNos,
      });
    });
  } else {
    callback(null, {
      releaseIds: [], trackIds: [], workIds: [], contractIds: [],
    });
  }
}
