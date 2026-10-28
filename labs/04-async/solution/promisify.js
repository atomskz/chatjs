// Упражнение 6: три способа получить промис из callback-API.

import { readFile } from 'node:fs';
import { readFile as readFilePromise } from 'node:fs/promises';
import { promisify } from 'node:util';

const path = import.meta.filename;

// 1. Callback в стиле Node.js: первым аргументом всегда идёт ошибка.
readFile(path, 'utf8', (error, text) => {
  if (error) {
    console.error(error.message);
    return;
  }
  console.log(`callback: ${text.length} characters`);
});

// 2. Свой промис поверх callback.
function readFileManual(file) {
  return new Promise((resolve, reject) => {
    readFile(file, 'utf8', (error, text) => (error ? reject(error) : resolve(text)));
  });
}
console.log(`manual promise: ${(await readFileManual(path)).length} characters`);

// 3. Готовые инструменты.
const readFileAsync = promisify(readFile);
console.log(`util.promisify: ${(await readFileAsync(path, 'utf8')).length} characters`);
console.log(`fs/promises: ${(await readFilePromise(path, 'utf8')).length} characters`);
