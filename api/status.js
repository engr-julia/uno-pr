// Open  https://YOUR-SITE.vercel.app/api/status  to see whether saving works and, if not, why.
// (Locally: http://localhost:3000/api/status). It shows no secrets. It writes one tiny file, status-check.txt.
import fs from 'node:fs';
import path from 'node:path';

const USE_BLOB = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const ON_VERCEL = !!process.env.VERCEL;
const out = (o, status = 200) => new Response(JSON.stringify(o, null, 2), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET() {
  const info = { onVercel: ON_VERCEL, blobConnected: USE_BLOB, storage: USE_BLOB ? 'vercel-blob' : 'local-file' };
  if (!USE_BLOB && ON_VERCEL) {
    return out({ ...info, ok: false, problem: 'Vercel Blob is not connected, so nothing can be saved.',
      fix: 'Vercel dashboard > your project > Storage > Create > Blob, choose PRIVATE access, connect it to this project, then Redeploy.' }, 503);
  }
  if (!USE_BLOB) {
    try { fs.accessSync(process.cwd(), fs.constants.W_OK); return out({ ...info, ok: true, note: 'Saving to prayers.txt / rsvps.txt in the project folder.' }); }
    catch (e) { return out({ ...info, ok: false, problem: 'The project folder is not writable: ' + e.message }, 500); }
  }
  try {
    const { get, put } = await import('@vercel/blob');
    const r = await get('rsvps.txt', { access: 'private', useCache: false });
    info.readTest = r && r.statusCode === 200 ? 'ok (rsvps.txt exists)' : 'ok (rsvps.txt not created yet)';
    await put('status-check.txt', 'ok ' + new Date().toISOString(), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'text/plain' });
    info.writeTest = 'ok';
    return out({ ...info, ok: true });
  } catch (e) {
    const msg = String((e && e.message) || e).slice(0, 300);
    const hint = /private|public|access/i.test(msg)
      ? 'The Blob store was probably created as PUBLIC. Create a new Blob store with PRIVATE access, connect it to this project, and redeploy.'
      : /token|unauthor|forbidden|401|403/i.test(msg)
        ? 'The Blob token is missing or wrong. Reconnect the Blob store under Storage and redeploy.'
        : 'See the error above and the function logs in the Vercel dashboard.';
    return out({ ...info, ok: false, error: msg, hint }, 500);
  }
}
