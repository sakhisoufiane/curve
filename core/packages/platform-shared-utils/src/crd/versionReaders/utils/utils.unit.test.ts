import { DISTRIBUTION_CATEGORY, type DistributionCategoryCode } from '../constants';
import { type MDRRecord, type MWNRecord } from '../types/baseTypes';
import { type CrdData2 } from '../types/crdV2Types';
import {
  addDecimalPoint,
  extractDateFromCombined,
  formatDate,
  getChannel,
  getMwnEntry,
  getWorkDistItem,
  mapDistributionCategory,
  readField,
} from './utils';

describe('addDecimalPoint', () => {
  it('returns null when input string is falsy or decimal places missing', () => {
    // Act & Assert
    expect(addDecimalPoint(undefined, 2)).toBeNull();
    expect(addDecimalPoint('', 2)).toBeNull();
    expect(addDecimalPoint('1234', undefined)).toBeNull();
  });

  it('inserts decimal point according to supplied places', () => {
    // Act & Assert
    expect(addDecimalPoint('1234', 2)).toBe('12.34');
    expect(addDecimalPoint('00001', 3)).toBe('0.001');
  });
});

describe('formatDate', () => {
  it('returns undefined when date string is missing', () => {
    // Act & Assert
    expect(formatDate(undefined, 'YYYYMMDD')).toBeUndefined();
    expect(formatDate('', 'YYYYMMDD')).toBeUndefined();
  });

  it('formats YYYYMMDD correctly ignoring sentinel 00000000', () => {
    // Act & Assert
    expect(formatDate('20240115', 'YYYYMMDD')).toBe('15/01/2024');
    expect(formatDate('00000000', 'YYYYMMDD')).toBeUndefined();
  });

  it('formats YYYY-MM-DD correctly', () => {
    // Act & Assert
    expect(formatDate('2024-01-15', 'YYYY-MM-DD')).toBe('15/01/2024');
  });
});

describe('mapDistributionCategory', () => {
  it('maps a numeric code via DISTRIBUTION_CATEGORY', () => {
    // Arrange
    const firstCode = Object.keys(DISTRIBUTION_CATEGORY)[0] as string;
    const numericCode = Number(firstCode) as DistributionCategoryCode;
    // Act & Assert
    expect(mapDistributionCategory(numericCode)).toBe(DISTRIBUTION_CATEGORY[numericCode]);
  });

  it('coerces string numbers to numeric codes', () => {
    // Arrange
    const firstCode = Object.keys(DISTRIBUTION_CATEGORY)[0] as string;
    const numericCode = Number(firstCode) as DistributionCategoryCode;
    // Act & Assert
    expect(mapDistributionCategory(firstCode)).toBe(DISTRIBUTION_CATEGORY[numericCode]);
  });
});

describe('getChannel', () => {
  const makeMdrRecord = (typeOfRightCategory: string): MDRRecord => ({
    transactionSequence: '1',
    recordSequence: '1',
    rightCode: 'RC',
    typeOfRightCategory,
  });

  it('prefers MDR line channel when valid', () => {
    // Arrange
    const mdrRecord = makeMdrRecord('PER');
    // Act
    const result = getChannel([mdrRecord]);
    // Assert
    expect(result).toBe('Performance');
  });

  it('falls back to SDN channel when MDR line missing', () => {
    // Arrange
    const Mdr: MDRRecord[] = [];
    // Act
    const result = getChannel(Mdr, 'MEC');
    // Assert
    expect(result).toBe('Mechanical');
  });

  it('falls back to SDN channel when MDR undefined', () => {
    // Arrange
    const Mdr = undefined;
    // Act
    const result = getChannel(Mdr, 'PER');
    // Assert
    expect(result).toBe('Performance');
  });

  it('falls back to SDN channel when MDR line has no typeOfRightCategory', () => {
    // Arrange
    const Mdr = [makeMdrRecord('')];
    // Act
    const result = getChannel(Mdr, 'SYN');
    // Assert
    expect(result).toBe('Sync');
  });
});

describe('getMwnEntry & getWorkDistItem', () => {
  it('initialises missing MWN entry and work distribution array entries', () => {
    // Arrange
    const crdData: CrdData2 = { MWN: {}, SDN: {} };
    // Act
    const entry = getMwnEntry(crdData, 'ABC123');
    // Assert
    expect(entry).toEqual({});
    expect(crdData.MWN.ABC123).toBe(entry);
  });
  it('initialises missing MWN entry and work distribution array entries', () => {
    // Arrange
    const crdData: CrdData2 = { MWN: {}, SDN: {} };
    // Act
    const workDistItem = getWorkDistItem(crdData, 'ABC123', 0);
    // Assert
    expect(workDistItem).toEqual({});
    const updatedEntry = crdData.MWN.ABC123 as MWNRecord;
    expect(updatedEntry).toBeDefined();
    expect(updatedEntry.workDist).toHaveLength(1);
    expect(updatedEntry.workDist?.[0]).toEqual(workDistItem);
  });
  // check that it gets the nth entry in the workDist array
  it('gets the nth entry in the workDist array', () => {
    // Arrange
    const workDistItem = {
      MDS: {
        transactionSequence: '1',
        recordSequence: '1',
        mdsIdentifier: '1',
        typeOfShareStructure: '1',
        paymentRuleIndicator: '1',
        workStatusStartDate: '1',
        workStatusEndDate: '1',
      },
     };
    const crdData: CrdData2 = { MWN: { ABC123: { workDist: [{ }, workDistItem] } }, SDN: {} };
    // Act
    const workDistItemReceived = getWorkDistItem(crdData, 'ABC123', 1);
    // Assert
    expect(workDistItemReceived).toEqual(workDistItem);
  });
});

describe('extractDateFromCombined', () => {
  it('extracts YYYYMM segment per position and defaults day to 01', () => {
    // Arrange
    const combined = '202401202402';
    // Act & Assert
    expect(extractDateFromCombined(combined, 0)).toBe('01/01/2024');
    expect(extractDateFromCombined(combined, 1)).toBe('01/02/2024');
  });

  it('returns empty string when invalid input supplied', () => {
    // Act & Assert
    expect(extractDateFromCombined(undefined, 0)).toBe('');
    expect(extractDateFromCombined('2024', 0)).toBe('');
  });
});

describe('readField', () => {
  it('slices the provided string', () => {
    // Arrange
    const line = '     FIELD-VALUE   ';
    // Act & Assert
    expect(
      readField({
        line,
        start: 5,
        length: 11,
      })
    ).toBe('FIELD-VALUE');
  });
  it('slices the provided string and trims whitespace', () => {
    // Arrange
    const line = '     FIELD-VALUE   ';
    // Act & Assert
    expect(
      readField({
        line,
        start: 5,
        length: 13,
      })
    ).toBe('FIELD-VALUE');
  });
});


