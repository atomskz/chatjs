// Упражнение 1: в каком порядке выполнится код?
// Сначала весь синхронный код, затем микрозадачи (промисы),
// затем макрозадачи (таймеры, ввод-вывод, setImmediate).

console.log('1: sync start');

setTimeout(() => console.log('7: setTimeout 0'), 0);
setImmediate(() => console.log('8: setImmediate'));

Promise.resolve().then(() => console.log('4: promise.then'));
queueMicrotask(() => console.log('5: queueMicrotask'));

(async () => {
  console.log('2: inside async function, before await');
  await null;
  console.log('6: after await');
})();

console.log('3: sync end');
