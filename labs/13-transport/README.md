# Лабораторная 13. Транспорт как абстракция

**Цель:** спрятать сетевую библиотеку за простым интерфейсом так, чтобы
логика чата не знала, WebSocket под ней или TCP. Освоить идеи контракта,
адаптера и единого набора тестов для всех реализаций. Подключить
`ChatServer` из лабораторной 8 к настоящей сети.

**Понадобится:** лабораторные 5, 8, 10, 11 и 12. Работа идёт прямо в проекте
`chat/`, кроме разминки в упражнении 1.

**Примерное время:** 6 часов, два занятия и шаг проекта.

**Как работать:** каждый пример запускайте у себя и сверяйте вывод.
В разминках сначала запишите **свой** ответ, потом проверьте и только
потом смотрите [answers.md](answers.md).

---

## Занятие 1. Контракт и адаптер

### 1.1. Зачем

ТЗ требует: работа с `ws` изолирована в папке `transport/`, а в доп. задании
11.1 транспорт меняется на `net` — и вне `transport/` правок быть не должно.
Если `ws` используется по всему коду, такая замена превращается
в переписывание всего проекта. Если же `ws` спрятан в одной папке, а остальной
код работает с **собственным** простым интерфейсом, меняется только эта папка.
Заодно логику можно тестировать без сети — так, как вы делали в лабораторной 8.

**Аналогия: переходник для зарядки.** Ваш телефон рассчитан на один вид
разъёма. В разных странах разные розетки, но телефону всё равно: между ним
и розеткой стоит переходник, который приводит любую розетку к нужному разъёму.

- Телефон — логика чата (`ChatServer`, `ChatClient`).
- Нужный разъём — **контракт**: какие методы и события есть у соединения.
- Розетки разных стран — библиотеки `ws` и `net`.
- Переходник — **адаптер**: `WsConnection` и `TcpConnection`.

```
          ChatServer, ChatClient        знают только: send, close, 'message', 'close'
                    ▲
        ┌───────────┴───────────┐
        │ Connection (контракт) │
        └───────────┬───────────┘
            ▲                ▲
      WsConnection     TcpConnection     адаптеры: transport/ws.js, transport/tcp.js
            ▲                ▲
      WebSocket (ws)    net.Socket        библиотеки
```

### 1.2. Контракт

Контракт — это описание интерфейса: какие функции есть, что они принимают
и возвращают, какие события испускают. В JavaScript нет интерфейсов,
как в Java или TypeScript, поэтому контракт описывают комментарием
и проверяют тестами. Контракт транспорта в эталонном проекте:

```
listen({ port, onConnection }) → Promise<{ port, close() → Promise<void> }>
  close() перестаёт принимать новые подключения; промис выполнится,
  когда закроется последнее уже открытое соединение
connect({ host, port })        → Promise<Connection>

Connection (EventEmitter):
  remoteAddress      — адрес собеседника, для логов
  send(text)         — отправить одно сообщение
  close()            — штатно закрыть
  'message' (text)   — пришло одно целое сообщение
  'close' (error?)   — соединение закрыто; error есть, если транспорт узнал причину
```

Это ровно тот интерфейс, который вы уже реализовали «в памяти»
в лабораторной 5 (`FakeConnection`). Теперь у него появятся настоящие
реализации.

Обратите внимание, чего в контракте **нет**: событий `error`, `Buffer`,
кодов закрытия WebSocket, `end`/`destroy`. Всё это детали конкретной
библиотеки, и наружу они не выходят.

Про `close(error?)` важно не ошибиться: ошибка передаётся, только если
транспорт **знает** причину. Отсутствие ошибки не значит, что закрытие
было штатным. Например, если клиент на WebSocket просто закрыл терминал,
`ws` сообщит о закрытии кодом 1006 без всякой ошибки, а TCP в Windows
обычно даст `ECONNRESET`, в Linux — просто FIN без ошибки. Поэтому логика
чата обрабатывает любое `close` одинаково: «участник ушёл».

Путь события, когда клиент закрыл терминал без `leave`:

