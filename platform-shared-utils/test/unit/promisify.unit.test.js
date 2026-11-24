const { expect } = require('chai');

const { promisify } = require('../../libs/promisify');

describe('Promisify Unit Tests', () => {
  const expectedError = new Error('Something has gone wrong!');

  const callbackFuncSuccess = (x, y, z, cb) => {
    cb(null, x + y + z);
  };

  const callbackFuncFailure = (x, y, z, cb) => {
    cb(expectedError);
  };

  const callbackFuncUndefined = (x, y, z, cb) => {
    cb();
  };

  const callbackDyadicReturnSuccess = (x, y, z, cb) => {
    cb(null, (x + y + z), (x * y * z));
  };

  const callbackFuncNoReturn = (x, y, z, cb) => {
    cb(null);
  };

  it('Should successfully resolve with the correct value when parameters are correct', async () => {
    // When

    // Then
    const result = await promisify(callbackFuncSuccess, 1, 2, 3)
      .catch((e) => {
        expect.fail('Promisify should not throw an error');
      });

    // Expect
    expect(result).to.deep.eq([6]);
  });

  it('Should fail with the correct error message from the callback function', async () => {
    // When

    // Then
    const result = await promisify(callbackFuncFailure, 1, 2, 3)
      .then((res) => {
        expect.fail('Promisify should not resolve');
      })
      .catch((e) => {
        // Expect
        expect(e).to.deep.eq(expectedError);
      });
    expect(result).to.eq(undefined);
  });

  it('Should resolve to an empty array even if the callback passed to the function is called without parameters', async () => {
    // When

    // Then
    const result = await promisify(callbackFuncUndefined, 1, 2, 3)
      .catch((e) => {
        expect.fail('Promisify should not throw an error');
      });

    // Expect
    expect(result).to.deep.eq([]);
  });

  it('Should fail with an appropriate error if there are not enough parameters for the callback function', async () => {
    // When

    // Then
    const result = await promisify(callbackFuncSuccess, 1)
      .then((res) => {
        expect.fail('Promisify should not resolve');
      })
      .catch((e) => {
        // Expect
        expect(e.message).to.eq('cb is not a function');
      });
    expect(result).to.eq(undefined);
  });

  it('Should fail with an appropriate error if there are too many parameters for the callback function', async () => {
    // When

    // Then
    const result = await promisify(callbackFuncSuccess, 1, 2, 3, 4, 5, 6)
      .then((res) => {
        expect.fail('Promisify should not resolve');
      })
      .catch((e) => {
        // Expect
        expect(e.message).to.eq('cb is not a function');
      });
    expect(result).to.eq(undefined);
  });

  it('Should handle multiple return values from the function execution successfully', async () => {
    // When

    // Then
    const [resultOne, resultTwo] = await promisify(callbackDyadicReturnSuccess, 2, 3, 4)
      .catch((e) => {
      // Expect
        expect.fail('Promisify should not throw an error');
      });
    expect(resultOne).to.eq(9);
    expect(resultTwo).to.eq(24);
  });

  it('Should resolve an empty array even if no value is returned to the callback in promisify', async () => {
    // When

    // Then
    const result = await promisify(callbackFuncNoReturn, 2, 3, 4)
      .catch((e) => {
      // Expect
        expect.fail('Promisify should not throw an error');
      });
    expect(result).to.deep.eq([]);
  });
});
