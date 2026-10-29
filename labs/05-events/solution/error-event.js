// Упражнение 5: событие 'error' особенное.
// node error-event.js        — обработчика нет: emit('error') выбрасывает исключение
// node error-event.js handle — обработчик есть: ошибка просто передана ему

import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();

if (process.argv[2] === 'handle') {
  emitter.on('error', (error) => console.log(`handled: ${error.message}`));
}

emitter.emit('error', new Error('socket hang up'));
console.log('still alive');
