import { Schema } from 'mongoose';

export type FixedReport = {
  name: string;
  key: string;
  label: boolean;
  publisher: boolean;
  public: boolean;
  clientIds: unknown[];
};

const fixedReport = new Schema<FixedReport>(
  {
    name: String,
    key: { type: String, unique: true },
    label: Boolean,
    publisher: Boolean,
    public: Boolean,
    clientIds: Array,
  },
  {
    timestamps: true,
  },
);

export default { name: 'FixedReport', schema: fixedReport };
