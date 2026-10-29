// Упражнение 1: emit вызывает обработчики синхронно, по порядку подписки.

import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
emitter.on('greet', (name) => console.log(`  listener A: hello, ${name}`));
emitter.on('greet', (name) => console.log(`  listener B: hi, ${name}`));

console.log('before emit');
const hadListeners = emitter.emit('greet', 'Ann');
console.log(`after emit, had listeners: ${hadListeners}`);
console.log(`nobody listens to "bye": ${emitter.emit('bye')}`);

const onGreet = () => console.log('  listener C');
emitter.on('greet', onGreet);
emitter.off('greet', onGreet); // отписаться можно только той же самой функцией
console.log(`listeners now: ${emitter.listenerCount('greet')}`);
