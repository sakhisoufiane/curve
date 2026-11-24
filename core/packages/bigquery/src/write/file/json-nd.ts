import appRoot from 'app-root-dir';
import moment from 'moment';
import * as fs from 'node:fs';
import { LocalFileHandler } from './local-file-handler';
import { createEmptyFile } from '../../util/file-utils';

const appRootDir = appRoot.get();

export class NewLineDelimitedJsonLocalFileHandler<RowT> implements LocalFileHandler<RowT>{
  readonly filePath: string;

  readonly sourceFormat = 'NEWLINE_DELIMITED_JSON';

  constructor(tempDir: string = `${appRootDir}/tmp`) {
    // Setup file name and set to object
    this.filePath = `${tempDir}/${moment().format('YYYYMMDDHHmmssSSSS')}${Math.random().toString(36).substring(2, 5)}.json`;
    // Create file
    createEmptyFile(this.filePath);
  }

  async write(data: RowT[] | RowT): Promise<void> {

    let output = '';
    if (Array.isArray(data)) {
      data.forEach((item) => {
        output += createJsonLine(item);
      });
    } else {
      output += createJsonLine(data);
    }

    fs.appendFileSync(this.filePath, output);
  }

  end(): Promise<void> {
    return Promise.resolve();
  }
}

function createJsonLine<RowT>(item: RowT): string {
  return `${JSON.stringify(item)}\r\n`;
}