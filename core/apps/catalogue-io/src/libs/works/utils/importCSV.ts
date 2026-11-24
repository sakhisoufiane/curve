import fs from 'fs';
// @ts-expect-error — no type declarations for platform-shared-utils
import { logger, fileOpener } from '@curveroyaltysystems/platform-shared-utils';

export interface TemplateEntry {
  key: string;
  type?: 'Boolean' | 'Array' | 'Date' | 'Number';
  separator?: string;
  ignore?: boolean;
}

export type MappedRow = Record<string, unknown> & {
  modified?: boolean;
  originalRow?: string[];
};

export async function getData(file: string): Promise<string[][]> {
  if (!file) throw new Error('A file is required');
  if (!fs.existsSync(file)) throw new Error('The passed file does not exist');
  return new Promise<string[][]>((resolve, reject) => {
    try {
      fileOpener.readCsvFile(file, null, null, null, null, (err: string | null, data: string[][]) => {
        if (err) reject(new Error(err));
        else resolve(data ?? []);
      });
    } catch (err) {
      logger.error(err);
      reject(new Error('Error opening file, the file format should be CSV'));
    }
  });
}

function mapDataToTemplate(
  data: string[],
  template: TemplateEntry[],
  dateFormat: string,
): MappedRow {
  const mappedData: MappedRow = {};
  for (let index = 0; index < template.length; index += 1) {
    const templateObject = template[index];
    if (!templateObject) {
      throw new Error('Template does not match, please check the template matches the current version');
    }
    if (!templateObject.ignore) {
      const value = data[index];
      if (templateObject.type === 'Boolean') {
        if (value === 'TRUE' || value === 'true' || value === '1') {
          mappedData[templateObject.key] = true;
        } else if (value === 'FALSE' || value === 'false' || value === '0') {
          mappedData[templateObject.key] = false;
        }
      } else if (value && typeof value === 'string' && templateObject.type === 'Array' && templateObject.separator) {
        mappedData[templateObject.key] = value.split(templateObject.separator).map((s) => s.trim()).filter(Boolean);
      } else if (templateObject.type === 'Array') {
        mappedData[templateObject.key] = value ? [value] : [];
      } else if (templateObject.type === 'Date' && typeof value === 'string' && value !== '') {
        try {
          const [d0, d1, d2] = String(value).trim().split('/');
          const dateFromString = dateFormat === 'MM/DD/YYYY'
            ? new Date(Date.UTC(parseInt(d2 ?? '0'), parseInt(d0 ?? '0') - 1, parseInt(d1 ?? '0')))
            : new Date(Date.UTC(parseInt(d2 ?? '0'), parseInt(d1 ?? '0') - 1, parseInt(d0 ?? '0')));
          if (!Number.isNaN(dateFromString.getTime())) {
            mappedData[templateObject.key] = dateFromString;
          }
        } catch (err) {
          logger.error(err);
        }
      } else if (templateObject.type === 'Number' && typeof value === 'string' && value.trim() !== '') {
        const num = Number(value.trim());
        if (!Number.isNaN(num)) {
          mappedData[templateObject.key] = num;
        }
      } else if (typeof value === 'string') {
        if (value.trim() !== '') {
          mappedData[templateObject.key] = value.trim();
        } else {
          // Empty CSV cells arrive as '' — set null to match Excel's empty-cell behaviour
          // and prevent Mongoose schema defaults from firing on the field.
          mappedData[templateObject.key] = null;
        }
      } else {
        mappedData[templateObject.key] = value;
      }
    }
  }
  return mappedData;
}

export async function getDataByTemplate(
  file: string,
  template: TemplateEntry[],
  dateFormat: string,
): Promise<MappedRow[]> {
  if (!file && !template) throw new Error('A file and a template are required');
  if (!file) throw new Error('A file is required');
  if (!fs.existsSync(file)) throw new Error('The passed file does not exist');
  if (!template) throw new Error('A template is required');
  if (!(template instanceof Array)) throw new Error('The template must be an Array');

  let rawData = await getData(file);

  if (!rawData[0]) throw new Error('Template does not match');

  // Filter out empty data rows (preserve the header row at index 0)
  rawData = rawData.filter((row, index) => index === 0 || row.some((v) => v !== ''));

  // Validate header column count against template length
  const headerRow = rawData[0]!.filter((v) => v && v !== '');
  if (headerRow.length !== template.length) {
    logger.error(`Template does not match: ${headerRow.length} - ${template.length}`);
    logger.error(headerRow.join(', '));
    throw new Error('Template does not match');
  }

  // Remove the header row, then map each row with per-row cleaning.
  // Avoids two full JSON.parse/stringify copies of the entire dataset — each
  // `cleanedRow` is a single row that is discarded after mapping.
  rawData.splice(0, 1);
  const mappedData: MappedRow[] = rawData.map((originalRow) => {
    const cleanedRow = originalRow.map((v) =>
      v.replace(/[^\x20-\xFFĀ-ɏͰ-\uDFFF]+/g, '').replace(/_x000D_/g, ''),
    );
    const mapped = mapDataToTemplate(cleanedRow, template, dateFormat);
    if (cleanedRow.some((v, i) => v !== originalRow[i])) {
      mapped.modified = true;
      mapped.originalRow = originalRow;
    }
    return mapped;
  });

  return mappedData;
}
