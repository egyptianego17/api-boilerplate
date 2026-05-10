// @ts-check

import eslint from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.yarn/**',
      'coverage/**',
      '**/*.js',
      '**/*.d.ts',
      '**/*.spec.ts',
      'test/**',
      'ormconfig.ts',
      'eslint.config.mjs',
      'src/generated/**',
    ],
  },
  eslint.configs.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      '@stylistic': stylisticPlugin,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      '@stylistic/quotes': [
        'warn',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true,
        },
      ],
      '@stylistic/semi': ['warn', 'always'],
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
    },
    extends: [prettierPlugin],
    rules: {
      'prettier/prettier': [
        'warn',
        {
          singleQuote: true,
          trailingComma: 'all',
          tabWidth: 2,
          bracketSpacing: true,
        },
      ],
    },
  },
  {
    extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic],
    rules: {
      // TypeScript essentials
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/array-type': 'off',

      // Relaxed rules for NestJS compatibility
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Good practices (warnings, not errors)
      'no-console': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      eqeqeq: ['warn', 'smart'],
      curly: ['warn', 'multi-line'],

      // Code quality
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-duplicate-case': 'error',
      'no-fallthrough': 'error',
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          extraFileExtensions: ['.ts'],
          defaultProject: 'tsconfig.eslint.json',
        },
        // @ts-ignore
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
