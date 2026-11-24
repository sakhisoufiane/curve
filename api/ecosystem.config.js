// This file is where all long running pm2 scripts are configured.

// How to use:

// pm2 start pm2.config.js
// pm2 stop pm2.config.js
// pm2 restart pm2.config.js

module.exports = {
  apps: [
    {
      name: 'DDEX Ingestion',
      script: './processes/xmlIngestion/xmlRunner.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'Sales FTP Initialiser',
      script: './processes/ftpIngestion/ftpInitialiser.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'Sales Ingestion',
      script: './processes/ftpIngestion/ftpRunner.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'ACKs Ingestion',
      script: './processes/ftpIngestion/ackRunner.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'ACKs FTP Initialiser',
      script: './processes/ftpIngestion/ackInitialiser.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'Billing',
      script: './processes/billing/billingRunner.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'Flush Delvieries Queued Status',
      script: './processes/scheduledDeliveries/flushDeliveryQueuedStatus.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'Pre-Delivery Notifications',
      script: './processes/scheduledDeliveries/preDeliveryNotification.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'Scheduled Deliveries',
      script: './processes/scheduledDeliveries/runScheduledDeliveries.js',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'Ftp Iswc Ack Runner',
      script: './processes/ftpIswcAckCheck/ftpIswcAckRunner.js',
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
