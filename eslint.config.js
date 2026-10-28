// Настройки ESLint: рекомендуемые правила + глобальные переменные Node.js.
// Форматированием (отступы, кавычки) занимается Prettier, а ESLint ищет ошибки:
// неиспользуемые переменные, опечатки в именах, недостижимый код и т. п.

import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
];
