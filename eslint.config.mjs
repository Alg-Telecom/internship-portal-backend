// ESLint flat config for the backend (Node.js + Express, CommonJS).
// Same structure as frontend/eslint.config.js, without React/JSX and with
// Node globals (require, module, process, __dirname...) instead of browser
// ones. The .mjs extension lets this file use `import` although the
// backend code itself is CommonJS.
import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['node_modules', 'uploads', 'src/generated', 'prisma/migrations']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // `const { password: _password, ...rest } = user` drops a field on
      // purpose; unused `_err` / `_next` parameters are intentional too.
      'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
])
