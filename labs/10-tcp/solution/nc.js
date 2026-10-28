// Замена netcat для Windows (и не только): node nc.js <host> <port>
// Всё, что вы набираете (или что пришло по конвейеру), уходит на сервер,
// а всё, что прислал сервер, печатается. Когда ввод закончился (Ctrl+D,
// конец конвейера), клиент закрывает свою сторону и ждёт, пока сервер закроет свою.
//
//   node nc.js localhost 5000
//   printf '{"type":"join","nick":"nc"}\n{"type":"msg","text":"hi"}\n' | node nc.js localhost 5000

import net from 'node:net';

const [host = 'localhost', port = '5000'] = process.argv.slice(2);
const socket = net.connect({ host, port: Number(port) });

socket.on('connect', () => {
  process.stdin.pipe(socket); // ввод → сервер; конец ввода → socket.end()
  socket.pipe(process.stdout); // сервер → экран
});
socket.on('error', (error) => {
  const code = error.code ?? error.errors?.[0]?.code;
  console.error(`nc.js: ${code ?? error.message}`);
  process.exitCode = 1;
});
socket.on('close', () => process.exit()); // stdin мог остаться открытым — выходим явно
