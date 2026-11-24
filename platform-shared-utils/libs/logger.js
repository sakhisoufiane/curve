/* eslint-disable no-restricted-syntax */
require('dotenv').config();
const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
const util = require('util');

/**
 * ConsoleLogger provides methods, to log messages in console
 * Depending on type of message, available methods are
 * info: to log general information messages
 * error: to log errors and exceptions
 * debug: to debug code, or data
 *
 * ConsoleLogger is intended to use for development environment only
 */
const ConsoleLogger = function () {
  this.info = function (data) {
    const args = ['Info:', ...data];
    console.log(...args);
  };

  this.error = function (data) {
    const args = ['Error:', ...data];
    console.error(...args);
  };

  this.debug = function (data) {
    const args = ['Debug:', ...data];
    console.log(...args);
  };
};

/**
 *
 * Logger object provide wrapper object and encapsulates actual logger objects depending on env
 *
 * Provides functions to initiate encapsulated logger object and property, there are two types
 * of encapsulated logger objects
 * Winston: It is responsible to log messages on aws cloud watch, and intended to use in production
 * and staging environments only
 * ConsoleLogger: It is responsible to log messages in console, when we don't want to log messages
 * in AWS, intended to use
 * in development environment only.
 *
 * Available methods are
 * info: to log general information messages
 * error: to log errors and exceptions
 * debug: to debug code, or data (development environment only)
 *
 * Usage: just include lib, using require function, as this export initiated object, and use one of
 * above methods e.g.
 *
 * let logger = require(./logger);
 * logger.info("This is a general information message")
 * logger.error("Record is not saved, error details are ...")
 * logger.debug(response)
 *
 * It is also possible to pass multiple arguments which will be stringed to one single string for Winston logging but kept as separate arguments when logging to console
 * const item = { param1: 1, param2: 2 };
 * e.g. logger.info('Info about an object', item);
 *
 */
const Logger = function () {
  this.logger = null;
  this.environment = null;

  this.init = () => {
    this.environment = (process.env && process.env.environmentName) ? process.env.environmentName.toLowerCase() : 'development';

    if (this.environment !== 'development') {
      // Generate random number between 1 and 999999 for stream name
      const min = 1;
      const max = 999999;
      const randomNumber = Math.floor(Math.random() * (max - min) + min);

      // Add config for cloudwatch
      this.logger = winston.createLogger({
        transports: [
          new WinstonCloudWatch({
            awsOptions: {
              credentials: {
                accessKeyId: process.env.S3_access_key,
                secretAccessKey: process.env.S3_secret_key,
              },
              region: process.env.S3_region,
            },
            logGroupName: `${process.env.logGroupName}-${process.env.logStreamName}`,
            logStreamName: `${process.env.logStreamName}-${randomNumber}`,
          }),
        ],
      });
    } else {
      this.logger = new ConsoleLogger();
    }
  };

  this.sanitise = (args) => {
    const messages = [];
    args.forEach((arg) => {
      if (typeof (arg) !== 'object') {
        messages.push(`${arg}`);
      } else if (arg instanceof Error) {
        messages.push(JSON.stringify(util.format(arg)));
      } else {
        messages.push(JSON.stringify(arg));
      }
    });

    // if called in development environment - just pass args for better dev display when logging to console
    return (this.environment === 'development') ? args : messages.join(' ');
  };

  this.info = (...args) => {
    this.logger.info(this.sanitise(args));
  };

  this.error = (...args) => {
    this.logger.error(this.sanitise(args));
  };

  this.debug = (...args) => {
    if (['development', 'staging'].includes(this.environment)) {
      this.logger.debug(this.sanitise(args));
    }
  };
};

const logger = new Logger();

logger.init();

module.exports = logger;
