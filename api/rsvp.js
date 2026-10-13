import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// RSVP backend. Works exactly like api/prayers.js: every reply is one line in ONE text file
// (rsvps.txt). On Vercel that file lives in Vercel Blob. On your own computer (no Blob
// credentials) it is a plain rsvps.txt in the project folder.
const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL_FILE = path.join(process.cwd(), 'rsvps.txt');

const FILE = 'rsvps.txt';          // the single text file (one JSON reply per line)
const MAX_REPLIES = 300;           // safety cap for the whole list
const MAX_PER_BROWSER = 10;        // most replies one browser can send (e.g. a phone shared by a family)
const MAX_GUESTS = 10;             // most people one reply can cover
const MAX_NAME = 40;
const MAX_MESSAGE = 300;

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });

// ---- who is this browser? (same random-id cookie the prayer registry uses) ----
const getOwner = req => (req.headers.get('cookie') || '').match(/(?:^|;\s*)pr_owner=([a-f0-9]{32})/)?.[1] || null;
const ownerCookie = id => USE_BLOB
  ? `pr_owner=${id}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`   // deployed (https)
  : `pr_owner=${id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`;          // plain http://localhost
const parse = text => text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const serialize = rows => rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// ---- the text file ----
async function read() {
  if (!USE_BLOB) return { rows: fs.existsSync(LOCAL_FILE) ? parse(fs.readFileSync(LOCAL_FILE, 'utf8')) : [], etag: null };
  const { get } = await import('@vercel/blob');
  const r = await get(FILE, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { rows: [], etag: null };
  const text = await new Response(r.stream).text();
  return { rows: parse(text), etag: r.blob.etag };
}
// Read, change, write back. If two people save at the same moment, the second retries.
async function update(change) {
  if (!USE_BLOB) { // local file: no awaits between read and write, so it can't interleave
    const { rows } = await read();
    const { rows: next, out } = change(rows);
    if (next !== rows) fs.writeFileSync(LOCAL_FILE, serialize(next));
    return out;
  }
  const { put, BlobPreconditionFailedError } = await import('@vercel/blob');
  for (let i = 0; i < 5; i++) {
    const { rows, etag } = await read();
    const { rows: next, out } = change(rows);
    if (next === rows) return out; // nothing to save
    const body = serialize(next);
    try {
      await put(FILE, body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'text/plain', ...(etag ? { ifMatch: etag } : {}) });
      return out;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError) || i === 4) throw e;
    }
  }
}

// What the browser is allowed to see: ONLY the replies that came from THIS browser.
// Nobody else's name, answer or message is ever sent (there is no public guest wall).
export async function GET(req) {
  const ownerId = getOwner(req);
  const me = ownerId && sha(ownerId);
  let rows;
  try { ({ rows } = await read()); }
  catch (e) { console.error('rsvp: read failed', e); return json({ error: 'Could not load your reply.' }, 500); }
  const newest = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return json({ mine: me ? newest.filter(r => r.owner === me).map(({ owner, ...r }) => r) : [] });
}

export async function POST(req) {
  let b; try { b = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  if (b.website) return json({ error: 'Could not send. Please try again.' }, 400);   // honeypot: only bots fill this
  if (typeof b.attending !== 'boolean') return json({ error: 'Please choose Attending or Not Attending.' }, 400);
  const name = clean(b.name, MAX_NAME);
  if (!name) return json({ error: 'Please enter your name.' }, 400);
  const attending = b.attending;
  const guests = attending ? Math.min(MAX_GUESTS, Math.max(1, parseInt(b.guests, 10) || 1)) : 0;
  const message = String(b.message || '').replace(/\r/g, '').trim().slice(0, MAX_MESSAGE);

  let ownerId = getOwner(req), headers = {};
  if (!ownerId) { ownerId = crypto.randomBytes(16).toString('hex'); headers['Set-Cookie'] = ownerCookie(ownerId); }
  const owner = sha(ownerId);

  const reply = { id: crypto.randomBytes(6).toString('hex'), name, attending, guests, message, createdAt: new Date().toISOString(), owner };
  let out;
  try {
    out = await update(rows => {
      // Sending again with the same name from the same browser CHANGES that reply (no duplicates).
      const i = rows.findIndex(r => r.owner === owner && r.name.toLowerCase() === name.toLowerCase());
      if (i >= 0) { const next = [...rows]; next[i] = { ...reply, id: rows[i].id }; return { rows: next, out: 'ok' }; }
      if (rows.length >= MAX_REPLIES) return { rows, out: 'full' };
      if (rows.filter(r => r.owner === owner).length >= MAX_PER_BROWSER) return { rows, out: 'limit' };
      return { rows: [...rows, reply], out: 'ok' };
    });
  } catch (e) { console.error('rsvp: save failed', e); return json({ error: 'Could not send. Please try again.' }, 500); }
  if (out === 'full') return json({ error: 'We have reached the most replies this page can hold. Please message us directly. Thank you!' }, 429);
  if (out === 'limit') return json({ error: "This browser has already sent the most replies it can. Thank you!" }, 429);
  const { owner: _o, ...safe } = reply;
  return json(safe, 201, headers);
}
