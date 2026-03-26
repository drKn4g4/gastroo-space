// eslint.config.mjs — ESLint v9 flat config
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '.next/**',
      '.firebase/**',
      'functions/node_modules/**',
      'node_modules/**',
      'public/**',
      'out/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-debugger': 'error',
    },
  },
  // Test files: relax rules that conflict with Playwright fixture patterns
  {
    files: ['tests/**/*.ts', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      // Playwright fixtures use `use()` which trips the React hooks linter
      'react-hooks/rules-of-hooks': 'off',
      // BDD fixtures intentionally use `any` for flexible test data shapes
      '@typescript-eslint/no-explicit-any': 'off',
      // console.log is acceptable in test output
      'no-console': 'off',
    },
  },
];
