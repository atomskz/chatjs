# Лабораторная 8. Логика чата без сети: классы, Map, внедрение зависимостей

**Цель:** написать сердце сервера — логику чата — и проверить её тестами
до того, как появится настоящая сеть. По пути разобраться, зачем нужны
классы и состояние, как работают закрытые поля, коллекции `Map` и `Set`,
почему зависимости лучше передавать снаружи и как читать упавший тест.

**Понадобится:** `protocol.js` (лабораторная 6), `test/fake-connection.js`
(лабораторная 5), тесты (лабораторная 7). Упражнения 1–4 делайте в папке
`sandbox-08` с `"type": "module"`, шаг проекта — в `chat/`.

**Примерное время:** 6–8 часов, два занятия и шаг проекта по ступеням.

**Как работать:** каждый пример запускайте у себя и сверяйте вывод.
В разминках сначала запишите **свой** ответ, потом запустите код и только
потом смотрите [answers.md](answers.md).

---

## Занятие 1. Классы, состояние и `Map`

### 1.1. Зачем: программа, которая помнит

В задачах вроде LeetCode функция получает вход и возвращает выход,
и больше ничего не помнит. Сервер чата так не может: ему нужно **помнить**,
кто сейчас подключён и под каким ником, — и помнить это между сообщениями,
которые приходят в разное время. Такие данные называют **состоянием**.

**Аналогия: администратор гостиницы.** У него журнал: номер комнаты →
гость. Гость приходит — администратор записывает; спрашивают «кто в 12-м?» —
смотрит в журнал; гость уезжает — вычёркивает. Журнал — это состояние,
а действия администратора — функции, которые с ним работают.

**Класс** объединяет и то, и другое: данные (поля) и функции (методы),
которые с ними работают.

### 1.2. Разобранный пример: от переменной к классу

**Шаг 1. Состояние в обычной переменной.**

```js
let count = 0;
function increment() {
  count++;
  return count;
}
increment();
increment();
console.log(count); // 2
```

Работает, но счётчик один на всю программу, и любой код может испортить
его, написав `count = -100`.

**Шаг 2. Класс.** Каждый объект, созданный через `new`, получает **своё**
состояние:

```js
class Counter {
  #count = 0; // поле с # — закрытое

  increment() {
    this.#count++; // this — объект, у которого вызвали метод
    return this.#count;
  }
}

const a = new Counter();
const b = new Counter();
a.increment();
a.increment();
b.increment();
console.log(a.increment(), b.increment()); // 3 2 — у каждого свой счёт
```

- `class Counter { ... }` — описание: какие поля и методы будут у объектов.
- `new Counter()` — создать объект по этому описанию.
- `#count = 0` — поле, начальное значение у каждого нового объекта.
- `this` внутри метода — тот объект, у которого метод вызвали
  (`a.increment()` → `this` это `a`).

**Шаг 3. Почему `#`.** Поле с `#` **закрытое**: снаружи класса его не видно
и не изменить.

```js
class Room {
  #members = new Map();
  count() {
    return this.#members.size;
  }
}
const room = new Room();
console.log(room.members, Object.keys(room), room.count()); // undefined [] 0
// console.log(room.#members);
// → SyntaxError: Private field '#members' must be declared in an enclosing class
```

Снаружи видны только публичные методы — это **интерфейс** класса. Внутри
его можно переделать как угодно, и никто снаружи не сломается, потому что
никто не мог залезть в закрытые поля. Подчёркивание (`this._members`) —
лишь договорённость «не трогайте», нарушить её можно. `#` проверяет сам язык.

У класса бывает **конструктор** — метод, который вызывается при `new`
и получает его аргументы:

```js
class ChatServer {
  #logger;
  constructor({ logger = console } = {}) {
    this.#logger = logger;
  }
}
new ChatServer({ logger: myLogger });
new ChatServer(); // тоже можно: = {} подставит пустой объект
```

### Разминка 1

1. Что напечатает код? Почему у `a` и `b` разные числа, хотя метод один?

   ```js
   const a = new Counter();
   const b = new Counter();
   a.increment();
   console.log(a.increment(), b.increment());
   ```

2. Почему `room.members` — `undefined`, хотя в классе есть `#members`?

### 1.3. `Map`: журнал «ключ → значение»

У обычного объекта ключи — строки. Если ключом сделать объект, он
превратится в строку `'[object Object]'`, и все такие ключи совпадут:

