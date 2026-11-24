/* eslint-disable no-restricted-syntax */
/* eslint-disable no-promise-executor-return */
/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();

const { ECSClient, RunTaskCommand, DescribeTasksCommand } = require('@aws-sdk/client-ecs');

const batchTaskId = '685f20e490f8b0ab2c073d67';


const runIndividualBatchTask = async () => {
    // TODO: Instead of each lambda writing individually to BQ, we should send the files to GCS, group them and write them to BQ in a single file
    console.log(`Running batch task ${batchTaskId}`);
    const ecs = new ECSClient({ credentials: { accessKeyId: process.env.S3_access_key, secretAccessKey: process.env.S3_secret_key, }, region: process.env.S3_region });
    
    const command = new RunTaskCommand({
      cluster: 'sales-calculator',
      taskDefinition: 'sales-calculator-dev',
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: ['subnet-09be094e9fe9fb326', 'subnet-0ddf6d19da7c3222f', 'subnet-01c5af61f09089850'],
          assignPublicIp: 'DISABLED',
          securityGroups: ['sg-0cb722a51cdcc7023']
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: 'sales-calculator',
            environment: [
              { name: 'DB_PROTOCOL', value: process.env.DB_PROTOCOL },
              { name: 'DB_NAME', value: process.env.DB_NAME },
              { name: 'DB_OPTS', value: process.env.DB_OPTS },
              { name: 'DB_URL', value: process.env.DB_URL },
              { name: 'DB_USER', value: process.env.DB_USER },
              { name: 'DB_PASS', value: process.env.DB_PASS },
              { name: 'BQ_project_id', value: process.env.BQ_project_id },
              { name: 'BQ_client_email', value: process.env.BQ_client_email },
              { name: 'BQ_private_key', value: process.env.BQ_private_key },
              { name: 'batchTaskId', value: batchTaskId }
            ]
          }
        ]
      }
    });
  
    const response = await ecs.send(command);
  
    console.log(`Fargate task started for batch task ${batchTaskId}: ${response.tasks?.[0]?.taskArn}`);
    // Wait for the Fargate task to finish
    await waitForFargateToFinish({ecs, taskArn: response.tasks?.[0]?.taskArn});
    console.log(`Batch task ${batchTaskId} completed`);
    process.exit(0);
}

runIndividualBatchTask();

async function waitForFargateToFinish({ecs, taskArn}) {
    while (true) {
      await new Promise(r => setTimeout(r, 10000));
      const { tasks } = await ecs.send(
        new DescribeTasksCommand({ cluster: 'sales-calculator', tasks: [taskArn] })
      ).catch((error) => {
        console.log(`Error describing task ${taskArn}: ${error.message}`);
      });
      if (tasks?.[0]?.lastStatus === 'STOPPED') break;
    }
  }