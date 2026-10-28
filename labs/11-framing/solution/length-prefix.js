// Упражнение 4 (бонус): фрейминг с префиксом длины.
// Кадр = 4 байта длины (big-endian) + столько же байт UTF-8 текста.

const HEADER_BYTES = 4;

/** Строка → кадр. */
export function encodeFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt32BE(payload.length);
  return Buffer.concat([header, payload]);
}

export class FrameDecoder {
  #buffer = Buffer.alloc(0);
  #maxFrameBytes;

  constructor({ maxFrameBytes = 64 * 1024 } = {}) {
    this.#maxFrameBytes = maxFrameBytes;
  }

  /**
   * Добавляет кусок байтов и возвращает все кадры, которые в нём завершились.
   * @param {Buffer} chunk
   * @returns {string[]}
   */
  push(chunk) {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    const frames = [];

    while (this.#buffer.length >= HEADER_BYTES) {
      const length = this.#buffer.readUInt32BE(0);
      // Размер известен сразу — слишком большой кадр отклоняем, не дожидаясь данных.
      if (length > this.#maxFrameBytes) {
        throw new Error(`Frame of ${length} bytes is larger than ${this.#maxFrameBytes}`);
      }
      if (this.#buffer.length < HEADER_BYTES + length) {
        break; // кадр ещё не пришёл целиком
      }
      const payload = this.#buffer.subarray(HEADER_BYTES, HEADER_BYTES + length);
      // Кадр целый, поэтому UTF-8 символы в нём тоже целые: StringDecoder не нужен.
      frames.push(payload.toString('utf8'));
      this.#buffer = this.#buffer.subarray(HEADER_BYTES + length);
    }
    return frames;
  }
}
