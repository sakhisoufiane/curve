/** @type {import('prettier').Config} * */
module.exports = {
  singleQuote: true, // If you want to use single quotes
  tabWidth: 2, // Specify the number of spaces per indentation level
  semi: true, // If you want to use semicolons
  trailingComma: 'es5', // Trailing commas where valid in ES5 (objects, arrays, etc.)
  printWidth: 120, // Specify the line length that the printer will wrap on
  quoteProps: 'as-needed', // Change when properties in objects are quoted
  overrides: [
    {
      files: '*.json',
      options: {
        parser: 'json',
        // JSON files must use double quotes per JSON spec
        singleQuote: false,
        tabWidth: 2,
        useTabs: false,
      },
    },
  ],
};
