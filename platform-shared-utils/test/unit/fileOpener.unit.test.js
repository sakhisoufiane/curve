const path = require('path');
const { expect } = require('chai');
const { each } = require('async');
const fs = require('fs');
const fileOpener = require('../../libs/fileOpener');

describe('fileOpener Unit Tests', () => {
  describe('fileOpener.extractData', () => {
    it.skip(
      'should call fileOpener.detectExtension with the correct attributes',
      () => {},
    );
    it.skip('should call fileOpener.readData with the correct attributes', () => {});
    // TODO: need to change this to add in extractResults() and separateByCharacters() as well as removeUnwantedCharacters()
    it.skip(
      'should return totalTabs and data array split by tabs to the callback',
      () => {},
    );
    it.skip(
      'should return any error returned by fileOpener.detectExtension or fileOpener.readData to the callback',
      () => {},
    );
    it.skip(
      'should return error "File does not exist" to the callback if the file cannot be found',
      () => {},
    );
  });

  // TODO: add tests for extractDataAndIdentifiers (from API version)
  describe('fileOpener.extractIdentifiers', () => {
    it.skip(
      'should call fileOpener.detectExtension with the correct attributes',
      () => {},
    );
    it.skip('should call chardet.detectFile with the correct attributes', () => {});
    it.skip(
      'should call fileOpener.readData with the correct attributes to extract only the first 20 rows of each tab (sheet)',
      () => {},
    );
    it.skip(
      'should call templateMatcher.buildIdentification with the correct attributes for each tab',
      () => {},
    );
    it.skip('should return identifiers and tab names to the callback', () => {});
    it.skip(
      'should return any error returned by fileOpener.detectExtension, chardet.detectFile or fileOpener.readData to the callback',
      () => {},
    );
    it.skip(
      'should return error "File does not exist" to the callback if the file cannot be found',
      () => {},
    );
  });

  describe('fileOpener.detectExtension', () => {
    it.skip(
      'should return the extension ".txt" for a file with extension ".txt" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".csv" for a file with extension ".csv" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".xls" for a file with extension ".xls" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".xlsx" for a file with extension ".xlsx" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".xlsb" for a file with extension ".xlsb" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".dat" for a file with extension ".dat" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".crd" for a file with extension ".crd" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".tsv" for a file with extension ".tsv" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".020" for a file with extension ".020" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".021" for a file with extension ".021" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".022" for a file with extension ".022" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".axf" for a file with extension ".axf" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".roy" for a file with extension ".roy" to the callback',
      () => {},
    );
    it.skip(
      'should return the extension ".tab" for a file with extension ".tab" to the callback',
      () => {},
    );
    it.skip(
      'should return error "Unknown file type with extension of {{extension}}" to the callback',
      () => {},
    );
    it.skip(
      'should return error "File does not exist" to the callback if the file is not of type "string" (or undefined)',
      () => {},
    );
  });

  // TODO: add tests for fileOpener.detectFileType

  describe('fileOpener.readData', () => {
    describe('for a file with extension ".xls" or ".xlsb"', () => {
      // TODO: add test for calling fileOpener.detectFileType and using readTxtFile if fileType of 'txt' detected
      it.skip(
        'should call fileOpener.readExcelFile with the correct attributes',
        () => {},
      );
      describe('when an error is returned', () => {
        it.skip(
          'should call fileOpener.readXlsxFile with the correct attributes',
          () => {},
        );
        it.skip(
          'should return totalTabs, tabs and sheetNames returned by fileOpener.readXlsxFile to the callback',
          () => {},
        );
        it.skip(
          'should return any error returned by fileOpener.readXlsxFile to the callback',
          () => {},
        );
      });
    });
    describe('for a file with extension ".xlsx"', () => {
      // TODO: need to update tests below to include fileOpener.readExcelJs
      it.skip(
        'should call fileOpener.readExcelFile with the correct attributes',
        () => {},
      );
      it.skip(
        'should return totalTabs, tabs and sheetNames returned by fileOpener.readXlsxFile to the callback',
        () => {},
      );
      describe('when an error is returned', () => {
        it.skip(
          'should call fileOpener.readXlsxFile with the correct attributes',
          () => {},
        );
        it.skip(
          'should return totalTabs, tabs and sheetNames returned by fileOpener.readXlsxFile to the callback',
          () => {},
        );
        it.skip(
          'should return any error returned by fileOpener.readXlsxFile to the callback',
          () => {},
        );
      });
      describe('on error caught using try/catch', () => {
        it.skip(
          'should call fileOpener.readXlsxFile with the correct attributes',
          () => {},
        );
        it.skip(
          'should return totalTabs, tabs and sheetNames returned by fileOpener.readXlsxFile to the callback',
          () => {},
        );
        it.skip(
          'should return any error returned by fileOpener.readXlsxFile to the callback',
          () => {},
        );
      });
    });
    describe('for a templatefileType of "CRD"', () => {
      it.skip('should create a new CrdReader instance', () => {});
      it.skip('should call crdReader.readCrdFile with the correct attributes', () => {});
      describe('returns the following data to the callback', () => {
        it.skip('err should contain any error returned by crdReader.readCrdFile', () => {});
        it.skip('totalTabs should always be returned as 1', () => {});
        it.skip(
          'tabs should contain an array with length of 1, containing the data array returned by crdReader.readCrdFile',
          () => {},
        );
        it.skip('sheetNames should always be undefined', () => {});
      });
    });
    describe('for a a file with extension ".csv', () => {
      it.skip('should call fileOpener.readCsvFile with the correct attributes', () => {});
      describe('when no error is returned', () => {
        describe('returns the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip('totalTabs should always be returned as 1', () => {});
          it.skip(
            'tabs should contain an array with length of 1, containing the data array returned by fileOpener.readCsvFile',
            () => {},
          );
          it.skip('sheetNames should always be undefined', () => {});
        });
      });
      describe('when an error is returned', () => {
        it.skip('should call fileOpener.readTxtFile with the correct attributes', () => {});
        it.skip(
          'should call fileOpener.readTxtFile with delimiter set to "," if delimiter has not been set',
          () => {},
        );
        describe('returns the following data to the callback', () => {
          it.skip(
            'err should contain any error returned by fileOpener.readTxtFile',
            () => {},
          );
          it.skip('totalTabs should always be returned as 1', () => {});
          it.skip(
            'tabs should contain an array with length of 1, containing the data array returned by fileOpener.readTxtFile',
            () => {},
          );
          it.skip('sheetNames should always be undefined', () => {});
        });
      });
    });
    describe('for a file with extension ".txt" where file includes "edi.txt"', () => {
      it.skip('should create a new EdiReader instance', () => {});
      it.skip('should call ediReader.readEdiFile with the correct attributes', () => {});
      // TODO: the output below is not implemented but will be structured like this
      describe('returns the following data to the callback', () => {
        it.skip('err should contain any error returned by ediReader.readEdiFile', () => {});
        it.skip('totalTabs should always be returned as 1', () => {});
        it.skip(
          'tabs should contain an array with length of 1, containing the data array returned by ediReader.readEdiFile',
          () => {},
        );
        it.skip('sheetNames should always be undefined', () => {});
      });
    });
    describe('for a file with extension of ".txt", ".dat", ".tsv", ".020", ".021", ".022", ".crd", ".tab', () => {
      it.skip('should call fileOpener.readTxtFile with the correct attributes', () => {});
      describe('returns the following data to the callback', () => {
        it.skip(
          'err should contain any error returned by fileOpener.readTxtFile',
          () => {},
        );
        it.skip('totalTabs should always be returned as 1', () => {});
        it.skip(
          'tabs should contain an array with length of 1, containing the data array returned by fileOpener.readTxtFile',
          () => {},
        );
        it.skip('sheetNames should always be undefined', () => {});
      });
    });
    describe('for a file with extension of ".axf"', () => {
      it.skip('should create a new AxfReader instance', () => {});
      it.skip('should call axfReader.readAxfFile with the correct attributes', () => {});
      describe('returns the following data to the callback', () => {
        it.skip('err should contain any error returned by axfReader.readAxfFile', () => {});
        it.skip('totalTabs should always be returned as 1', () => {});
        it.skip(
          'tabs should contain an array with length of 1, containing the data array returned by axfReader.readAxfFile',
          () => {},
        );
        it.skip('sheetNames should always be undefined', () => {});
      });
    });
    describe('for a file with any other extension', () => {
      it.skip(
        'should return error "Unknown file type with extension of {{type}}" to the callback',
        () => {},
      );
    });
  });

  describe('fileOpener.readExcelFile', () => {
    describe('when attribute maxRows is defined', () => {
      it.skip(
        'should call XLSX.readFile with sheetRows in options set to maxRows',
        () => {},
      );
    });
    describe('when attribute maxRows is undefined or null', () => {
      it.skip('should call XLSX.readFile with options set to an empty object', () => {});
    });
    describe('when XLSX.readFile returns data', () => {
      describe('when returnAllTabs is defined and NOT false or null', () => {
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip(
            'totalTabs should be set to the number of tabs contained in the file',
            () => {},
          );
          it.skip(
            'tabs should be an array containing arrays of data rows for each tab',
            () => {},
          );
          it.skip('sheetNames should be an array containing the names of all tabs', () => {});
        });
      });
      describe('when returnAllTabs is NOT defined, false or null', () => {
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip(
            'totalTabs should be set to the number of tabs contained in the file',
            () => {},
          );
          it.skip(
            'tabs should be an array containing just one array of data rows for the tab selected',
            () => {},
          );
          it.skip('sheetNames should be an array containing the names of all tabs', () => {});
        });
      });
      describe('when returnAllTabs is NOT defined, false or null AND tab attribute is not defined, false or null', () => {
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip(
            'totalTabs should be set to the number of tabs contained in the file',
            () => {},
          );
          it.skip(
            'tabs should be an array containing just one array of data rows for the first tab in the sheet',
            () => {},
          );
          it.skip('sheetNames should be an array containing the names of all tabs', () => {});
        });
      });
    });
    describe('when XLSX.readFile returns NO data', () => {
      it.skip(
        'should return error "Failed to read file successfully" to the callback',
        () => {},
      );
    });
    describe('on error caught using try/catch', () => {
      describe('when the error matches "path must be a string or Buffer"', () => {
        it.skip('should return error "File does not exist" to the callback', () => {});
      });
      describe('for any other error', () => {
        it.skip(
          'should return error "There was an error reading the Excel file. Check file is valid."',
          () => {},
        );
      });
    });
  });

  // TODO: Add tests for 'fileOpener.readExcelJs'

  describe('fileOpener.readXlsxFile', () => {
    describe('when returnAllTabs is defined and NOT false or null', () => {
      describe('for a file with one tab', () => {
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1, include_empty_rows: true, round_floats: false',
          () => {},
        );
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip('totalTabs should be set to 1', () => {});
          it.skip('tabs should be an array containing just one array of data rows', () => {});
          it.skip(
            'sheetNames should be an array containing the names of one tab only',
            () => {},
          );
        });
      });
      describe('for a file with three tabs', () => {
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 2',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 3',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1, include_empty_rows: true, round_floats: false',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 2, include_empty_rows: true, round_floats: false',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 3, include_empty_rows: true, round_floats: false',
          () => {},
        );
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip('totalTabs should be set to 3', () => {});
          it.skip(
            'tabs should be an array containing arrays of data rows for each tab',
            () => {},
          );
          it.skip(
            'sheetNames should be an array containing the names of all 3 tabs',
            () => {},
          );
        });
      });
    });
    describe('when returnAllTabs is NOT defined, false or null', () => {
      describe('for a file with two tabs and tab attribute set to 1', () => {
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 2',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 2, include_empty_rows: true, round_floats: false',
          () => {},
        );
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip('totalTabs should be set to 2', () => {});
          it.skip(
            'tabs should be an array containing just one array of data rows for the second tab',
            () => {},
          );
          it.skip(
            'sheetNames should be an array containing the names of all 2 tabs',
            () => {},
          );
        });
      });
      describe('for a file with three tabs and tab attribute set to 0', () => {
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 2',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 3',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1, include_empty_rows: true, round_floats: false',
          () => {},
        );
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip('totalTabs should be set to 3', () => {});
          it.skip(
            'tabs should be an array containing just one array of data rows for the first tab',
            () => {},
          );
          it.skip(
            'sheetNames should be an array containing the names of all 3 tabs',
            () => {},
          );
        });
      });
      describe('for a file with two tabs and tabs attribute undefined, false or null', () => {
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 2',
          () => {},
        );
        it.skip(
          'should create a new XLSXExtract instance and call it\'s extract method with sheet_nr in options set to 1, include_empty_rows: true, round_floats: false',
          () => {},
        );
        describe('should return the following data to the callback', () => {
          it.skip('err should be null', () => {});
          it.skip('totalTabs should be set to 2', () => {});
          it.skip(
            'tabs should be an array containing just one array of data rows for the first tab',
            () => {},
          );
          it.skip(
            'sheetNames should be an array containing the names of all 2 tabs',
            () => {},
          );
        });
      });
      describe('for a file which is not a valid Excel file', () => {
        it.skip('should return an error to the callback', () => {});
      });
    });
    describe('on error caught using try/catch', () => {
      it.skip(
        'should return error "There was an error reading the Excel file. Check file is valid." to the callback',
        () => {},
      );
    });
  });

  describe('fileOpener.readCsvFile', () => {
    describe('when attribute encoding is defined', () => {
      it.skip(
        'should call fs.createReadStream with file path and encoding in options set to encoding',
        () => {},
      );
    });
    describe('when attribute encoding is undefined or null', () => {
      it.skip(
        'should call fs.createReadStream with file path and encoding in options set to an empty object',
        () => {},
      );
    });
    describe('when attribute delimiter is "\\t"', () => {
      it.skip('should call csv.parse with delimiter in options set to "\t"', () => {});
    });
    describe('when attribute delimiter is "\t"', () => {
      it.skip('should call csv.parse with delimiter in options set to "\t"', () => {});
    });
    describe('when attribute delimiter is undefined or null', () => {
      it.skip('should call csv.parse with delimiter in options set to ","', () => {});
    });
    describe('when attribute maxRows is defined', () => {
      it.skip('should call csv.parse with maxRows in options set to maxRows', () => {});
    });
    describe('for a file with 3 rows of data and maxRows undefined', () => {
      describe('should return the following data to the callback', () => {
        it.skip('err should be null', () => {});
        it.skip('result should be an array of 3 data rows', () => {});
      });
    });
    describe('for a file with 3 rows of data and maxRows set to 2', () => {
      describe('should return the following data to the callback', () => {
        it.skip('err should be null', () => {});
        it.skip('result should be an array of 2 data rows', () => {});
      });
    });
    describe('on error caught using try/catch', () => {
      describe('when the error matches "path must be a string or Buffer"', () => {
        it.skip('should return error "File does not exist" to the callback', () => {});
      });
      describe('for any other error', () => {
        it.skip(
          'should return error "There was an error reading the CSV file. Check file is valid."',
          () => {},
        );
      });
    });
  });

  describe('fileOpener.readTxtFile', () => {
    describe('when attribute encoding is defined', () => {
      it.skip(
        'should create new LineByLineReader with file path and encoding in options set to encoding',
        () => {},
      );
    });
    describe('when attribute encoding is undefined or null', () => {
      it.skip(
        'should create new LineByLineReader with file path and encoding in options set to an empty object',
        () => {},
      );
    });

    describe('for a file containing 3 data rows of 5 fields separated by "\t" with delimiter attribute set to "\\t"', () => {
      describe('should return the following data to the callback', () => {
        it.skip('err should be null', () => {});
        it.skip(
          'result should be an array of 3 arrays containing 5 elements each',
          () => {},
        );
      });
    });
    describe('for a file containing 3 data rows of 5 fields separated by "\t" with delimiter attribute set to "\t"', () => {
      describe('should return the following data to the callback', () => {
        it.skip('err should be null', () => {});
        it.skip(
          'result should be an array of 3 arrays containing 5 elements each',
          () => {},
        );
      });
    });
    describe('for a file containing 3 data rows of 5 fields separated by "\t" with delimiter attribute being undefined', () => {
      describe('should return the following data to the callback', () => {
        it.skip('err should be null', () => {});
        it.skip(
          'result should be an array of 3 arrays containing 5 elements each',
          () => {},
        );
      });
    });

    describe('for a file containing 3 data rows of 5 fields with attribute maxRows set to 2', () => {
      describe('should return the following data to the callback', () => {
        it.skip('err should be null', () => {});
        it.skip(
          'result should be an array of 2 arrays containing 5 elements each',
          () => {},
        );
      });
    });
    describe('for a file containing 3 data rows of 5 fields with attribute maxRows being undefined', () => {
      describe('should return the following data to the callback', () => {
        it.skip('err should be null', () => {});
        it.skip(
          'result should be an array of 3 arrays containing 5 elements each',
          () => {},
        );
      });
    });

    describe('on error caught using try/catch', () => {
      describe('when the error matches "path must be a string or Buffer"', () => {
        it.skip('should return error "File does not exist" to the callback', () => {});
      });
      describe('for any other error', () => {
        it.skip(
          'should return error "There was an error reading the Text file. Check file is valid."',
          () => {},
        );
      });
    });
  });

  describe('fileOpener.detectEncoding', () => {
    it('should detect the correct encoding', async () => {
      const tests = [
        { encoding: 'utf8', text: 'This įs sömę text with utf8 chærs' },
        { encoding: 'latin1', text: 'This įs sömę text with utf8 chærs encoded with latin1' },
        // Since we don't support ascii, we expect an error to be logged and detectedEncoding to be undefined
        // It's up to the user of the function to have a fallback such as utf8
        { encoding: undefined, text: 'This is some text encoded with ascii (unsupported)' },
      ];
      await each(tests, async (test) => {
        const file = path.join(__dirname, `../../tmp/${test.encoding}`);
        fs.writeFileSync(file, test.text, { encoding: test.encoding });
        const detectedEncoding = await new Promise((resolve) => {
          fileOpener.detectEncoding(file, (err, encoding) => resolve(encoding));
        });
        expect(detectedEncoding).to.equal(test.encoding);
      });
    });
  });
});