```js
const ann = { name: 'ann' };
const bob = { name: 'bob' };

const asObject = {};
asObject[ann] = 'ann state';
asObject[bob] = 'bob state'; // перезаписал ann!
console.log(Object.keys(asObject)); // [ '[object Object]' ]

const asMap = new Map();
asMap.set(ann, 'ann state');
asMap.set(bob, 'bob state');
console.log(asMap.size, asMap.get(ann)); // 2 ann state
```

У `Map` ключом может быть что угодно, в том числе объект соединения.
Это ровно то, что нужно серверу: «по этому соединению — вот этот клиент».

```js
const clients = new Map();
clients.set(connection, { nick: null }); // добавить или заменить
clients.has(connection); // true — есть ли такой ключ
clients.get(connection); // { nick: null }; для неизвестного ключа — undefined
clients.get(connection).nick = 'ann'; // значение — ссылка на объект: меняем прямо в Map
clients.delete(connection); // true, если ключ был; false, если нет
clients.size; // сколько записей

for (const [connection, client] of clients) {
  /* пары ключ-значение, в порядке добавления */
}
clients.keys(); // перебор ключей; clients.values() — значений; clients.entries() — пар
[...clients.keys()]; // ключи массивом
```

Так выглядит состояние сервера чата:

```
#clients (Map)
┌───────────────────────┬──────────────────┐
│ ключ: соединение      │ значение: клиент │
├───────────────────────┼──────────────────┤
│ соединение №1         │ { nick: 'ann' }  │
│ соединение №2         │ { nick: null }   │ ← подключился, но ещё не прислал join
│ соединение №3         │ { nick: 'bob' }  │
└───────────────────────┴──────────────────┘
```

`Map` помнит порядок **добавления**. Клиент попадает в `Map` при подключении,
поэтому список ников идёт в порядке подключения. Обычно он совпадает
с порядком входа, но не всегда: если `ann` подключилась первой, а `join`
прислала второй, она всё равно окажется в списке первой. Для чата этого
достаточно.

**Почему не массив клиентов.** Найти в массиве клиента по соединению можно
только перебором (`clients.find(...)`) на **каждое** сообщение, а удалять
из середины массива неудобно. `Map` находит запись по ключу сразу.

**`Set`** — множество уникальных значений: `add`, `has`, `delete`, `size`.
Убрать повторы из массива: `[...new Set(['ann', 'bob', 'ann'])]` → `['ann', 'bob']`.

### 1.4. `this` в обработчиках событий

Внутри методов к полям обращаются через `this`: `this.#clients`.
Подписываясь на события соединения, пишите **стрелочные функции**
(лабораторная 5, раздел 1.5):

```js
// внутри handleConnection(connection) класса ChatServer:
connection.on('message', (text) => this.#handleMessage(connection, text)); // правильно
connection.on('message', this.#handleMessage); // ошибка: this внутри — уже соединение
// → TypeError: Cannot read private member #clients from an object whose class did not declare it
```

### Разминка 2

1. В `Map` положили `clients.set(conn, { nick: null })`, а потом выполнили
   `clients.get(conn).nick = 'ann'`. Что вернёт `clients.get(conn)`? Нужен ли
   после изменения ещё один `clients.set(...)`?
2. Почему для ключа «соединение» не подходит обычный объект `{}`?

---

## Занятие 2. Внедрение зависимостей и тесты по ступеням

### 2.1. Зачем: класс, который можно проверить

Если класс сам создаёт всё, что ему нужно (`console`, `Date.now`,
сетевой сервер), его трудно проверить: тест засыпает консоль логами,
время всё время разное, нужен свободный порт и настоящая сеть.

**Разобранный пример.** `Room` запоминает время входа:

Трудно проверить: время берётся «изнутри», и тест не знает, каким оно будет.

```js
class Room {
  #members = new Map();
  join(nick) {
    this.#members.set(nick, { joinedAt: Date.now() });
  }
}
```

Легко проверить: источник времени передают снаружи, а по умолчанию берут настоящий.

```js
class Room {
  #members = new Map();
  #now;
  constructor({ now = Date.now } = {}) {
    this.#now = now;
  }
  join(nick) {
    this.#members.set(nick, { joinedAt: this.#now() });
  }
  joinedAt(nick) {
    return this.#members.get(nick)?.joinedAt;
  }
}

// В тесте — свои «часы»:
let time = 1000;
const room = new Room({ now: () => time });
room.join('ann'); // joinedAt 1000
time = 5000;
room.join('bob'); // joinedAt 5000
```

