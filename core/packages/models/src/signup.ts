import { Schema } from 'mongoose';

export type Signup = {
  user: unknown;
  client: unknown;
  confirmed: boolean;
  confirmedAt: Date;
};

const signup = new Schema<Signup>(
  {
    user: Object,
    client: Object,
    confirmed: { type: Boolean, default: false },
    confirmedAt: Date,
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Signup', schema: signup };
