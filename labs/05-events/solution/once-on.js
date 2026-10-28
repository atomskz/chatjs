// Упражнение 4 и 5: события как промисы и как асинхронные итераторы.

import { on, once } from 'node:events';
import { Ticker } from './ticker.js';

// once() — промис, который выполнится при первом событии.
const ticker = new Ticker();
ticker.start({ count: 2 });
await once(ticker, 'done');
console.log('once: ticker is done');

// Если раньше придёт 'error', промис once() отклонится с этой ошибкой.
const failing = new Ticker();
failing.start({ count: 5, failAt: 2 });
try {
  await once(failing, 'done');
} catch (error) {
  console.log(`once rejected: ${error.message}`);
}

// on() — асинхронный итератор: события копятся в очереди и не теряются.
// close: ['done'] — событие, на котором цикл закончится.
const counter = new Ticker();
counter.start({ count: 4, intervalMs: 50 });
const ticks = [];
for await (const [n] of on(counter, 'tick', { close: ['done'] })) {
  ticks.push(n);
}
console.log(`on: collected ticks ${ticks.join(', ')}`);

// Тот же итератор можно читать по одному значению через next().
const manual = new Ticker();
manual.start({ count: 3, intervalMs: 50 });
const iterator = on(manual, 'tick', { close: ['done'] });
const first = await iterator.next(); // { value: [1], done: false }
const second = await iterator.next();
console.log(`next: ${first.value[0]}, then ${second.value[0]}`);
manual.stop();
await iterator.return(); // отписаться от событий, как break в for await
