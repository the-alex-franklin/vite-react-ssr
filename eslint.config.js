import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['server.js', 'dist/**', 'node_modules/**'],
    files: [
      'server.ts',
      'src/**/*.{js,mjs,cjs,ts,jsx,tsx}',
      'eslint.config.js',
      'vite.config.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Base configs
      ...pluginJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,

      // Syntax rules
      semi: ['warn', 'always'],
      eqeqeq: ['warn', 'smart'],
      'no-extra-semi': 'warn',
      'jsx-quotes': 'warn',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'comma-dangle': ['warn', 'always-multiline'],
      'padded-blocks': ['warn', 'never'],
      'space-before-blocks': ['warn', 'always'],
      'no-constant-condition': 'warn',
      'no-unreachable': 'warn',
      'no-unused-labels': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',

      // Indentation
      indent: ['warn', 2, {
        SwitchCase: 1,
        ignoredNodes: ['TemplateLiteral *'],
      }],

      // Unused variables
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // Whitespace
      'no-trailing-spaces': 'warn',
      'object-curly-spacing': ['warn', 'always'],

      // Empty blocks and functions
      'no-empty': 'warn',
      'no-empty-function': ['warn', { allow: ['constructors'] }],

      // Line spacing
      'eol-last': ['warn', 'always'],
      'no-multiple-empty-lines': ['warn', {
        max: 1,
        maxEOF: 0,
        maxBOF: 0,
      }],

      // TypeScript specific
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',

      // Console and debugging
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },
];
