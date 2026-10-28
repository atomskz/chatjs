// Упражнение 2: вопрос и ответ через readline/promises.
// Работает в интерактивном терминале. Попробуйте также
// printf 'Ann\nblue\n' | node ask.js — и прочитайте объяснение в README.

import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const name = await rl.question('What is your name? ');
const color = await rl.question(`Nice to meet you, ${name}. Favourite color? `);
console.log(`${name} likes ${color || 'nothing'}.`);
rl.close();
