import { V2Reader, V3Reader, V4Reader } from '../versionReaders';
import { detectVersion } from './versionDetector';

export class CrdReader {
  async readCrdFile(file: string, encoding: BufferEncoding): Promise<string[][]> {
    const { version, prs } = await detectVersion(file, encoding);

    let reader: V2Reader | V3Reader | V4Reader;

    if (version?.startsWith('2')) {
      reader = new V2Reader();
    } else if (['3.00', '3.01', '3.02', '3.03', '3.04', '3.05'].includes(version ?? '')) {
      reader = new V3Reader();
    } else if (version?.startsWith('4')) {
      reader = new V4Reader(version, prs as boolean);
    } else {
      throw new Error(`Unsupported CRD version: ${version}`);
    }

    const result = await reader.readCrdFile(file, encoding);
    return result;
  }
}
