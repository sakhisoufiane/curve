const SQS = require('../libs/sqs');

const QueueUrl = 'https://sqs.eu-west-1.amazonaws.com/993822227530/6195a5acdcc0840026b74eae-1698704371810.fifo';

const getMessage = new Promise((resolve, reject) => { 
  SQS.getMessages(QueueUrl, (err, message) => { 
    if (err) { 
      reject(err);
    } else {
      resolve(message);
    } 
  });
});


getMessage.then((message) => {
  console.log(message);
});
getMessage.then((message) => {
  console.log(message);
});
getMessage.then((message) => {
  console.log(message);
});
