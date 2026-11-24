// var FTPS = require('ftps');
const { Duplex } = require('stream');
const SFTP = require('ssh2-sftp-client');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const bufferToStream = (buffer) => {
  const stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

module.exports = function (params) {
  const object = this;
  this.host = params.host;
  this.username = params.username;
  this.password = params.password;
  this.port = params.port ? params.port : 22;

  this.connect = function () {
    return new Promise((resolve, reject) => {
      this.sftpConnection = new SFTP();
      this.sftpConnection.connect({
        host: object.host,
        username: object.username,
        password: object.password,
        port: object.port,
        algorithms: {
          serverHostKey: ['ssh-rsa', 'ssh-dss'],
        },
      }).then(resolve).catch(reject);
    });
  };

  this.disconnect = function () {
    return this.sftpConnection.end();
  };

  this.ls = function (directory) {
    return new Promise((resolve, reject) => {
      if (!directory) {
        directory = '/';
      }
      // console.log(directory);
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
        this.sftpConnection.rmdir(directory, true).then(resolve).catch(reject);
      }
    });
  };
};
