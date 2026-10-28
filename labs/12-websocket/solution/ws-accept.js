// Упражнение 3: как сервер вычисляет Sec-WebSocket-Accept (RFC 6455, раздел 1.3).
// Клиент присылает случайный ключ, сервер приписывает к нему фиксированный GUID,
// берёт SHA-1 и кодирует в base64. Так клиент убеждается, что сервер понимает WebSocket.

import { createHash } from 'node:crypto';

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(clientKey) {
  return createHash('sha1')
    .update(clientKey + WEBSOCKET_GUID)
    .digest('base64');
}

const key = process.argv[2] ?? 'dGhlIHNhbXBsZSBub25jZQ==';
console.log(`Sec-WebSocket-Key:    ${key}`);
console.log(`Sec-WebSocket-Accept: ${acceptKey(key)}`);
// Для ключа из RFC должно получиться s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
