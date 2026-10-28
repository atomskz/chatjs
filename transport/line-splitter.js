// Фрейминг для TCP: превращает поток байтов в отдельные сообщения.
//
// TCP не знает о сообщениях — он гарантирует только порядок байтов.
// Одно событие 'data' может содержать половину сообщения, ровно одно
// или сразу несколько. Поэтому мы договариваемся о формате NDJSON:
// каждое сообщение — одна строка, завершённая '\n', и режем поток по '\n'.

import { StringDecoder } from 'node:string_decoder';

export class LineSplitter {
  // StringDecoder не отдаёт «половинку» многобайтового UTF-8 символа:
  // если кириллическая буква или эмодзи разорвались между двумя кусками,
  // он придержит неполные байты до следующего вызова write().
  #decoder = new StringDecoder('utf8');
  #buffer = '';
  #maxLineLength;

  constructor({ maxLineLength = 64 * 1024 } = {}) {
    this.#maxLineLength = maxLineLength;
  }

  /**
   * Добавляет очередной кусок данных и возвращает все строки,
   * которые в нём завершились. Неполный хвост остаётся в буфере.
   * @param {Buffer} chunk
   * @returns {string[]}
   * @throws {Error} если строка без '\n' стала длиннее maxLineLength
   */
  push(chunk) {
    this.#buffer += this.#decoder.write(chunk);

    const parts = this.#buffer.split('\n');
    // Последний элемент — то, что идёт после последнего '\n':
    // либо пустая строка, либо начало следующего, ещё не полного сообщения.
    this.#buffer = parts.pop();

    if (this.#buffer.length > this.#maxLineLength) {
      throw new Error(`Line is longer than ${this.#maxLineLength} characters`);
    }

    return parts
      .map((line) => line.replace(/\r$/, '')) // поддержка '\r\n' от telnet и nc в Windows
      .filter((line) => line.trim() !== '');
  }
}
