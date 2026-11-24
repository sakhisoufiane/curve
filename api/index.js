const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
// eslint-disable-next-line import/no-extraneous-dependencies
const qs = require('qs');

const app = express();

// Configure query parser to handle arrays properly, as a recent update to express changed the default behavior
// to not parse arrays properly when using jQuery's $.param(). This is a temporary fix to ensure that the query parser works as expected.
// This ensures jQuery's $.param() indexed arrays (ids[0]=a&ids[1]=b) are parsed as arrays
app.set('query parser', (str) => qs.parse(str, { arrayLimit: 10000 }));

// Security
app.use(helmet());

logger.info('App Running');
logger.info(app.settings.env);

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(`${__dirname}/public`));
app.use(require('./routes'));

app.enable('trust proxy');

if (!module.parent) {
  app.listen(8081);
}

module.exports = app;
