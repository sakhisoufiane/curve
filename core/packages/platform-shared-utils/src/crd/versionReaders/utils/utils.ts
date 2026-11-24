import { DISTRIBUTION_CATEGORY, type DistributionCategoryCode } from '../constants';
import { WorkDistRecord, type MDRRecord } from '../types/baseTypes';
import { type CrdData2 } from '../types/crdV2Types';
import { type CrdData3, type WorkDistRecord3 } from '../types/crdV3Types';
import { type Channel, type ChannelCode } from '../types/sharedTypes';

export const addDecimalPoint = (str?: string, decimalPlaces?: number): string | null => {
  if (!str || str === '' || !decimalPlaces) return null;
  return (Number(str) / 10 ** decimalPlaces).toFixed(decimalPlaces);
};

export const formatDate = (dateStr?: string, format?: 'YYYYMMDD' | 'YYYY-MM-DD'): string | undefined => {
  let date;
  if (dateStr && dateStr !== '') {
    if (format === 'YYYYMMDD' && dateStr !== '00000000') {
      date = `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
    } else if (format === 'YYYY-MM-DD') {
      date = `${dateStr.slice(8, 10)}/${dateStr.slice(5, 7)}/${dateStr.slice(0, 4)}`;
    }
  }
  return date;
};

export const mapDistributionCategory = (code: string | number): string | undefined => {
  const numericCode = Number(code) as DistributionCategoryCode;
  return DISTRIBUTION_CATEGORY[numericCode];
};

export const getChannel = (MDRLines?: MDRRecord[], SDNChannel?: ChannelCode): Channel => {
  const sdnChannelCode = SDNChannel || '';
  if (MDRLines?.[0]?.typeOfRightCategory) {
    const mdrChannelCode = MDRLines[0].typeOfRightCategory;
    const mdrChannel = getChannelFromChannelCode(mdrChannelCode as ChannelCode);
    if (mdrChannel) {
      return mdrChannel;
    }
  }
  return getChannelFromChannelCode(sdnChannelCode as ChannelCode);
};

const getChannelFromChannelCode = (channelCode: ChannelCode): Channel => {
  if (channelCode === 'PER') {
    return 'Performance';
  }
  if (channelCode === 'MEC') {
    return 'Mechanical';
  }
  if (channelCode === 'SYN') {
    return 'Sync';
  }
  return channelCode;
};

export const getMwnEntry = (crdData: CrdData2 | CrdData3, transactionSequence: string) => {
  if (!crdData.MWN[transactionSequence]) {
    crdData.MWN[transactionSequence] = {};
  }
  return crdData.MWN[transactionSequence];
};

export const getWorkDistItem = (crdData: CrdData2 | CrdData3, transactionSequence: string, workDistIdx: number) => {
  const mwnEntry = getMwnEntry(crdData, transactionSequence);
  if (!mwnEntry.workDist) {
    mwnEntry.workDist = [];
  }
  if (!mwnEntry.workDist[workDistIdx]) {
    mwnEntry.workDist[workDistIdx] = {};
  }
  return mwnEntry.workDist[workDistIdx] as WorkDistRecord | WorkDistRecord3;
};

export const extractDateFromCombined = (combinedDate: string | undefined, position: number): string => {
  if (combinedDate && typeof combinedDate === 'string') {
    const startPos = 6 * position;
    const year = combinedDate.slice(startPos, startPos + 4);
    const month = combinedDate.slice(startPos + 4, startPos + 6);
    const date = `01/${month}/${year}`;
    return date.length === 10 ? date : '';
  }
  return '';
};

export const readField = ({ line, start, length }: { line: string; start: number; length: number }): string =>
  line.slice(start, start + length).trim();
