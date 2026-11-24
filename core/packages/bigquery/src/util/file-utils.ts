import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const createEmptyFile = (filePath: string): void => {
  // Ensure the directory exists
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  // Create the file
  writeFileSync(filePath, '');
};