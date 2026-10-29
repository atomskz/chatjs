# Лабораторная 12. HTTP и WebSocket

**Цель:** понять, как HTTP и WebSocket устроены поверх TCP; как
WebSocket-соединение начинается с HTTP-запроса и что WebSocket даёт
по сравнению с «голым» TCP. Научиться писать WebSocket-сервер и клиент
на библиотеке `ws`.

**Понадобится:** лабораторные 10 и 11. Упражнения делайте в папке `sandbox-12`
с `"type": "module"` и установите в неё `ws`: `npm install ws`.

**Примерное время:** 4 часа, два занятия.

**Как работать:** каждый пример запускайте у себя и сверяйте вывод.
В разминках сначала запишите **свой** ответ, потом проверьте и только
потом смотрите [answers.md](answers.md).

---

## Занятие 1. HTTP — текст поверх TCP

### 1.1. Зачем

Чат на TCP из лабораторных 10 и 11 работает, но у него два недостатка.
Из браузера к нему не подключиться: браузеры не дают сайтам открывать
«голые» TCP-соединения. И границы сообщений приходится размечать самим.
В вебе для этого есть два протокола: **HTTP** — основа всех сайтов —
и **WebSocket**, который начинается как HTTP, а потом превращается
в постоянный двусторонний канал с готовыми границами сообщений.

**Аналогия: справочная.** HTTP — окошко справочной: вы задали вопрос,
получили ответ и отошли. Позвать вас сама справочная не может — только
ответить на вопрос. WebSocket — вы подошли к окошку и договорились:
«дальше давайте по телефону». После этого говорить можно в обе стороны
и когда угодно, пока кто-то не положит трубку.

### 1.2. Разобранный пример: HTTP руками

HTTP — это **текст**, который ходит по обычному TCP-соединению. Это легко
увидеть. Запустите HTTP-сервер [solution/http-server.js](solution/http-server.js)
и отправьте ему запрос не браузером, а «руками» через `net` —
[solution/raw-http.js](solution/raw-http.js):

```js
socket.write('GET /time HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');
```

Ответ сервера как есть:

```
HTTP/1.1 200 OK                       ← строка статуса: версия, код, пояснение
Content-Type: application/json        ← заголовки: «имя: значение»
Date: Thu, 29 Oct 2026 00:10:00 GMT
Connection: close
Transfer-Encoding: chunked
                                      ← пустая строка: заголовки закончились
14                                    ← длина следующего куска тела: 0x14 = 20 байт
{"ts":1793232600705}                  ← сам кусок тела, 20 байт
0                                     ← кусок нулевой длины: тело закончилось
```

- Запрос тоже текст: строка `GET /time HTTP/1.1`, заголовки, пустая строка.
- Строки в HTTP заканчиваются `\r\n`, а не просто `\n`.
- HTTP использует **оба** способа фрейминга из лабораторной 11: заголовки
  разделены переводами строк, а длина тела указана в `Content-Length`
  или кусками (`Transfer-Encoding: chunked`). У каждого куска свой префикс
  длины, записанный в **шестнадцатеричном** виде: `14` значит 20 байт.

