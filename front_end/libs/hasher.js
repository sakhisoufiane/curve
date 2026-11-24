const bcrypt = require('bcrypt');

const encrypt = (text) => {
  if (text) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(text, salt);
  }
};

const compare = (hash, comparison) => bcrypt.compareSync(comparison, hash);

module.exports = {
  encrypt,
  compare,
};
