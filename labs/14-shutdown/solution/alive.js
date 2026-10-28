// Упражнение 1: что держит процесс живым.
// node alive.js interval      — никогда не завершится (Ctrl+C)
// node alive.js unref         — завершится сразу: unref-таймер не держит процесс
// node alive.js server        — сервер слушает порт и держит процесс
// node alive.js server-close  — сервер закрыт через секунду, процесс завершается

import net from 'node:net';

const mode = process.argv[2] ?? 'unref';
const start = Date.now();
process.on('exit', (code) => console.log(`exit after ${Date.now() - start} ms, code ${code}`));

switch (mode) {
  case 'interval':
    setInterval(() => console.log('still here'), 1000);
    break;
  case 'unref':
    setInterval(() => console.log('never printed'), 1000).unref();
    break;
  case 'server':
  case 'server-close': {
    const server = net.createServer().listen(0);
    if (mode === 'server-close') {
      setTimeout(() => server.close(() => console.log('server closed')), 1000);
    }
    break;
  }
}

// Что сейчас удерживает цикл событий.
console.log('active resources:', process.getActiveResourcesInfo());
