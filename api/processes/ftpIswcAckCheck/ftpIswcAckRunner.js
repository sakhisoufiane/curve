require('dotenv').config();
require('../../models/db');
const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Ftp = require('../../libs/ftp');
const Sftp = require('../../libs/sftp');
const Client = require('../../models/client');
const Task = require('../../models/task');

const devMode = (process.env.environmentName.toLowerCase() === 'development');

const createTask = async ({ file, server }) => {
  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'ISWC Acknowledgment',
    clientId: server.clientId,
    clientName: server.clientName,
    value: { fileName: file.name, serverId: server.id, clientId: server.clientId },
  });
};

const run = async (clientId, serverName) => {
  const query = {
    $and: [
      { 'iswcFtpIngestions.host': { $exists: true } },
      { 'iswcFtpIngestions.active': true },
    ],
  };

  if (clientId) query._id = clientId;
  if (serverName) query.$and.push({ 'iswcFtpIngestions.name': serverName });

  const clients = await Client.find(query, 'name iswcFtpIngestions');

  const ftpIswcServers = [];
  clients.forEach((client) => {
    client.iswcFtpIngestions.forEach((iswcFtpIngestion) => {
      if (iswcFtpIngestion?.host && iswcFtpIngestion?.active && (!serverName || iswcFtpIngestion.name === serverName)) {
        ftpIswcServers.push({
          id: iswcFtpIngestion._id.toString(),
          name: iswcFtpIngestion.name,
          host: iswcFtpIngestion.host,
          username: iswcFtpIngestion.username,
          password: iswcFtpIngestion.password,
          active: iswcFtpIngestion.active,
          directory: iswcFtpIngestion.directory,
          port: iswcFtpIngestion.port,
          protocol: iswcFtpIngestion.protocol,
          clientId: client._id.toString(),
          clientName: client.name,
        });
      }
    });
  });

  await async.eachSeries(ftpIswcServers, async (server) => {
    const rootDir = server.directory || '/';
    const defaultPort = (server.protocol === 'SFTP') ? 22 : 21;
    const ftpConfig = {
      host: server.host,
      username: server.username,
      password: server.password,
      port: server.port || defaultPort,
    };
    const ftp = (server.protocol === 'SFTP') ? new Sftp(ftpConfig) : new Ftp(ftpConfig);

    try {
      await ftp.connect(server.host, server.clientId, 'ISWC Ack Runner', server.clientName);
      const files = await ftp.ls(rootDir);
      if (files.length > 0) {
        files.forEach(async (file) => {
          if (file.type !== 'd') {
            await createTask({ file, server });
          }
        });
      }
      await ftp.disconnect(server.host, server.clientId, 'ISWC Ack Runner', server.clientName);
    } catch (err) {
      logger.error(`Could not read ftp ISWC acknowledgment server id - ${server.id}`);
      logger.error(err);
    }
  });
};

if (require.main === module) {
  if (devMode) {
    run();
  } else {
    setInterval(run, 1000 * 60 * 60 * 6); // every 6 hours
  }
}

module.exports = run;