```
ОС клиента закрывает сокет (FIN или RST)
  → у сервера: ws — 'close' с кодом 1006 / net — 'end' или 'error' ECONNRESET, затем 'close'
  → адаптер транспорта: 'close' (error или ничего)
  → ChatServer.#handleDisconnect: удалить из Map, разослать «X left the chat»
```

### 1.3. Адаптер: что он переводит

Сокеты `net` и `ws` и наш контракт говорят на разных языках. Адаптер
переводит одно в другое:

| `net.Socket`                          | `WebSocket` (`ws`)                        | `Connection` (контракт)     |
| ------------------------------------- | ----------------------------------------- | --------------------------- |
| `'data'` — `Buffer`, **кусок** потока | `'message'` — `Buffer`, целое сообщение   | `'message'` — строка, целое |
| `'error'`, затем `'close'`            | `'error'`, затем `'close'` (code, reason) | `'close'` (error?)          |
| `write(text + '\n')`                  | `send(text)`                              | `send(text)`                |
| `end()`, потом `destroy()`            | `close(1000)`, потом `terminate()`        | `close()`                   |

**Разобранный пример: почему адаптер не может быть «тонким».** Самый
простой TCP-адаптер просто пересказывает каждое событие `data` как `message`:

```js
class NaiveConnection extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.remoteAddress = 'naive';
    socket.on('data', (chunk) => this.emit('message', chunk.toString()));
    socket.on('close', () => this.emit('close'));
  }
  send(text) {
    this.socket.write(`${text}\n`);
  }
  close() {
    this.socket.end();
  }
}
```

Подключим к нему настоящий `ChatServer` и отправим `join` и `msg` одним `write`.
Сервер ответит:

```
{"type":"error","code":"BAD_MESSAGE","message":"Message is not valid JSON"}
```

Два сообщения склеились в один кусок (лабораторная 11), и `ChatServer`
получил не JSON. Кроме того, у этого адаптера нет обработчика `error`:
первый же оборванный клиент уронит сервер (лабораторная 10). Правильный
адаптер решает обе проблемы, и логика чата о них даже не узнаёт:

```js
class TcpConnection extends EventEmitter {
  #socket;

  constructor(socket, remoteAddress) {
    super();
    this.#socket = socket;
    this.remoteAddress = remoteAddress;

    const splitter = new LineSplitter(); // лабораторная 11
    let lastError = null;
    socket.on('data', (chunk) => {
      let lines;
      try {
        lines = splitter.push(chunk);
      } catch (error) {
        // Строка без '\n' длиннее предела. Исключение в обработчике 'data'
        // уронило бы весь сервер (лабораторная 5), поэтому рвём только это соединение.
        socket.destroy(error);
        return;
      }
      for (const line of lines) this.emit('message', line);
    });
    socket.on('error', (error) => {
      lastError = error; // не выпускаем 'error' наружу...
    });
    socket.on('close', () => this.emit('close', lastError)); // ...а отдаём его в 'close'
  }

  send(text) {
    if (this.#socket.writable) this.#socket.write(`${text}\n`);
  }

  close() {
    this.#socket.end();
    setTimeout(() => this.#socket.destroy(), 2000).unref(); // если собеседник не ответил
  }
}
```

Почему `error` превращается в аргумент `close`. Событие `close` у сокета
приходит **всегда**, и после штатного закрытия, и после ошибки. Если
наружу выпускать и `error`, и `close`, каждый пользователь транспорта
обязан подписаться на `error`, иначе процесс упадёт (лабораторная 5).
Одно событие `close(error?)` проще и безопаснее.

### 1.4. Тесты контракта

Если обе реализации выполняют один контракт, их проверяют **одним
и тем же** набором тестов в цикле:

```js
for (const name of TRANSPORT_NAMES) {
  describe(`${name} transport`, () => {
    /* одни и те же тесты */
  });
}
```

Если тест проходит на `ws` и падает на `tcp`, значит, одна из реализаций
нарушает контракт. Так устроены и тесты чата эталона:

```
▶ chat over ws
✔ chat over ws (30.1282ms)
▶ chat over tcp
✔ chat over tcp (10.0087ms)
ℹ tests 18
ℹ pass 18
```

