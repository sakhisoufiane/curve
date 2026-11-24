require('dotenv').config();
require('../models/db');

const { eachLimit } = require('async');
const Ftp = require('../libs/ftp');
const Sftp = require('../libs/sftp');
const Client = require('../models/client');

const connectToFtpServer = async ({ server }) => {
  const rootDir = server.directory || '/';
  const defaultPort = (server.protocol === 'SFTP') ? 22 : 21;
  const ftpParams = { protocol: server.protocol, host: server.host, username: server.username, password: server.password, port: server.port || defaultPort };
  if (['FTPES', 'FTPS'].includes(server.protocol)) { ftpParams.secure = (server.protocol === 'FTPS') ? 'implicit' : true; }
  const ftp = (server.protocol === 'SFTP') ? new Sftp(ftpParams) : new Ftp(ftpParams);
  await ftp.connect();
  console.log('Connected to server');
  console.log('Listing root directory content..');
  const files = await ftp.ls(rootDir);
  console.log('Files in root directory: ', files?.length);
  ftp.disconnect();
}

const checkClientsFtpDetails = async ({ clientId, clientsToIgnore}) => {
  console.log('Getting clients..')
  const filter = {'salesFtpIngestions.active': true};
  if (clientId) filter._id = clientId;
  if (clientsToIgnore?.length) filter._id = { $nin: clientsToIgnore};

  const clients = await Client.find(filter).select('name salesFtpIngestions');
  console.log(`Testing ${clients.length} clients`);

  await eachLimit(clients, 10, async (client) => {
    if (client?.salesFtpIngestions?.length) {
      for (const server of client.salesFtpIngestions) {
        if (server.active) {
          console.log(`===> Testing client: ${client._id} - ${client.name} - Server: ${server.name || server.host}`);
          await connectToFtpServer({server}).catch((err) => {
            throw Error(`===> Client: ${client._id} - ${client.name} - Server: ${server.name || server.host} - Error: ${err.message}`)
          });
        }
      }
    }
  })
}

const clientId = null;
const clientsToIgnore = [];
checkClientsFtpDetails({ clientId, clientsToIgnore}).then(() => { console.log('Done checking.')});