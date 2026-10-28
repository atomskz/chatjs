// Упражнение 2: надёжный вариант, который работает и с конвейером.
// Асинхронный итератор readline складывает строки в очередь и не теряет их.

import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();

async function ask(question) {
  process.stdout.write(question);
  const { value, done } = await lines.next();
  return done ? '' : value;
}

const name = await ask('What is your name? ');
const color = await ask(`Nice to meet you, ${name}. Favourite color? `);
console.log(`${name} likes ${color || 'nothing'}.`);
rl.close();
