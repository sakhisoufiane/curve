require('dotenv').config();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  UpdateAutoScalingGroupCommand,
} = require('@aws-sdk/client-auto-scaling');
const config = require('../config.json');

const Autoscale = new AutoScalingClient({
  credentials: {
    accessKeyId: process.env.S3_access_key,
    secretAccessKey: process.env.S3_secret_key,
  },
  region: process.env.S3_region,
});

module.exports = {
  addProcessor(callback) {
    logger.info('Adding processor');
    const command = new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [config.scalingGroups.processor] });
    Autoscale.send(command, (err, result) => {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        const params = {
          AutoScalingGroupName: config.scalingGroups.processor,
          DesiredCapacity: result.AutoScalingGroups[0].DesiredCapacity += 1,
        };

        const command = new UpdateAutoScalingGroupCommand(params);
        Autoscale.send(command, (err, result) => {
          if (err) {
            logger.error(err);
            callback(err);
          } else {
            logger.debug('Processor successfully added');
            logger.debug(result);
            callback(null, result);
          }
        });
      }
    });
  },
  resetProcessors(callback) {
    logger.debug('Reducing processors back to 1');

    const params = {
      AutoScalingGroupName: config.scalingGroups.processor,
      DesiredCapacity: 1,
    };

    const command = new UpdateAutoScalingGroupCommand(params);
    Autoscale.send(command, (err, result) => {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        logger.debug('Processor successfully added');
        logger.debug(result);
        callback(null, result);
      }
    });
  },
  getProcessorsCount(callback) {
    const command = new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [config.scalingGroups.processor] });
    Autoscale.send(command, (err, result) => {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        callback(null, result.AutoScalingGroups[0].DesiredCapacity);
      }
    });
  },
};