### 1.3. HTTP-сервер на Node.js

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  // req.method — 'GET', req.url — '/time', req.headers — заголовки запроса
  res.writeHead(200, { 'Content-Type': 'application/json' }); // код и заголовки ответа
  res.end(JSON.stringify({ ok: true })); // тело и конец ответа
});
server.listen(5000);
```

Коды статуса: `200` — успешно, `404` — не найдено, `426` — нужно перейти
на другой протокол, `101` — переходим на другой протокол.

- В `req.headers` имена заголовков всегда в **нижнем регистре**:
  `req.headers['content-type']`, а не `['Content-Type']`.
- Для текста с кириллицей указывайте кодировку:
  `'Content-Type': 'text/plain; charset=utf-8'`. Иначе браузер может
  показать кракозябры.
- Как Node.js выбирает способ передачи тела: если заголовки отправлены
  заранее через `res.writeHead(...)`, а тело — потом через `res.end(body)`,
  длина в момент отправки заголовков неизвестна, и Node.js использует
  `chunked`. Если задать заголовки через `res.setHeader(...)` и сразу
  вызвать `res.end(body)`, придёт `Content-Length`, и числа перед телом
  не будет.

### Разминка 1

1. Сервер ответил `HTTP/1.1 404 Not Found`. Что это значит и кто виноват:
   клиент или сервер?
2. Перед телом ответа стоит `1a`. Сколько байт в этом куске тела?
3. Почему `req.headers['Content-Type']` даёт `undefined`, хотя клиент
   прислал этот заголовок?

---

## Занятие 2. WebSocket

### 2.1. Рукопожатие

HTTP устроен по схеме «запрос — ответ», и сервер не может сам написать
клиенту. WebSocket решает это так: соединение **начинается** как HTTP-запрос,
а потом «переключается» в двусторонний канал.

```
 клиент                                          сервер
   │  TCP-соединение (лабораторная 10) ────────►  │
   │  GET / HTTP/1.1                              │
   │  Connection: Upgrade                         │
   │  Upgrade: websocket                          │
   │  Sec-WebSocket-Key: dGhl...  ──────────────► │
   │                                              │
   │  ◄──────────── HTTP/1.1 101 Switching Protocols
   │                Sec-WebSocket-Accept: s3pP...  │
   │                                              │
   │  ═══════ WebSocket-фреймы в обе стороны ════ │
```

Полный обмен выглядит так:

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
GUID задан стандартом (RFC 6455) и одинаков для всех:
`258EAFA5-E914-47DA-95CA-C5AB0DC85B11`. Так клиент убеждается, что ответил
настоящий WebSocket-сервер, а не обычный веб-сервер, который случайно вернул 200.

- **SHA-1** — хеш-функция: превращает любые данные в 20 байт «отпечатка».
  Одинаковый вход всегда даёт одинаковый отпечаток.
- **base64** — способ записать байты печатными символами (буквы, цифры, `+`, `/`, `=`),
  чтобы их можно было положить в текстовый заголовок.

В Node.js оба есть в модуле `node:crypto`:

```js
import { createHash } from 'node:crypto';

createHash('sha1') // выбрать алгоритм
  .update('какие-то данные') // добавить данные (можно вызывать несколько раз)
  .digest('base64'); // получить отпечаток в виде base64-строки
```

После ответа `101` HTTP на этом соединении заканчивается, и по тому же
TCP-соединению ходят WebSocket-**фреймы**.

### 2.2. Разобранный пример: границы сообщений бесплатно

В лабораторной 11 три `write` подряд пришли на TCP-сервер **одним**
событием `data`. Повторим то же на WebSocket.
[solution/ws-client.js](solution/ws-client.js) сразу после подключения
делает три `send` подряд, а эхо-сервер
[solution/ws-echo-server.js](solution/ws-echo-server.js) печатает каждое
событие `message`:

```
сервер:
connected: ::1:56726, key gaZk3iBbz9e3QXi87yMb1Q==
message from ::1:56726: "one" (binary: false)
message from ::1:56726: "two" (binary: false)
message from ::1:56726: "Привет 😀" (binary: false)
closed: ::1:56726, code 1000, reason "bye"

