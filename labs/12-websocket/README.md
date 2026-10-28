# Лабораторная 12. HTTP и WebSocket

**Цель:** понять, как HTTP и WebSocket устроены поверх TCP; как
WebSocket-соединение начинается с HTTP-запроса и что WebSocket даёт
по сравнению с «голым» TCP. Научиться писать WebSocket-сервер и клиент
на библиотеке `ws`.

**Понадобится:** лабораторные 10 и 11.

**Примерное время:** 2,5 часа.

## Теория

### HTTP — текст поверх TCP

Браузер открывает TCP-соединение и отправляет текст:

```
GET /time HTTP/1.1
Host: localhost
                       ← пустая строка: заголовки закончились
```

Сервер отвечает тоже текстом: строка статуса, заголовки, пустая строка,
тело. Строки в HTTP заканчиваются `\r\n`. HTTP использует **оба** способа
фрейминга из лабораторной 11: заголовки разделены переводами строк,
а длина тела указана в `Content-Length` или кусками
(`Transfer-Encoding: chunked`, у каждого куска свой префикс длины).

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  // req.method, req.url, req.headers
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});
server.listen(5000);
```

Коды статуса: `200` — успешно, `404` — не найдено, `426` — нужно перейти
на другой протокол, `101` — переходим на другой протокол.

### Рукопожатие WebSocket

HTTP устроен по схеме «запрос — ответ», и сервер не может сам написать
клиенту. WebSocket решает это так: соединение **начинается** как HTTP-запрос,
а потом «переключается» в двусторонний канал.

```
GET / HTTP/1.1
Host: localhost:5000
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==

HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

`Sec-WebSocket-Accept` = base64(SHA-1(ключ клиента + фиксированный GUID)).
Так клиент убеждается, что ответил настоящий WebSocket-сервер, а не
обычный веб-сервер, который случайно вернул 200. После ответа `101`
HTTP на этом соединении заканчивается, и по тому же TCP-соединению
ходят WebSocket-**фреймы**.

### Что WebSocket добавляет к TCP

- **границы сообщений**: что отправили одним `send()`, придёт одним `message`,
  без склеек и разрывов. Фрейминг уже сделан за вас;
- тип данных: текст (UTF-8) или двоичные данные;
- служебные фреймы: `ping`/`pong` (жив ли собеседник) и `close`
  с кодом и причиной;
- работа через HTTP-прокси и в браузере, куда «голый» TCP не пускают.

Коды закрытия: `1000` — нормальное закрытие, `1001` — уходим (сервер
выключается), `1006` — соединение оборвалось без close-фрейма
(этот код только сообщается, его нельзя отправить), `1009` — сообщение
слишком большое.

### Библиотека `ws`

```js
import http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

const httpServer = http.createServer(/* обычные запросы */);
const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024 });

wss.on('connection', (socket, request) => {
  socket.on('message', (data, isBinary) => socket.send(data.toString()));
  socket.on('close', (code, reason) => {});
  socket.on('error', (error) => {}); // как и у TCP-сокета — обязательно
});
httpServer.listen(5000);
```

Клиент:

```js
const socket = new WebSocket('ws://localhost:5000', { handshakeTimeout: 5000 });
await once(socket, 'open');
socket.send('hi');
socket.close(1000, 'bye'); // штатно, с close-фреймом
socket.terminate(); // оборвать сразу
```

- `data` в `message` — это `Buffer`, его нужно превратить в строку.
- `socket.readyState` — `CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`. Отправлять
  можно только в `OPEN`.
- `maxPayload` ограничивает размер одного сообщения — это та же защита
  памяти, что и `maxLineLength` в `LineSplitter`.
- `WebSocketServer` по умолчанию сам ведёт список клиентов (`wss.clients`).
  По ТЗ рассылку и учёт участников нужно написать самим, поэтому в чате
  этот список выключают: `clientTracking: false`.
- IPv6-адрес в URL пишется в квадратных скобках: `ws://[::1]:5000`.

Порядок запуска важен. Если создать `WebSocketServer` до того, как
HTTP-сервер успешно начал слушать порт, ошибку `EADDRINUSE` перехватит
`ws` и выбросит её как необработанную. Сначала `listen` и
`await once(httpServer, 'listening')`, потом `WebSocketServer`.

### Инструменты

- `curl -i http://localhost:5000/` — HTTP-запрос с заголовками ответа.
- `npx wscat -c ws://localhost:5000` — интерактивный WebSocket-клиент.

## Упражнения

Решения лежат в [solution/](solution/). Пакет `ws` уже установлен
в корне этого репозитория, поэтому решения можно запускать прямо отсюда.

### Упражнение 1. HTTP-сервер

Напишите сервер с двумя адресами: `/` отвечает текстом (с кириллицей,
не забудьте `charset=utf-8`), `/time` — JSON `{ "ts": ... }`, остальное —
`404`. Проверьте в браузере и через `curl -i`.

### Упражнение 2. HTTP руками

Через `net.connect` отправьте серверу из упражнения 1 строку
`GET /time HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`
и напечатайте ответ как есть. Найдите строку статуса, заголовки и тело.
Что за число стоит перед JSON?

### Упражнение 3. `Sec-WebSocket-Accept`

С помощью `node:crypto` вычислите `Sec-WebSocket-Accept` для ключа
`dGhlIHNhbXBsZSBub25jZQ==` из RFC 6455. Должно получиться
`s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`.

### Упражнение 4. WebSocket эхо-сервер

Сделайте эхо-сервер на `ws` поверх `http.createServer`. Обычный HTTP-запрос
получает `426 Upgrade Required`. Логируйте подключение (с
`Sec-WebSocket-Key` из `request.headers`), сообщения и закрытие с кодом
и причиной. Подключитесь через `wscat`, браузером и `curl -i`.

### Упражнение 5. Границы сообщений

Напишите клиент, который сразу после `open` делает три `send` подряд,
печатает три ответа и закрывается с кодом `1000` и причиной `bye`.
Сравните с упражнением 2 из лабораторной 11: сколько событий `message`
пришло на сервер? Что сервер напечатал про код закрытия? Закройте `wscat`
через Ctrl+C. Какой код увидел сервер теперь?

### Упражнение 6 (бонус). Рассылка на WebSocket

Переделайте сервер рассылки из лабораторной 10 на `ws`: свой `Set` сокетов,
`clientTracking: false`.

## Шаг проекта

Отдельного шага нет: транспорт на `ws` вы соберёте в лабораторной 13. Но
ответы на вопросы 1 и 2 из раздела 9 ТЗ уже можно написать в README проекта.

## Контрольные вопросы

1. Какой HTTP-запрос открывает WebSocket-соединение и что отвечает сервер?
2. Зачем нужен `Sec-WebSocket-Accept`?
3. Что WebSocket добавляет к TCP?
4. Почему WebSocket-серверу не нужен `LineSplitter`?
5. Что значат коды закрытия 1000 и 1006?
6. Зачем `maxPayload`?
7. Почему `WebSocketServer` создают только после успешного `listen` HTTP-сервера?

## Где это в эталонном проекте

- [transport/ws.js](../../transport/ws.js): HTTP-сервер с ответом 426,
  `WebSocketServer` с `clientTracking: false` и `maxPayload`, создание после
  `listen`, клиент с `handshakeTimeout`.
- Ответы на вопросы 1 и 2 в [README](../../README.md#1-как-устанавливается-websocket-соединение).
- `git checkout step-1` и `git checkout step-2` — эхо и рассылка на `ws`.
