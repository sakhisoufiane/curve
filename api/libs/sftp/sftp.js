const { Duplex } = require('stream');
const SFTP = require('ssh2-sftp-client');
const fs = require('fs');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const bufferToStream = (buffer) => {
  const stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

const AuthenticationType = {
  Password: 'Password',
  KeyFile: 'Key File',
};

module.exports = function (params) {
  const object = this;
  this.host = params.host;
  this.username = params.username;
  this.password = params.password;
  this.port = params.port ? params.port : 22;
  this.authenticationType = params.authenticationType;
  this.privateKey = params.privateKey;

  let privateKeyFile;

  this.connect = async function (serverName, clientId, logText, clientName) {
    await new Promise((resolve, reject) => {
      if (this.authenticationType === AuthenticationType.KeyFile && this.privateKey) {
        fileManager.downloadFromS3(this.privateKey, process.env.S3_bucket, (err, localFile) => {
          if (err) {
            logger.debug(`${logText} - ${clientName} (${clientId}) - ${serverName} Error downloading key file from S3`);
            reject(err);
          }

          privateKeyFile = localFile;
          resolve();
        });
      } else {
        resolve();
      }
    });

    return new Promise((resolve, reject) => {
      this.sftpConnection = new SFTP();
      this.sftpConnection.connect({
        host: this.host,
        username: this.username,
        ...(this.authenticationType !== AuthenticationType.KeyFile && this.password && { password: this.password }),
        ...(privateKeyFile && { privateKey: fs.readFileSync(privateKeyFile) }),
        port: this.port,
        algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-512'] },
      }).then(() => {
        logger.info(`${logText}: ${clientName} (${clientId}) - ${serverName} Connected to ${object.host}`);
        resolve();
      }).catch((err) => {
        logger.debug('Errored on connection');
        logger.error(`${logText} - ${clientName} (${clientId}) - ${serverName} Error connecting to ${object.host}`);
        logger.error(`${logText} - ${clientName} (${clientId}) - ${serverName} ${err}`);
        reject(err);
      });
    });
  };

  this.disconnect = function (serverName, clientId, logText, clientName) {
    logger.info(`${logText}: ${clientName} (${clientId}) - ${serverName} Connection to ${object.host} closed`);
    return this.sftpConnection.end();
  };

  this.ls = function (directory) {
    return new Promise((resolve, reject) => {
      if (!directory) {
        directory = '/';
      }
      this.sftpConnection.list(directory).then(resolve).catch(reject);
    });
  };

  this.uploadFile = function (localFile, putLocation) {
    logger.info('Uploading file via SFTP:', putLocation);
    return new Promise((resolve, reject) => {
      if (!localFile || !putLocation) {
        reject(new Error('Local File and Put Location are required'));
      } else {
        // Add slash to front of location if it doesn't exist
        if (putLocation[0] !== '/') {
          putLocation = `/${putLocation}`;
        }
        this.sftpConnection.put(localFile, putLocation).then(resolve).catch(reject);
      }
    });
  };

  // returns ReadableStream - localPath parameter left as undefined causes sftpConnection
  // to return Buffer, (see module docs), and by converting this to a ReadableStream
  // Object we have the same functionality as the ftp library
  this.download = function (filePath) {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        reject('No file specified.');
      }
      this.sftpConnection.get(filePath).then((data) => {
        resolve(bufferToStream(data));
      }).catch(reject);
    });
  };

  this.downloadFastGet = function (filePath, localPath) {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        reject('No file specified.');
      }
      this.sftpConnection.fastGet(filePath, localPath).then(resolve).catch(reject);
    });
  };

  this.rmdir = function (dir) {
    return new Promise((resolve, reject) => {
      if (!dir) {
        reject('No directory specified.');
      }
      this.sftpConnection.rmdir(dir, true).then(resolve).catch(reject);
    });
  };

  this.mkdir = function (directory) {
    return new Promise((resolve, reject) => {
      if (!directory) {
        resolve();
      } else {
        this.sftpConnection.mkdir(directory, true).then(resolve).catch(reject);
      }
    });
  };
};
