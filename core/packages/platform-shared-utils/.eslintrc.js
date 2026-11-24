module.exports = {
  root: true,
  extends: ['@curveroyaltysystems/eslint-config/index.js'],
  overrides: [
    {
      files: ['*.js'],
      rules: {
        // These can be removed when source code is converted to TypeScript
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/no-require-imports': 'warn',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-this-alias': 'warn',
      },
    },
    {
      files: ['*.test.js'],
      rules: {
        // This can be removed when tests are converted to Jest + TypeScript
        '@typescript-eslint/no-unused-expressions': 'off',
      },
    },
  ],
};
