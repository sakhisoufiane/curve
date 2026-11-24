require('dotenv').config();
require('../../models/db');
const async = require('async');
const utils = require('../../libs/utils');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Work = require('../../models/work');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const Composer = require('../../models/composer');
const Publisher = require('../../models/publisher');

const limit = 50000;
let count = 0;

function runTrack(client, lastId, total, callback) {
  const filter = { clientId: client._id, $or: [
    { 'salesReturnsRights.contractId': '' },
    { 'costsRights.contractId': '' },
    { 'releaseSpecificSalesReturnsRights.contractId': '' },
    { 'mechanicalLicenses.contractId': '' },
    { 'mechanicalLicenses.composerId': '' },
    { 'mechanicalLicenses.publisherId': '' },
  ]};
  const projection = { salesReturnsRights: 1, costsRights: 1, releaseSpecificSalesReturnsRights: 1, mechanicalLicenses: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Track.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, tracks) => {
    async.eachLimit(tracks, 50, (track, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${tracks.length+total} - ${track._id}`);
      utils.clearBlankStrings(track, ['salesReturnsRights', 'costsRights', 'releaseSpecificSalesReturnsRights', 'mechanicalLicenses']);
      Track.findByIdAndUpdate(
        track._id,
        { $set: { salesReturnsRights: track.salesReturnsRights, costsRights: track.costsRights, releaseSpecificSalesReturnsRights: track.releaseSpecificSalesReturnsRights, mechanicalLicenses: track.mechanicalLicenses } },
        { timestamps: false }, cb);
    }, (err) => {
      if (tracks && tracks.length === limit) {
        runTrack(client, lastId, total + limit, callback);
      } else {
        if (tracks.length > 0) { console.log(); }
        callback();
      }
    });
  });
}

function runRelease(client, lastId, total, callback) {
  const filter = { clientId: client._id, $or: [{ 'salesReturnsRights.contractId': '' }, { 'costsRights.contractId': '' }] };
  const projection = { salesReturnsRights: 1, costsRights: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Release.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, releases) => {
    async.eachLimit(releases, 50, (release, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${releases.length+total} - ${release._id}`);
      utils.clearBlankStrings(release, ['salesReturnsRights', 'costsRights']);
      Release.findByIdAndUpdate(
        release._id,
        { $set: { salesReturnsRights: release.salesReturnsRights, costsRights: release.costsRights } },
        { timestamps: false }, cb);
    }, (err) => {
      if (releases && releases.length === limit) {
        runRelease(client, lastId, total + limit, callback);
      } else {
        if (releases.length > 0) { console.log(); }
        callback();
      }
    });
  });
}

function runWork(client, lastId, total, callback) {
  const filter = { clientId: client._id, $or: [{ 'salesReturnsRights.contractId': '' }, { 'salesReturnsRightsDisplay.contractId': '' }, { 'channelSpecificSalesReturnsRights.contractId': '' }] };
  const projection = { salesReturnsRights: 1, salesReturnsRightsDisplay: 1, channelSpecificSalesReturnsRights: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Work.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 50, (work, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${works.length+total} - ${work._id}`);
      utils.clearBlankStrings(work, ['salesReturnsRights', 'salesReturnsRightsDisplay', 'channelSpecificSalesReturnsRights']);
      Work.findByIdAndUpdate(
        work._id,
        { $set: { salesReturnsRights: work.salesReturnsRights, salesReturnsRightsDisplay: work.salesReturnsRightsDisplay, channelSpecificSalesReturnsRights: work.channelSpecificSalesReturnsRights } },
        { timestamps: false }, cb);
    }, (err) => {
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, callback);
      } else {
        if (works.length > 0) { console.log(); }
        callback();
      }
    });
  });
}

function runContract(client, lastId, total, callback) {
  const filter = { clientId: client._id, $or: [{ 'crossContracts.contractId': '' }, { 'autoPaymentConditions.contractId': '' }, { 'payeeId': '' }] };
  const projection = { title: 1, crossContracts: 1, autoPaymentConditions: 1, payeeId: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Contract.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, contracts) => {
    async.eachLimit(contracts, 50, (contract, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${contracts.length+total} - ${contract._id}`);
      utils.clearBlankStrings(contract, ['crossContracts', 'autoPaymentConditions', 'payeeId']);
      Contract.findByIdAndUpdate(
        contract._id,
        { $set: { crossContracts: contract.crossContracts, autoPaymentConditions: contract.autoPaymentConditions, payeeId: contract.payeeId } },
        { timestamps: false }, cb);
    }, (err) => {
      if (contracts && contracts.length === limit) {
        runContract(client, lastId, total + limit, callback);
      } else {
        if (contracts.length > 0) { console.log(); }
        callback();
      }
    });
  });
}

function runComposer(client, lastId, total, callback) {
  const filter = { clientId: client._id, $or: [{ 'publisherAgreements.publisherId': '' }] };
  const projection = { publisherAgreements: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Composer.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, composers) => {
    async.eachLimit(composers, 50, (composer, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${composers.length+total} - ${composer._id}`);
      utils.clearBlankStrings(composer, ['publisherAgreements']);
      Composer.findByIdAndUpdate(
        composer._id,
        { $set: { publisherAgreements: composer.publisherAgreements } },
        { timestamps: false }, cb);
    }, (err) => {
      if (composers && composers.length === limit) {
        runComposer(client, lastId, total + limit, callback);
      } else {
        if (composers.length > 0) { console.log(); }
        callback();
      }
    });
  });
}

function runPublisher(client, lastId, total, callback) {
  const filter = { clientId: client._id, $or: [{ 'publisherAgreements.publisherId': '' }] };
  const projection = { publisherAgreements: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Publisher.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, publishers) => {
    async.eachLimit(publishers, 50, (publisher, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${publishers.length+total} - ${publisher._id}`);
      utils.clearBlankStrings(publisher, ['publisherAgreements']);
      Publisher.findByIdAndUpdate(
        publisher._id,
        { $set: { publisherAgreements: publisher.publisherAgreements } },
        { timestamps: false }, cb);
    }, (err) => {
      if (publishers && publishers.length === limit) {
        runPublisher(client, lastId, total + limit, callback);
      } else {
        if (publishers.length > 0) { console.log(); }
        callback();
      }
    });
  });
}

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through ALl works')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      console.log(`\n---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing Tracks <<<<<<');
          count = 0;
          runTrack(client, null, 0, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Releases <<<<<<');
          count = 0;
          runRelease(client, null, 0, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Works <<<<<<');
          count = 0;
          runWork(client, null, 0, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Contracts <<<<<<');
          count = 0;
          runContract(client, null, 0, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Composers <<<<<<');
          count = 0;
          runComposer(client, null, 0, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Publishers <<<<<<');
          count = 0;
          runPublisher(client, null, 0, cb);
        },
      ], eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
