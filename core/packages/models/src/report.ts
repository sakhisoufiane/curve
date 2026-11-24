import { Schema, Types } from 'mongoose';

export type Report = {
  name: string;
  table: string;
  clientId: string;
  payeeId: string;
  filter: unknown;
  filters: unknown;
  fields: unknown[];
  format: string;
  reportType: string;
  fixedReportId: Types.ObjectId;
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
};

const report = new Schema<Report>(
  {
    name: { type: String, required: true },
    table: { type: String, required: true },
    clientId: String,
    payeeId: String,
    filter: Schema.Types.Mixed,
    filters: Schema.Types.Mixed,
    fields: Array,
    format: String,
    reportType: String,
    fixedReportId: { type: Schema.Types.ObjectId, ref: 'FixedReport' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

export default { name: 'Report', schema: report };
