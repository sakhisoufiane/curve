const { FtpLogs } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');

module.exports = mongoose.model(FtpLogs.name, FtpLogs.schema);
