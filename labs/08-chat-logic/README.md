# Лабораторная 8. Логика чата без сети: классы, Map, внедрение зависимостей

**Цель:** написать сердце сервера, логику чата, и проверить её тестами
до того, как появится настоящая сеть. По пути разобраться с классами
и закрытыми полями, коллекциями `Map` и `Set` и с тем, почему зависимости
лучше передавать снаружи.

**Понадобится:** `protocol.js` (лабораторная 6), `test/fake-connection.js`
(лабораторная 5), тесты (лабораторная 7).

**Примерное время:** 4–5 часов.

## Теория

### Классы и закрытые поля

```js
export class ChatServer {
  #clients = new Map(); // закрытое поле: снаружи его не видно и не изменить
  #logger;

  constructor({ logger = console } = {}) {
    this.#logger = logger;
  }

  handleConnection(connection) {
    /* публичный метод */
  }

  #broadcast(message) {
    /* закрытый метод: деталь реализации */
  }
}
```

Поля и методы с `#` доступны только внутри класса. Снаружи остаются
видны только публичные методы. Это и есть интерфейс класса: его можно
менять внутри, не ломая тех, кто им пользуется. Закрытые поля проверяет
сам язык. Подчёркивание (`_clients`) — лишь соглашение, его можно нарушить.

### `Map` и `Set`

У обычного объекта ключи — строки. Объект в роли ключа превратится
в строку `'[object Object]'`, и все такие ключи совпадут. У `Map` ключом
может быть что угодно, в том числе объект соединения:

```js
const clients = new Map();
clients.set(connection, { nick: null }); // состояние этого клиента
clients.get(connection).nick = 'ann';
clients.delete(connection);
clients.size;
for (const [connection, client] of clients) {
  /* в порядке добавления */
}
```

`Map` помнит порядок добавления, поэтому список участников сам собой
получается в порядке входа. `Set` — множество уникальных значений
с методами `add`, `has` и `delete`.

### Внедрение зависимостей

Если класс сам создаёт всё, что ему нужно (`console`, `Date.now`,
сетевой сервер), его трудно проверить: тест засыпает консоль логами,
время всё время разное, нужен свободный порт. Если же зависимости
**передать снаружи**, тест подставит свои:

```js
const chat = new ChatServer({ logger: silentLogger }); // логи в тестах не нужны
const room = new Room({ now: () => 1000 }); // время под контролем теста
chat.handleConnection(fakeConnection); // соединение в памяти вместо сокета
```

Это называется внедрением зависимостей (dependency injection). Никакой
библиотеки не нужно: достаточно параметров конструктора.

### Как устроена логика сервера чата

- **Состояние** — `Map` «соединение → `{ nick }`». В неё попадают все
  подключившиеся, а `nick` остаётся `null`, пока не пришёл `join`.
- **Источник правды — сервер.** Поля `from` и `ts` в сообщении чата
  ставит сервер, а не клиент: иначе любой мог бы писать от чужого имени.
- **Рассылка** — цикл по своей `Map`. Сообщение кодируется один раз,
  а не для каждого получателя. Тот, кто ещё не прислал `join`,
  ничего не получает.
- **Один путь выхода.** И `leave`, и обрыв связи заканчиваются событием
  `close` соединения. Удаление участника и «X left the chat» живут
  в одном обработчике `close`, а `leave` просто закрывает соединение.
- **Граница ошибок** (лабораторная 3) — `try/catch` вокруг обработки
  каждого сообщения.

## Упражнения

Решения лежат в [solution/](solution/).

### Упражнение 1. `Map` против объекта

Создайте два объекта `ann` и `bob` и запишите для каждого состояние
сначала в обычный объект (`state[ann] = ...`), а потом в `Map`. Выведите
ключи объекта. Почему состояние `ann` пропало? Проверьте, что `Map`
помнит порядок добавления, и уберите повторы из списка с помощью `Set`.

### Упражнение 2. Класс `Room`

Напишите класс `Room` с закрытым полем `#members` (`Map` «ник → данные»):

- `join(nick)` — добавляет участника. Если ник занят, выбрасывает `RoomError`
  с кодом `NICK_TAKEN`;
