require('../models/db');
const { eachSeries } = require('async');
const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('../models/client');
const SalesFile = require('../models/salesFile');

const Ftp = require('../libs/ftp');
const Sftp = require('../libs/sftp');
const ftpHelpers = require('../processes/ftpIngestion/ftpHelpers');
const FTPLogs = require('../models/ftpLogs');


const getReport = async ({ clientId }) => {
  const client = await Client.findById({ _id: clientId });
  if (!client) throw new Error('Client not found');

  console.log(client.salesFtpIngestions);

  await eachSeries(client.salesFtpIngestions, async (server) => {
    if (!server.initialisedDate) { return; }

    let connectionActive = false;
    const rootDir = server.directory || '/';
    const defaultPort = (server.protocol === 'SFTP') ? 22 : 21;
  
    const ftpParams = {
      protocol: server.protocol,
      host: server.host,
      username: server.username,
      password: server.password,
      port: server.port || defaultPort,
    };


    if (['FTPES', 'FTPS'].includes(server.protocol)) {
      ftpParams.secure = (server.protocol === 'FTPS') ? 'implicit' : true;
    }

    logger.debug({ ftpParams });

    const ftp = (server.protocol === 'SFTP') ? new Sftp(ftpParams) : new Ftp(ftpParams);
    const recursive = server.recursive || true;

    await ftp.connect()

    const files = await new Promise((resolve, reject) => {
      ftpHelpers.readAllFiles(ftp, server, rootDir, false, [], recursive, [], [], [], null, true, (err, zipFiles, gZipFiles, ftpFiles) => {
        if (err) { 
          reject(err); 
        } else {
          resolve({ zipFiles, gZipFiles, ftpFiles });
        }
      });
    });

    const serverLog = await FTPLogs.findOne({ clientId, type: 'Server Sales', server: `${server.username}@${server.host}` }).catch(logger.error);
    
    for (const file of files.ftpFiles) {
      const filename = `${file.path}/${file.name}`;
      const ftpLog = await FTPLogs.find({ clientId, type: 'Sales', server: `${server.username}@${server.host}`, 'files.filename': filename }).catch(logger.error);
      console.log('ftpLOg', ftpLog);
    }
  });

};

getReport({ clientId: '659bf399c006e77cdb8cb1b0' }).then(() => {
  logger.info('Done');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});