/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-param-reassign */
const FtpClient = require('ftp');
const logger = require('../logger');

module.exports = function (params) {
  const object = this;
  this.host = params.host;
  this.username = params.username;
  this.password = params.password;
  this.port = params.port ? params.port : 21;
  this.secure = params.secure ? params.secure : undefined; // for ftpes & ftps but untested on ftps

  if (params.protocol === 'FTPES') {
    // rejectUnauthorized is an awful hack which allows man in the middle attacks
    // must return to this and find a working solution : may require merlin to fix their certificate
    // This is the original problem https://stackoverflow.com/questions/20082893/unable-to-verify-leaf-signature
    // Alternative to rejectUnauthorized process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    // UPDATE
    // Now added CAs but this is pretty blind - changes the error to: UNABLE_TO_GET_ISSUER_CERT
    // Prestty good explanation of the problem here: https://stackoverflow.com/questions/31861109/tls-what-exactly-does-rejectunauthorized-mean-for-me
    // Sectigo CA options : https://www.thesslstore.com/knowledgebase/ssl-support/sectigo-root-and-intermediate-certificates/
    // Now believe the issue may even lie with merlins certificate : https://www.thesslstore.com/knowledgebase/ssl-support/sectigo-root-and-intermediate-certificates/

    this.secureOptions = {
      // key: fs.readFileSync('processes/ftpIngestion/.cert/private-key.pem'),
      // cert: fs.readFileSync('processes/ftpIngestion/.cert/public-cert.pem'),
      // agent:false,
      // Th efollowing don't work - removed from codebase -stored locally in case we revisit
      // ca: [
      //   fs.readFileSync('processes/ftpIngestion/.cert/SectigoRSADomainValidationSecureServerCA.crt'),
      //   fs.readFileSync('processes/ftpIngestion/.cert/SectigoRSADVBundle.pem'),
      //   fs.readFileSync('processes/ftpIngestion/.cert/SHA-2-Root-USERTrust-RSA-Certification-Authority.crt'),
      //   fs.readFileSync('processes/ftpIngestion/.cert/SectigoRSACodeSigningCA.crt'),
      //   fs.readFileSync('processes/ftpIngestion/.cert/SectigoRSAOVBundle.pem'),
      //   fs.readFileSync('processes/ftpIngestion/.cert/SectigoRSAEVBundle.pem'),
      //   fs.readFileSync('processes/ftpIngestion/.cert/SectigoRSAOrganizationValidationSecureServerCA.crt'),
      //   fs.readFileSync('processes/ftpIngestion/.cert/AddTrustExternalCARoot.crt')
      // ],
      rejectUnauthorized: false,
    };
  }

  this.connect = function () {
    return new Promise((resolve, reject) => {
      this.ftpConnection = new FtpClient();

      this.ftpConnection.on('greeting', (msg) => {
        logger.debug({ msg });
      });

      this.ftpConnection.on('ready', () => {
        logger.debug(`Connected to ${object.host}`);
        resolve();
      });
      this.ftpConnection.on('error', (err) => {
        // Report Error
        logger.debug('Errored on connection');
        reject(err);
      });
      this.ftpConnection.connect({
        host: object.host,
        user: object.username,
        password: object.password,
        secure: (object.secure) ? object.secure : undefined,
        secureOptions: (object.secureOptions) ? object.secureOptions : undefined,
      });
    });
  };

  this.disconnect = function () {
    return new Promise((resolve, reject) => {
      this.ftpConnection.end();
      logger.debug(`Connection to ${object.host} closed`);
      resolve();
    });
  };

  this.ls = function (directory) {
    return new Promise((resolve, reject) => {
      if (!directory) {
        directory = '/';
      }
      this.ftpConnection.list(directory, (err, array) => {
        if (err) {
          reject(err);
        } else {
          resolve(array);
        }
      });
    });
  };

  this.uploadFile = function (localFile, putLocation) {
    return new Promise((resolve, reject) => {
      if (!localFile || !putLocation) {
        reject(new Error('Local File and Put Location are required'));
      } else {
        // Get directory location for creation
        const splitLocation = putLocation.split('/');
        splitLocation.pop();
        // Create directory
        object.mkdir(splitLocation.join('/')).then(() => {
          // Upload File
          this.ftpConnection.put(localFile, putLocation, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }).catch(reject);
      }
    });
  };

  this.download = function (filePath) {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        reject('No file specified.');
      }
      this.ftpConnection.get(filePath, (err, file) => {
        if (err) {
          reject(err);
        } else {
          resolve(file);
        }
      });
    });
  };

  this.rmdir = function (dir) {
    return new Promise((resolve, reject) => {
      if (!dir) {
        reject('No directory specified.');
      }
      this.ftpConnection.rmdir(dir, true, (err) => {
        if (err) {
          logger.error(err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  this.mkdir = function (directory) {
    return new Promise((resolve, reject) => {
      if (!directory) {
        resolve();
      } else {
        this.ftpConnection.mkdir(directory, true, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  };
};
