// Упражнение 3: «невежливый» клиент. Получив от сервера FIN (событие 'end'),
// он не закрывает свою сторону соединения. Сервер должен отключить его сам
// по страховочному таймеру.
// node half-open-client.js [port]

import net from 'node:net';

const port = Number(process.argv[2] ?? 5000);
const start = Date.now();
const elapsed = () => `${((Date.now() - start) / 1000).toFixed(1)}s`;

// allowHalfOpen: true — не закрывать свою сторону автоматически после 'end'.
const socket = net.connect({ port, host: '127.0.0.1', allowHalfOpen: true });

socket.on('data', (chunk) => process.stdout.write(`${elapsed()} got: ${chunk}`));
socket.on('end', () => console.log(`${elapsed()} server sent FIN, but I keep my side open`));
socket.on('error', (error) => console.log(`${elapsed()} error: ${error.code}`));
socket.on('close', () => {
  console.log(`${elapsed()} closed`);
  clearInterval(keepAlive);
});

// Пустой таймер держит процесс живым: без него после 'end' процессу было бы нечего
// ждать, он завершился бы, ОС закрыла бы сокет, и сервер не увидел бы «зависшего»
// клиента. Остановите клиент через Ctrl+C.
const keepAlive = setInterval(() => {}, 1000);
