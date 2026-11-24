module.exports = function (obj) {
  // Function checks if object has values
  let objectPopulated = false;
  // Loop through keys
  for (const key in obj) {
    // Check if object has property
    if (obj.hasOwnProperty(key) && obj[key] !== '') {
      objectPopulated = true;
    }
  }
  return objectPopulated;
};
