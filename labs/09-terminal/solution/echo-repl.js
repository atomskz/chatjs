// Упражнение 1: построчное чтение ввода.
// Интерактивно: node echo-repl.js (выход — exit, Ctrl+D или Ctrl+C)
// Из файла или конвейера: printf 'a\nexit\nb\n' | node echo-repl.js

import readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let count = 0;
let isClosed = false;

rl.setPrompt('echo> ');
rl.prompt();

rl.on('line', (line) => {
  // Ловушка: если строки пришли одним куском (из файла или конвейера),
  // readline отдаёт их и после close(). А prompt() после close() выбрасывает
  // ERR_USE_AFTER_CLOSE. Поэтому после закрытия строки игнорируем.
  if (isClosed) return;
  if (line.trim() === 'exit') {
    rl.close();
    return;
  }
  count++;
  console.log(line.toUpperCase());
  rl.prompt();
});

// 'close' приходит при rl.close(), Ctrl+D и конце входного потока.
rl.on('close', () => {
  isClosed = true;
  console.log(`\nLines: ${count}. Bye!`);
});
