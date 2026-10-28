// Упражнение 2: модуль с двумя функциями.

export function sum(a, b) {
  return a + b;
}

export function average(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  return numbers.reduce(sum, 0) / numbers.length;
}