клиент:
message #1: echo: one
message #2: echo: two
message #3: echo: Привет 😀
closed with code 1000
```

Три `send` — три события `message`, без склеек и разрывов, и кириллица
с эмодзи целы. Фрейминг (лабораторная 11) WebSocket делает сам: каждое
сообщение уходит отдельным фреймом со своей длиной.

### 2.3. Что WebSocket добавляет к TCP

- **границы сообщений**: что отправили одним `send()`, придёт одним `message`,
  без склеек и разрывов;
- тип данных: текст (UTF-8) или двоичные данные;
- служебные фреймы: `ping`/`pong` (жив ли собеседник) и `close`
  с кодом и причиной;
- работа через HTTP-прокси и в браузере, куда «голый» TCP не пускают.

Коды закрытия:

| код    | когда сервер его увидит                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `1000` | собеседник закрыл штатно: `socket.close(1000)`                                                                               |
| `1001` | «ухожу»: например, вкладка браузера закрыта или сервер выключается                                                           |
| `1005` | close-фрейм пришёл, но без кода: собеседник вызвал `close()` без аргументов                                                  |
| `1006` | close-фрейма не было: процесс собеседника упал, закрыли терминал, оборвалась сеть                                            |
| `1009` | сообщение больше `maxPayload`. Этот код увидит тот, кто прислал слишком большое сообщение; сам сервер получит `error` и 1006 |

Коды 1005 и 1006 только сообщаются, отправить их нельзя. Обрыв связи
в `ws` выглядит именно как `close` с кодом 1006, **без события `error`**.

`ping`/`pong`: `socket.ping()` отправляет служебный фрейм, собеседник
по стандарту отвечает `pong` сам, без вашего кода (событие `socket.on('pong', ...)`).
Так сервер может раз в N секунд проверять, жив ли клиент, и отключать
(`terminate()`) тех, кто не ответил. Это нужно на случай, когда связь
пропала совсем и никакой пакет о закрытии не придёт (лабораторная 10).

### Разминка 2

1. Клиент отправил `send('{"type":"join","nick":"ann"}')` и сразу
   `send('{"type":"msg","text":"hi"}')`. Сколько событий `message` получит
   сервер? Нужен ли ему `LineSplitter`?
2. Сервер увидел `close` с кодом 1006. Что, скорее всего, случилось с клиентом?

### 2.4. Библиотека `ws`

**Сервер:**

```js
import { once } from 'node:events';
import http from 'node:http';
import { WebSocketServer } from 'ws';

const httpServer = http.createServer((req, res) => {
  res.writeHead(426).end('Upgrade Required\n'); // обычные HTTP-запросы
});
httpServer.listen(5000);
await once(httpServer, 'listening'); // сначала порт...

const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024 }); // ...потом ws
wss.on('connection', (socket, request) => {
  socket.on('message', (data, isBinary) => socket.send(data.toString()));
  socket.on('close', (code, reason) => {});
  socket.on('error', (error) => {}); // как и у TCP-сокета — обязательно
});
```

**Клиент:**

```js
import { once } from 'node:events';
import { WebSocket } from 'ws';

const socket = new WebSocket('ws://localhost:5000', { handshakeTimeout: 5000 });
await once(socket, 'open'); // соединение установлено — или исключение
socket.send('hi');
socket.close(1000, 'bye'); // штатно, с close-фреймом
// socket.terminate(); — оборвать сразу
```

Что важно знать:

- `data` в `message` — это `Buffer`, его нужно превратить в строку.
  `reason` в `close` — тоже `Buffer`: `reason.toString()`.
- `request` в `connection` — обычный HTTP-запрос (`http.IncomingMessage`),
  с которого началось рукопожатие: `request.headers['sec-websocket-key']`
  (имена в нижнем регистре), `request.socket.remoteAddress` и `remotePort`.
- Запросы с `Upgrade: websocket` забирает себе `ws`, и обработчик
  `http.createServer` для них **не вызывается**. Туда попадают только
  обычные HTTP-запросы — поэтому там и отвечают `426`.
- `socket.readyState` — `CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`. Отправлять
  можно только в `OPEN`: `send` до `open` выбросит
  `WebSocket is not open: readyState 0 (CONNECTING)`.
- `handshakeTimeout` ограничивает время на подключение вместе с рукопожатием.
  Если не уложились, придёт `error` с текстом `Opening handshake has timed out`
  и **без** `code`. Значит, в `describeConnectError` такая ошибка попадёт
  в ветку «любой другой» и покажется своим текстом.
- `maxPayload` ограничивает размер одного сообщения — это та же защита
  памяти, что и `maxLineLength` в `LineSplitter`.
- `WebSocketServer` по умолчанию сам ведёт список клиентов (`wss.clients`).
  По ТЗ рассылку и учёт участников нужно написать самим, поэтому в чате
  этот список выключают: `clientTracking: false`.
- IPv6-адрес в URL пишется в квадратных скобках: `ws://[::1]:5000`.

