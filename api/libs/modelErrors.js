module.exports = {
  map(string, delimiter = ',') {
    // Manage error messages to ensure easily readable values are returned to the user
    const modelErrors = this;
    if (string) {
      // Split string based on delimiter
      const splitErrors = string.split(delimiter);
      // Map each value
      // Use mapValue function on each item
      return splitErrors.map((message) => modelErrors.mapValue(message));
    }
    // Handle Error
    throw (new Error('A String is required'));
  },
  mapValue(value) {
    if (value.includes('Path `name` is required')) {
      return 'A Name is required';
    }
    return value;
  },
};
