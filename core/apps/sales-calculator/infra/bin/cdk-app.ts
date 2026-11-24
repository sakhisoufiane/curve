import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SalesCalculatorStack } from '../lib/sales-calculator-stack';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
};

// eslint-disable-next-line no-new
new SalesCalculatorStack(app, 'SalesCalculatorStack', {
  env,
  stackName: 'sales-calculator',
});
