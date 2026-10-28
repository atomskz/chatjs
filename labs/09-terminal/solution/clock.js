// Упражнение 4: вывод над строкой ввода, не ломая набираемый текст.
// Каждую секунду печатаем время. Попробуйте при этом что-нибудь набирать.

import readline from 'node:readline';

/** ts в миллисекундах → 'ЧЧ:ММ:СС' (toLocaleTimeString зависит от настроек системы). */
function formatTime(ts) {
  const date = new Date(ts);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const output = process.stdout;

/** Печатает строку над приглашением и заново рисует приглашение с набранным текстом. */
function printAbovePrompt(text) {
  if (!output.isTTY) {
    output.write(`${text}\n`); // в файл или конвейер — просто строкой
    return;
  }
  readline.cursorTo(output, 0); // курсор в начало строки
  readline.clearLine(output, 0); // стереть строку целиком («> набранный текст»)
  output.write(`${text}\n`); // напечатать своё
  rl.prompt(true); // перерисовать «> » и набранный текст, сохранив позицию курсора
}

const timer = setInterval(() => {
  printAbovePrompt(`[${formatTime(Date.now())}] tick`);
}, 1000);

rl.setPrompt('> ');
rl.prompt();

rl.on('line', (line) => {
  printAbovePrompt(`you typed: ${line}`);
});

rl.on('close', () => clearInterval(timer)); // Ctrl+D, Ctrl+C или конец ввода
