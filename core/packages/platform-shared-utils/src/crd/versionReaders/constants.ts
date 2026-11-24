export type DistributionCategoryCode =
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 20
  | 21
  | 22
  | 30
  | 31
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 50
  | 51
  | 52
  | 60
  | 70
  | 71
  | 80
  | 90;

export const DISTRIBUTION_CATEGORY: Record<DistributionCategoryCode, string> = {
  10: 'Audio carriers - blanket licensing',
  11: 'Audio-visual carriers - blanket licensing',
  12: 'Synchronization rights',
  13: 'Audio carriers, work-by-work',
  14: 'Audio-visual carriers, work-by-work',
  15: 'Audio-visual Streaming - not on-demand',
  16: 'Audio-visual Streaming - on-demand',
  20: 'Radio',
  21: 'Television',
  22: 'Satellite radio',
  30: 'Private copying',
  31: 'Rental and lending',
  40: 'Download - musical works',
  41: 'Download - audiovisual works',
  42: 'Download - ringtones',
  43: 'Download - other',
  44: 'Internet radio',
  45: 'Audio Streaming - not on-demand',
  46: 'Audio Streaming - on-demand',
  47: 'Internet television',
  48: 'User Generated Content',
  50: 'Live performances',
  51: 'Major Live Performances',
  52: 'Live Stream Concerts',
  60: 'Discotheques',
  70: 'Music by electronic or mechanical means',
  71: 'Karaoke',
  80: 'Cinema',
  90: 'Other royalties',
};

export const CRD_FILE_HEADER = [
  'Channel',
  'Source',
  'Transaction Date',
  'Sale Date',
  'Date From',
  'Date To',
  'Territory',
  'Sub Source',
  'Work Title',
  'Release Title',
  'Release Artist',
  'Party 1',
  'Party 2',
  'Party 3',
  'Party 4',
  'Description',
  'Configuration',
  'Identifier',
  'ISAN',
  'AV Work Type',
  'Episode',
  'ISWC',
  'ISRC',
  'Barcode',
  'Cat No',
  'Song Code',
  'Duration',
  'Units',
  'Share Percentage',
  'Gross Amount',
  'Net Amount',
  'Original Currency',
  'Positive/Negative',
  'Sales Type',
  'Territory Name',
  'Source Collecting Society',
  'Source Type',
  'Source Description',
  'Production / Catalogue Number',
  'Adjustment Reason',
  'Composers',
  'Party 5',
  'Withholding At Source',
];
