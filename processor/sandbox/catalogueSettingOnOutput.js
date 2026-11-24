/* eslint-disable max-len */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const { ObjectId } = require('mongodb');
const Track = require('../models/track');

const trackIds = ['5de9dbef2cec041b15eed58f', '5e3205f8130a3228e8af4779', '5de9d1ea6c45bd681ba85eb8', '5e30cbea1d058633140f6b54', '5e30cbf11d058633140f6b63', '5e3101fc1eadf16e374de45b', '5e31aae3118f50050d9b7113', '5e31022a118f50050d9b5290', '5e310249d88c326e5fb91f54', '5e31026ad88c326e5fb91f59', '5e310296d88c326e5fb91f5f', '5e3102a81eadf16e374de45e', '5e31ab06d88c326e5fb925a5', '5e31027fd88c326e5fb91f5c', '5e31abacd88c326e5fb925ad', '5e31abcc810794797ff46bbd', '5e31abf81eadf16e374de8e1', '5e31ac1b118f50050d9b711e', '5df3270cebf3c947d7b6a176', '5df32da8ebf3c947d7b6a545', '5df331fc83831460267d0614', '5df35730ebf3c947d7b6babe', '5df3612febf3c947d7b6bf86', '5df3681bebf3c947d7b6c34e', '5df3733d83831460267d30d9', '5df3759783831460267d329e', '5df3788983831460267d351c', '5df378caebf3c947d7b6cbd7', '5df39417ebf3c947d7b6dac6', '5e31ab2a118f50050d9b7118', '5e31ab8a810794797ff46bba', '5e31abe3d88c326e5fb925b2', '5deffb1d7f914a2f6c8a191e', '5e31ab46810794797ff46bb7', '5df33fbcebf3c947d7b6ae64', '5df341c583831460267d11e9', '5df39305ebf3c947d7b6da33', '5e2b84646c47124fc37b3014', '5e2b752d47bf1f0a52ede94b'];
const ids = trackIds.map((id) => ObjectId(id));

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  const collection = db.collection('AudiosaladPeriodSales');
  Track.find({ _id: { $in: ids } }, (err, tracks) => {
    async.eachSeries(tracks, (track, cb) => {
      collection.updateMany({ periodId: '5e32e936a3a2d857e7ab20ad', trackId: track._id.toString() }, {
        $set: {
          catalogueTrackTitle: track.title, catalogueTrackArtist: track.artist, catalogueIsrc: track.isrc, mechanicalRate: track.statutoryRate, catalogueContractIds: track.salesReturnsRights.map((term) => term.contractId),
        },
      }, { multi: true }, (err) => {
        if (err) {
          logger.error(err);
        } else {
          logger.info(`Updated Track ${track.isrc}`);
        }
        cb();
      });
    });
  });
});
