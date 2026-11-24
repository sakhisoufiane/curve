/**
 * Promisify is a function which wraps another function that uses a callback function to instead return a Promise.
 * Promisify will call the function passing in an arrow function to be used as a callback inside of a new Promise,
 * allowing the arrow function to resolve or reject depending on the parameters passed into the arrow function.
 *
 * It's important to note that promisify assumes that the callback will be called with any error being the first parameter.
 * Any number of resultant values can be passed into the rest parameter of the callback which will be the promise will resolve
 * as an array of values.
 *
 * If the function passed resolves with no values returned to the callback promisify will still resolve with an empty array.
 * This allows promisify to be used on asynchronous functions which do not return values to their callbacks.
 *
 *
 * This function will reject with the error passed to the callback if there is one.
 * This function will call resolve with the values passed to the callback as an array.
 * This function will reject if neither of these conditions are true. (Should never happen with the rest parameter "...response")
 *
 * @param {function} func - The callback function that will either return a response or error given the parameters.
 * @param  {...any} args - A rest parameter used to encapsulate all the arguments needed for the callback function.
 * @returns {Promise} - Promise that will resolve with the array of values passed to func's arrow function. Or will reject
 * with the error passed to func's arrow function.
 */
const promisify = (func, ...args) => new Promise((resolve, reject) => {
  func(...args, (error, ...response) => {
    if (error) {
      reject(error);
    } else if (response) {
      resolve(response);
    } else {
      reject(new Error('Promisify function did not produce an error or a response'));
    }
  });
});

module.exports = { promisify };
