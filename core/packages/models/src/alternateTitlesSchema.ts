import { Schema } from 'mongoose';

export type AlternateTitlesSchema = {
  title: string;
  language: string;
};

const alternateTitlesSchema = new Schema<AlternateTitlesSchema>(
  {
    title: String,
    language: String,
  },
  { _id: false },
);

export default { name: 'AlternateTitlesSchema', schema: alternateTitlesSchema };