Это называется **внедрением зависимостей** (dependency injection): то,
от чего зависит класс, ему передают снаружи. Никакой библиотеки не нужно,
достаточно параметров конструктора. Так же устроен сервер чата:

```js
const chat = new ChatServer({ logger: silentLogger }); // логи в тестах не нужны
chat.handleConnection(fakeConnection); // соединение в памяти вместо сокета
```

`ChatServer` не создаёт ни логгер, ни соединения: ему их передают. Поэтому
в тесте ему можно подсунуть «тихий» логгер и соединение в памяти из
лабораторной 5 — и проверить всю логику чата без сети.

### 2.2. Как читать упавший тест

**Зачем.** Шаг проекта в этой лабораторной построен так: сначала тест
падает, вы читаете, что он говорит, и исправляете код, пока тест не пройдёт.
Поэтому умение читать вывод упавшего теста — главный навык этого занятия.

**Разобранный пример.** В [start/room-broken.js](start/room-broken.js) — класс
`Room` с тремя ошибками, а в [start/room-broken.test.js](start/room-broken.test.js) —
три теста. Запуск `node --test room-broken.test.js` печатает (сокращено):

```
✖ lists members in join order
✖ rejects a taken nick
✖ leave tells whether the member was there
ℹ pass 0
ℹ fail 3

test at room-broken.test.js:7:1
✖ lists members in join order
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    [
  +   'ann',
      'bob',
  -   'ann'
    ]

      at TestContext.<anonymous> (file:///.../room-broken.test.js:11:10)
```

Как это читать, по шагам:

1. **Какой тест** упал: `lists members in join order` — «список в порядке входа».
2. **Какая проверка**: `strictly deep-equal` — `assert.deepEqual`, строка 11
   тестового файла (`room-broken.test.js:11:10`). Откройте её: там
   `assert.deepEqual(room.list(), ['bob', 'ann'])`.
3. **Что получили и что ждали**: `+` — то, что вернул ваш код (actual),
   `-` — то, что ждал тест (expected). Код вернул `['ann', 'bob']`,
   а ждали `['bob', 'ann']`.
4. **Гипотеза**: имена отсортированы по алфавиту, а не в порядке входа.
   Ищем в `room-broken.js`, где список сортируется.

Ещё два вида сообщений, которые вы будете видеть часто:

```
AssertionError [ERR_ASSERTION]: Missing expected exception.
```

`assert.throws` ждал исключение, а код **ничего не выбросил**.

```
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ undefined
- true
```

Ждали `true`, а функция вернула `undefined` — скорее всего, в ней нет `return`.

Если тест **завис** и через какое-то время упал с `test timed out after 10000ms`,
значит, тест ждёт ответа, который код так и не отправил. Для тестов сервера
чата это почти всегда «сервер не ответил на сообщение» или «ответил не тому
клиенту».

### Разминка 3

Тест упал так:

```
✖ list → users in join order
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    {
  +   code: 'NOT_JOINED',
  +   message: 'Send "join" first',
  +   type: 'error'
  -   type: 'users',
  -   users: [
  -     'ann',
  -     'bob'
  -   ]
    }
```

1. Что сервер ответил на `list` и что ждал тест?
2. Где искать ошибку: в обработке `list` или раньше?

### 2.3. Как устроена логика сервера чата

```
соединение ── 'message' (text) ──► обработчик в handleConnection
                                     try {
                                       #handleMessage(connection, text)
                                         ├─ decode не удался  → error BAD_MESSAGE
                                         ├─ неизвестный type  → error UNKNOWN_TYPE
                                         ├─ ещё не вошёл      → error NOT_JOINED
                                         └─ switch (type)
                                              join  → #handleJoin
                                              msg   → #handleChatMessage
                                              list  → users
                                              leave → connection.close()
                                     } catch → лог со стеком + error INTERNAL_ERROR

соединение ── 'close' ──► #handleDisconnect: удалить из Map, «X left the chat»
```

- **Состояние** — `Map` «соединение → `{ nick }`». В неё попадают все
  подключившиеся, а `nick` остаётся `null`, пока не пришёл `join`.
  Хранить и тех, кто ещё не вошёл, нужно: сервер должен отличать
  «подключился, но не вошёл» (ответить `NOT_JOINED`) от неизвестного
  соединения, логировать их отключение и закрыть их при выключении
  (лабораторная 14).
