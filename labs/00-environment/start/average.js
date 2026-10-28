/* eslint-disable -- файл с ошибками нарочно, это задание на отладку */
// Средний балл. Запуск: node average.js 5 4 3
// В программе три ошибки. Найдите и исправьте их (упражнение 4).

const grades = process.argv.slice(2);

function average(numbers) {
  let total = 0;
  for (let i = 0; i <= numbers.length; i++) {
    total = total + numbers[i];
  }
  return totl / numbers.length;
}

console.log(`Average: ${average(grades)}`);