**Порядок запуска важен.** Если создать `WebSocketServer` до того, как
HTTP-сервер успешно начал слушать порт, ошибку `EADDRINUSE` перехватит
`ws` и выбросит её как необработанную — сервер упадёт с
`Unhandled 'error' event`. Сначала `listen` и `await once(httpServer, 'listening')`,
потом `WebSocketServer`.

### 2.5. Инструменты

- `curl -i http://localhost:5000/` — HTTP-запрос с заголовками ответа.
  В Windows PowerShell 5.1 пишите `curl.exe`: просто `curl` там — другая команда.
- `npx wscat -c ws://localhost:5000` — интерактивный WebSocket-клиент.
  `npx` запускает команду из npm-пакета: из `node_modules/.bin` проекта,
  а если там её нет — скачивает пакет во временный кэш, не добавляя его
  в проект. При первом запуске спросит `Ok to proceed? (y)`.
- Браузер: в нём есть свой встроенный класс `WebSocket` с похожим, но другим
  API — `ws.onmessage = (event) => event.data` вместо `socket.on('message', (data) => ...)`.

### Разминка 3

1. Почему обработчик `http.createServer` не вызывается, когда подключается
   WebSocket-клиент?
2. Клиент на `ws` подключился к обычному HTTP-серверу без WebSocket и получил
   `Unexpected server response: 200`. Что произошло во время рукопожатия?

---

## Упражнения

Решения лежат в [solution/](solution/). Пакет `ws` уже установлен
в корне этого репозитория, поэтому решения можно запускать прямо отсюда.
Упражнения 1–2 — к первому занятию, 3–6 — ко второму.

### Упражнение 1. HTTP-сервер

Напишите сервер с двумя адресами: `/` отвечает текстом (с кириллицей,
не забудьте `charset=utf-8`), `/time` — JSON `{ "ts": ... }`, остальное —
`404`. Проверьте в браузере и через `curl -i` (`curl.exe -i` в PowerShell).

### Упражнение 2. HTTP руками

Повторите пример 1.2: через `net.connect` отправьте серверу из упражнения 1
строку `GET /time HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`
и напечатайте ответ как есть. Найдите строку статуса, заголовки и тело.
Что за число стоит перед JSON? Как оно связано с длиной тела?

### Упражнение 3. `Sec-WebSocket-Accept`

С помощью `node:crypto` (2.1) вычислите `Sec-WebSocket-Accept` для ключа
`dGhlIHNhbXBsZSBub25jZQ==` из RFC 6455. Должно получиться
`s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`.

### Упражнение 4. WebSocket эхо-сервер

Сделайте эхо-сервер на `ws` поверх `http.createServer` (2.4). Обычный HTTP-запрос
получает `426 Upgrade Required`. Логируйте подключение (с
`Sec-WebSocket-Key` из `request.headers`), сообщения и закрытие с кодом
и причиной. Подключитесь тремя способами:

- `npx wscat -c ws://localhost:5000` — набирайте строки, сервер отвечает эхом;
- из браузера: откройте `http://localhost:5000/` (увидите страницу `426` —
  так и задумано), нажмите F12, вкладка Console, и выполните:

  ```js
  const ws = new WebSocket('ws://localhost:5000');
  ws.onmessage = (event) => console.log(event.data);
  ws.onopen = () => ws.send('hi from browser');
  ```

- рукопожатие вручную через curl. Ответ — `101 Switching Protocols`
  с тем самым `Sec-WebSocket-Accept` из упражнения 3 (выход — Ctrl+C):

  ```bash
  curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" http://localhost:5000/
  ```

Обычный `curl -i http://localhost:5000/` без этих заголовков получит `426`.

