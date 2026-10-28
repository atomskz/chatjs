// Упражнение 4: исправленная программа. Запуск: node average.js 5 4 3
//
// Ошибка 1: опечатка totl → ReferenceError. Видна сразу по стеку.
// Ошибка 2: аргументы командной строки — строки, и '0' + '5' = '05'.
//           Видна в отладчике: total становится строкой. Лечится Number.
// Ошибка 3: i <= numbers.length заходит на один элемент дальше конца
//           массива, numbers[3] === undefined, а число + undefined = NaN.

const grades = process.argv.slice(2).map(Number);

function average(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total = total + numbers[i];
  }
  return total / numbers.length;
}

console.log(`Average: ${average(grades)}`);
