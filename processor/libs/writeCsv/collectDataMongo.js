const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}

module.exports = {
  getData(collection, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, format, logKey, callback) {
    const collectData = this;
    const group = getGroup(template);

    async.waterfall([
      function (cb) {
        logger.debug('Filter:', filter);
        logger.debug('Group:', group);
        collection.aggregate([
          { $match: filter },
          { $group: { _id: group._id } },
          { $count: 'count' },
        ], { allowDiskUse: true })
          .toArray()
          .then((result) => {
            if (result && result.length > 0) {
              cb(null, result[0].count);
            } else {
              cb(null, 0);
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(null, 0);
          });
      },
      function (linesCount, cb) {
        logger.debug(`Count: ${linesCount}`);
        const limit = 200000;
        const rounds = listFromNumber(Math.floor(linesCount / limit));
        logger.debug(`Rounds: ${rounds}`);
        async.eachSeries(rounds, (round, loopCb) => {
          logger.debug(`Round: ${round}`);
          const aggregate = [
            { $match: filter },
            { $group: group },
            { $skip: round * limit },
            { $limit: limit },
          ];
          if (sort) { aggregate.splice(2, 0, { $sort: sort }); }
          collection.aggregate(aggregate, { allowDiskUse: true })
            .toArray()
            .then((findResult) => {
              // Remove 0 value lines if configured to
              if (suppressZeroValue) {
                findResult = collectData.removeZeroValues(findResult);
              }
              // Map to the passed template
              const mappedData = collectData.mapData(findResult, template);
              logger.debug(mappedData.length);
              // Write output data to CSV
              writeCsv.addData(mappedData, loopCb);
            })
            .catch((err) => {
              logger.error(err);
              loopCb();
            });
        }, cb);
      },
    ], callback);
  },
  getTotals(collection, filter, template, sort, writeCsv, format, callback) {
    const collectData = this;
    const group = getTotalGroup(template, filter);
    logger.debug('Totals Group');
    logger.debug(group);
    collection.aggregate([
      { $match: filter },
      { $group: group },
    ], { allowDiskUse: true })
      .toArray()
      .then((findResult) => {
        const mappedData = collectData.mapData(findResult, template);
        // Add Total wording
        let finalBlankCell = 0;
        if (mappedData && mappedData[0]) {
          mappedData[0].forEach((item, index) => {
            if (!item && finalBlankCell == index - 1) { finalBlankCell = index; }
          });
          mappedData[0][finalBlankCell] = 'Total';
          writeCsv.addData(mappedData, callback);
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback();
      });
  },
  mapData(data, template) {
    const CollectData = this;
    return data.map((line) => CollectData.lineToTemplate(line, template));
  },
  lineToTemplate(line, template) {
    line = this.flattenLine(line);
    const result = [];
    for (let i = 0; i < template.length; i += 1) {
      result[i] = line[template[i].field];
    }
    return result;
  },
  flattenLine(line) {
    const idKeys = Object.keys(line._id);
    for (let i = 0; i < idKeys.length; i += 1) {
      if (idKeys[i] !== '_id') { line[idKeys[i]] = line._id[idKeys[i]]; }
    }
    if (idKeys.includes('_id')) {
      line._id = line._id._id;
    } else {
      delete line._id;
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

function getGroup(template) {
  const group = {};
  const selectors = {};

  for (let i = 0; i < template.length; i += 1) {
    if (template[i].field === 'catalogueCatNo') { group[template[i].field] = { $first: '$catalogueCatNo' }; }
    if (template[i].field === 'catalogueIsrc') { group[template[i].field] = { $first: '$catalogueIsrc' }; }
    if (template[i].field === 'source') { group[template[i].field] = { $first: '$source' }; }
    if (template[i].type === 'Selector') {
      selectors[template[i].field] = `$${template[i].field}`;
    } else if (template[i].type === 'Calculator') {
      group[template[i].field] = { $sum: `$${template[i].field}` };
    }
  }

  group._id = selectors;

  return group;
}

function getTotalGroup(template, filter) {
  const group = {};
  const selectors = {};

  for (let i = 0; i < template.length; i += 1) {
    if (template[i].type === 'Calculator') {
      group[template[i].field] = { $sum: `$${template[i].field}` };
    }
  }

  Object.keys(filter).forEach((filterKey) => {
    if (filterKey.includes('Id')) {
      selectors[filterKey] = `$${filterKey}`;
    }
  });

  group._id = selectors;

  return group;
}
