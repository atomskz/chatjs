// Упражнение 2: разбор недоверенной строки без исключений наружу.
// Возвращает { ok: true, value } или { ok: false, error }.

function safeParseMessage(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not valid JSON' };
  }
  // typeof null === 'object' и typeof [] === 'object' — их отсекаем явно.
  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  if (!isObject) {
    return { ok: false, error: 'not a JSON object' };
  }
  if (typeof data.type !== 'string') {
    return { ok: false, error: 'field "type" must be a string' };
  }
  return { ok: true, value: data };
}

const inputs = [
  '{"type":"msg","text":"hi"}',
  'hello',
  'null',
  '[1]',
  '42',
  '{"text":"hi"}',
  '{"type":5}',
];

for (const input of inputs) {
  console.log(input.padEnd(28), JSON.stringify(safeParseMessage(input)));
}
