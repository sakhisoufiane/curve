import reactConfig from '@curveroyaltysystems/eslint-config/react.js';
import storybook from 'eslint-plugin-storybook';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', 'storybook-static']),
  ...storybook.configs['flat/recommended'],
  ...reactConfig,
  {
    rules: {
      // This is a component library, not a Vite app — HMR constraints don't apply.
      // Files legitimately export both components and related constants/hooks together.
      'react-refresh/only-export-components': 'off',
    },
  },
]);
