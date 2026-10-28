// Упражнение 3: проверка MyEmitter — вывод должен совпасть с настоящим EventEmitter.

import { MyEmitter } from './my-emitter.js';

const emitter = new MyEmitter();
const handler = (text, from) => console.log(`${from}: ${text}`);

emitter.on('message', handler);
emitter.once('message', () => console.log('first message!'));

console.log('before emit');
console.log(`emit returned ${emitter.emit('message', 'hi', 'ann')}`);
emitter.emit('message', 'again', 'bob');
emitter.off('message', handler);
console.log(`after off: ${emitter.emit('message', 'lost', 'kate')}`);
