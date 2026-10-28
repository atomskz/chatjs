// Упражнение 3: чтение файла с колбэком и обработка ошибки.
// node read-callback.js <путь>

import { readFile } from 'node:fs';

const path = process.argv[2] ?? import.meta.filename;

console.log(`Reading ${path}...`);

readFile(path, 'utf8', (error, text) => {
  // Колбэк вызывается позже, когда файл прочитан или чтение не удалось.
  if (error) {
    console.error(`Cannot read: ${error.code}`);
    process.exitCode = 1;
    return;
  }
  const lines = text.split('\n').length;
  console.log(`${path}: ${text.length} characters, ${lines} lines`);
});

console.log('readFile called, waiting for the result');
