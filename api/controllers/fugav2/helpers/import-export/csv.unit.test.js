const fs = require('fs');
const path = require('path');
const appRootDir = require('app-root-dir').get();
const {
  createTrackCSVWriter,
  createErrorCSVWriter,
  formatTrackAsCSVRow,
  formatErrorAsCSVRow,
  extractPayeesFromRow,
  validateHeaders,
  validatePayees,
  validateRow,
} = require('./csv');

describe('CSV Helper', () => {
  const testDir = path.join(appRootDir, 'tmp', 'csv-test');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const getPathToTestFile = (fileName) => {
    const filePath = path.join(testDir, fileName);
    return filePath;
  };

  const waitForStreamEnd = (writer) => new Promise((resolve, reject) => {
    writer.on('finish', () => {
      // Small delay to ensure file is flushed to disk
      setTimeout(() => resolve('writtenToFile'), 100);
    });
    writer.on('error', () => {
      reject('errorWritingToFile');
    });
  });

  const getCSVLines = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').filter((line) => line.trim());
  };

  describe('csv writers', () => {
    it('should create files at specified paths', async () => {
      // GIVEN
      const trackFile = getPathToTestFile('custom-tracks.csv');
      const errorFile = getPathToTestFile('custom-errors.csv');

      // WHEN
      const trackWriter = createTrackCSVWriter(trackFile);
      const errorWriter = createErrorCSVWriter(errorFile);

      trackWriter.end();
      errorWriter.end();

      await Promise.all([
        waitForStreamEnd(trackWriter),
        waitForStreamEnd(errorWriter),
      ]);

      // THEN
      expect(fs.existsSync(trackFile)).toBe(true);
      expect(fs.existsSync(errorFile)).toBe(true);
    });

    it('should create a CSV writer that generates correct headers', async () => {
      // GIVEN
      const filePath = getPathToTestFile('tracks.csv');
      const placeholderRow = ['placeholder'];

      // WHEN
      const writer = createTrackCSVWriter(filePath);
      writer.write(placeholderRow); // Trigger csv-write-stream library to create the file
      writer.end();

      await waitForStreamEnd(writer);

      const lines = getCSVLines(filePath);

      // THEN
      expect(lines).toHaveLength(2);
      const headers = lines[0].split(',');
      expect(headers).toHaveLength(35);
      const nonPayeeHeaders = headers.slice(0, 5);
      expect(nonPayeeHeaders).toEqual([
        'ID',
        'Asset Title',
        'Artists',
        'Alternative ID',
        'ISRC',
      ]);

      const payeeHeaders = headers.slice(5);
      expect(payeeHeaders).toHaveLength(30);

      for (let i = 1; i <= 10; i++) {
        const payeeStartIndex = (i - 1) * 3;

        expect(payeeHeaders.slice(payeeStartIndex, payeeStartIndex + 3)).toEqual([
          `Payee Name ${i}`,
          `Payee Email ${i}`,
          `Payee Participation ${i}`,
        ]);
      }
    });

    it('should create a functional CSV writer that can write data', async () => {
      const filePath = getPathToTestFile('tracks-with-data.csv');
      const writer = createTrackCSVWriter(filePath);

      const testRow = [
        'track123',
        'Test Track',
        'Test Artist',
        'ALT123',
        'ISRC123',
        'Payee 1', 'payee1@test.com', '50',
        'Payee 2', 'payee2@test.com', '30',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
        '', '', '',
      ];

      writer.write(testRow);
      writer.end();
      await waitForStreamEnd(writer);

      const lines = getCSVLines(filePath);
      expect(lines).toHaveLength(2);

      const dataRow = lines[1].split(',').map((cell) => cell.replace(/"/g, ''));
      const nonPayeeFields = dataRow.slice(0, 5);
      expect(nonPayeeFields[0]).toBe('track123');
      expect(nonPayeeFields[1]).toBe('Test Track');
      expect(nonPayeeFields[2]).toBe('Test Artist');
      expect(nonPayeeFields[4]).toBe('ISRC123');
      const firstPayeeFields = dataRow.slice(5, 8);
      expect(firstPayeeFields[0]).toBe('Payee 1');
      expect(firstPayeeFields[1]).toBe('payee1@test.com');
      expect(firstPayeeFields[2]).toBe('50');
    });

    it('should handle multiple rows correctly', async () => {
      const filePath = getPathToTestFile('tracks-multiple.csv');
      const writer = createTrackCSVWriter(filePath);

      const rows = [
        ['track1', 'Title 1', 'Artist 1', '', 'ISRC1', ...Array(30).fill('')],
        ['track2', 'Title 2', 'Artist 2', '', 'ISRC2', ...Array(30).fill('')],
        ['track3', 'Title 3', 'Artist 3', '', 'ISRC3', ...Array(30).fill('')],
      ];

      rows.forEach((row) => writer.write(row));
      writer.end();
      await waitForStreamEnd(writer);

      const lines = getCSVLines(filePath);
      expect(lines).toHaveLength(4);

      for (let i = 0; i < 3; i++) {
        const dataRow = lines[i + 1].split(',');
        const nonPayeeFields = dataRow.slice(0, 5);
        expect(nonPayeeFields[0]).toBe(`track${i + 1}`);
        expect(nonPayeeFields[1]).toBe(`Title ${i + 1}`);
        expect(nonPayeeFields[4]).toBe(`ISRC${i + 1}`);
      }
    });

    it('should create a CSV writer that generates correct error headers', async () => {
      const filePath = getPathToTestFile('errors.csv');
      const writer = createErrorCSVWriter(filePath);
      const row = ['placeholder'];
      writer.write(row); // to trigger csv-write-stream library to create the file

      writer.end();
      await waitForStreamEnd(writer);

      const lines = getCSVLines(filePath);
      const headers = lines[0].split(',');

      expect(headers).toHaveLength(6);
      const errorHeaders = [
        'ID',
        'Asset Title',
        'Artists',
        'Alternative ID',
        'ISRC',
        'Errors',
      ];
      expect(headers).toEqual(errorHeaders);
    });

    it('should create a functional CSV writer that can write error data', async () => {
      const filePath = getPathToTestFile('errors-with-data.csv');
      const writer = createErrorCSVWriter(filePath);

      const testErrorRow = [
        'track456',
        'Failed Track',
        'Failed Artist',
        '',
        'ISRC456',
        'Validation error: missing payee information',
      ];

      writer.write(testErrorRow);
      writer.end();
      await waitForStreamEnd(writer);

      const lines = getCSVLines(filePath);
      expect(lines).toHaveLength(2); // Headers + 1 data row

      const dataRow = lines[1].split(',').map((cell) => cell.replace(/"/g, ''));
      const nonPayeeFields = dataRow.slice(0, 5);
      expect(nonPayeeFields[0]).toBe('track456');
      expect(nonPayeeFields[1]).toBe('Failed Track');
      const errorField = dataRow[5];
      expect(errorField).toBe('Validation error: missing payee information');
    });

    it('should handle multiple error rows correctly', async () => {
      const filePath = getPathToTestFile('errors-multiple.csv');
      const writer = createErrorCSVWriter(filePath);

      const errorRows = [
        ['track1', 'Title 1', 'Artist 1', '', 'ISRC1', 'Error 1'],
        ['track2', 'Title 2', 'Artist 2', '', 'ISRC2', 'Error 2'],
        ['track3', 'Title 3', 'Artist 3', '', 'ISRC3', 'Error 3'],
      ];

      errorRows.forEach((row) => writer.write(row));
      writer.end();
      await waitForStreamEnd(writer);

      const lines = getCSVLines(filePath);
      expect(lines).toHaveLength(4);

      for (let i = 0; i < 3; i++) {
        const dataRow = lines[i + 1].split(',').map((cell) => cell.replace(/"/g, ''));
        const nonPayeeFields = dataRow.slice(0, 5);
        expect(nonPayeeFields[0]).toBe(`track${i + 1}`);
        const errorField = dataRow[5];
        expect(errorField).toBe(`Error ${i + 1}`);
      }
    });

    it('should create files with UTF-8 encoding', async () => {
      const filePath = getPathToTestFile('utf8-test.csv');
      const writer = createTrackCSVWriter(filePath);

      const testRow = [
        'track1',
        'Tëst Tráck wïth Ünïcödé',
        'Artïst Ñamé',
        '',
        'ISRC123',
        ...Array(30).fill(''),
      ];

      writer.write(testRow);
      writer.end();
      await waitForStreamEnd(writer);

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('Tëst Tráck wïth Ünïcödé');
      expect(content).toContain('Artïst Ñamé');
    });
  });

  describe('csv row formatters', () => {
    it('should format a complete track with all fields', () => {
      // GIVEN
      const track = {
        id: 'track123',
        title: 'Test Track',
        artist: 'Test Artist',
        isrc: 'ISRC123456789',
        payees: [
          { name: 'Payee 1', email: 'payee1@test.com', percentage: '50' },
          { name: 'Payee 2', email: 'payee2@test.com', percentage: '30' },
          { name: 'Payee 3', email: 'payee3@test.com', percentage: '20' },
        ],
      };

      // WHEN
      const result = formatTrackAsCSVRow(track);

      // THEN
      expect(result).toHaveLength(35);
      const nonPayeeFields = result.slice(0, 5);
      expect(nonPayeeFields).toEqual([
        'track123',
        'Test Track',
        'Test Artist',
        '',
        'ISRC123456789',
      ]);

      const firstThreePayees = result.slice(5, 14);
      expect(firstThreePayees).toEqual([
        'Payee 1', 'payee1@test.com', '50',
        'Payee 2', 'payee2@test.com', '30',
        'Payee 3', 'payee3@test.com', '20',
      ]);

      const remainingPayeeFields = result.slice(14, 35);
      expect(remainingPayeeFields).toEqual(Array(21).fill(''));
    });

    it('should handle track with missing fields', () => {
      // GIVEN
      const track = {
        id: 'track456',
      };

      // WHEN
      const result = formatTrackAsCSVRow(track);

      // THEN
      expect(result).toHaveLength(35);
      const nonPayeeFields = result.slice(0, 5);
      expect(nonPayeeFields).toEqual([
        'track456',
        '',
        '',
        '',
        '',
      ]);

      expect(result.slice(5, 35)).toEqual(Array(30).fill(''));
    });

    it('should handle track with no payees', () => {
      // GIVEN
      const track = {
        id: 'track789',
        title: 'No Payees Track',
        artist: 'Solo Artist',
        isrc: 'ISRC987654321',
        payees: [],
      };

      // WHEN
      const result = formatTrackAsCSVRow(track);

      // THEN
      expect(result).toHaveLength(35);
      const nonPayeeFields = result.slice(0, 5);
      expect(nonPayeeFields).toEqual([
        'track789',
        'No Payees Track',
        'Solo Artist',
        '',
        'ISRC987654321',
      ]);

      const allPayeeFields = result.slice(5, 35);
      expect(allPayeeFields).toEqual(Array(30).fill(''));
    });

    it('should handle null/undefined track', () => {
      // GIVEN
      const noTrack = null;

      // WHEN
      const result = formatTrackAsCSVRow(noTrack);

      // THEN
      expect(result).toHaveLength(35);
      const nonPayeeFields = result.slice(0, 5);
      expect(nonPayeeFields).toEqual(['', '', '', '', '']);
      const allPayeeFields = result.slice(5, 35);
      expect(allPayeeFields).toEqual(Array(30).fill(''));
    });

    it('should handle payees with missing fields', () => {
      // GIVEN
      const track = {
        id: 'track111',
        title: 'Incomplete Payees',
        artist: 'Artist',
        isrc: 'ISRC444',
        payees: [
          { name: 'Complete Payee', email: 'complete@test.com', percentage: '100' },
          { name: 'Missing Email', percentage: '50' },
          { email: 'missing-name@test.com', percentage: '25' },
          { name: 'Missing Percentage', email: 'missing-perc@test.com' },
        ],
      };

      // WHEN
      const result = formatTrackAsCSVRow(track);

      // THEN
      const firstFourPayeeFields = result.slice(5, 17);
      expect(firstFourPayeeFields).toEqual([
        'Complete Payee', 'complete@test.com', '100',
        'Missing Email', '', '50',
        '', 'missing-name@test.com', '25',
        'Missing Percentage', 'missing-perc@test.com', '',
      ]);
    });

    it('should format track with single error message', () => {
      // GIVEN
      const track = {
        id: 'error-track-1',
        title: 'Failed Track',
        artist: 'Failed Artist',
        isrc: 'ISRC999',
      };
      const errors = ['Validation failed: missing payee'];

      // WHEN
      const result = formatErrorAsCSVRow(track, errors);

      // THEN
      expect(result).toHaveLength(6);
      expect(result).toEqual([
        'error-track-1',
        'Failed Track',
        'Failed Artist',
        '',
        'ISRC999',
        'Validation failed: missing payee',
      ]);
    });

    it('should format track with multiple error messages', () => {
      // GIVEN
      const track = {
        id: 'error-track-2',
        title: 'Multiple Errors Track',
        artist: 'Error Artist',
        isrc: 'ISRC888',
      };
      const errors = [
        'Invalid ISRC format',
        'Payee percentages must sum to 100',
        'Missing required field: artist',
      ];

      // WHEN
      const result = formatErrorAsCSVRow(track, errors);

      // THEN
      expect(result).toHaveLength(6);
      expect(result).toEqual([
        'error-track-2',
        'Multiple Errors Track',
        'Error Artist',
        '',
        'ISRC888',
        'Invalid ISRC format, Payee percentages must sum to 100, Missing required field: artist',
      ]);
    });

    it('should handle track with missing fields', () => {
      // GIVEN
      const track = {
        id: 'error-track-3',
      };
      const errors = ['Track incomplete'];

      // WHEN
      const result = formatErrorAsCSVRow(track, errors);

      // THEN
      expect(result).toHaveLength(6);
      expect(result).toEqual([
        'error-track-3',
        '',
        '',
        '',
        '',
        'Track incomplete',
      ]);
    });

    it('should handle null/undefined track', () => {
      // GIVEN
      const errors = ['Track not found'];

      // WHEN
      const result = formatErrorAsCSVRow(null, errors);

      // THEN
      expect(result).toHaveLength(6);
      expect(result).toEqual([
        '',
        '',
        '',
        '',
        '',
        'Track not found',
      ]);
    });

    it('should handle non-array error parameter', () => {
      // GIVEN
      const track = {
        id: 'error-track-4',
        title: 'String Error Track',
        artist: 'Artist',
        isrc: 'ISRC777',
      };
      const errors = 'Single string error';

      // WHEN
      const result = formatErrorAsCSVRow(track, errors);

      // THEN
      expect(result).toHaveLength(6);
      expect(result).toEqual([
        'error-track-4',
        'String Error Track',
        'Artist',
        '',
        'ISRC777',
        'Unknown error',
      ]);
    });

    it('should handle null/undefined errors', () => {
      // GIVEN
      const track = {
        id: 'error-track-6',
        title: 'Undefined Errors Track',
        artist: 'Artist',
        isrc: 'ISRC555',
      };

      // WHEN
      const result = formatErrorAsCSVRow(track, null);

      // THEN
      expect(result).toHaveLength(6);
      expect(result).toEqual([
        'error-track-6',
        'Undefined Errors Track',
        'Artist',
        '',
        'ISRC555',
        'Unknown error',
      ]);
    });
  });

  describe('extractPayeesFromRow', () => {
    it('should extract payees from a row with single payee', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Summer Nights',
        Artists: 'John Doe',
        'Alternative ID': 'ALT-12345',
        ISRC: 'USRC17607839',
        'Payee Name 1': 'John Doe',
        'Payee Email 1': 'john@example.com',
        'Payee Participation 1': '100',
      };

      // WHEN
      const result = extractPayeesFromRow(row);

      // THEN
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        percentage: 100,
      });
    });

    it('should extract multiple payees from a row', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Collaboration Track',
        Artists: 'John Doe, Jane Smith, Bob Wilson',
        'Alternative ID': 'ALT-67890',
        ISRC: 'GBUM71505478',
        'Payee Name 1': 'John Doe',
        'Payee Email 1': 'john@example.com',
        'Payee Participation 1': '50',
        'Payee Name 2': 'Jane Smith',
        'Payee Email 2': 'jane@example.com',
        'Payee Participation 2': '30',
        'Payee Name 3': 'Bob Wilson',
        'Payee Email 3': 'bob@example.com',
        'Payee Participation 3': '20',
      };

      // WHEN
      const result = extractPayeesFromRow(row);

      // THEN
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        percentage: 50,
      });
      expect(result[1]).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com',
        percentage: 30,
      });
      expect(result[2]).toEqual({
        name: 'Bob Wilson',
        email: 'bob@example.com',
        percentage: 20,
      });
    });

    it('should skip completely empty payee chunks', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Track with Gaps',
        Artists: 'Various Artists',
        'Alternative ID': 'ALT-11111',
        ISRC: 'FRUM71500123',
        'Payee Name 1': 'John Doe',
        'Payee Email 1': 'john@example.com',
        'Payee Participation 1': '50',
        'Payee Name 2': '',
        'Payee Email 2': '',
        'Payee Participation 2': '',
        'Payee Name 3': 'Jane Smith',
        'Payee Email 3': 'jane@example.com',
        'Payee Participation 3': '50',
      };

      // WHEN
      const result = extractPayeesFromRow(row);

      // THEN
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        percentage: 50,
      });
      expect(result[1]).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com',
        percentage: 50,
      });
    });

    it('should include partially filled payee chunks', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Incomplete Payee Data',
        Artists: 'John Doe',
        'Alternative ID': '',
        ISRC: 'USRC17607840',
        'Payee Name 1': 'John Doe',
        'Payee Email 1': '',
        'Payee Participation 1': '100',
      };

      // WHEN
      const result = extractPayeesFromRow(row);

      // THEN
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: '',
        percentage: 100,
      });
    });

    it('should trim whitespace from payee fields', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Whitespace Test',
        Artists: 'John Doe',
        'Alternative ID': 'ALT-22222',
        ISRC: 'USRC17607841',
        'Payee Name 1': '  John Doe  ',
        'Payee Email 1': '  john@example.com  ',
        'Payee Participation 1': '  100  ',
      };

      // WHEN
      const result = extractPayeesFromRow(row);

      // THEN
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        percentage: 100,
      });
    });

    it('should return empty array when no payee columns exist', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'No Payees Track',
        Artists: 'Test Artist',
        'Alternative ID': 'ALT-33333',
        ISRC: 'USRC17607842',
      };

      // WHEN
      const result = extractPayeesFromRow(row);

      // THEN
      expect(result).toEqual([]);
    });

    it('should handle decimal percentages', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Decimal Split Track',
        Artists: 'John Doe, Jane Smith',
        'Alternative ID': 'ALT-44444',
        ISRC: 'USRC17607843',
        'Payee Name 1': 'John Doe',
        'Payee Email 1': 'john@example.com',
        'Payee Participation 1': '33.33',
        'Payee Name 2': 'Jane Smith',
        'Payee Email 2': 'jane@example.com',
        'Payee Participation 2': '66.67',
      };

      // WHEN
      const result = extractPayeesFromRow(row);

      // THEN
      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBe(33.33);
      expect(result[1].percentage).toBe(66.67);
    });
  });

  describe('validateHeaders', () => {
    let headers;

    beforeEach(() => {
      headers = [
        'ID',
        'Asset Title',
        'Artists',
        'Alternative ID',
        'ISRC',
        'Payee Name 1',
        'Payee Email 1',
        'Payee Participation 1',
        'Payee Name 2',
        'Payee Email 2',
        'Payee Participation 2',
        'Payee Name 3',
        'Payee Email 3',
        'Payee Participation 3',
        'Payee Name 4',
        'Payee Email 4',
        'Payee Participation 4',
        'Payee Name 5',
        'Payee Email 5',
        'Payee Participation 5',
        'Payee Name 6',
        'Payee Email 6',
        'Payee Participation 6',
        'Payee Name 7',
        'Payee Email 7',
        'Payee Participation 7',
        'Payee Name 8',
        'Payee Email 8',
        'Payee Participation 8',
        'Payee Name 9',
        'Payee Email 9',
        'Payee Participation 9',
        'Payee Name 10',
        'Payee Email 10',
        'Payee Participation 10',
      ];
    });

    it('should accept valid headers with minimum required payee columns', () => {
      // GIVEN
      const validHeaders = headers;

      // WHEN & THEN
      expect(() => validateHeaders(validHeaders)).not.toThrow();
    });

    it('should accept valid headers with more than minimum payee columns', () => {
      // GIVEN
      headers.push(...['Payee Name 11',
        'Payee Email 11',
        'Payee Participation 11',
        'Payee Name 12',
        'Payee Email 12',
        'Payee Participation 12']);

      const validHeaders = headers;

      // WHEN & THEN
      expect(() => validateHeaders(validHeaders)).not.toThrow();
    });

    it('should throw error when "ID" header name is incorrect', () => {
      // GIVEN
      const incorrectIdHeaderName = 'Track Id';
      headers[0] = incorrectIdHeaderName;
      const validHeaders = headers;

      // WHEN & THEN
      expect(() => validateHeaders(validHeaders)).toThrow('File validation error.');
    });

    it('should throw error when multiple basic headers are incorrect', () => {
      // GIVEN
      const incorrectTrackId = 'Track ID';
      const incorrectTrackTitle = 'Track Title';
      const incorrectArtistName = 'Artist Name';
      const incorrectAltId = 'Alt ID';
      const incorrectISRCCode = 'ISRC Code';

      headers[0] = incorrectTrackId;
      headers[1] = incorrectTrackTitle;
      headers[2] = incorrectArtistName;
      headers[3] = incorrectAltId;
      headers[4] = incorrectISRCCode;

      const invalidHeaders = headers;

      // WHEN & THEN
      expect(() => validateHeaders(invalidHeaders)).toThrow('File validation error.');
    });

    it('should throw error when payee columns are fewer than minimum required', () => {
      // GIVEN
      const headers = [
        'ID',
        'Asset Title',
        'Artists',
        'Alternative ID',
        'ISRC',
        'Payee Name 1',
        'Payee Email 1',
        'Payee Participation 1',
        'Payee Name 2',
        'Payee Email 2',
        'Payee Participation 2',
      ];

      // WHEN & THEN
      expect(() => validateHeaders(headers)).toThrow('File validation error.');
    });

    it('should throw error when payee header pattern is invalid', () => {
      // GIVEN
      const indexOfPayeeNameHeader = 5;
      headers[indexOfPayeeNameHeader] = 'invalid payee header name';

      // WHEN & THEN
      expect(() => validateHeaders(headers)).toThrow('File validation error.');
    });
  });

  describe('validatePayees', () => {
    it('should accept valid payees with correct data', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 50 },
        { name: 'Jane Smith', email: 'jane@example.com', percentage: 50 },
      ];

      // THEN
      expect(() => validatePayees(payees)).not.toThrow();
    });

    it('should accept a single payee', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 100 },
      ];

      // THEN
      expect(() => validatePayees(payees)).not.toThrow();
    });

    it('should accept payees with decimal percentages totaling 100', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 33.33 },
        { name: 'Jane Smith', email: 'jane@example.com', percentage: 33.33 },
        { name: 'Bob Wilson', email: 'bob@example.com', percentage: 33.34 },
      ];

      // THEN
      expect(() => validatePayees(payees)).not.toThrow();
    });

    it('should accept payees with percentages less than 100', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 40 },
        { name: 'Jane Smith', email: 'jane@example.com', percentage: 30 },
      ];

      // THEN
      expect(() => validatePayees(payees)).not.toThrow();
    });

    it('should throw error when payee is missing name', () => {
      // GIVEN
      const payees = [
        { name: '', email: 'john@example.com', percentage: 100 },
      ];

      // THEN
      expect(() => validatePayees(payees)).toThrow('Invalid payee data. Payee should have a name, email and percentage fields');
    });

    it('should throw error when payee is missing email', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: '', percentage: 100 },
      ];

      // THEN
      expect(() => validatePayees(payees)).toThrow('Invalid payee data. Payee should have a name, email and percentage fields');
    });

    it('should throw error when payee is missing percentage', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 0 },
      ];

      // THEN
      expect(() => validatePayees(payees)).toThrow('Invalid payee data. Payee should have a name, email and percentage fields');
    });

    it('should throw error when multiple payees have missing fields', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 50 },
        { name: '', email: 'jane@example.com', percentage: 30 },
        { name: 'Bob Wilson', email: '', percentage: 20 },
      ];

      // THEN
      expect(() => validatePayees(payees)).toThrow('Invalid payee data. Payee should have a name, email and percentage fields');
    });

    it('should throw error when total percentages exceed 100', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 60 },
        { name: 'Jane Smith', email: 'jane@example.com', percentage: 50 },
      ];

      // THEN
      expect(() => validatePayees(payees)).toThrow(/Total payee percentages exceed 100%/);
    });

    it('should throw error when single payee exceeds 100', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: 'john@example.com', percentage: 150 },
      ];

      // THEN
      expect(() => validatePayees(payees)).toThrow('Total payee percentages exceed 100% (current total: 150%)');
    });

    it('should accept empty payees array', () => {
      // GIVEN
      const payees = [];

      // THEN
      expect(() => validatePayees(payees)).not.toThrow();
    });

    it('should throw error when payee has name but missing both email and percentage', () => {
      // GIVEN
      const payees = [
        { name: 'John Doe', email: '', percentage: 0 },
      ];

      // THEN
      expect(() => validatePayees(payees)).toThrow('Invalid payee data. Payee should have a name, email and percentage fields');
    });
  });

  describe('validateRow', () => {
    it('should accept valid row with all required fields', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Summer Nights',
        Artists: 'John Doe',
        'Alternative ID': 'ALT-12345',
        ISRC: 'USRC17607839',
        'Payee Name 1': 'John Doe',
        'Payee Email 1': 'john@example.com',
        'Payee Participation 1': '100',
      };

      // THEN
      expect(() => validateRow(row)).not.toThrow();
    });

    it('should accept valid row with optional Artists field empty', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Summer Nights',
        Artists: '',
        'Alternative ID': 'ALT-12345',
        ISRC: 'USRC17607839',
      };

      // THEN
      expect(() => validateRow(row)).not.toThrow();
    });

    it('should accept valid row with optional Alternative ID field empty', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Summer Nights',
        Artists: 'John Doe',
        'Alternative ID': '',
        ISRC: 'USRC17607839',
      };

      // THEN
      expect(() => validateRow(row)).not.toThrow();
    });

    it('should accept valid row with multiple payees', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Collaboration Track',
        Artists: 'John Doe, Jane Smith',
        'Alternative ID': 'ALT-67890',
        ISRC: 'GBUM71505478',
        'Payee Name 1': 'John Doe',
        'Payee Email 1': 'john@example.com',
        'Payee Participation 1': '50',
        'Payee Name 2': 'Jane Smith',
        'Payee Email 2': 'jane@example.com',
        'Payee Participation 2': '50',
      };

      // THEN
      expect(() => validateRow(row)).not.toThrow();
    });

    it('should throw error when ID field is missing', () => {
      // GIVEN
      const row = {
        ID: '',
        'Asset Title': 'Summer Nights',
        Artists: 'John Doe',
        'Alternative ID': 'ALT-12345',
        ISRC: 'USRC17607839',
      };

      // THEN
      expect(() => validateRow(row)).toThrow(/Row validation error; some fields are not valid.*ID is required/);
    });

    it('should NOT throw error when ISRC field is missing', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Summer Nights',
        Artists: 'John Doe',
        'Alternative ID': 'ALT-12345',
        ISRC: '',
      };

      // THEN
      expect(() => validateRow(row)).not.toThrow();
    });

    it('should throw error when multiple required fields are missing', () => {
      // GIVEN
      const row = {
        ID: '',
        'Asset Title': '',
        Artists: 'John Doe',
        'Alternative ID': 'ALT-12345',
        ISRC: '',
      };

      // THEN
      expect(() => validateRow(row)).toThrow(/Row validation error; some fields are not valid/);
    });

    it('should accept row with only required fields', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Minimal Track',
        ISRC: 'USRC17607839',
      };

      // THEN
      expect(() => validateRow(row)).not.toThrow();
    });

    it('should accept row with unicode and with special characters', () => {
      // GIVEN
      const row = {
        ID: '507f1f77bcf86cd799439011',
        'Asset Title': 'Tëst Tráck wïth < > Ünïcödé',
        Artists: 'Artïst Ñamé',
        'Alternative ID': 'ALT-12345',
        ISRC: 'USRC17607839',
      };

      // THEN
      expect(() => validateRow(row)).not.toThrow();
    });

    it('should throw error with formatted error message listing all validation failures', () => {
      // GIVEN
      const row = {
        ID: '',
        'Asset Title': '',
        Artists: 'John Doe',
        'Alternative ID': 'ALT-12345',
        ISRC: '',
      };

      // THEN
      expect(() => validateRow(row)).toThrow(/Row validation error; some fields are not valid: \[.*\]/);
    });
  });
});
