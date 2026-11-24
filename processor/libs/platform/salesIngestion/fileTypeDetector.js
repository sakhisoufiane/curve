const fs = require('fs');
const papa = require('papaparse');
const { fileOpener } = require('@curveroyaltysystems/platform-shared-utils');
const AdmZip = require('adm-zip');
const CFB = require('cfb');

const knownCrdExtensions = [
  'CRD',
  'DAT',
  '020',
  '021',
  '022',
  '210',
  '220',
  '301',
  '302',
  '303',
  '304',
];

/**
 * @typedef {TextFileResult} DelimitedTextFileResult
 * @property {'CSV'|'TXT'|'TSV'} type - Text-based formats
 * @property {string} delimiter - The detected delimiter (e.g., ",", "\t", ";")
 */

/**
 * @typedef {Object} TextFileResult
 * @property {'Fixed-width' | 'CRD'} type - Text-based formats
 * @property {'utf16le' | 'utf8' | 'latin1'} encoding - The detected encoding
 */

/**
 * @typedef {Object} ExcelFileResult
 * @property {'XLS' | 'XLSB' | 'XLSX'} type - Binary or Fixed formats
 */

/**
 * The return type for your detection function.
 * @typedef {DelimitedTextFileResult | TextFileResult | ExcelFileResult} FileDetectionResult
 */

/**
 * Get the file type from the file information
 * @param {{ key: string, delimiter?: string, encoding?: string, characterSeparators?: number[] }} ingestionData The gathered ingestion data
 * @param {string} localFile The path to the file stored locally
 * @returns {Promise<FileDetectionResult>} Resolves to a supported file type
 */
const detectFileType = async (ingestionData, localFile) => {
  if (ingestionData.characterSeparators) {
    return { type: 'Fixed-width', encoding: await determineEncoding(ingestionData, localFile) };
  }

  // Check if we have explicit overrides for known extensions
  const originalFileName = ingestionData.key;

  const splitArray = originalFileName.split('.');
  const extension = splitArray[splitArray.length - 1].toUpperCase();

  const knownCrdExtension = knownCrdExtensions.includes(extension);
  if (knownCrdExtension) {
    return { type: 'CRD', encoding: await determineEncoding(ingestionData, localFile) };
  }

  // Otherwise, try to autodetect
  // Check the magic number of the file
  const buffer = Buffer.alloc(4);
  let fd;

  try {
    fd = fs.openSync(localFile, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  const hex = buffer.toString('hex').toUpperCase();

  // D0CF11E0 = Legacy Excel (OLE2 Compound File)
  if (hex === 'D0CF11E0') {
    return { type: determineXls(localFile) };
  }

  // 504B0304 = Zip Archive (XLSX, XLSB, XLSM, DOCX, etc.)
  if (hex.startsWith('504B0304')) {
    return { type: determineXlsxOrXlsb(localFile) };
  }

  // Otherwise, this is a text file. We have two flows:
  //   If a delimiter is set, use the delimiter and the file extension to determine how to process the file
  //   If a delimiter is not set, use autodetection to determine the details
  const encoding = await determineEncoding(ingestionData, localFile);
  const { delimiter } = ingestionData;

  if (delimiter) {
    switch (extension) {
      case 'CSV':
        return { type: 'CSV', delimiter, encoding };
      case 'TSV':
        return { type: 'TSV', delimiter, encoding };
      default:
        return { type: 'TXT', delimiter, encoding };
    }
  }

  // Load up a snippet of the file (first 512K), and use PapaParse to autodetect the encoding
  const snippet = getFileSnippet(localFile, 512 * 1024);

  const results = papa.parse(snippet, {
    delimiter: '', // Auto-detect
    preview: 10, // Only look at first 10 rows
  });

  const { delimiter: foundDelimiter } = results.meta;

  if (foundDelimiter === ',') return { type: 'CSV', delimiter: foundDelimiter, encoding };
  if (foundDelimiter) return { type: 'TXT', delimiter: foundDelimiter, encoding };

  throw new Error(`Unknown file type detected: '${extension}' for sales file: ${ingestionData.salesFileId}`);
};

const getFileSnippet = (filePath, size) => {
  const fd = fs.openSync(filePath, 'r');

  const buffer = Buffer.alloc(size);

  try {
    fs.readSync(fd, buffer, 0, size, 0);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
};

/**
 * Differentiates between OLE2 formats (XLS, DOC, PPT) by checking internal streams.
 * @param {string} filePath The file to check
 * @returns {'XLS'} Returns XLS if the format is XLS, otherwise an error is thrown
 */
const determineXls = (filePath) => {
  try {
    // Parse the container structure (does not read full content, just directory)
    const container = CFB.read(filePath, { type: 'file' });

    const streamNames = container.FullPaths;

    // EXCEL: 'Workbook' is standard, 'Book' is used in Excel 5.0/95
    if (streamNames.some((name) => name.endsWith('Workbook') || name.endsWith('Book'))) {
      return 'XLS';
    }
  } catch (e) {
    throw new Error(`Failed to parse Excel file: ${filePath}`, { cause: e });
  }
  throw new Error(`Doesn't look like an Excel file: ${filePath}`);
};

/**
 * Given a zipped > 2004 Microsoft Document, try to determine if we are dealing with an XLSX file, or an XLSB file
 * @param {string} filePath The path to the local file. Must be some kind of zip file.
 * @return {'XLSX'|'XLSB'} The type of Excel file
 */
const determineXlsxOrXlsb = (filePath) => {
  try {
    // To determine what kind of Excel file we have, we need to look at the contents of the zip file
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();

    // We are looking for the main workbook file.
    // XLSB uses a binary file (.bin), XLSX uses XML (.xml)
    let hasBin = false;
    let hasXml = false;

    for (const entry of zipEntries) {
      if (entry.entryName === 'xl/workbook.bin') {
        hasBin = true;
        break;
      }
      if (entry.entryName === 'xl/workbook.xml') {
        hasXml = true;
        // Don't break yet, technically a weird hybrid could exist,
        // but usually we can stop here too.
      }
    }

    if (hasBin) return 'XLSB';
    if (hasXml) return 'XLSX';
  } catch (e) {
    // Typically happens if the contents are not a zip file
    throw new Error(`Failed to identify zipped contents of file ${filePath}`, { cause: e });
  }

  // It's a Zip file, but not a recognized Excel structure
  throw new Error(`Doesn't look like an Excel file: ${filePath}`);
};

/**
 * Loads the given path to a locally stored file, and attempts to determine the encoding
 * @param {*} ingestionData The ingestion data
 * @param {string} localFile The file path
 * @returns {Promise<'utf16le' | 'utf8' | 'latin1' | undefined>} Resolves to the name of the encoding (either utf16le, utf8 or latin1). Null if the encoding cannot be determined
 */
const determineEncoding = async (ingestionData, localFile) => {
  const { encoding } = ingestionData;
  if (encoding) {
    return encoding;
  }

  return new Promise((resolve, reject) => {
    fileOpener.detectEncoding(localFile, (error, encoding) => {
      if (error) {
        reject(error);
      } else {
        resolve(encoding);
      }
    });
  });
};

module.exports = { detectFileType };