- **Источник правды — сервер.** Поля `from` и `ts` в сообщении чата
  ставит сервер, а не клиент: иначе любой мог бы писать от чужого имени.
- **Рассылка** — цикл по своей `Map`. Сообщение кодируется один раз,
  а не для каждого получателя. Тот, кто ещё не прислал `join`,
  ничего не получает.
- **Один путь выхода.** И `leave`, и обрыв связи заканчиваются событием
  `close` соединения. Удаление участника и «X left the chat» живут
  в одном обработчике `close`, а `leave` просто закрывает соединение.
- **Граница ошибок** (лабораторная 5) — `try/catch` внутри обработчика
  каждого сообщения.

---

## Упражнения

Решения лежат в [solution/](solution/). Упражнения 1–2 — к первому занятию,
3–4 — ко второму. Затем — шаг проекта по ступеням.

### Упражнение 1. `Map` против объекта

Создайте два объекта `ann` и `bob` и запишите для каждого состояние
сначала в обычный объект (`state[ann] = ...`), а потом в `Map`. Выведите
ключи объекта. Почему состояние `ann` пропало? Проверьте, что `Map`
помнит порядок добавления, и уберите повторы из списка с помощью `Set`.

### Упражнение 2. Класс `Room`

Напишите класс `Room` с закрытым полем `#members` (`Map` «ник → данные»):

- `join(nick)` — добавляет участника. Если ник занят, выбрасывает `RoomError`
  с кодом `NICK_TAKEN` (свой класс ошибки — лабораторная 3);
- `leave(nick)` — убирает участника и возвращает `true`, если тот был;
- `list()` — ники в порядке входа.

Напишите для него тесты. Убедитесь, что `room.members` и `Object.keys(room)`
ничего не показывают.

### Упражнение 3. Подменяемое время

Добавьте в конструктор `Room` параметр `now` (по умолчанию `Date.now`)
и сохраняйте время входа каждого участника. Напишите тест, который
подставляет свои часы и проверяет `joinedAt(nick)` (2.1).

### Упражнение 4. Найдите ошибки по тестам

Скопируйте [start/room-broken.js](start/room-broken.js) и
[start/room-broken.test.js](start/room-broken.test.js) в `sandbox-08`
и запустите `node --test room-broken.test.js`. Все три теста упадут.
**Не читая код класса**, по выводу каждого упавшего теста запишите:
какая проверка не прошла, что ждали, что получили и где, скорее всего,
ошибка. Только потом откройте `room-broken.js` и исправьте. Повторяйте
запуск, пока не будет `pass 3`. Сверьтесь с [solution/room.js](solution/room.js).

## Типичные ошибки

| что видите                                                                                     | почему                                                                 | что делать                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `TypeError: Cannot read private member #clients from an object whose class did not declare it` | метод передан без вызова: `on('message', this.#handle)`                | `on('message', (text) => this.#handle(connection, text))`     |
| `SyntaxError: Private field '#x' must be declared in an enclosing class`                       | поле `#x` не объявлено в классе или к нему обращаются снаружи          | объявить `#x;` в начале класса; снаружи — только через методы |
| `TypeError: logger.log is not a function`                                                      | у тестового логгера только `info`, `warn`, `error`                     | вызывать `this.#logger.info(...)`                             |
| в `Map` «пропадают» клиенты или все ники `undefined`                                           | вместо `Map` обычный объект — ключи-соединения слиплись                | `new Map()`                                                   |
| ответ `INTERNAL_ERROR` вместо `BAD_MESSAGE`                                                    | ошибку `decode` поймала общая граница, а не свой `try` вокруг `decode` | маленький `try/catch` вокруг `decode` (ступень 1)             |
| новичок получил «X joined the chat» о самом себе                                               | `#broadcast` без `except: connection`                                  | передать `{ except: connection }`                             |
| «left the chat» о том, кто так и не вошёл                                                      | нет проверки, что у клиента был ник                                    | рассылать, только если `client.nick`                          |
| тест завис и упал: `test timed out after ...`                                                  | сервер не отправил ответ, которого ждёт тест                           | найти, на какой запрос нет `#send`                            |
| `Connection closed before a message arrived`                                                   | сервер закрыл соединение раньше, чем ответил                           | сначала `#sendError`, потом `connection.close()`              |
| тест проходит один, но падает вместе с другими                                                 | тесты делят один сервер или одно состояние                             | новый `ChatServer` в каждом тесте (`createChat()`)            |

## Шаг проекта

