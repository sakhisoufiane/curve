export interface LocalFileHandler<T> {
  sourceFormat: 'NEWLINE_DELIMITED_JSON' | 'AVRO';
  filePath: string;
  write(data: T[] | T): Promise<void>;
  end(): Promise<void>;
}