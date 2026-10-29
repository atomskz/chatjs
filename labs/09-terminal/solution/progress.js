// Упражнение 4: одна строка, которая перерисовывается на месте.
// В терминале видно одну строку прогресса, которая растёт.
// В файле или конвейере (node progress.js > out.txt) — по строке на каждый шаг.

import readline from 'node:readline';

const output = process.stdout;
const total = 10;
let done = 0;

function render() {
  const bar = '#'.repeat(done) + '.'.repeat(total - done);
  const line = `[${bar}] ${done * 10}%`;
  if (output.isTTY) {
    readline.cursorTo(output, 0); // курсор в начало строки
    readline.clearLine(output, 0); // стереть старый вариант строки
    output.write(line); // нарисовать новый — без перевода строки
  } else {
    output.write(`${line}\n`); // без терминала курсором не управляют
  }
}

const timer = setInterval(() => {
  done++;
  render();
  if (done === total) {
    clearInterval(timer);
    output.write('\nDone!\n');
  }
}, 200);

render();
