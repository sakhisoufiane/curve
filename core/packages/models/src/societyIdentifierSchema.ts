import { Schema } from 'mongoose';

export type SocietyIdentifierSchema = {
  society: string;
  identifier: string;
};

const societyIdentifierSchema = new Schema<SocietyIdentifierSchema>(
  {
    society: String,
    identifier: String,
  },
  { _id: false },
);

export default {
  name: 'SocietyIdentifierSchema',
  schema: societyIdentifierSchema,
};
