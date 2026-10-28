// Упражнение 5: свой обработчик Ctrl+C.
// Если на readline есть обработчик 'SIGINT', Ctrl+C больше не завершает процесс сам.

import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.setPrompt('> ');
rl.prompt();

rl.on('line', (line) => {
  console.log(`got: ${line}`);
  rl.prompt();
});

rl.on('SIGINT', () => {
  rl.question('Really quit? (y/n) ', (answer) => {
    if (answer.trim().toLowerCase() === 'y') {
      rl.close();
    } else {
      rl.prompt();
    }
  });
});

rl.on('close', () => console.log('Bye!'));