Напишите `lib/chat-server.js` — логику сервера по разделу 6.1 ТЗ. Задача
большая, поэтому она разбита на подготовку и пять ступеней. Для каждой
ступени есть готовые тесты в папке [tests/](tests/): скопируйте файл в свой
`chat/test/`, запустите `npm test`, добейтесь, чтобы он прошёл, и только
потом переходите к следующей ступени. Тесты предыдущих ступеней должны
продолжать проходить.

### Порядок работы на каждой ступени

1. Скопируйте тест ступени в `chat/test/`.
2. Запустите **только его**: `node --test test/chat-server-1-errors.test.js`.
   Так вывод короче, и видно только то, что относится к этой ступени.
3. Прочитайте **первый** упавший тест так, как в разделе 2.2: какая проверка,
   что ждали, что получили, какая строка теста. Исправляйте по одной ошибке.
4. Когда ступень зелёная, запустите `npm test`: тесты прошлых ступеней тоже
   должны проходить. Сделайте коммит и переходите к следующей ступени.

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
  #getNicks() {} // ники вошедших, в порядке подключения
  #broadcast(message, { except } = {}) {} // всем вошедшим, кроме except
  #send(connection, message) {} // connection.send(encode(message))
  #sendError(connection, code, text) {} // warn в лог + ServerMessage.error
}
```

Логгер — любой объект с методами `info`, `warn` и `error`. Вызывайте только
их, а не `logger.log`: тесты подставляют объект ровно с этими тремя методами.
Каждому методу передавайте **одну строку**, собранную шаблонной строкой:
``logger.info(`Joined: ${nick} (${connection.remoteAddress})`)``. Тестовый логгер
сохраняет только первый аргумент, поэтому вызов в стиле `console.log`
(`logger.info('Joined:', nick)`) потеряет ник.

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

Для шага 1 нужен свой маленький `try/catch` прямо вокруг `decode`.
Переменную объявите до него: после блока `const` уже не видно
(см. [шпаргалку](../js-cheatsheet.md#переменные-и-строки)):

```js
// внутри #handleMessage(connection, text):
let message;
try {
  message = decode(text);
} catch (error) {
  this.#sendError(connection, error.code, error.message); // ProtocolError → BAD_MESSAGE
  return;
}
```

Этот `catch` превращает ошибку протокола в ответ клиенту. Любая другая
ошибка (баг) сюда не попадёт: её поймает общая граница ошибок из ступени 5
и ответит `INTERNAL_ERROR`.

### Ступень 2. Регистрация

Тест: [chat-server-2-join.test.js](tests/chat-server-2-join.test.js).

`#handleJoin`:

- уже вошёл — `ALREADY_JOINED`, соединение остаётся открытым;
- `!isValidNick(nick)` — `INVALID_NICK`, затем `connection.close()`;
- ник среди `#getNicks()` — `NICK_TAKEN`, затем `connection.close()`;
- иначе, **именно в таком порядке**: `client.nick = nick`, `info` в лог,
  новичку — `welcome` со списком ников, остальным — `system`
  «nick joined the chat» (`#broadcast` с `except: connection`).
  Порядок «сначала лог, потом отправка» проверяет тест ступени 5.

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

1. Что такое состояние и почему серверу чата без него не обойтись?
2. Чем класс отличается от набора функций с общей переменной?
3. Чем закрытое поле `#clients` лучше, чем `this._clients`?
4. Почему клиентов хранят в `Map`, а не в объекте или массиве?
5. Зачем хранить в `Map` клиента, который ещё не прислал `join`?
6. Почему `from` и `ts` ставит сервер?
7. Почему `leave` только закрывает соединение, а «left the chat» рассылает обработчик `close`?
8. Что даёт передача `logger` в конструктор? Что ещё в этом классе
   передаётся снаружи?
9. Почему этот класс можно протестировать без сети?
10. Что значат `+` и `-` в выводе упавшего `assert.deepEqual`? С какой строки
    начинать поиск ошибки?

Ответы — в [answers.md](answers.md).

## Где это в эталонном проекте

- [lib/chat-server.js](../../lib/chat-server.js) — эталонная реализация.
- [test/helpers.js](../../test/helpers.js) — `TestClient`.
- [tests/](tests/) — приёмочные тесты ступеней 1–5 из этой лабораторной.
- `git show step-5:lib/chat-server.js` — регистрация и рассылка,
  `git diff step-4 step-5 -- lib/chat-server.js` — что добавилось.
