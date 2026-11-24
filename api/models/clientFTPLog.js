const { ClientFTPLog } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');

module.exports = mongoose.model(ClientFTPLog.name, ClientFTPLog.schema);
