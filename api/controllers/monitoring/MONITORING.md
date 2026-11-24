# Monitoring controller

The monitoring controller (`index.js`) uses AWS credentials from environment variables to stop and poll Step Function executions and AWS Batch jobs (e.g. when terminating or re-running tasks from the monitoring dashboard).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PROCESSOR_ACCESS_KEY` | AWS access key ID for the IAM user/role |
| `PROCESSOR_SECRET_KEY` | AWS secret access key |
| `ECS_REGION` or `S3_region` | AWS region for Step Functions and Batch |
| `STEP_FUNCTION_STATE_MACHINE_ARN` | Used to build execution ARNs when stopping Step Function runs |

## IAM permissions

The IAM user or role whose keys are set in `PROCESSOR_ACCESS_KEY` / `PROCESSOR_SECRET_KEY` needs the following permissions. Use this policy (attach to the user or role, or merge into an existing policy).

### Minimal policy (recommended)

Restrict `Resource` to your state machine’s executions and your Batch job queue/jobs when possible.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "states:StopExecution",
            "Resource": "arn:aws:states:*:*:execution:*:*"
        },
        {
            "Effect": "Allow",
            "Action": "batch:TerminateJob",
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "states:StopExecution",
                "states:DescribeExecution"
            ],
            "Resource": "arn:aws:states:*:*:execution:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "batch:TerminateJob",
                "batch:DescribeJobs"
            ],
            "Resource": "*"
        }
    ]
}
```

### Optional: restrict by resource

Tighten the policy by replacing `"Resource": "*"` with your ARNs:

- **Step Functions:** execution ARNs for your state machine, e.g.  
  `"Resource": "arn:aws:states:REGION:ACCOUNT_ID:execution:STATE_MACHINE_NAME:*"`
- **Batch:** job queue and jobs, e.g.  
  `"Resource": ["arn:aws:batch:REGION:ACCOUNT_ID:job-queue/JOB_QUEUE_NAME", "arn:aws:batch:REGION:ACCOUNT_ID:job-definition/*"]`  
  (Batch may require both queue and job definition ARNs depending on usage; the minimal policy above with `*` is valid if you prefer simplicity.)
