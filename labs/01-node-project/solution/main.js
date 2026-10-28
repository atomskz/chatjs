// Упражнение 2: импорт своего модуля и встроенного модуля Node.js.

import os from 'node:os';
import { average } from './math.js';

console.log(`average: ${average([2, 4, 9])}`);
console.log(`CPU cores: ${os.cpus().length}`);
console.log(`This file: ${import.meta.filename}`);
console.log(`Its folder: ${import.meta.dirname}`);
