import { open } from 'node:fs/promises';
import logger from '../../../logger';

interface DetectVersionResult {
  version: string | null;
  prs?: boolean;
}

/**
 * Determine the CRD file version
 * @param {string} filePath The path to the file
 * @param {string} [encoding] The character encoding the file is formatted in. Defaults to 'utf8'
 * @return {Promise<{version: string, prs?: boolean}>} The version found. Current supported versions are '2', '4' and '4.01'
 */
export const detectVersion = async (filePath: string, encoding: BufferEncoding): Promise<DetectVersionResult> => {
  try {
    let version: string | undefined;
    
    const options = encoding ? { encoding } : {};
    const file = await open(filePath).catch((err) => {
      if (err.code === 'ENOENT') {
        throw new Error('File does not exist');
      }
      throw err;
    });
    for await (const line of file.readLines(options)) {
      if (!version) {
        // If we don't have a version set, we haven't encountered the SDN line yet.
        // Check if this is the SDN line
        // In v4 files, the record type starts at position 11.
        // In v2 files, the record type starts at position 1.
        if (line.slice(0, 3) === 'SDN') {
          const ver = line.slice(114, 114 + 5);
          if (ver.startsWith('002') || ver.startsWith('02')) {
            return { version: '2' };
          }
          if (ver.slice(0, 4) === '0300') {
            return { version: '3.00' };
          } if (ver.slice(0, 4) === '0301') {
            return { version: '3.01' };
          } if (['03.02', '03.03', '03.04', '03.05'].includes(ver)) {
            return { version: ver.slice(1) };
          } 
            return { version: ver }; // Return the version as-is for further handling
          
        }
        if (line.slice(10, 10 + 3) === 'HDR') {
          // Parse the V4 header to determine which precise version
          // According to spec location version should be formatted as 04.00 but have come across some files with the version as "4.0"
          if (line.slice(154, 154 + 5) === '04.00' || line.slice(154, 154 + 3) === '4.0') {
            version = '4';
          } else if (line.slice(154, 154 + 5) === '04.01') {
            version = '4.01';
          }
        }
      } else {
        // If we are still reading the file, then we are some kind of v4 file. We need to determine if this is a
        // PRS/MCPS v4 file (which has customizations outside the spec)
        // To do this, we check if the Credit/Debit marker is a particular position (which would be out-of-bounds
        // if the file was in spec). This position differs depending on what record type we are reading.        
        const recordType = line.slice(10, 10 + 3);
        if (recordType === 'MCH') {
          return { version, prs: handleMchLine(line, version) };
        }
        if (recordType === 'PRF') {
          return { version, prs: handlePrfLine(line, version) };
        }
        if (recordType === 'AVI') {
          return { version, prs: handleAviLine(line) };
        }
        if (recordType === 'ADJ') {
          return { version, prs: handleAdjLine(line) };
        }
      }
    }
  } catch (err) {
    logger.error(err);
    if (err instanceof Error && err.message === 'File does not exist') {
      throw err;
    } else {
      throw new Error('There was an error reading the CRD file. Check file is valid.');
    }
  }
  // If we've read the whole file and we haven't determined a version, then throw an error (file is either not CRD, or empty)
  throw new Error('There was an error reading the CRD file. Data does not look like CRD Data');
};

const checkForCreditOrDebit = (line: string, characterLocation: number) => {
  const creditDebit = line.slice(characterLocation, characterLocation + 1);
  if (isCreditOrDebit(creditDebit)) {
    return true;
  }
  return false;
};

const handleMchLine = (line: string, version: string | null) => {
  const characterLocation = version === '4.01' ? 946 : 851;
  return checkForCreditOrDebit(line, characterLocation);
};

const handlePrfLine = (line: string, version: string | null) => {
  const characterLocation = version === '4.01' ? 663 : 596;
  return checkForCreditOrDebit(line, characterLocation);
};

const handleAviLine = (line: string) => checkForCreditOrDebit(line, 1204);

const handleAdjLine = (line: string) => checkForCreditOrDebit(line, 563);

const isCreditOrDebit = (value: string) => value === 'C' || value === 'D';
