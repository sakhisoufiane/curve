import { Schema } from 'mongoose';

export type UnmappedTrack = {
  clientId: string;
  salesFileId: string;
  title: string;
  version: string;
  isrc: string;
  artist: string;
  trackId: string;
  complete: boolean;
};

const unmappedTrack = new Schema<UnmappedTrack>(
  {
    clientId: String,
    salesFileId: String,
    title: String,
    version: String,
    isrc: String,
    artist: String,
    trackId: String,
    complete: Boolean,
  },
  {
    timestamps: true,
  },
);

export default { name: 'UnmappedTrack', schema: unmappedTrack };
