// Run the site on your own computer:  node local.js   ->  http://localhost:3000
// Prayers are saved in prayers.txt and RSVPs in rsvps.txt in this folder. (On Vercel this file is not used.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import * as prayers from './api/prayers.js';
import * as rsvp from './api/rsvp.js';

const PORT = process.env.PORT || 3000;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
};
const PUBLIC = path.resolve('public');
const apis = { '/api/prayers': prayers, '/api/rsvp': rsvp };

http.createServer(async (rq, rs) => {
  const url = new URL(rq.url, 'http://localhost');
  const api = apis[url.pathname];
  if (api && api[rq.method]) {
    const chunks = []; for await (const c of rq) chunks.push(c);
    const body = ['GET', 'HEAD'].includes(rq.method) ? undefined : Buffer.concat(chunks);
    const r = await api[rq.method](new Request('http://localhost:' + PORT + rq.url, { method: rq.method, headers: rq.headers, body }));
    rs.writeHead(r.status, Object.fromEntries(r.headers));
    return rs.end(await r.text());
  }
  let rel; try { rel = decodeURIComponent(url.pathname); } catch { rs.writeHead(400); return rs.end('Bad request'); }
  const file = path.resolve(PUBLIC, rel === '/' ? 'index.html' : '.' + rel);
  if (file.startsWith(PUBLIC + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const size = fs.statSync(file).size;
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    // Safari only plays audio from servers that understand "Range" requests, so support them.
    const m = /^bytes=(\d*)-(\d*)$/.exec(rq.headers.range || '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start > end || start >= size) { rs.writeHead(416, { 'Content-Range': `bytes */${size}` }); return rs.end(); }
      rs.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(rs);
    }
    rs.writeHead(200, { ...headers, 'Content-Length': size });
    return fs.createReadStream(file).pipe(rs);
  }
  rs.writeHead(404); rs.end('Not found');
}).listen(PORT, () => console.log(`Invitation site running on http://localhost:${PORT}`));
