# Лабораторная 1. Проект на Node.js: npm, модули, скрипты

**Цель:** научиться создавать проект на Node.js с нуля: описать его в
`package.json`, подключить зависимости, разбить код на модули и настроить
инструменты, которые следят за качеством кода.

**Понадобится:** Node.js 22.13 или новее (лучше 24 LTS), терминал, редактор кода, git.
Если в примерах встретится незнакомая запись (`?.`, `??`, деструктуризация,
`...`), загляните в [шпаргалку по синтаксису](../js-cheatsheet.md).

**Примерное время:** 1,5–2 часа.

## Теория

### Node.js и `process`

Node.js — это программа, которая выполняет JavaScript вне браузера.
Команда `node file.js` читает файл и выполняет его. Вместо `window` и
`document` здесь есть глобальный объект `process` — сведения о текущем
процессе:

```js
process.version; // версия Node.js, например 'v24.19.0'
process.platform; // 'win32', 'linux', 'darwin'
process.argv; // аргументы командной строки (лабораторная 2)
process.env; // переменные окружения
process.cwd(); // текущая папка
```

### `package.json`

Файл описывает проект. Его создаёт команда `npm init -y`, дальше его
правят руками. Важные поля:

| поле              | зачем                                                   |
| ----------------- | ------------------------------------------------------- |
| `name`, `version` | имя и версия проекта                                    |
| `type`            | `"module"` — файлы `.js` считаются ES-модулями          |
| `private`         | `true` — защита от случайной публикации в npm           |
| `engines`         | какая версия Node.js нужна, например `{"node": ">=22"}` |
| `scripts`         | короткие команды: `npm run lint`, `npm test`            |
| `dependencies`    | пакеты, нужные программе для работы                     |
| `devDependencies` | пакеты, нужные только разработчику (линтер, тесты)      |

### Зависимости

`npm install ws` скачивает пакет в папку `node_modules/` и записывает его
в `dependencies`. С флагом `--save-dev` (`-D`) пакет попадёт
в `devDependencies`.

Версия записывается как `"^8.22.0"`. Значок `^` разрешает ставить
более новые версии 8.x.x, но не 9.0.0. Точные версии, которые реально
установились, лежат в `package-lock.json`.

- `node_modules/` в git **не кладут**: эта папка большая, и её всегда можно
  восстановить. Добавьте её в `.gitignore`.
- `package-lock.json` в git **кладут**: команда `npm ci` поставит по нему
  ровно те же версии, что у автора.

### ES-модули

Каждый файл — отдельный модуль со своей областью видимости. Наружу видно
только то, что помечено `export`:

```js
// math.js
export function sum(a, b) {
  return a + b;
}
export const PI = 3.14159;
```

```js
// main.js
import { sum, PI } from './math.js'; // расширение .js обязательно
import os from 'node:os'; // встроенный модуль Node.js
```

- Встроенные модули подключаются с префиксом `node:` (`node:fs`, `node:net`,
  `node:events`). Так сразу видно, что это не пакет из npm.
- Пакеты из `node_modules` подключаются по имени: `import { WebSocket } from 'ws'`.
- В старом коде вы встретите другой формат, CommonJS: `require()`
  и `module.exports`. В ES-модулях `require`, `__dirname` и `__filename`
  не определены. Вместо двух последних есть `import.meta.dirname`
  и `import.meta.filename`.

### Линтер и форматтер

- **ESLint** ищет ошибки: неиспользуемые переменные, опечатки в именах,
  недостижимый код.
- **Prettier** приводит оформление к единому виду: отступы, кавычки, переносы.

У них разные задачи. ESLint отвечает на вопрос «нет ли здесь ошибки?»,
а Prettier — «одинаково ли оформлен код?».

## Упражнения

Создайте пустую папку `sandbox-01` для упражнений. Решения лежат
в [solution/](solution/), но сначала попробуйте сами.

### Упражнение 1. Первый проект

1. В папке `sandbox-01` выполните `npm init -y` и посмотрите на `package.json`.
2. Новые версии npm сразу пишут в него `"type": "commonjs"`. **Замените**
   это значение на `"module"`, а не добавляйте второе поле `type`: при двух
   одинаковых ключах действует последний, и все `import` сломаются.
   Если поля `type` нет, добавьте его.
3. Добавьте `"private": true` и `"engines": { "node": ">=22.13" }`.
4. Создайте `hello.js`, который выводит версию Node.js, платформу,
   текущую папку и `process.argv`.
