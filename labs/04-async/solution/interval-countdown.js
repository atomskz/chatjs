// Упражнение 2: обратный отсчёт на setInterval, без промисов.
// Печатает 3, 2, 1 раз в полсекунды, затем Go! и останавливает таймер.

let count = 3;

const timer = setInterval(() => {
  if (count > 0) {
    console.log(count);
    count--;
    return;
  }
  console.log('Go!');
  clearInterval(timer); // без этого интервал работал бы вечно, и процесс не завершился бы
}, 500);

console.log('Countdown started'); // напечатается первым: setInterval не ждёт
