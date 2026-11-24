import { Schema } from 'mongoose';

export type CalculationNotesSchema = {
  type: string;
  message: string;
  runNo: number;
  documentId: string;
  documentName: string;
  documentType: string;
};

const calculationNotesSchema = new Schema<CalculationNotesSchema>({
  type: { type: String, required: true },
  message: { type: String, required: true },
  runNo: { type: Number, required: true },
  documentId: String,
  documentName: String,
  documentType: { type: String, required: true, enum: ['Payee', 'Contract'] },
});

export default {
  name: 'CalculationNotesSchema',
  schema: calculationNotesSchema,
};
