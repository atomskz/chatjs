// Упражнение 4: клиент, который обрывает соединение «грубо» — как программа,
// которая упала или была убита. Сервер получит ECONNRESET.
// node reset-client.js [port]

import net from 'node:net';

const port = Number(process.argv[2] ?? 5000);
const socket = net.connect({ host: '127.0.0.1', port });

socket.on('connect', () => {
  socket.write('hi');
  // resetAndDestroy отправляет собеседнику RST вместо штатного FIN.
  socket.resetAndDestroy();
  console.log('connection reset');
});
socket.on('error', (error) => console.log(`client error: ${error.code}`));
