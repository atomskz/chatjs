// Упражнение 6: ограничение времени ожидания.
// node timeout.js       — withTimeout убирает свой таймер, процесс завершается сразу
// node timeout.js leaky — таймер не убран, процесс висит ещё 5 секунд

import { delay, withTimeout } from './async-utils.js';

function withTimeoutLeaky(promise, ms) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
  return Promise.race([promise, timeout]);
}

const start = Date.now();
process.on('exit', () => console.log(`process exited after ${Date.now() - start} ms`));

const wrap = process.argv[2] === 'leaky' ? withTimeoutLeaky : withTimeout;

console.log('fast:', await wrap(delay(100, 'done'), 5000));

try {
  await withTimeout(delay(1000, 'too late'), 200);
} catch (error) {
  console.log(`slow: ${error.code} ${error.message}`);
}
