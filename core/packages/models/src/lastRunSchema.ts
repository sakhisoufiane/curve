import { Schema } from 'mongoose';

export type LastRunSchema = {
  date: Date;
  workCount: number;
};

const lastRunSchema = new Schema<LastRunSchema>({
  date: Date,
  workCount: Number,
});

export default { name: 'LastRunSchema', schema: lastRunSchema };