5. Добавьте скрипт `"hello": "node hello.js"` и запустите его
   командой `npm run hello`.

**Проверка:** в выводе есть строка вида `Node.js v24.19.0 on win32`.

### Упражнение 2. Модули

1. Создайте `math.js` с функциями `sum(a, b)` и `average(numbers)`.
   Функция `average` должна использовать `sum`.
2. Создайте `main.js`: импортируйте обе функции, а также `os`
   из `node:os`, и выведите `average([2, 4, 9])` и `os.cpus().length`.
3. Сломайте импорт: уберите `.js` в `'./math.js'`. Прочитайте ошибку
   (`ERR_MODULE_NOT_FOUND`) и верните расширение.
4. Попробуйте написать в `main.js` `const fs = require('node:fs')`.
   Какая ошибка появилась и почему?
5. Выведите `import.meta.dirname` и `import.meta.filename`.

**Проверка:** `node main.js` печатает `average: 5` и число ядер процессора.

### Упражнение 3. Зависимости

1. Выполните `npm install ws` и `npm install -D eslint @eslint/js globals prettier`.
2. Посмотрите, как изменились `package.json` и `node_modules/`.
3. Создайте `.gitignore` со строкой `node_modules/`.
4. Удалите `node_modules/` (`rm -rf node_modules` в bash,
   `Remove-Item -Recurse -Force node_modules` в PowerShell) и выполните
   `npm ci`. Папка восстановится в точности по `package-lock.json`.

### Упражнение 4. ESLint и Prettier

1. Создайте `eslint.config.js`:

   ```js
   import js from '@eslint/js';
   import globals from 'globals';

   export default [
     js.configs.recommended,
     {
       languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
         globals: globals.node,
       },
     },
   ];
   ```

2. Создайте `.prettierrc.json`: `{ "singleQuote": true, "printWidth": 100 }`.
3. Добавьте скрипты `"lint": "eslint ."`, `"format": "prettier --write ."`
   и `"format:check": "prettier --check ."`.
4. Испортите `math.js` тремя способами:
   - объявите неиспользуемую переменную: `const unused = 42;`;
   - сделайте опечатку в имени переменной: `numbrs.length` вместо `numbers.length`;
   - собейте отступы и уберите точку с запятой в конце строки.

   Запустите `npm run lint`, затем `npm run format` и снова `npm run lint`.
   ESLint должен найти `'unused' is assigned a value but never used`
   (`no-unused-vars`) и `'numbrs' is not defined` (`no-undef`).
   Какие проблемы исправил Prettier, а какие остались для вас?

5. Теперь сделайте синтаксическую ошибку, например `retrun a + b;`.
   Что скажут ESLint и Prettier? Почему ни один из них не может продолжить работу?

## Шаг проекта

Начните свой чат: в отдельной папке `chat/` (не внутри этого репозитория)
сделайте то же, что в упражнениях 1, 3 и 4:

- `package.json` с `"type": "module"`, `engines` и зависимостью `ws`;
- ESLint, Prettier и скрипты `lint`, `format`, `format:check`;
- `.gitignore` с `node_modules/`;
- `.gitattributes` со строкой `* text=auto eol=lf`. В Windows git может
  превращать переводы строк в CRLF, и тогда Prettier ругается на каждый файл;
- `git init` и первый коммит.

Дальше каждая лабораторная добавляет в этот проект новый кусок,
а в лабораторной 15 он становится готовым чатом. Удобно делать по коммиту
на каждую лабораторную.

## Контрольные вопросы

1. Чем `dependencies` отличаются от `devDependencies`?
2. Зачем коммитить `package-lock.json` и почему не коммитят `node_modules/`?
3. Что меняет `"type": "module"` в `package.json`?
4. Почему в `import` нужно писать `./math.js`, а не `./math`?
5. Зачем писать `node:fs`, а не просто `fs`?
6. Какую проблему решает ESLint, а какую Prettier? Можно ли обойтись одним?

## Где это в эталонном проекте

- [package.json](../../package.json), [eslint.config.js](../../eslint.config.js),
  [.prettierrc.json](../../.prettierrc.json), [.gitattributes](../../.gitattributes).
- Каким был эталон на этом шаге: `git show step-0 --stat` (как смотреть историю
  эталона, см. [labs/README.md](../README.md#история-эталонного-проекта)).
