import { Schema } from 'mongoose';
import insertionTerritorySchema from './insertionTerritorySchema';

export type DeliveryPartner = {
  clientId: string;
  cwrVersion: string;
  extraPartners: unknown[];
  ftpAuthenticationType: string;
  ftpFileKey: string;
  ftpHost: string;
  ftpPassword: string;
  ftpPort: string;
  ftpRootDir: string;
  ftpUsername: string;
  insertion: {
    publisherId: string;
    category: string;
  };
  insertionTerritory: unknown[];
  ipiNo: string;
  sendingPartyName: string;
  sendingPartyId: string;
  name: string;
  notificationEmail: string;
  outputFormat: string;
  receivingParty: string;
  splitElection: boolean;
  splitElectionPRO: string;
  subPartners: unknown[];
  territory: string;
  type: string;
};

const deliveryPartner = new Schema<DeliveryPartner>(
  {
    clientId: String,
    cwrVersion: { type: String, default: '2.2' },
    extraPartners: Array,
    ftpAuthenticationType: String,
    ftpFileKey: String,
    ftpHost: String,
    ftpPassword: String,
    ftpPort: String,
    ftpRootDir: String,
    ftpUsername: String,
    insertion: { publisherId: String, category: String },
    insertionTerritory: [insertionTerritorySchema.schema],
    ipiNo: String,
    sendingPartyName: String,
    sendingPartyId: String,
    name: String,
    notificationEmail: String,
    outputFormat: { type: String, default: 'CWR' },
    receivingParty: String,
    splitElection: Boolean,
    splitElectionPRO: String,
    subPartners: Array,
    territory: String,
    type: String,
  },
  {
    timestamps: true,
  },
);

export default { name: 'DeliveryPartner', schema: deliveryPartner };
