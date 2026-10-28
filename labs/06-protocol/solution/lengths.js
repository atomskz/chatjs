// Упражнение 4: что считать длиной строки.

const samples = ['hello', 'привет', '😀', 'e\u0301', '👨‍👩‍👧'];
const segmenter = new Intl.Segmenter();

console.log('text      .length  [...text]  graphemes  UTF-8 bytes');
for (const text of samples) {
  const codePoints = [...text].length;
  const graphemes = [...segmenter.segment(text)].length;
  const bytes = Buffer.byteLength(text, 'utf8');
  console.log(
    `${text.padEnd(9)} ${String(text.length).padEnd(8)} ${String(codePoints).padEnd(10)} ${String(graphemes).padEnd(10)} ${bytes}`,
  );
}
