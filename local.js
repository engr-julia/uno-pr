// Run the site on your own computer:  node local.js   ->  http://localhost:3000
// Prayers are saved in prayers.txt in this folder. (On Vercel this file is not used.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import * as api from './api/prayers.js';

const PORT = process.env.PORT || 3000;
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const PUBLIC = path.resolve('public');

http.createServer(async (rq, rs) => {
  const url = new URL(rq.url, 'http://localhost');
  if (url.pathname === '/api/prayers' && api[rq.method]) {
    const chunks = []; for await (const c of rq) chunks.push(c);
    const body = ['GET', 'HEAD'].includes(rq.method) ? undefined : Buffer.concat(chunks);
    const r = await api[rq.method](new Request('http://localhost:' + PORT + rq.url, { method: rq.method, headers: rq.headers, body }));
    rs.writeHead(r.status, Object.fromEntries(r.headers));
    return rs.end(await r.text());
  }
  const file = path.resolve(PUBLIC, url.pathname === '/' ? 'index.html' : '.' + url.pathname);
  if (file.startsWith(PUBLIC + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    rs.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    return rs.end(fs.readFileSync(file));
  }
  rs.writeHead(404); rs.end('Not found');
}).listen(PORT, () => console.log(`Prayer Registry running on http://localhost:${PORT}`));
