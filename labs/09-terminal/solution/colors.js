// Упражнение 3: цвета в терминале через util.styleText.
// Сравните: node colors.js   и   node colors.js > out.txt (или | more)

import { styleText } from 'node:util';

console.log(styleText('red', '! error'));
console.log(styleText('yellow', '* system'));
console.log(styleText(['bold', 'green'], 'you') + ': hello');
console.log(styleText('dim', '[12:00:00]'));

// styleText сама проверяет, умеет ли поток вывода показывать цвета:
// при выводе в файл или в другую программу escape-коды не добавляются.
console.log(`stdout is a TTY: ${Boolean(process.stdout.isTTY)}`);
console.log(`escape codes: ${JSON.stringify(styleText('red', 'x'))}`);
