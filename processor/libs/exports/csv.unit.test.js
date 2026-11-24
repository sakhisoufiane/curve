const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const fs = require('fs');

const { ObjectId } = require('mongodb');
const CsvExports = require('./csv');

describe('csv', () => {
  describe('closeStream', () => {
    it('should wait for a stream to finish', async () => {
      // Arrange
      const rows = 500_000;
      const filePath = `/${process.env.APP_ROOT_DIR}/tmp/${randomId()}`;
      const stream = fs.createWriteStream(filePath);
      // Act
      for (let i = 0; i < rows; i += 1) stream.write(`${randomString()}\n`);
      await CsvExports.closeStream(stream);
      // Assert
      expect(stream.destroyed).toEqual(true);
      const file = fs.readFileSync(filePath, 'utf8');
      const lines = file.split('\n');
      expect(lines.length).toEqual(
        rows // Data lines
        + 1, // Final blank new line
      );
    });
  });

  describe('writeCsvLine', () => {
    let lines;
    let filePath;
    let stream;

    beforeEach(() => {
      lines = [
        [null, undefined, '2025-01-01'],
        ['This is a value with whitespace', 2, 3],
        ['"Should be escaped"', '', 'Three'],
        ['*UNSIGNED* Christian Alexander - "Bicycle KOTW SD" - Contributor - Josh Scarbrow', '', ''],
        ['*UNSIGNED* Christian Alexander - "Bicycle, KOTW, SD" - Contributor - Josh Scarbrow', '', ''],
        ['This is "text,containing,commas," enclosed', 'Track', 'SE'],
        ['one', ['one', 'two', 'three'], 'two'],
      ];
      filePath = `/${process.env.APP_ROOT_DIR}/tmp/${randomId()}`;
      stream = fs.createWriteStream(filePath);
    });

    describe('when no specific format is used (default UK Decimal style)', () => {
      it('should write a line to a stream in csv format with a comma delimiter', async () => {
        // Act
        // writeCsvLine expects data already foramtted to UK style decimals
        lines.push(['1', '2', '3', '1.0', '3.14']);
        for (const line of lines) CsvExports.writeCsvLine(stream, line, { format: null });
        await CsvExports.closeStream(stream);
        // Assert
        const file = fs.readFileSync(filePath, 'utf8');
        const outputLines = file.split('\n');
        expect(outputLines).toEqual([
          ',,2025-01-01',
          'This is a value with whitespace,2,3',
          '"""Should be escaped""",,Three',
          '"*UNSIGNED* Christian Alexander - ""Bicycle KOTW SD"" - Contributor - Josh Scarbrow",,',
          '"*UNSIGNED* Christian Alexander - ""Bicycle, KOTW, SD"" - Contributor - Josh Scarbrow",,',
          '"This is ""text,containing,commas,"" enclosed",Track,SE',
          'one,"one,two,three",two',
          '1,2,3,1.0,3.14',
          '',
        ]);
      });
    });

    describe('when EU format is specified', () => {
      it('should write a line to a stream in csv format with a ; delimiter', async () => {
        // Act
        // writeCsvLine expects data already foramtted to EU style decimals
        lines.push(['1', '2', '3', '1,0', '3,14']);
        for (const line of lines) {
          CsvExports.writeCsvLine(stream, line, {
            format: 'EU Decimal Comma',
          });
        }
        await CsvExports.closeStream(stream);
        // Assert
        const file = fs.readFileSync(filePath, 'utf8');
        const outputLines = file.split('\n');
        expect(outputLines).toEqual([
          ';;2025-01-01',
          'This is a value with whitespace;2;3',
          '"""Should be escaped""";;Three',
          '"*UNSIGNED* Christian Alexander - ""Bicycle KOTW SD"" - Contributor - Josh Scarbrow";;',
          '"*UNSIGNED* Christian Alexander - ""Bicycle, KOTW, SD"" - Contributor - Josh Scarbrow";;',
          '"This is ""text,containing,commas,"" enclosed";Track;SE',
          'one;one,two,three;two',
          '1;2;3;1,0;3,14',
          '',
        ]);
      });
    });

    describe('when bom is enabled', () => {
      it('should add a byte order mark to the line', async () => {
        // Act
        CsvExports.writeCsvLine(
          stream,
          ['one', 'two', 'three'],
          { bom: true },
        );
        await CsvExports.closeStream(stream);
        // Assert
        const file = fs.readFileSync(filePath, 'utf8');
        const outputLines = file.split('\n');
        expect(outputLines).toEqual([
          '\ufeffone,two,three',
          '',
        ]);
      });
    });

    describe('when a Mongo ObjectID is passed in Object form', () => {
      it('should stringify the ObjectID', async () => {
        // Arrange
        const objId = new ObjectId();
        const strId = randomId();
        // Act
        CsvExports.writeCsvLine(stream, ['one', objId, strId]);
        await CsvExports.closeStream(stream);
        // Assert
        const file = fs.readFileSync(filePath, 'utf8');
        const outputLines = file.split('\n');
        expect(outputLines).toEqual([
          // The ObjectID should have been stringified
          `one,${objId.toString()},${strId}`,
          '',
        ]);
      });
    });
  });

  describe('createStream', () => {
    it('should create a writable CSV stream with headers written', async () => {
      // Arrange
      const filePath = `/${process.env.APP_ROOT_DIR}/tmp/${randomId()}`;
      const headers = ['Header One', 'Header Two', 'Header Three'];

      // Act
      const stream = CsvExports.createStream(filePath, headers);
      await CsvExports.closeStream(stream);

      // Assert
      const file = fs.readFileSync(filePath, 'utf8');
      const outputLines = file.split('\n');
      expect(outputLines).toEqual([
        '\ufeffHeader One,Header Two,Header Three',
        '',
      ]);
    });
  });
});
