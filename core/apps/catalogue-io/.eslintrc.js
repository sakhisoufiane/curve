module.exports = {
  root: true,
  extends: ['@curveroyaltysystems/eslint-config/index.js'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
  },
};