### Упражнение 5. Границы сообщений

Повторите пример 2.2: клиент сразу после `open` делает три `send` подряд,
печатает три ответа и закрывается с кодом `1000` и причиной `bye`.
Сравните с упражнением 2 из лабораторной 11: сколько событий `message`
пришло на сервер? Что сервер напечатал про код закрытия? Закройте `wscat`
через Ctrl+C. Какой код увидел сервер теперь?

### Упражнение 6 (бонус). Рассылка на WebSocket

Переделайте сервер рассылки из лабораторной 10 на `ws`: свой `Set` сокетов,
`clientTracking: false`. Решение — [solution/ws-broadcast-server.js](solution/ws-broadcast-server.js).

## Типичные ошибки

| что видите                                              | почему                                                   | что делать                                                |
| ------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `listen EADDRINUSE ... Unhandled 'error' event` от `ws` | `WebSocketServer` создан до успешного `listen`           | сначала `await once(httpServer, 'listening')`, потом `ws` |
| в браузере страница `426 Upgrade Required`              | это обычный HTTP-запрос, а не WebSocket — так и задумано | подключаться через `new WebSocket(...)` или `wscat`       |
| кириллица в браузере превратилась в кракозябры          | в `Content-Type` нет `charset=utf-8`                     | `'text/plain; charset=utf-8'`                             |
| в логе `<Buffer 68 69>` вместо текста                   | `data` и `reason` — это `Buffer`                         | `data.toString()`, `reason.toString()`                    |
| `request.headers['Sec-WebSocket-Key']` — `undefined`    | имена заголовков в нижнем регистре                       | `request.headers['sec-websocket-key']`                    |
| `WebSocket is not open: readyState 0 (CONNECTING)`      | `send` до события `open`                                 | `await once(socket, 'open')`, потом `send`                |
| `Unexpected server response: 200`                       | клиент подключился к серверу без WebSocket               | проверить адрес, порт и что сервер — WebSocket            |
| `Opening handshake has timed out`                       | сервер не ответил на рукопожатие за `handshakeTimeout`   | проверить адрес; сервер запущен и отвечает?               |
| `Cannot connect ...` с пустой причиной                  | `AggregateError` с пустым `message` (лабораторная 10)    | `error.code ?? error.errors?.[0]?.code`                   |
| в PowerShell `curl -i ...` ругается на параметры        | `curl` там — это `Invoke-WebRequest`                     | `curl.exe -i ...`                                         |
| сервер видит код 1006 при каждом выходе клиента         | клиент выходит без `close()` (обрывает процесс)          | клиенту — `socket.close(1000)` перед выходом              |

## Шаг проекта

Отдельного шага нет: транспорт на `ws` вы соберёте в лабораторной 13. Но
ответы на вопросы 1 и 2 из раздела 9 ТЗ уже можно написать в README проекта:
как устанавливается WebSocket-соединение и что WebSocket добавляет к TCP.

## Контрольные вопросы

1. Чем HTTP отличается от WebSocket по схеме общения?
2. Какой HTTP-запрос открывает WebSocket-соединение и что отвечает сервер?
3. Зачем нужен `Sec-WebSocket-Accept`?
4. Что WebSocket добавляет к TCP?
5. Почему WebSocket-серверу не нужен `LineSplitter`?
6. Что значат коды закрытия 1000 и 1006?
7. Зачем `maxPayload`?
8. Почему `WebSocketServer` создают только после успешного `listen` HTTP-сервера?

Ответы — в [answers.md](answers.md).

## Где это в эталонном проекте

- [transport/ws.js](../../transport/ws.js): HTTP-сервер с ответом 426,
  `WebSocketServer` с `clientTracking: false` и `maxPayload`, создание после
  `listen`, клиент с `handshakeTimeout`.
- Ответы на вопросы 1 и 2 в [README](../../README.md#1-как-устанавливается-websocket-соединение).
- `git show step-1:server.js` и `git show step-2:server.js` — эхо и рассылка на `ws`.
