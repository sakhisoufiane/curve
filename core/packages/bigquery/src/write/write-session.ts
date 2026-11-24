/**
 * An interface which represents how to write data to BigQuery
 */
export interface BigQueryWriteSession<T> {
  /**
   * Sets up the resources necessary to write this data to BigQuery.
   * Must be called before data can be written.
   * @return Resolves once the setup is complete
   */
  setup(): Promise<void>;

  /**
   * Writes a given object or array of objects to BigQuery.
   * @param data The data to write
   * @return Resolves once the data has been written
   */
  write(data: T | T[]): Promise<void>;

  /**
   * Flushes the data to BigQuery and closes any resources. Must be called once the session is complete.
   * @return Resolves once the session has finished closing
   */
  close(): Promise<void>;
}