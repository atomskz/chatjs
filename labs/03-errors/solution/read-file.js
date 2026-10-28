// Упражнение 1: системные ошибки и их коды.
// node read-file.js <путь>

import { readFileSync } from 'node:fs';

function describeReadError(error, path) {
  switch (error.code) {
    case 'ENOENT':
      return `File "${path}" does not exist`;
    case 'EISDIR':
      return `"${path}" is a folder, not a file`;
    case 'EACCES':
    case 'EPERM':
      return `No permission to read "${path}"`;
    default:
      return `Cannot read "${path}": ${error.message}`;
  }
}

const path = process.argv[2] ?? 'missing.txt';

try {
  const text = readFileSync(path, 'utf8');
  console.log(`${path}: ${text.length} characters`);
} catch (error) {
  console.error(`code=${error.code} syscall=${error.syscall}`);
  console.error(`Error: ${describeReadError(error, path)}`);
  process.exitCode = 1;
}