### Разминка 1

1. Почему в контракте `message` приносит строку, а не `Buffer`?
2. Тест «три `send` подряд приходят тремя сообщениями» проходит на `ws`,
   а на `tcp` получает одно сообщение `'a\nb\nc'`. Что не так в TCP-адаптере?

---

## Занятие 2. Сборка: реестр транспортов и точка входа

### 2.1. Где выбирают реализацию

```js
// transport/index.js
import * as tcp from './tcp.js';
import * as ws from './ws.js';

const transports = { ws, tcp };
export const TRANSPORT_NAMES = Object.keys(transports); // ['ws', 'tcp']
export function getTransport(name) {
  /* ... */
}
```

`import * as tcp from './tcp.js'` собирает **все** экспорты модуля в один
объект: `tcp.listen`, `tcp.connect`. Так у обоих транспортов получается
одинаковая форма — объект с `listen` и `connect`, — и их можно сложить
в один объект `{ ws, tcp }` и выбирать по имени: `transports['tcp']`.

Реализацию выбирает точка входа (`server.js`, `client.js`). Это
**корень композиции**: единственное место, где части приложения
связываются друг с другом. `ChatServer` получает готовые соединения
и не знает, откуда они взялись.

```
server.js ──► lib/chat-server.js ──► protocol.js
    │
    └──► transport/index.js ──► ws.js (ws) / tcp.js (net)
```

Стрелка — «импортирует». Логика чата не импортирует транспорт: соединения
ей передают снаружи (`chat.handleConnection(connection)`).

### 2.2. Разобранный пример: замена транспорта затронула только `transport/`

Так выглядел переход эталона с WebSocket на TCP — коммит `step-9`:

```
$ git diff --stat step-8 step-9
 test/line-splitter.test.js | 39 +++++++++++++++++++++
 test/tcp-framing.test.js   | 28 +++++++++++++++
 transport/index.js         |  2 +-
 transport/line-splitter.js | 45 ++++++++++++++++++++++++
 transport/tcp.js           | 87 ++++++++++++++++++++++++++++++++++++++++++++++
 5 files changed, 200 insertions(+), 1 deletion(-)
```

Новые файлы в `transport/`, одна изменённая строка в `transport/index.js`
и новые тесты. `ChatServer`, `ChatClient`, протокол и точки входа не тронуты,
а старые тесты чата прошли на TCP без правок. Это и есть проверка, что
слои разделены правильно.

**Сколько файлов трогать, чтобы добавить третий транспорт.** Новый файл
в `transport/` и две строки в `transport/index.js`: `import` и ключ
в объекте `transports`. Больше ничего: usage
в точках входа собирается из `TRANSPORT_NAMES` (`TRANSPORT_NAMES.join('|')` → `ws|tcp`),
а тесты контракта и тесты чата перебирают `TRANSPORT_NAMES` сами.

**Как проверить, что логика не зависит от библиотеки.** `ws` и `net`
должны встречаться только в `transport/` и в тестах самого транспорта:

```
$ git grep --untracked -n -E "from '(ws|net|node:net)'"
test/tcp-framing.test.js:5:import net from 'node:net';
transport/tcp.js:7:import net from 'node:net';
transport/ws.js:7:import { WebSocket, WebSocketServer } from 'ws';
```

`--untracked` нужен, чтобы искать и в файлах, которые вы ещё не добавили в git.
Если в списке появился `lib/` или `protocol.js` — слои перемешались.

### Разминка 2

1. Коллега добавил в `lib/chat-server.js` строку `import { WebSocket } from 'ws'`,
   чтобы проверять `socket.readyState`. Чем это плохо и как сделать правильно?
2. Почему транспорт выбирают в `server.js`, а не внутри `ChatServer`?

---

## Упражнения

Решения упражнений 1 и 5 лежат в [solution/](solution/). Решения упражнений 2–4 —
это файлы эталона [transport/tcp.js](../../transport/tcp.js),
[transport/ws.js](../../transport/ws.js) и [transport/index.js](../../transport/index.js).
Упражнения 1–3 — к первому занятию, 4–5 — ко второму.

