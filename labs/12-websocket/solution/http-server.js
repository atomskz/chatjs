// Упражнение 1: простой HTTP-сервер.
// node http-server.js, затем curl -i http://localhost:5000/time или откройте в браузере.

import http from 'node:http';

const port = Number(process.argv[2] ?? 5000);

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Привет! Try /time\n');
  } else if (req.method === 'GET' && req.url === '/time') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ts: Date.now() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found\n');
  }
});

server.listen(port, () => console.log(`http://localhost:${port}/`));
