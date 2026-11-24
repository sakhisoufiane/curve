require('dotenv').config();
require('../../models/db');
const User = require('../../models/user');
const Client = require('../../models/client');
const { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand } = require("@aws-sdk/client-cloudwatch-logs");
const AWSClient = new CloudWatchLogsClient({ region: "eu-west-1", credentials: { accessKeyId: process.env.S3_access_key, secretAccessKey: process.env.S3_secret_key } });
const fs = require('fs');
const { eachLimit } = require('async');

const apiUsersReport = async () => {
  const data = [['Email', 'Client Names', 'Requests Last 180 Days']];
  // Get all users with API keys
  const users = await User.find({ apiKey: { $exists: true } });
  console.log(`Found ${users.length} users with API keys`);

  let processedUsers = 0;
  
  await eachLimit(users, 5, async (user) => {
      // Get all clients for the user
      const clientIds = user.rights ? Object.keys(user.rights).filter((clientId) => clientId !== "null") : user.clientIds;
      const clients = await Client.find({ _id: { $in: clientIds } });
      console.log(`User ${user.email} has access to ${clients.length} clients`);
      // Get request for the last 30 days
      const totalLogs = await getLogsForUser(user.email);
      console.log(`User ${user.email} has ${totalLogs} logs`);
      data.push([user.email, clients.map((client) => client.name).join(' | ').replace(/,/g, ' '), totalLogs]);
      
      processedUsers++;
      console.log(`Processed ${processedUsers} of ${users.length} users`);
      await new Promise(r => setTimeout(r, 1000));
  });

  fs.writeFileSync('api_users_report.csv', data.join('\n'));
  console.log('Report generated successfully.');
  process.exit(0);
};

getLogsForUser = async (email) => {
    let totalLogs = 0;
    const queryParams = ['fields @timestamp, @message', `| filter @message like \'{"user":"${email}"\'`, '| stats count(*) as totalLogs'];

    const startQuery = new StartQueryCommand({
        logGroupName: "Production-API",
        startTime: Date.now() - 180 * 24 * 60 * 60 * 1000, // last 30 days
        endTime: Date.now(),
        queryString: queryParams.join('\n'),
    });

    const { queryId } = await AWSClient.send(startQuery);

    while (true) {
        const res = await AWSClient.send(new GetQueryResultsCommand({ queryId }));
        if (res.status === "Complete") {
            console.log(JSON.stringify(res.results));
            totalLogs = res.results?.[0]?.[0]?.value || 0;
        break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    return totalLogs;
}

apiUsersReport();

// getLogsForUser('integrity-curve-api-us-sandbox@integrity.com').then(console.log).catch(console.error);