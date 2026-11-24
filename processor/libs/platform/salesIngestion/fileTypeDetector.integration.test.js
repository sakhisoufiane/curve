const { get } = require('app-root-dir');
const { detectFileType } = require('./fileTypeDetector');

const appRootDir = get();

describe('Detect File Type', () => {
  describe('With no delimiter or encoding', () => {
    it('should detect an XLS file', async () => {
      const fileName = 'sample-xls.abc';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('XLS');
    });

    it('should detect an XLSX file', async () => {
      const fileName = 'sample-xlsx.abc';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('XLSX');
    });

    it('should detect an XLSB file', async () => {
      const fileName = 'sample-xlsb.abc';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('XLSB');
    });

    it('should detect an CSV file', async () => {
      const fileName = 'sample-csv.abc';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('CSV');
      expect(result.delimiter).toEqual(',');
      expect(result.encoding).toEqual('latin1');
    });

    it('should detect an TXT file', async () => {
      const fileName = 'sample-txt.abc';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('TXT');
      expect(result.delimiter).toEqual('\t');
      expect(result.encoding).toEqual('latin1');
    });

    describe('Encoding tests', () => {
      it('should detect an utf8 file', async () => {
        const fileName = 'sample-txt-utf8.abc';

        const ingestionData = {
          key: `/s3/file/path/${fileName}`,
        };

        const result = await detectFileType(ingestionData, getTestFile(fileName));
        expect(result).not.toBeNull();
        expect(result.type).toEqual('TXT');
        expect(result.delimiter).toEqual('\t');
        expect(result.encoding).toEqual('utf8');
      });

      it('should detect an utf16 file', async () => {
        const fileName = 'sample-txt-utf16.abc';

        const ingestionData = {
          key: `/s3/file/path/${fileName}`,
        };

        const result = await detectFileType(ingestionData, getTestFile(fileName));
        expect(result).not.toBeNull();
        expect(result.type).toEqual('TXT');
        expect(result.delimiter).toEqual('\t');
        expect(result.encoding).toEqual('utf16le');
      });
    });
  });

  describe('With delimiter', () => {
    it('should detect an CSV file based on extension', async () => {
      const fileName = 'sample.csv';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
        delimiter: '\t',
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('CSV');
      expect(result.delimiter).toEqual('\t');
      expect(result.encoding).toEqual('latin1');
    });

    it('should detect an TSV file based on extension', async () => {
      const fileName = 'sample.tsv';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
        delimiter: ',',
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('TSV');
      expect(result.delimiter).toEqual(',');
      expect(result.encoding).toEqual('latin1');
    });

    it('should detect an TXT file based on extension', async () => {
      const fileName = 'sample.txt';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
        delimiter: ',',
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('TXT');
      expect(result.delimiter).toEqual(',');
      expect(result.encoding).toEqual('latin1');
    });
  });

  describe('With encoding', () => {
    it('should return the encoding set', async () => {
      const fileName = 'sample-csv.abc';

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
        encoding: 'utf8',
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('CSV');
      expect(result.delimiter).toEqual(',');
      expect(result.encoding).toEqual('utf8');
    });
  });

  describe('CRD handling', () => {
    it.each(['crd', 'dAt', '020', '021', '022', 210, 220])('should return crd', async (extension) => {
      const fileName = `crd.${extension}`;

      const ingestionData = {
        key: `/s3/file/path/${fileName}`,
        encoding: 'utf8',
      };

      const result = await detectFileType(ingestionData, getTestFile(fileName));
      expect(result).not.toBeNull();
      expect(result.type).toEqual('CRD');
      expect(result.encoding).toEqual('utf8');
    });
  });
});

const getTestFile = (fileName) => `${appRootDir}/data/ingestion/${fileName}`;
