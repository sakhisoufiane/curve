const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}

module.exports = {
  getData(collection, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, format, logKey, callback) {
    logger.debug('Data Collection with Catalogue lookup aggregation');
    const collectData = this;
    async.waterfall([
      function (cb) {
        collection.countDocuments(filter).then((count) => cb(null, count)).catch(cb);
      },
      function (linesCount, cb) {
        logger.debug('Total Lines:', linesCount);
        const limit = 200000;
        const rounds = listFromNumber(Math.floor(linesCount / limit));
        async.eachSeries(rounds, (round, loopCb) => {
          logger.info(`${logKey} - Round ${round + 1} of ${rounds.length}`);
          collection.aggregate([
            { $match: filter },
            { $skip: round * limit },
            { $limit: limit },
            {
              $lookup: {
                from: 'releases',
                localField: 'releaseIds',
                foreignField: '_id',
                as: 'releasesLookup',
              },
            },
            {
              $lookup: {
                from: 'tracks',
                localField: 'trackIds',
                foreignField: '_id',
                as: 'trackIsrcLookup',
              },
            },
            {
              $addFields: {
                catalogueCatNo: {
                  $map: {
                    input: '$releasesLookup',
                    as: 'release',
                    in: '$$release.catNo',
                  },
                },
              },
            },
            {
              $addFields: {
                catalogueIsrc: {
                  $map: {
                    input: '$trackIsrcLookup',
                    as: 'track',
                    in: '$$track.isrc',
                  },
                },
              },
            },
            {
              $project: {
                releasesLookup: 0,
                trackIsrcLookup: 0,
              },
            },
          ]).toArray()
            .then((findResult) => {
            // Remove 0 value lines if configured to
              if (suppressZeroValue) {
                findResult = collectData.removeZeroValues(findResult);
              }
              // Map to the passed template
              const mappedData = collectData.mapData(findResult, template);
              // Write output data to CSV
              return writeCsv.addData(mappedData, loopCb);
            })
            .catch((err) => {
              // Handle the error
              logger.error('Error during database query or CSV write:', err);
              loopCb();
            });
        }, cb);
      },
    ], callback);
  },
  // TODO: unexpected result here if the line has an _id in it. Example: line: { _id: {_id: 'x', property1: 'y', property2: 'z'...}}
  mapData(data, template) {
    const CollectData = this;
    return data.map((line) => CollectData.lineToTemplate(line, template));
  },
  // TODO: unexpected result here if the line has an _id in it. Example: line: { _id: {_id: 'x', property1: 'y', property2: 'z'...}}
  lineToTemplate(line, template) {
    line = this.flattenLine(line);
    const result = [];
    for (let i = 0; i < template.length; i += 1) {
      result[i] = line[template[i].field];
    }
    return result;
  },
  // TODO: unexpected result here if the line has an _id in it. Example: line: { _id: {_id: 'x', property1: 'y', property2: 'z'...}}
  flattenLine(line) {
    const idKeys = Object.keys(line._id);
    for (let i = 0; i < idKeys.length; i += 1) {
      line[idKeys[i]] = line._id[idKeys[i]];
    }
    return line;
  },
  removeZeroValues(data) {
    return data.map((line) => {
      if (line.calculationOutput != 0) {
        return line;
      }
    }).filter(Boolean);
  },
};
