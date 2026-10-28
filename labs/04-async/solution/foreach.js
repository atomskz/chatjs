// Упражнение 9: async-колбэк в forEach не ждут.

import { delay } from './async-utils.js';

const names = ['ann', 'bob', 'kate'];

console.log('forEach:');
names.forEach(async (name) => {
  await delay(10);
  console.log(`  hello, ${name}`);
});
console.log('  forEach finished?'); // напечатается раньше приветствий

await delay(50); // дождёмся, пока forEach «доделает» своё

console.log('for...of:');
for (const name of names) {
  await delay(10); // по очереди: каждое приветствие ждёт предыдущее
  console.log(`  hello, ${name}`);
}
console.log('  for...of finished');

console.log('Promise.all + map:');
await Promise.all(
  names.map(async (name) => {
    await delay(10); // одновременно: все три ждут параллельно
    console.log(`  hello, ${name}`);
  }),
);
console.log('  Promise.all finished');
