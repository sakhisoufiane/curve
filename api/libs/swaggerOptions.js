module.exports = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Curve Royalty Systems API',
      version: '1.10.0',
    },
    security: [
      {
        applicationToken: [],
        token: [],
      },
    ],
    components: {
      securitySchemes: {
        applicationToken: {
          type: 'apiKey',
          in: 'header',
          name: 'applicationToken',
          description: 'Enter applicationToken without enclosing quotation marks',
        },
        token: {
          type: 'apiKey',
          in: 'header',
          name: 'token',
          description: 'Enter token obtained from /authenticate route without enclosing quotation marks',
        },
      },
    },
  },
  apis: ['./routes/*.js', './routes/swaggerDocs/*.js', './routes/swaggerDocs/*.yml'],
};
