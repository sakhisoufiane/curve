const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({
  credentials: {
    accessKeyId: process.env.S3_access_key,
    secretAccessKey: process.env.S3_secret_key,
  },
  region: process.env.S3_region,
});

const lambdas = {
  invoke: async (functionName, object) => {
    const params = { FunctionName: functionName };
    if (object) {
      params.Payload = JSON.stringify(object);
    }
    const command = new InvokeCommand(params);
    return lambda.send(command);
  },
  encrypt: async (object) => lambdas.invoke('platoonEncryptionLambda', object),
  sftp: async (object) => lambdas.invoke('platoonSftpLambdaKt', object),
};

module.exports = lambdas;
