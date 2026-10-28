// Транспорт на «голом» TCP (встроенный модуль `net`).
// В отличие от WebSocket, TCP передаёт поток байтов, а не сообщения,
// поэтому границы сообщений мы размечаем сами: формат NDJSON,
// одно сообщение = одна строка JSON + '\n' (см. line-splitter.js).

import { EventEmitter, once } from 'node:events';
import net from 'node:net';
import { LineSplitter } from './line-splitter.js';

const CONNECT_TIMEOUT_MS = 5000;
const CLOSE_TIMEOUT_MS = 2000;

class TcpConnection extends EventEmitter {
  #socket;

  constructor(socket, remoteAddress) {
    super();
    this.#socket = socket;
    this.remoteAddress = remoteAddress;

    const splitter = new LineSplitter();
    let lastError = null;

    socket.on('data', (chunk) => {
      let lines;
      try {
        lines = splitter.push(chunk);
      } catch (error) {
        // Собеседник шлёт бесконечную строку без '\n' — обрываем соединение.
        socket.destroy(error);
        return;
      }
      for (const line of lines) {
        this.emit('message', line);
      }
    });
    socket.on('error', (error) => {
      lastError = error;
    });
    socket.on('close', () => this.emit('close', lastError));
  }

  send(text) {
    // JSON.stringify экранирует переводы строк внутри значений,
    // поэтому '\n' в закодированном сообщении встречается только как разделитель.
    if (this.#socket.writable) {
      this.#socket.write(`${text}\n`);
    }
  }

  close() {
    // end() отправляет оставшиеся данные и затем FIN — «я больше не пишу».
    this.#socket.end();
    // Если собеседник так и не закрыл свою сторону, рвём соединение принудительно.
    setTimeout(() => this.#socket.destroy(), CLOSE_TIMEOUT_MS).unref();
  }
}

export async function listen({ port, onConnection }) {
  const server = net.createServer((socket) => {
    const address = `${socket.remoteAddress}:${socket.remotePort}`;
    onConnection(new TcpConnection(socket, address));
  });

  // Хост не указан: слушаем все интерфейсы (и IPv4, и IPv6).
  server.listen(port);
  // once() ждёт 'listening' и выбрасывает ошибку, если раньше придёт 'error'.
  await once(server, 'listening');

  return {
    port: server.address().port,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

export async function connect({ host, port }) {
  const socket = net.connect({ host, port, timeout: CONNECT_TIMEOUT_MS });
  // Если за отведённое время соединиться не удалось, превращаем таймаут в ошибку.
  socket.once('timeout', () => {
    socket.destroy(Object.assign(new Error('Connection timed out'), { code: 'ETIMEDOUT' }));
  });

  // Ждём 'connect'; если раньше придёт 'error', once() выбросит эту ошибку.
  await once(socket, 'connect');
  socket.setTimeout(0); // соединение установлено, дальше оно может молчать сколько угодно
  return new TcpConnection(socket, `tcp://${host}:${port}`);
}
