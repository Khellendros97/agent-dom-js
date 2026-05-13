import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const root = import.meta.dirname;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  let path = join(root, req.url === '/' ? 'index.html' : req.url);
  if (!path.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  const stream = createReadStream(path);
  stream.on('error', () => {
    res.writeHead(404);
    res.end('Not found');
  });
  res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
  res.setHeader('Access-Control-Allow-Origin', '*');
  stream.pipe(res);
}).listen(3050, () => {
  console.log('http://localhost:3050/web-test/static-html/index.html');
});
