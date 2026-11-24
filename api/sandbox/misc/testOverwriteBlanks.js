const overwriteBlanks = require('../libs/overwriteBlanks');

let one = 'another';
one = overwriteBlanks(one, false, true, null, 'boolean');
console.log(one);
