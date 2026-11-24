require('dotenv').config();
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
  
const sqs = new SQSClient({ credentials: { accessKeyId: process.env.RASA_SQS_ACCESS_KEY, secretAccessKey: process.env.RASA_SQS_ACCESS_SECRET }, region: process.env.RASA_SQS_REGION });
const QueueUrl = process.env.RASA_SQS_QUEUE;

// Send message
const message = {
    "bucket": "fuga-integ-rasa-statements",
    "name": "dds/123/9384.csv",
    "metageneration": "1",
    "timeCreated": "2020-09-29711:32:00.000Z",
    "updated": "2020-09-29712:11:00.000Z",
    "size": "1024",
    "md5Hash": "d41d8cd98f00b204e9800998ecf8427e",
    "contentType": "text/plain",
    "metadata": {
      "gcs_path": "gcs://ryba/123.csv",
      "export_run_id": "123",
      "statement_run_id": "123",
      "statement_run_name": "June 2023",
      "statement_run_reference": "2023.06",
      "statement_id": "9384",
      "statement_name": "Statement name",
      "account": "dds",
      "organization_id": "32234",
      "organization_name": "Jimmy Org",
      "package_hook": "hjkghjgj291jnhh21g",
      "statement_run_statements": "123"
    }
  }

// Set queue based on passed no
const command = new SendMessageCommand({ QueueUrl, MessageGroupId: '1', MessageBody: JSON.stringify(message) });
sqs.send(command, (err, result) => { err ? console.log(err): console.log(result); });
