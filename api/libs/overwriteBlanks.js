/**
  * Check if import data needs to be overwritten/set to default.
  *
  * If not import data and overwrite blanks is set to true, the contract field is set the default value.
  *
  * @method
  * @param {string} field - Contract field.
  * @param {string} valueToAssign - Imported data field.
  * @param {boolean} overwriteBlanks - Overwrite blanks ?.
  * @param {string} defaultValue - Default value to ovwerwrite with.
  * @param {string} fieldType - Contract field type.
  * @returns {result} The value to assign the the contract field.
  */
module.exports = (field, valueToAssign, overwriteBlanks, defaultValue, fieldType) => {
  let result;

  if (valueToAssign || valueToAssign === false || valueToAssign === 0) {
    if (fieldType === 'boolean') {
      result = !(valueToAssign === 'false' || valueToAssign === 'FALSE' || valueToAssign === false);
    } else if (fieldType === 'number') {
      result = Number(valueToAssign);
      if (!Number.isNaN(parseFloat(valueToAssign))) {
        result = Number(valueToAssign);
      } else {
        result = 0;
      }
    } else {
      result = valueToAssign;
    }
  } else if (overwriteBlanks) {
    result = defaultValue;
  } else {
    result = field;
  }

  return result;
};
