/* eslint-disable no-new */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Network } from '@curveroyaltysystems/aws-base-infra';

export class SalesCalculatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const appName = 'sales-calculator';

    const vpc = Network.importVPC(this);
    const privateSubnetIds = vpc.selectSubnets(Network.dualStackSelector).subnetIds;

    // Security group (egress-only)
    const taskSG = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group for outbound-only ECS Fargate tasks',
    });

    // ECR repository
    const repo = new ecr.Repository(this, 'EcrRepository', {
      repositoryName: appName,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // ECS cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc,
      containerInsights: true,
      clusterName: `${appName}-cluster`,
    });

    // CloudWatch Logs
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/${appName}`,
      retention: logs.RetentionDays.INFINITE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM roles
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'App task role for Sales Calculator jobs',
    });

    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')],
      description: 'Execution role to pull from ECR and write logs',
    });

    // Fargate task definition (short-lived job)
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: 1024,
      memoryLimitMiB: 8192,
      taskRole,
      executionRole,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    taskDef.addContainer('JobContainer', {
      containerName: appName,
      image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
      cpu: 1024,
      memoryLimitMiB: 8192,
      memoryReservationMiB: 8192,
      logging: ecs.LogDriver.awsLogs({ logGroup, streamPrefix: appName }),
      // environment: { NODE_ENV: 'production' },
      // command: ['node', 'job.js'],
    });

    // SSM parameters
    new ssm.StringParameter(this, 'VpcIdParameter', {
      parameterName: `/${appName}/vpc-id`,
      stringValue: vpc.vpcId,
    });
    new ssm.StringParameter(this, 'SecurityGroupIdParameter', {
      parameterName: `/${appName}/security-group-id`,
      stringValue: taskSG.securityGroupId,
    });
    new ssm.StringParameter(this, 'EcrRepoUriParameter', {
      parameterName: `/${appName}/ecr-repo-uri`,
      stringValue: repo.repositoryUri,
    });
    new ssm.StringParameter(this, 'EcsClusterNameParameter', {
      parameterName: `/${appName}/ecs-cluster-name`,
      stringValue: cluster.clusterName,
    });
    new ssm.StringParameter(this, 'LogGroupNameParameter', {
      parameterName: `/${appName}/log-group-name`,
      stringValue: logGroup.logGroupName,
    });
    new ssm.StringParameter(this, 'TaskRoleArnParameter', {
      parameterName: `/${appName}/task-role-arn`,
      stringValue: taskRole.roleArn,
    });
    new ssm.StringParameter(this, 'ExecutionRoleArnParameter', {
      parameterName: `/${appName}/execution-role-arn`,
      stringValue: executionRole.roleArn,
    });
    new ssm.StringParameter(this, 'TaskDefinitionArnParameter', {
      parameterName: `/${appName}/task-definition-arn`,
      stringValue: taskDef.taskDefinitionArn,
    });
    new ssm.StringListParameter(this, 'PrivateSubnetIdsParameter', {
      parameterName: `/${appName}/private-subnet-ids`,
      stringListValue: privateSubnetIds,
    });

    // Stack resources
    new cdk.CfnOutput(this, 'VpcId', { value: vpc.vpcId });
    new cdk.CfnOutput(this, 'SecurityGroupId', { value: taskSG.securityGroupId });
    new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName });
    new cdk.CfnOutput(this, 'TaskDefinitionArn', { value: taskDef.taskDefinitionArn });
    new cdk.CfnOutput(this, 'EcrRepoUri', { value: repo.repositoryUri });
  }
}
