const SQS = require('../libs/sqs');
const moment = require('moment');
const { eachSeries } = require('async');

(async () => {
  // Create Queue
  // const { QueueUrl } = await SQS.createQueue('63e607221ffc28bbbc641ab7')
  // console.log('Queue created ', QueueUrl);
  
  // Send messages
  // const IDS = ['63e607221ffc28bbbc641ab1', '63e607221ffc28bbbc641ab2', '63e607221ffc28bbbc641ab3', '63e607221ffc28bbbc641ab4', '63e607221ffc28bbbc641ab5']
  // const QueueUrl = 'https://sqs.eu-west-1.amazonaws.com/211769215579/63e607221ffc28bbbc641ab7.fifo';
  
  // eachSeries(IDS, (id, cb) => {  
  //   const message = {
  //     clientId: '63e607221ffc28bbbc641a10', periodId: '63e607221ffc28bbbc641ab7', name: 'Batch Task Id', status: 'Pending', value: { batchTaskId: id },
  //   };
  
  //   SQS.sendMessage(message, QueueUrl, (err, result) => {
  //     console.log('message sent')
  //     cb();
  //   });

  // })
  
  //Get message
  const QueueUrl = 'https://sqs.eu-west-1.amazonaws.com/211769215579/63e607221ffc28bbbc641ab7.fifo';
  SQS.getMessage(QueueUrl, (err, message) => {
    console.log(err || message);
  })

  // Delete Queue
  // const response = await SQS.deleteQueue(QueueUrl);
  // console.log(response);
})();
