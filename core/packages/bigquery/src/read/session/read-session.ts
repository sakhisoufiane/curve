/**
 * An interface which represents how to read data from BigQuery
 */
export interface BigQueryReadSession<T> {
  /**
   * Sets up the resources necessary to read this data from BigQuery.
   * Must be called before data can be written.
   * @return Resolves once the setup is complete
   */
  setup(): Promise<void>;

  /**
   * Reads a list of objects from BigQuery
   * @return Resolves with the data requested. Will return an empty array if data is no longer available
   */
  read(): Promise<T[]>;

  /**
   * Closes the reader
   * @return Resolves once the session has finished closing
   */
  close(): Promise<void>;
}