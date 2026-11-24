const fixUtf8 = require('fix-utf8');

module.exports = function (value) {
  try {
    return fixUtf8(value);
  } catch (e) {
    return value;
  }
};
