/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@curveroyaltysystems/eslint-config/index.js'],
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/no-this-alias': 'warn',
      },
    },
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-require-imports': 'warn',
      },
    },
  ],
};
