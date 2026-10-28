// Упражнение 1: строки и байты.

import { StringDecoder } from 'node:string_decoder';

const text = 'Привет, 😀';
const bytes = Buffer.from(text, 'utf8');

console.log(`text.length = ${text.length}, bytes = ${bytes.length}`);
console.log('hex:', bytes.toString('hex').match(/../g).join(' '));
console.log(`"П" takes ${Buffer.byteLength('П')} bytes, "P" takes ${Buffer.byteLength('P')}`);

// Режем буфер посередине буквы «р» (байты 2 и 3 — это «р»).
const first = bytes.subarray(0, 3);
const second = bytes.subarray(3);
console.log(`naive:   "${first.toString()}" + "${second.toString()}"`);

// StringDecoder придерживает неполный символ до следующего куска.
const decoder = new StringDecoder('utf8');
console.log(`decoder: "${decoder.write(first)}" + "${decoder.write(second)}"`);
