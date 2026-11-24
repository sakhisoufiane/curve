require('../models/db');
const Contract = require('../models/contract')
const Release = require('../models/release');
// const Track = require('./track');
// const Work = require('./work');
const async = require('async');

const contractId = "5e1493fe7f08d7395fd354dd"

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}

const newQuery = () => {
  Contract.find({ _id: contractId }, (err, contractObj) => {
    if (err) {
      console.log(err);
    }

    const contract = contractObj[0]
    const query = contract.contractType === 'Mechanical' ? { clientId: contract.clientId, mechanicalContractIds: contract._id.toString() } : { clientId: contract.clientId, salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } };

    const startTime = Date.now()

    async.parallel({
      releases(cb) {
        const mappings = {};

        Release.countDocuments(query, (err, count) => {
          const limit = 10000;
          const rounds = listFromNumber(Math.floor(count / limit));
          let lastReleaseId;

          async.eachSeries(rounds, (round, loopCb) => {
            if (lastReleaseId) {
              query._id = { $gt: lastReleaseId }
            }

            Release.find(query, '_id title version artist label foreignId catNo barcode').sort({ id: 1 }).limit(limit)
              .exec((err, releases) => {
                if (releases && releases[releases.length - 1]) {
                  lastReleaseId = releases[releases.length - 1]._id;
                }

                if (releases) {
                  releases.forEach((release) => {
                    mappings[release._id.toString()] = {
                      catalogueReleaseTitle: release.title, catalogueReleaseVersion: release.version, catalogueReleaseArtist: release.artist, catalogueReleaseLabel: release.label, catalogueCatNo: release.catNo, catalogueReleaseForeignId: release.foreignId, catalogueBarcode: release.barcode,
                    };
                  });
                }
                loopCb();
              })
          }, (err) => {
            cb(err, mappings)
          })
        })
      }
    }, (err, results) => {
      if (err) {
        console.log(err);
      }
      const endTime = Date.now();
      console.log('FINAL TIME (New Query)', endTime - startTime);
    });
  });
};

const oldQuery = () => {
  Contract.find({ _id: contractId }, (err, contractObj) => {
    if (err) {
      console.log(err);
    }

    const contract = contractObj[0]
    const query = contract.contractType === 'Mechanical' ? { clientId: contract.clientId, mechanicalContractIds: contract._id.toString() } : { clientId: contract.clientId, salesReturnsRights: { $elemMatch: { contractId: contract._id.toString() } } };

    const startTime = Date.now()

    async.parallel({
      releases(cb) {
        const mappings = {};

        Release.countDocuments(query, (err, count) => {
          const limit = 10000;
          const rounds = listFromNumber(Math.floor(count / limit));

          async.eachLimit(rounds, 3, (round, loopCb) => {

            Release.find(query, '_id title version artist label foreignId catNo barcode').sort({ id: 1 }).limit(limit).skip(limit * round)
              .exec((err, releases) => {
                if (releases && releases[releases.length - 1]) {
                  lastReleaseId = releases[releases.length - 1]._id;
                }

                if (releases) {
                  releases.forEach((release) => {
                    mappings[release._id.toString()] = {
                      catalogueReleaseTitle: release.title, catalogueReleaseVersion: release.version, catalogueReleaseArtist: release.artist, catalogueReleaseLabel: release.label, catalogueCatNo: release.catNo, catalogueReleaseForeignId: release.foreignId, catalogueBarcode: release.barcode,
                    };
                  });
                }
                loopCb();
              })
          }, (err) => {
            cb(err, mappings)
          })
        })
      }
    }, (err, results) => {
      if (err) {
        console.log(err);
      }
      const endTime = Date.now();
      console.log('FINAL TIME (Old Query)', endTime - startTime);
    });
  });
};

newQuery();
oldQuery();