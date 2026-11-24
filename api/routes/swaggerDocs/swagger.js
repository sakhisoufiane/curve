const express = require('express');

const router = express.Router();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerOptions = require('../../libs/swaggerOptions');
const Client = require('../../models/client');

const corsHeaders = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.frontEndUrl);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, token, x-api-key');
  next();
};

router.use('/swagger.json', corsHeaders);

router.get('/swagger.json', async (req, res) => {
  try {
    const client = await Client.findById(req.curveUser.clientId);

    if (!client.features.fugaApiUser && !client.features.apiUser) {
      return res.status(403).json({
        error: 'API doc access required',
        message: 'Your account does not have API doc access. Please contact support to enable API doc access.',
      });
    }
    const options = JSON.parse(JSON.stringify(swaggerOptions));

    if (client.features.fugaApiUser) {
      options.apis.push('./routes/swaggerDocs/fugaOnly/*');
    }

    const swaggerSpec = swaggerJsDoc(options);
    res.json(swaggerSpec);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate API documentation',
    });
  }
});

router.options('/swagger.json', (req, res) => res.sendStatus(200));

module.exports = router;
