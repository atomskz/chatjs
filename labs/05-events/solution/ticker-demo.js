// Упражнение 2: подписка через on и once.

import { Ticker } from './ticker.js';

const ticker = new Ticker();
ticker.on('tick', (n) => console.log(`tick ${n}`));
ticker.once('tick', () => console.log('first tick only'));
ticker.on('done', () => console.log('done'));
ticker.start({ count: 3 });
