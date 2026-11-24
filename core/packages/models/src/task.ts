import { Schema } from 'mongoose';

export type TaskMetadata = {
  stepFunctionExecutionId: string;
  awsBatchJobId: string;
  image: {
    id: string;
    tag: string;
  }
  compute: {
    cpu: string;
    memory: number;
  }
};

export type Task = {
  clientId: string;
  clientName: string;
  priority: number;
  name: string;
  email: string;
  status: string;
  value: unknown;
  started: Date;
  complete: Date;
  error: unknown;
  progressStatus: string;
  type: string;
  taskArn: string;
  healthCheck: Date;
  retries: number;
  metadata: TaskMetadata;
  duration: number;
  environment: string;
};

const taskMetadataSchema = new Schema<TaskMetadata>(
  {
    stepFunctionExecutionId: String,
    awsBatchJobId: String,
    image: {
      id: String,
      tag: String,
    },
    compute: {
      cpu: String,
      memory: Number,
    }
  },
  {
    // no id and timestamps
    timestamps: false,
    _id: false,
  },
);

const task = new Schema<Task>(
  {
    clientId: String,
    clientName: String,
    priority: { type: Number, default: 1 },
    name: String,
    email: String,
    status: { type: String, default: 'Pending' },
    value: Schema.Types.Mixed,
    started: Date,
    complete: Date,
    error: Schema.Types.Mixed,
    progressStatus: String,
    type: String,
    taskArn: String,
    healthCheck: Date,
    retries: { type: Number, default: 0 },
    metadata: taskMetadataSchema,
    duration: Number,
    environment: String
  },
  {
    timestamps: true,
  },
);

export default { name: 'Task', schema: task };
