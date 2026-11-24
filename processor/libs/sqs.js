require('dotenv').config();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const {
  SQSClient,
  ListQueuesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
  DeleteQueueCommand,
} = require('@aws-sdk/client-sqs');
const moment = require('moment');

const sqs = new SQSClient({
  credentials: {
    accessKeyId: process.env.S3_access_key,
    secretAccessKey: process.env.S3_secret_key,
  },
  region: process.env.SQS_region || process.env.S3_region,
  endpoint: process.env.SQS_endpoint || undefined,
});

module.exports = {
  getQueues(callback) {
    const command = new ListQueuesCommand({});
    sqs.send(command, callback);
  },
  sendMessage(message, queue, callback) {
    // Check if message exists
    if (message) {
      // If queue is a number, set it to the right queue, else use the queueURL
      if (queue === 1) {
        queue = process.env.SQS_queue_1;
      } else if (queue === 2) {
        queue = process.env.SQS_queue_2;
      }
      const command = new SendMessageCommand({ QueueUrl: queue, MessageGroupId: '1', MessageBody: JSON.stringify(message) });
      sqs.send(command, callback);
    } else {
      // Handle no queue error
      callback(new Error('Message is required'));
    }
  },
  getMessages(queue, callback) {
    // Set queue based on passed no
    if (queue === 1) {
      queue = process.env.SQS_queue_1;
    } else if (queue === 2) {
      queue = process.env.SQS_queue_2;
    }
    logger.debug(queue);
    const command = new ReceiveMessageCommand({ QueueUrl: queue, MaxNumberOfMessages: 1 });
    sqs.send(command, callback);
  },
  getMessage(queue, callback) {
    const sqsLib = this;
    this.getMessages(queue, (err, res) => {
      if (err) {
        // Handle errors
        callback(err);
        // Check message exists
      } else if (res.Messages && res.Messages[0] && res.Messages[0].Body) {
        // Delete Message
        logger.debug({ res });
        sqsLib.deleteMessage(queue, res.Messages[0].ReceiptHandle, (err) => {
          if (err) {
            // Handle any deletion errors
            callback(err);
          } else {
            // Return parsed body as object
            callback(null, JSON.parse(res.Messages[0].Body));
          }
        });
      } else {
        callback(null, null);
      }
    });
  },
  deleteMessage(queue, handle, callback) {
    // Set queue based on passed no
    if (queue === 1) {
      queue = process.env.SQS_queue_1;
    } else if (queue === 2) {
      queue = process.env.SQS_queue_2;
    }
    const command = new DeleteMessageCommand({ QueueUrl: queue, ReceiptHandle: handle });
    sqs.send(command, callback);
  },
  async createQueue(periodId) {
    logger.info(`Creating SQS queue for period ${periodId}..`);
    const QueueName = `${periodId}-${moment().format('x')}`;
    const input = {
      QueueName: `${QueueName}.fifo`,
      Attributes:
      {
        FifoQueue: 'true',
        ContentBasedDeduplication: 'true',
        Policy: `{
          "Version": "2008-10-17",
          "Statement": [
            {
              "Sid": "__owner_statement",
              "Effect": "Allow",
              "Principal": {
                "AWS": "arn:aws:iam::${process.env.SQS_project}:root"
              },
              "Action": "SQS:*",
              "Resource": "arn:aws:sqs:${process.env.SQS_region || 'eu-west-1'}:${process.env.SQS_project}:${QueueName}-${process.env.SQS_project}.fifo"
            }
          ]
        }`,
      },
    };

    const command = new CreateQueueCommand(input);

    return sqs.send(command);
  },
  async deleteQueue(QueueUrl) {
    logger.info(`Deleting SQS queue ${QueueUrl}..`);
    const params = { QueueUrl };
    const command = new DeleteQueueCommand(params);
    return sqs.send(command);
  },
};