### Упражнение 1. Разминка: контракт хранилища

Опишите контракт `get(key) → Promise<string | undefined>`,
`set(key, value) → Promise<void>` и сделайте две реализации:
в памяти (`Map`) и в JSON-файле. Напишите **один** набор тестов и
прогоните его в цикле по обеим реализациям.

Для файловой версии понадобится:

```js
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

await writeFile(path, JSON.stringify(data)); // записать файл целиком
const folder = await mkdtemp(join(tmpdir(), 'store-')); // новая временная папка
await rm(folder, { recursive: true, force: true }); // удалить папку со всем содержимым
```

`join` собирает путь с правильными разделителями для вашей ОС, `tmpdir()` —
системная папка для временных файлов. Каждому тесту давайте **свой**
файл: если тесты пишут в один и тот же файл, второй запуск увидит данные
первого, и тест «ключа ещё нет» упадёт. Временную папку удаляйте в хуке
`after`. Если файла ещё нет, `readFile` выбросит ошибку с кодом `ENOENT` —
для хранилища это значит «пусто».

### Упражнение 2. TCP-транспорт

Создайте `transport/tcp.js` с функциями `listen` и `connect` и классом
`TcpConnection` по контракту выше:

- `listen` слушает все интерфейсы и ждёт `listening` через `once`.
  Промис отклоняется при `EADDRINUSE`. Возвращает `{ port, close }`,
  где `port` берётся из `server.address()` (важно для порта 0);
- `connect` ставит таймаут подключения 5 секунд и превращает его
  в ошибку `ETIMEDOUT`. После подключения таймаут сбрасывается
  (`setTimeout(0)`);
- `TcpConnection` — как в примере из теории: режет поток `LineSplitter`-ом
  и при слишком длинной строке уничтожает соединение с этой ошибкой;
- `close()` сервера — `new Promise((resolve) => server.close(() => resolve()))`;
- `remoteAddress` соединения: на сервере — `ip:port` собеседника
  (`${socket.remoteAddress}:${socket.remotePort}`), а у соединения, которое
  вернул `connect`, — `tcp://host:port`. Клиент чата напечатает его
  в строке `Connected to ...` (лабораторная 15).

**Проверка:** временный скрипт поднимает `listen({ port: 0, onConnection })`,
где `onConnection` отвечает эхом на каждое сообщение, подключается через
`connect` и печатает ответ. Ответ должен прийти на `send('Привет 😀')`.

### Упражнение 3. WebSocket-транспорт

Создайте `transport/ws.js` с тем же контрактом:

- HTTP-сервер отвечает `426` на обычные запросы. `WebSocketServer`
  создаётся после успешного `listen`, с `clientTracking: false`
  и `maxPayload`;
- `connect` собирает URL `ws://host:port` (IPv6 — в скобках),
  с `handshakeTimeout`. Этот URL и есть `remoteAddress` соединения
  у клиента, а на сервере — `ip:port` из `request.socket`;
- `WsConnection.send` отправляет, только если сокет в состоянии `OPEN`;
- `close()` соединения закрывает с кодом `1000` и через 2 секунды страхуется
  `terminate()` с `unref()`;
- `close()` сервера вызывает **и** `wss.close()`, **и** `httpServer.close(callback)`.
  `wss.close()` не закрывает HTTP-сервер, который ему передали снаружи:
  без второго вызова порт останется занятым, а промис не выполнится никогда.
  Промис выполняется в колбэке `httpServer.close`.

Проверка — та же, что в упражнении 2.

### Упражнение 4. Выбор транспорта

Создайте `transport/index.js`: комментарий с контрактом, объект
`{ ws, tcp }`, `TRANSPORT_NAMES`, `DEFAULT_TRANSPORT = 'ws'` и
`getTransport(name)`. Для неизвестного имени он выбрасывает ошибку.

### Упражнение 5. Тесты контракта

Напишите тесты, которые в цикле по `TRANSPORT_NAMES` проверяют:

