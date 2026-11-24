/* eslint-disable no-plusplus */

/**
 * Creates a mock cursor for testing purposes.
 * This function simulates an async iterable cursor that returns a list of works.
 */
function createMockCursor(works) {
  // Async iterable mock cursor
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next: () => {
          if (i < works.length) {
            return Promise.resolve({ value: works[i++], done: false });
          }
          return Promise.resolve({ done: true });
        },
      };
    },
    destroy: jest.fn(),
  };
}

module.exports = {
  createMockCursor,
};
