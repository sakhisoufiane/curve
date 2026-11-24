require('dotenv').config();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const {
  EC2Client,
  DescribeImagesCommand,
  DeregisterImageCommand,
  DescribeSnapshotsCommand,
  DeleteSnapshotCommand,
} = require('@aws-sdk/client-ec2');

const async = require('async');

const ec2 = new EC2Client({
  credentials: {
    accessKeyId: process.env.S3_access_key,
    secretAccessKey: process.env.S3_secret_key,
  },
  region: process.env.S3_region,
});

logger.debug({
  accessKeyId: process.env.S3_access_key,
  secretAccessKey: process.env.S3_secret_key,
  region: process.env.S3_region,
});

async.waterfall([
  removeOldImages,
  removeOldSnapshots,
], (err) => {
  logger.debug('Removed all old backups');
});

function removeOldImages(callback) {
  const command = new DescribeImagesCommand({ Owners: ['824943408886'] });
  ec2.send(command, (err, data) => {
    logger.debug('Total Images:', data.Images.length);
    async.eachSeries(data.Images, (image, cb) => {
      if ((image.Name.includes('DB Backup') || image.Name.includes('DBBackup') || image.Name.includes('Daily Backup')) && new Date(image.CreationDate) < new Date().setDate(new Date().getDate() - 31)) {
        logger.debug('Deleting Image');
        logger.debug(image);
        setTimeout(() => {
          deleteImage(image.ImageId, cb);
        }, 500);
      } else {
        cb();
      }
    }, callback);
  });

  function deleteImage(imageId, callback) {
    const command = new DeregisterImageCommand({ ImageId: imageId });
    ec2.send(command, (err, data) => {
      if (err) {
        logger.error(err);
      } else {
        logger.debug(data);
      }
      callback();
    });
  }
}

function removeOldSnapshots(callback) {
  const command = new DescribeSnapshotsCommand({ OwnerIds: ['824943408886'] });
  ec2.send(command, (err, data) => {
    async.eachSeries(data.Snapshots, (snapshot, cb) => {
      if (snapshot.StartTime < new Date().setDate(new Date().getDate() - 31)) {
        logger.debug('Deleting Snapshot:');
        logger.debug(snapshot);
        setTimeout(() => {
          deleteSnapshot(snapshot.SnapshotId, cb);
        }, 500);
      } else {
        cb();
      }
    }, callback);
  });

  function deleteSnapshot(snapshotId, callback) {
    const command = new DeleteSnapshotCommand({ SnapshotId: snapshotId });
    ec2.send(command, (err, data) => {
      if (err) {
        logger.error(err);
      } else {
        logger.debug(data);
      }
      callback();
    });
  }
}