- сообщение с кириллицей и эмодзи доходит в обе стороны;
- три `send` подряд приходят тремя сообщениями в том же порядке
  (для TCP это проверка `LineSplitter`);
- `close()` на одной стороне вызывает `close` на другой;
- `connect` к порту, где никто не слушает, отклоняется с `ECONNREFUSED`;
- `listen` на занятом порту отклоняется с `EADDRINUSE`.

Подсказки:

- подключайтесь к `127.0.0.1`, а не к `localhost`: тогда ошибка будет одна,
  с `code`, а не `AggregateError` (лабораторная 10);
- порт, где точно никто не слушает: запустите `listen({ port: 0 })`, запомните
  `port`, закройте сервер — и подключайтесь к этому порту;
- занятый порт: запустите сервер на порту 0 и попробуйте второй `listen`
  на его `port`.

## Типичные ошибки

| что видите                                                   | почему                                                              | что делать                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| на TCP сервер отвечает `BAD_MESSAGE` на правильные сообщения | адаптер пересказывает сырые куски `data`, без `LineSplitter`        | резать поток в адаптере (1.3)                                |
| сервер падает, когда клиент обрывает связь                   | у сокета в адаптере нет обработчика `error`                         | `socket.on('error', ...)`, ошибку — в `close`                |
| в чате `<Buffer ...>` вместо текста                          | WebSocket-адаптер отдаёт `data` как есть                            | `data.toString()` перед `emit('message', ...)`               |
| тест на `ws` проходит, на `tcp` падает (или наоборот)        | реализация нарушает контракт                                        | сравнить поведение адаптеров с таблицей 1.3                  |
| `server.close()` в тестах не выполняется, прогон висит       | `ws`: закрыт только `wss`, а не HTTP-сервер; или открыты соединения | `wss.close()` **и** `httpServer.close()`; закрыть соединения |
| `port` при `listen({ port: 0 })` равен 0                     | вернули аргумент, а не фактический порт                             | `server.address().port`                                      |
| `connect` висит долго, потом `ETIMEDOUT` от ОС               | не поставлен свой таймаут подключения                               | таймаут из лабораторной 10, `handshakeTimeout` для `ws`      |
| `WebSocket is not open` при отправке                         | `send` после закрытия или до открытия                               | проверять `readyState === WebSocket.OPEN` в адаптере         |
| `git grep` нашёл `ws` или `net` в `lib/`                     | логика чата знает о библиотеке                                      | перенести работу с библиотекой в адаптер                     |
| `Unknown transport "tpc"`                                    | опечатка в имени при запуске                                        | список имён — в usage из `TRANSPORT_NAMES`                   |

## Шаг проекта

1. Положите в проект транспорт из упражнений 2–4 (`transport/`) и тесты
   контракта из упражнения 5 (`test/transport.test.js`).

2. **Логгер.** В `server.js` заведите функцию `createLogger()`. Она возвращает
   объект с методами `info`, `warn` и `error` (тот самый интерфейс из
   лабораторной 8), и каждая строка начинается с времени:

   ```js
   function createLogger() {
     const line = (level, text) => `${new Date().toISOString()} ${level.padEnd(5)} ${text}`;
     return {
       info: (text) => console.log(line('INFO', text)),
       warn: (text) => console.warn(line('WARN', text)),
       error: (text) => console.error(line('ERROR', text)),
     };
   }
   ```

3. **Флаг `--transport`.** Добавьте в разбор аргументов `server.js` опцию
   `transport: { type: 'string', default: DEFAULT_TRANSPORT }`. Если значения
   нет в `TRANSPORT_NAMES`, бросайте `new UsageError('Unknown transport "<имя>"')`.
   Функция разбора возвращает его под понятным именем:
   `return { port, transportName: values.transport }`. В usage допишите
   `` `[--transport ${TRANSPORT_NAMES.join('|')}]` `` — список собирается сам,
   и при новом транспорте точку входа менять не придётся.

