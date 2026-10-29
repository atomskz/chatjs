// Упражнение 8: исключение внутри обработчика события.
// node handler-throw.js sync   — emit синхронный: исключение вылетает из emit()
// node handler-throw.js later  — событие приходит позже: try/catch снаружи уже не поможет
// node handler-throw.js inside — граница ошибок внутри обработчика: процесс жив

import { EventEmitter } from 'node:events';

const mode = process.argv[2] ?? 'inside';
const emitter = new EventEmitter();

function handle(text) {
  if (text === 'bad') {
    throw new Error(`cannot handle "${text}"`);
  }
  console.log(`handled "${text}"`);
}

if (mode === 'inside') {
  emitter.on('message', (text) => {
    try {
      handle(text);
    } catch (error) {
      console.log(`boundary caught: ${error.message}`);
    }
  });
} else {
  emitter.on('message', handle);
}

try {
  if (mode === 'sync') {
    emitter.emit('message', 'bad'); // обработчик выполняется прямо здесь, внутри try
  } else {
    // Как настоящая сеть: событие случится позже, когда этот try уже закончился.
    setImmediate(() => emitter.emit('message', 'bad'));
  }
} catch (error) {
  console.log(`outer try caught: ${error.message}`);
}

setImmediate(() => setImmediate(() => console.log('still alive')));
