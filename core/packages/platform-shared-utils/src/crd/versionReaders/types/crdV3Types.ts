import {
  type ADJRecord,
  type MWNRecord,
  type RPIRecord,
  type SDN,
  type WEA,
  type WEP,
  type WER,
  type WorkDistRecord,
  type HDR,
} from './baseTypes';

// --- ADJ addition ---
interface ADJRecord3 extends ADJRecord {
  originalExploitationSourceIdentifier: string;
}

// --- Royalties additions ---
interface RoyaltySequenceNumbers {
  MdrSequenceNumber: string;
  MdtSequenceNumber: string;
}

interface WEP3 extends WEP, RoyaltySequenceNumbers {
  commissionRate: string;
}

interface WEA3 extends WEA, RoyaltySequenceNumbers {
  commissionRate: string;
  recordedProductNumber: string;
}

interface WER3 extends WER, RoyaltySequenceNumbers {
  societyAvWorkIdentifier: string;
  trackArtist: string;
}

type RoyaltyRecord3 = WEP3 | WEA3 | WER3;

export type WorkDistRecord3 = Omit<WorkDistRecord, 'ADJ' | 'royalties'> & {
  ADJ?: ADJRecord3[];
  royalties?: Record<string, RoyaltyRecord3>;
};

type MWNRecord3 = Omit<MWNRecord, 'workDist'> & {
  workDist?: Array<WorkDistRecord3>;
};

// --- RPI addition ---
interface RPIRecord3 extends RPIRecord {
  soundCarrierArtist: string;
};

type SDN3 = Omit<SDN, 'RPI'> & {
  RPI?: Record<string, RPIRecord3>;
};

export interface CrdData3 {
  HDR?: HDR;
  MWN: Record<string, MWNRecord3>;
  SDN: SDN3;
};
