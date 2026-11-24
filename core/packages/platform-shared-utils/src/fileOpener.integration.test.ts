import { get } from 'app-root-dir';
import fileOpener from './fileOpener';

const appRootDir = get();

describe('fileOpener Integration Tests', () => {
  describe('fileOpener.extractData', () => {
    it('should read fixed-width files containing tabs correctly', (done) => {
      const filePath = `${appRootDir}/data/fixed-width/file-with-tabs.txt`;
      const options = {
        tab: 0,
        characterSeparators: [5, 5],
      };

      fileOpener.extractData(filePath, options, (err, _, data) => {
        try {
          expect(err).toBeFalsy();

          expect(Array.isArray(data)).toEqual(true);
          expect(data.length).toEqual(1);

          const row = data[0];
          expect(Array.isArray(row)).toEqual(true);
          expect(row.length).toEqual(3);

          expect(row[0]).toEqual('AB\tDE');
          expect(row[1]).toEqual('01234');
          expect(row[2]).toEqual(''); // Any left over data will be appended to the end of the array. This should be empty

          done();
        } catch (e) {
          done(e);
        }
      });
    });

    describe('Delimiter Handling', () => {
      it.each([null, undefined, ''])('should default to comma when delimiter is not defined for CSV files', (delimiter, done) => {
        const filePath = `${appRootDir}/data/csv/a-file.csv`;
        const options = {
          tab: 0,
          startingLine: 1,
          delimiter,
        };

        // @ts-expect-error Passing null delimiter is possible through JS
        fileOpener.extractData(filePath, options, (err, _, data) => {
          try {
            expect(err).toBeFalsy();

            expect(Array.isArray(data)).toEqual(true);
            expect(data.length).toEqual(1);

            const row = data[0];
            expect(Array.isArray(row)).toEqual(true);
            expect(row.length).toEqual(3);

            expect(row[0]).toEqual('Hello');
            expect(row[1]).toEqual('World');
            expect(row[2]).toEqual('0.10');

            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it.each([null, undefined, ''])('should default to tab when delimiter is not defined for TXT files', (delimiter, done) => {
        const filePath = `${appRootDir}/data/txt/a-file.txt`;
        const options = {
          tab: 0,
          startingLine: 1,
          delimiter,
        };

        // @ts-expect-error Passing null delimiter is possible through JS
        fileOpener.extractData(filePath, options, (err, _, data) => {
          try {
            expect(err).toBeFalsy();

            expect(Array.isArray(data)).toEqual(true);
            expect(data.length).toEqual(1);

            const row = data[0];
            expect(Array.isArray(row)).toEqual(true);
            expect(row.length).toEqual(3);

            expect(row[0]).toEqual('Hello');
            expect(row[1]).toEqual('World');
            expect(row[2]).toEqual('0.10');

            done();
          } catch (e) {
            done(e);
          }
        });
      });

      it.each(['\t', '\\t'])('should treat an escaped backslash t as a tab as a delimiter', (delimiter, done) => {
        const filePath = `${appRootDir}/data/txt/a-file.txt`;
        const options = {
          tab: 0,
          startingLine: 1,
          delimiter,
        };

        fileOpener.extractData(filePath, options, (err, _, data) => {
          try {
            expect(err).toBeFalsy();

            expect(Array.isArray(data)).toEqual(true);
            expect(data.length).toEqual(1);

            const row = data[0];
            expect(Array.isArray(row)).toEqual(true);
            expect(row.length).toEqual(3);

            expect(row[0]).toEqual('Hello');
            expect(row[1]).toEqual('World');
            expect(row[2]).toEqual('0.10');

            done();
          } catch (e) {
            done(e);
          }
        });
      });
    })
  })
});