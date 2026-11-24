const { ElastiCacheClient, AddTagsToResourceCommand } = require('@aws-sdk/client-elasticache');


const client = new ElastiCacheClient({ region: 'eu-west-1' });
const input = { // AddTagsToResourceMessage
  ResourceName: 'arn:aws:elasticache:eu-west-1:211769215579:replicationgroup:der17qmlv1sm9ie3', // required
  Tags: [ // TagList // required
    { // Tag
      Key: "STRING_VALUE",
      Value: "STRING_VALUE",
    },
  ],
};
const command = new AddTagsToResourceCommand(input);
const response = await client.send(command);