4. **Соедините части** в `main()` сервера. Сделайте `main` асинхронной:
   `async function main()` — внутри будет `await`. Вызов `main();` в конце
   файла оставьте как есть.

   ```js
   // внутри async function main(), после разбора аргументов:
   const logger = createLogger();
   const chat = new ChatServer({ logger });
   const transport = getTransport(options.transportName);

   let server;
   try {
     server = await transport.listen({
       port: options.port,
       onConnection: (connection) => chat.handleConnection(connection),
     });
   } catch (error) {
     console.error(`Error: ${describeListenError(error, options.port)}`);
     process.exitCode = 1;
     return;
   }
   logger.info(`Server listening on port ${server.port} (transport: ${options.transportName})`);
   ```

   `describeListenError` импортируйте из `lib/errors.js` (лабораторная 3),
   `getTransport`, `TRANSPORT_NAMES` и `DEFAULT_TRANSPORT` — из `transport/index.js`.
   Строку `Would listen on port N` из лабораторной 2 уберите.

5. **Проверка вручную.** Запустите `node server.js --port 5000` и пройдите
   через `npx wscat -c ws://localhost:5000` случаи из критериев приёмки ТЗ
   про мусорные сообщения (не JSON, JSON без `type`, `msg` до `join`).
   Затем запустите `node server.js --port 5000 --transport tcp` и проверьте
   склейку из доп. задания 11.1 с помощью `nc.js` из лабораторной 10
   (запускайте свой `nc.js` по его пути, например `node ../sandbox-10/nc.js`):

   ```bash
   printf '{"type":"join","nick":"nc"}\n{"type":"msg","text":"hi"}\n' | node nc.js localhost 5000
   ```

   Ожидаемо: `welcome`, а затем `msg` от `nc` — оба сообщения обработаны.

6. **Проверка архитектуры.** Скопируйте из эталонного проекта
   [test/chat.test.js](../../test/chat.test.js) в свой `test/` и запустите
   `npm test`. Он использует `startChatServer` и `TestClient` из
   `test/helpers.js`. Если ваш `helpers.js` из лабораторной 8 отличается,
   **не заменяйте** его целиком: допишите в него `startChatServer`
   из эталонного [test/helpers.js](../../test/helpers.js) вместе с тем, что
   ей нужно, — в начале файла `import { ChatServer } from '../lib/chat-server.js';`
   и `const silentLogger = { info() {}, warn() {}, error() {} };`. Проверьте,
   что у `TestClient` те же методы. Если файлы и контракт совпадают с эталонными,
   тесты пройдут на обоих транспортах без правок.

   Исключение — тест выключения сервера (по одному на транспорт):
   `ChatServer.shutdown()` вы напишете в лабораторной 14. `stop()` в `helpers.js`
   уже вызывает его, поэтому пока добавьте в `ChatServer` временную версию,
   которая просто закрывает все соединения:

   ```js
   // метод класса ChatServer
   shutdown() {
     for (const connection of this.#clients.keys()) connection.close();
   }
   ```

   С ней упадут ровно два теста — `warns everyone ... on shutdown (ws)`
   и `(tcp)`. Совсем пустой `shutdown() {}` не годится: соединения останутся
   открытыми, `server.close()` не выполнится никогда, и прогон тестов зависнет.

7. Проверьте изоляцию командой `git grep` из 2.2 и сделайте коммит.

## Контрольные вопросы

1. Что такое контракт и почему в JavaScript его проверяют тестами?
2. Что такое адаптер? Что именно адаптирует `TcpConnection`?
3. Почему адаптер TCP не может просто пересказывать события `data`?
4. Почему в контракте соединения нет события `error`?
5. Где выбирается реализация транспорта и почему именно там?
6. Сколько файлов нужно изменить, чтобы добавить третий транспорт?
7. Как убедиться, что логика чата не зависит от `ws`?
8. Почему тесты чата из эталонного проекта проходят на вашем коде без правок?

Ответы — в [answers.md](answers.md).

## Где это в эталонном проекте

- [transport/index.js](../../transport/index.js), [transport/ws.js](../../transport/ws.js),
  [transport/tcp.js](../../transport/tcp.js).
- `git diff step-2 step-3` — вынос `ws` в слой транспорта.
- `git diff --stat step-8 step-9` — переход на TCP: изменилась только папка `transport/`.
