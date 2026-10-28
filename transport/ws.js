// Транспорт на WebSocket (библиотека `ws`).
// WebSocket сам делит поток байтов на сообщения (фреймы), поэтому здесь
// почти нечего делать: одно WebSocket-сообщение = одно сообщение чата.

import { EventEmitter, once } from 'node:events';
import http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

const CLOSE_TIMEOUT_MS = 2000;
// Сообщение чата — максимум 1000 символов, 64 КБ хватит с большим запасом.
// Ограничение защищает сервер от клиента, присылающего гигантские фреймы.
const MAX_MESSAGE_BYTES = 64 * 1024;

class WsConnection extends EventEmitter {
  #socket;

  constructor(socket, remoteAddress) {
    super();
    this.#socket = socket;
    this.remoteAddress = remoteAddress;

    let lastError = null;
    socket.on('message', (data) => this.emit('message', data.toString('utf8')));
    socket.on('error', (error) => {
      lastError = error;
    });
    // 'close' приходит всегда: и после штатного закрытия, и после обрыва.
    socket.on('close', () => this.emit('close', lastError));
  }

  send(text) {
    if (this.#socket.readyState === WebSocket.OPEN) {
      this.#socket.send(text);
    }
  }

  close() {
    // 1000 — код «нормальное закрытие» из RFC 6455.
    this.#socket.close(1000);
    // Если собеседник не ответил на закрытие, рвём соединение принудительно.
    setTimeout(() => this.#socket.terminate(), CLOSE_TIMEOUT_MS).unref();
  }
}

export async function listen({ port, onConnection }) {
  // WebSocket начинается как обычный HTTP-запрос с заголовком `Upgrade: websocket`,
  // поэтому сервер WebSocket работает поверх HTTP-сервера.
  const httpServer = http.createServer((req, res) => {
    // Сюда попадают обычные HTTP-запросы без Upgrade (например, из браузера).
    res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('This is a WebSocket chat server. Connect with a WebSocket client.\n');
  });

  // Хост не указан: Node.js слушает все интерфейсы (и IPv4, и IPv6),
  // поэтому к серверу можно подключиться с другой машины в сети.
  httpServer.listen(port);
  // once() ждёт событие 'listening' и выбрасывает ошибку, если раньше
  // придёт 'error' (например, EADDRINUSE — порт занят).
  await once(httpServer, 'listening');

  // WebSocketServer создаём только после успешного listen: иначе он
  // перехватит ошибку вроде EADDRINUSE и выбросит её как необработанную.
  // clientTracking: false — список участников ведёт логика чата, а не библиотека.
  const wss = new WebSocketServer({
    server: httpServer,
    clientTracking: false,
    maxPayload: MAX_MESSAGE_BYTES,
  });
  wss.on('connection', (socket, request) => {
    const { remoteAddress, remotePort } = request.socket;
    onConnection(new WsConnection(socket, `${remoteAddress}:${remotePort}`));
  });

  return {
    port: httpServer.address().port,
    close: () =>
      new Promise((resolve) => {
        wss.close();
        httpServer.close(() => resolve());
      }),
  };
}
