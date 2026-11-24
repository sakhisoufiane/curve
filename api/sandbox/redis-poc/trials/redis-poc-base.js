
const { randomBytes } = require('node:crypto');
const mappings = {};
const utiliseRedis = false;

// Function to generate a random string of length 'n'
const randomString = (n) => {
  return randomBytes(Math.ceil(n / 2))
    .toString('hex')
    .slice(0, n);
}

// Function to generate an array of 'numStrings' random strings of length 'stringLength'
const randomStringsArray = (numStrings, stringLength) => {
  const strings = [];
  for (let i = 0; i < numStrings; i++) {
    strings.push(randomString(stringLength));
  }
  mappings[strings[0]] = randomString(stringLength);
  return strings;
}

// Function to generate an array of 'numArrays' arrays, each containing 'numStrings' random strings of length 'stringLength'
const generateArrayOfRandomStringsArrays = (numArrays, numStrings, stringLength) => {
  const arrayOfArrays = [];
  for (let i = 0; i < numArrays; i++) {
    arrayOfArrays.push(randomStringsArray(numStrings, stringLength));
  }
  return arrayOfArrays;
}

// Generate an array of 1000000 arrays with 5 random strings of length 10 each
console.time('Setup');
const inputData = generateArrayOfRandomStringsArrays(1000000, 5, 10);
console.timeEnd('Setup');
console.log(`Input Lines: ${inputData.length}`);

if (utiliseRedis) {
  // Load mappings into redis
}
// Loop through array
console.time('Process Time');
// Run mapping process - using either local or redis
const outputData = inputData.map((item) => {
  if (utiliseRedis) {
    // Map using redis
  } else {
    item[0] = mappings[item[0]];
  }
});

// Output timings
console.log(`Output Lines: ${outputData.length}`);
console.timeEnd('Process Time');