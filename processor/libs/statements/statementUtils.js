/**
 * @module StatementUtils
 */
const StatementUtils = {
  /**
    * Check whether string passed contains special chars, used for detailed rows and non-odinary currencies.
    * We currently use this to check which font asset to use.
    *
    * @param {string} string - String to test
    * @returns {boolean} *true* if String contains special characters.
    */
  containsSpecialChars: (string) => {
    const specialChars = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
    return specialChars.test(string);
  },
};

module.exports = StatementUtils;
