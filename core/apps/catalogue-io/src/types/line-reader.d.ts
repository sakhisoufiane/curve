declare module 'line-reader' {
  interface LineReader {
    eachLine(
      filename: string,
      iteratee: (line: string, last: boolean, cb: (stop?: boolean) => void) => void | Promise<void>,
      callback?: (err?: Error) => void,
    ): void;
  }
  const lineReader: LineReader;
  export default lineReader;
}
