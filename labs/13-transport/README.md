# Лабораторная 13. Транспорт как абстракция

**Цель:** спрятать сетевую библиотеку за простым интерфейсом так, чтобы
логика чата не знала, WebSocket под ней или TCP. Освоить идеи контракта,
адаптера и единого набора тестов для всех реализаций. Подключить
`ChatServer` из лабораторной 8 к настоящей сети.

**Понадобится:** лабораторные 5, 8, 10, 11 и 12.

**Примерное время:** 3–4 часа.

## Теория

### Зачем прятать библиотеку

Если `ws` используется по всему коду, замена её на `net` (доп. задание 11.1
ТЗ) превращается в переписывание всего проекта. Если же `ws` используется
только в одной папке, а остальной код работает с **собственным** простым
интерфейсом, меняется только эта папка. Заодно логику можно тестировать
без сети (лабораторная 8).

### Контракт

Контракт — это описание интерфейса: какие функции есть, что они принимают
и возвращают, какие события испускают. В JavaScript нет интерфейсов,
как в Java или TypeScript, поэтому контракт описывают комментарием
и проверяют тестами. Контракт транспорта в эталонном проекте:

```
listen({ port, onConnection }) → Promise<{ port, close() → Promise<void> }>
connect({ host, port })        → Promise<Connection>

Connection (EventEmitter):
  remoteAddress      — адрес собеседника, для логов
  send(text)         — отправить одно сообщение
  close()            — штатно закрыть
  'message' (text)   — пришло одно целое сообщение
  'close' (error?)   — соединение закрыто; error есть, если это обрыв
```

Обратите внимание, чего в контракте **нет**: событий `error`, `Buffer`,
кодов закрытия WebSocket, `end`/`destroy`. Всё это детали конкретной
библиотеки, и наружу они не выходят.

### Адаптер

Адаптер приводит чужой интерфейс к нужному. `TcpConnection` оборачивает
`net.Socket`, а `WsConnection` — `WebSocket`, и оба выглядят одинаково:

```js
class TcpConnection extends EventEmitter {
  #socket;

  constructor(socket, remoteAddress) {
    super();
    this.#socket = socket;
    this.remoteAddress = remoteAddress;

    const splitter = new LineSplitter();
    let lastError = null;
    socket.on('data', (chunk) => {
      for (const line of splitter.push(chunk)) this.emit('message', line);
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

### Где выбирают реализацию

```js
// transport/index.js
import * as tcp from './tcp.js';
import * as ws from './ws.js';

const transports = { ws, tcp };
export function getTransport(name) {
  /* ... */
}
```

Реализацию выбирает точка входа (`server.js`, `client.js`). Это
**корень композиции**: единственное место, где части приложения
связываются друг с другом. `ChatServer` получает готовые соединения
и не знает, откуда они взялись.

Направление зависимостей:

```
server.js ──► lib/chat-server.js ──► protocol.js
    │
    └──► transport/index.js ──► ws.js (ws) / tcp.js (net)
```

Логика чата не импортирует транспорт: соединения ей передают снаружи.
Проверить это просто — `ws` и `net` нигде, кроме `transport/`, не встречаются:

```bash
git grep -n -E "from '(ws|node:net)'"
```

### Тесты контракта

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
нарушает контракт.

## Упражнения

Решения лежат в [solution/](solution/).

### Упражнение 1. Разминка: контракт хранилища

Опишите контракт `get(key) → Promise<string | undefined>`,
`set(key, value) → Promise<void>` и сделайте две реализации:
в памяти (`Map`) и в JSON-файле. Напишите **один** набор тестов и
прогоните его в цикле по обеим реализациям.

### Упражнение 2. TCP-транспорт

Создайте `transport/tcp.js` с функциями `listen` и `connect` и классом
`TcpConnection` по контракту выше:

- `listen` слушает все интерфейсы и ждёт `listening` через `once`.
  Промис отклоняется при `EADDRINUSE`. Возвращает `{ port, close }`,
  где `port` берётся из `server.address()` (важно для порта 0);
- `connect` ставит таймаут подключения 5 секунд и превращает его
  в ошибку `ETIMEDOUT`. После подключения таймаут сбрасывается
  (`setTimeout(0)`);
- `TcpConnection` режет поток `LineSplitter`-ом. Если строка слишком
  длинная, соединение уничтожается с этой ошибкой.

### Упражнение 3. WebSocket-транспорт

Создайте `transport/ws.js` с тем же контрактом:

- HTTP-сервер отвечает `426` на обычные запросы. `WebSocketServer`
  создаётся после успешного `listen`, с `clientTracking: false`
  и `maxPayload`;
- `connect` собирает URL `ws://host:port` (IPv6 — в скобках),
  с `handshakeTimeout`;
- `WsConnection.send` отправляет, только если сокет в состоянии `OPEN`;
- `close()` закрывает с кодом `1000` и через 2 секунды страхуется
  `terminate()` с `unref()`.

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

## Шаг проекта

1. Положите в проект транспорт из упражнений 2–4 и его тесты.
2. Соедините транспорт с логикой в `server.js`:

   ```js
   const chat = new ChatServer({ logger });
   const server = await getTransport(name).listen({
     port,
     onConnection: (connection) => chat.handleConnection(connection),
   });
   console.log(`Server listening on port ${server.port}`);
   ```

   Ошибку `listen` покажите через `describeListenError` и выйдите с кодом 1.

3. Проверьте вручную через `npx wscat -c ws://localhost:5000` все случаи
   из критериев приёмки ТЗ про мусорные сообщения. Для TCP —
   `printf '{"type":"join","nick":"nc"}\n{"type":"msg","text":"hi"}\n' | nc localhost 5000`.
4. **Проверка архитектуры.** Скопируйте из эталонного проекта
   [test/helpers.js](../../test/helpers.js) и [test/chat.test.js](../../test/chat.test.js)
   в свой `test/` и запустите `npm test`. Если файлы и контракт совпадают
   с эталонными, тесты пройдут на обоих транспортах без единой правки.
   Исключение — тест выключения сервера: `ChatServer.shutdown()` появится
   в лабораторной 14. До тех пор добавьте в `ChatServer` пустой метод
   `shutdown() {}` (его вызывает `stop()` в `helpers.js`), и упадёт только
   этот один тест.

## Контрольные вопросы

1. Что такое контракт и почему в JavaScript его проверяют тестами?
2. Почему в контракте соединения нет события `error`?
3. Что такое адаптер? Что именно адаптирует `TcpConnection`?
4. Где выбирается реализация транспорта и почему именно там?
5. Сколько файлов нужно изменить, чтобы добавить третий транспорт?
6. Как убедиться, что логика чата не зависит от `ws`?
7. Почему тесты чата из эталонного проекта проходят на вашем коде без правок?

## Где это в эталонном проекте

- [transport/index.js](../../transport/index.js), [transport/ws.js](../../transport/ws.js),
  [transport/tcp.js](../../transport/tcp.js).
- `git diff step-2 step-3` — вынос `ws` в слой транспорта.
- `git diff --stat step-8 step-9` — переход на TCP: изменилась только папка `transport/`.
