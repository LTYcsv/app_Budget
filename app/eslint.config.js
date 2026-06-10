import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'tailwind.config.js']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    rules: {
      // NBSP внутри regex для форматирования чисел — намеренно
      'no-irregular-whitespace': ['error', { skipRegExps: true }],
      // Легаси-паттерн «setState в effect» чинится рефакторингом, не правилом;
      // warn — CI-гейт не падает, но новые случаи видны
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  {
    // shadcn/ui и контексты экспортируют утилиты рядом с компонентами — их идиома
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/context/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
