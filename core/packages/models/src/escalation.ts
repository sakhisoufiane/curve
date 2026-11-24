import { Schema, Types } from 'mongoose';

export type Escalation = {
  clientId: string;
  periodId: Types.ObjectId;
  contractId: Types.ObjectId;
  trackers: unknown;
  startDate: Date;
  endDate: Date;
  previousCalculationTrackers: unknown;
};

const escalation = new Schema<Escalation>(
  {
    clientId: String,
    periodId: { type: Schema.Types.ObjectId, ref: 'Period' },
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract' },
    trackers: Object,
    startDate: Date,
    endDate: Date,
    previousCalculationTrackers: Object,
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export default { name: 'Escalation', schema: escalation };
