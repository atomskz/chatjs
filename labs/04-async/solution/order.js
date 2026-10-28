// Упражнение 1: в каком порядке выполнится код?
// Ответ: A F H D E G, затем C и B в любом порядке.
//
// 1. Весь синхронный код: A, F (тело async-функции до первого await), H.
// 2. Микрозадачи в порядке постановки в очередь: D (.then), E (queueMicrotask),
//    G (продолжение после await — оно встало в очередь после D и E).
// 3. Макрозадачи: B (setTimeout 0) и C (setImmediate). Их порядок в главном
//    модуле не гарантирован: он зависит от того, успел ли истечь 1 мс таймера
//    к началу цикла событий.

console.log('A');
setTimeout(() => console.log('B'), 0);
setImmediate(() => console.log('C'));
Promise.resolve().then(() => console.log('D'));
queueMicrotask(() => console.log('E'));
(async () => {
  console.log('F');
  await null;
  console.log('G');
})();
console.log('H');
