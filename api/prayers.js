import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// On Vercel the text file lives in Vercel Blob. On your own computer (no Blob credentials)
// it is a plain prayers.txt in the project folder.
const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL_FILE = path.join(process.cwd(), 'prayers.txt');

const FILE = 'prayers.txt';                 // the single text file (one JSON note per line)
const COLORS = ['white', 'sky', 'sand', 'periwinkle'];
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });

// ---- who is this browser? (random id kept in an HttpOnly cookie) ----
const getOwner = req => (req.headers.get('cookie') || '').match(/(?:^|;\s*)pr_owner=([a-f0-9]{32})/)?.[1] || null;
const ownerCookie = id => USE_BLOB
  ? `pr_owner=${id}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=None; Partitioned`  // works inside an iframe
  : `pr_owner=${id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`;                         // plain http://localhost
const parse = text => text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const serialize = notes => notes.map(n => JSON.stringify(n)).join('\n') + (notes.length ? '\n' : '');

// ---- the text file ----
async function read() {
  if (!USE_BLOB) return { notes: fs.existsSync(LOCAL_FILE) ? parse(fs.readFileSync(LOCAL_FILE, 'utf8')) : [], etag: null };
  const { get } = await import('@vercel/blob');
  const r = await get(FILE, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return { notes: [], etag: null };
  const text = await new Response(r.stream).text();
  return { notes: parse(text), etag: r.blob.etag };
}
// Read, change, write back. If two people save at the same moment, the second retries.
async function update(change) {
  if (!USE_BLOB) { // local file: no awaits between read and write, so it can't interleave
    const { notes } = await read();
    const { notes: next, out } = change(notes);
    if (next !== notes) fs.writeFileSync(LOCAL_FILE, serialize(next));
    return out;
  }
  const { put, BlobPreconditionFailedError } = await import('@vercel/blob');
  for (let i = 0; i < 5; i++) {
    const { notes, etag } = await read();
    const { notes: next, out } = change(notes);
    if (next === notes) return out; // nothing to save
    const body = serialize(next);
    try {
      await put(FILE, body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'text/plain', ...(etag ? { ifMatch: etag } : {}) });
      return out;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError) || i === 4) throw e;
    }
  }
}

export async function GET(req) {
  const me = getOwner(req) && sha(getOwner(req));
  const { notes } = await read();
  // never send the owner hash to the browser, only "mine: true/false"
  return json(notes.map(({ owner, ...n }) => ({ ...n, mine: !!me && owner === me })).reverse());
}

export async function POST(req) {
  let b; try { b = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const message = String(b.message || '').trim().slice(0, 600);
  if (!message) return json({ error: 'Please write a prayer first.' }, 400);
  const anonymous = b.anonymous === true;
  const name = anonymous ? '' : String(b.name || '').trim().slice(0, 40);

  let ownerId = getOwner(req), headers = {};
  if (!ownerId) { ownerId = crypto.randomBytes(16).toString('hex'); headers['Set-Cookie'] = ownerCookie(ownerId); }

  const note = {
    id: crypto.randomBytes(6).toString('hex'),
    name: name || 'Anonymous', message,
    color: COLORS.includes(b.color) ? b.color : 'white',
    createdAt: new Date().toISOString(),
    owner: sha(ownerId),                      // only a hash is stored in prayers.txt
  };
  await update(notes => ({ notes: [...notes, note], out: null }));
  const { owner, ...safe } = note;
  return json({ ...safe, mine: true }, 201, headers);
}

export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get('id');
  const ownerId = getOwner(req);
  if (!id || !ownerId) return json({ error: 'You can only delete prayers posted from this browser.' }, 403);
  const result = await update(notes => {
    const n = notes.find(x => x.id === id);
    if (!n) return { notes, out: 404 };
    if (n.owner !== sha(ownerId)) return { notes, out: 403 };
    return { notes: notes.filter(x => x.id !== id), out: 200 };
  });
  return result === 200 ? json({ ok: true })
    : json({ error: result === 404 ? 'Prayer not found.' : 'You can only delete prayers posted from this browser.' }, result);
}