- `leave(nick)` — убирает участника и возвращает `true`, если тот был;
- `list()` — ники в порядке входа.

Напишите для него тесты. Убедитесь, что `room.members` и `Object.keys(room)`
ничего не показывают.

### Упражнение 3. Подменяемое время

Добавьте в конструктор `Room` параметр `now` (по умолчанию `Date.now`)
и сохраняйте время входа каждого участника. Напишите тест, который
подставляет свои часы и проверяет `joinedAt(nick)`.

## Шаг проекта

Напишите `lib/chat-server.js` — логику сервера по разделу 6.1 ТЗ. Задача
большая, поэтому она разбита на подготовку и пять ступеней. Для каждой
ступени есть готовые тесты в папке [tests/](tests/): скопируйте файл в свой
`chat/test/`, запустите `npm test`, добейтесь, чтобы он прошёл, и только
потом переходите к следующей ступени. Тесты предыдущих ступеней должны
продолжать проходить.

### Подготовка: `TestClient` и общие файлы

Скопируйте в `chat/test/` файл [tests/setup.js](tests/setup.js). Он создаёт
сервер с «тихим» логгером и функцию `connect()`, которая подключает нового
клиента через соединение в памяти из лабораторной 5. Он ожидает, что
в `chat/test/` лежат `fake-connection.js` (лабораторная 5) и `helpers.js`
с классом `TestClient`. Его вы напишете сами.

`TestClient` — «программный пользователь» для тестов. Он оборачивает
клиентский конец соединения:

| член класса               | что делает                                                           |
| ------------------------- | -------------------------------------------------------------------- |
| `constructor(connection)` | создаёт очередь входящих сообщений и промис `closed`                 |
| `send(message)`           | отправляет объект: `connection.send(encode(message))`                |
| `sendRaw(text)`           | отправляет строку как есть — чтобы проверить реакцию на мусор        |
| `next()`                  | промис следующего полученного сообщения, уже разобранного `decode`   |
| `join(nick)`              | отправляет `join` и возвращает ответ сервера (`welcome` или `error`) |
| `closed`                  | промис, который выполнится, когда соединение закроется               |
| `close()`                 | закрывает соединение и возвращает `closed`                           |

Подсказки:

- очередь — это асинхронный итератор из лабораторной 5:
  `this.#messages = on(connection, 'message', { close: ['close'] })`;
- `next()` вызывает `await this.#messages.next()`. Если `done` — соединение
  закрылось, и нужно выбросить ошибку `'Connection closed before a message arrived'`.
  Иначе `value[0]` — текст сообщения, его нужно разобрать `decode`;
- и очередь, и `closed = once(connection, 'close')` создавайте **в конструкторе**:
  событие, которое случилось раньше подписки, уже не поймать.

Готовый вариант — в эталонном [test/helpers.js](../../test/helpers.js),
но сначала попробуйте сами.

### Каркас класса

```js
import {
  ErrorCode,
  NICK_RULES,
  ServerMessage,
  decode,
  encode,
  isValidNick,
  validateText,
} from '../protocol.js';

const CLIENT_MESSAGE_TYPES = ['join', 'msg', 'list', 'leave'];

export class ChatServer {
  #clients = new Map(); // соединение → { nick }; nick === null до join
  #logger;

  constructor({ logger = console } = {}) {
    // = {} — чтобы работал и вызов new ChatServer() без аргументов
    this.#logger = logger;
  }

  handleConnection(connection) {} // подписаться на 'message' и 'close'
  #handleMessage(connection, text) {} // разбор, проверки и switch по type
  #handleJoin(connection, client, message) {}
  #handleChatMessage(connection, client, message) {}
  #handleDisconnect(connection) {}
  #getNicks() {} // ники вошедших, в порядке входа
  #broadcast(message, { except } = {}) {} // всем вошедшим, кроме except
  #send(connection, message) {} // connection.send(encode(message))
  #sendError(connection, code, text) {} // warn в лог + ServerMessage.error
}
```

Логгер — любой объект с методами `info`, `warn` и `error`. Вызывайте только
их, а не `logger.log`: тесты подставляют объект ровно с этими тремя методами.

