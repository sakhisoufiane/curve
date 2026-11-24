const LineByLineReader = require('line-by-line');

const logger = require('../logger');

/**
 * Determine the CRD file version
 * @param {string} file The path to the file
 * @param {string} [encoding] The character encoding the file is formatted in. Defaults to 'utf8'
 * @return {Promise<{version: string, prs?: boolean}>} The version found. Current supported versions are '2', '4' and '4.01'
 */
const detectVersion = async (file, encoding) => new Promise((resolve, reject) => {
  let resolved = false;
  try {
    let version = null;

    const options = encoding ? { encoding } : {};
    const lineByLineReader = new LineByLineReader(file, options);
    lineByLineReader
      .on('line', (line) => {
        if (!version) {
          // If we don't have a version set, we haven't encountered the header yet.
          // Check if this is the header row (should be the first row in the file).
          // In v4 files, the record type starts at position 11.
          // In v2 files, the record type starts at position 1.
          if (line.substr(0, 3) === 'HDR') {
            resolveWithDetails('2');
          } else if (line.substr(10, 3) === 'HDR') {
            // Parse the V4 header to determine which precise version
            // According to spec location version should be formatted as 04.00 but have come across some files with the version as "4.0"
            if (line.substr(154, 5) === '04.00' || line.substr(154, 3) === '4.0') {
              version = '4';
            } else if (line.substr(154, 5) === '04.01') {
              version = '4.01';
            }
          }
        } else {
          // If we are still reading the file, then we are some kind of v4 file. We need to determine if this is a
          // PRS/MCPS v4 file (which has customizations outside the spec)
          // To do this, we check if the Credit/Debit marker is a particular position (which would be out-of-bounds
          // if the file was in spec). This position differs depending on what record type we are reading.
          const recordType = line.substr(10, 3);
          if (recordType === 'MCH') {
            handleMchLine(line);
          } else if (recordType === 'PRF') {
            handlePrfLine(line);
          } else if (recordType === 'AVI') {
            handleAviLine(line);
          } else if (recordType === 'ADJ') {
            handleAdjLine(line);
          }
        }
      })
      .on('error', (error) => reject(error))
      .on('end', () => {
        // If we've read the whole file and we aren't yet resolved, then throw an error (file is either not CRD, or empty)
        if (!resolved) {
          reject(new Error('There was an error reading the CRD file. Data does not look like CRD Data'));
        }
      });

    /**
     * Complete the function. This closes the reader, marks the function as resolved and returns a promise
     * with the version and prs flags
     * @param {string} ver The version to return
     * @param {boolean} [prs] Whether or not this is a PRS custom file
     */
    const resolveWithDetails = (ver, prs) => {
      lineByLineReader.close();
      resolved = true;
      resolve({ version: ver, prs });
    };

    const checkForCreditOrDebit = (line, characterLocation) => {
      const creditDebit = line.substr(characterLocation, 1);
      if (isCreditOrDebit(creditDebit)) {
        resolveWithDetails(version, true);
      } else {
        resolveWithDetails(version, false);
      }
    };

    const handleMchLine = (line) => {
      const characterLocation = version === '4.01' ? 946 : 851;
      checkForCreditOrDebit(line, characterLocation);
    };

    const handlePrfLine = (line) => {
      const characterLocation = version === '4.01' ? 663 : 596;
      checkForCreditOrDebit(line, characterLocation);
    };

    const handleAviLine = (line) => {
      checkForCreditOrDebit(line, 1204);
    };

    const handleAdjLine = (line) => {
      checkForCreditOrDebit(line, 563);
    };
  } catch (err) {
    if (err.message === 'path must be a string or Buffer') {
      reject(new Error('File does not exist'));
    } else {
      logger.error(err);
      reject(new Error('There was an error reading the CRD file. Check file is valid.'));
    }
  }
});

const isCreditOrDebit = (value) => value === 'C' || value === 'D';

module.exports = detectVersion;
