require('../models/db');
const Composer = require('../models/composer');
const Publisher = require('../models/publisher');
const lowerCaseString = require('../libs/lowerCaseString');
const async = require('async');

// This script needs to be run 2 times. One for Collection = Composer and the other one for Collection = Publisher.
const Collection = Publisher;

Collection.countDocuments({lowerCaseName: {$exists: false}}, (err, total) => {
    const limit = 100;
    const rounds = listFromNumber(Math.floor(total / limit));
    let lastUsedId;
    async.eachSeries(rounds, (round, cb) => {
        console.log(`Round: ${round}/${rounds.length}`);
        const filter = lastUsedId ? { _id: {$gt : lastUsedId}, lowerCaseName: {$exists: false} } : {lowerCaseName: {$exists: false}};
        Collection.find(filter).sort({ _id: 1 }).limit(limit).exec((err, result) => {
            lastUsedId = result[result.length - 1]._id;
            async.each(result, (item, ecb) => {
                item.lowerCaseName = lowerCaseString(item.name);
                item.save(() => ecb());
            }, cb);
        });
      }, () => console.log('Done processing.'));
})

function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
}