### Ступень 1. Разбор и ошибки до входа

Тест: [chat-server-1-errors.test.js](tests/chat-server-1-errors.test.js).

`handleConnection` кладёт соединение в `#clients` с `{ nick: null }` и
подписывается на `message`. Проверки в `#handleMessage` идут **строго в таком
порядке** (его же ждут тесты эталона в лабораторных 13 и 15):

1. `decode(text)` выбросил `ProtocolError` — ответить `error` с его `code`
   и `message` (это `BAD_MESSAGE`);
2. `type` не из `CLIENT_MESSAGE_TYPES` — `UNKNOWN_TYPE`;
3. клиент ещё не вошёл, а `type` не `join` — `NOT_JOINED`;
4. дальше — `switch (message.type)` с обработчиком для каждого типа.

### Ступень 2. Регистрация

Тест: [chat-server-2-join.test.js](tests/chat-server-2-join.test.js).

`#handleJoin`:

- уже вошёл — `ALREADY_JOINED`, соединение остаётся открытым;
- `!isValidNick(nick)` — `INVALID_NICK`, затем `connection.close()`;
- ник среди `#getNicks()` — `NICK_TAKEN`, затем `connection.close()`;
- иначе: `client.nick = nick`, `info` в лог, новичку — `welcome` со списком
  ников, остальным — `system` «nick joined the chat» (`#broadcast` с `except: connection`).

`#broadcast` проходит по `#clients` и отправляет только тем, у кого `nick !== null`.
Сообщение кодируется один раз до цикла.

### Ступень 3. Сообщения и список

Тест: [chat-server-3-messages.test.js](tests/chat-server-3-messages.test.js).

- `msg`: `validateText(text)` вернул проблему — `INVALID_TEXT` с этим текстом.
  Иначе — `#broadcast(ServerMessage.msg(client.nick, text))` всем, включая
  отправителя. `from` и `ts` из входящего сообщения не используются;
- `list`: `ServerMessage.users(this.#getNicks())` только этому клиенту.

### Ступень 4. Выход и обрыв

Тест: [chat-server-4-leave.test.js](tests/chat-server-4-leave.test.js).

- `leave`: просто `connection.close()`;
- `handleConnection` подписывается и на `close`. `#handleDisconnect` удаляет
  клиента из `#clients`, пишет `info` в лог и, если клиент успел войти,
  рассылает остальным `system` «nick left the chat».

### Ступень 5. Граница ошибок и логи

Тест: [chat-server-5-boundary.test.js](tests/chat-server-5-boundary.test.js).

- в обработчике `message` оберните вызов `#handleMessage` в `try/catch`
  (лабораторная 5). В `catch` — `logger.error` со стеком (`error.stack`)
  и ответ `INTERNAL_ERROR` с текстом `'Internal server error'`;
- логи: `info` при подключении (с `connection.remoteAddress`), при входе
  (с ником) и при отключении; `warn` в `#sendError` для каждой ошибки,
  отправленной клиенту (с кодом).

Когда все пять тестов проходят, логика сервера готова. Эталон —
[lib/chat-server.js](../../lib/chat-server.js): сравните со своим вариантом.

## Контрольные вопросы

1. Чем закрытое поле `#clients` лучше, чем `this._clients`?
2. Почему клиентов хранят в `Map`, а не в объекте или массиве?
3. Зачем хранить в `Map` клиента, который ещё не прислал `join`?
4. Почему `from` и `ts` ставит сервер?
5. Почему `leave` только закрывает соединение, а «left the chat» рассылает обработчик `close`?
6. Что даёт передача `logger` в конструктор? Что ещё в этом классе
   передаётся снаружи?
7. Почему этот класс можно протестировать без сети?

## Где это в эталонном проекте

- [lib/chat-server.js](../../lib/chat-server.js) — эталонная реализация.
- [test/helpers.js](../../test/helpers.js) — `TestClient`.
- [tests/](tests/) — приёмочные тесты ступеней 1–5 из этой лабораторной.
- `git show step-5:lib/chat-server.js` — регистрация и рассылка,
  `git diff step-4 step-5 -- lib/chat-server.js` — что добавилось.
