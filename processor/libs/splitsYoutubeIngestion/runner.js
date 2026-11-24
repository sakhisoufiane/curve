require('../../models/db');
const splitsYoutubeIngestion = require('./index');

const bucketName = process.env.environmentName === 'Production' ? 'curve-sftp' : 'curve-sftp-dev';
const prefix = 'fuga-youtube/';

splitsYoutubeIngestion.scanAndIngest(bucketName, prefix);
