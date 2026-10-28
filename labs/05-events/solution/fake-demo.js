// Проверка createConnectionPair: эхо-«сервер» на соединении в памяти.

import { createConnectionPair } from './fake-connection.js';

const [client, server] = createConnectionPair();

server.on('message', (text) => server.send(`echo: ${text}`));
server.on('close', () => console.log('server side: closed'));

client.on('message', (text) => console.log(`client got "${text}"`));
client.on('close', () => console.log('client side: closed'));

client.send('hello');
client.send('world');
setTimeout(() => client.close(), 10);
