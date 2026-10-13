PRAYER REGISTRY — Uno's Dedication Ceremony  (Vercel version)

FOLDER
  public/index.html     the website (+ images)
  api/prayers.js        the backend (list, post, delete)
  package.json          needs @vercel/blob

RUN ON YOUR COMPUTER (no Vercel needed)
  1. Install Node.js (LTS) from nodejs.org.
  2. Open this folder in VS Code, then Terminal > New Terminal.
  3. Run:   node local.js
  4. Open http://localhost:3000
  Prayers are saved in prayers.txt in this folder. Stop with Ctrl+C.

HOW IT WORKS
  - All prayers are kept in ONE text file, prayers.txt (one note per line): in a Vercel Blob store
    when deployed, or in this folder when you run locally.
  - Anyone can post, with a name or anonymously.
  - Each browser gets a random cookie when it first posts. Only that browser sees a small
    trash icon on its own notes and can delete them (click twice to confirm).
    The file stores only a hash of the cookie, never the cookie itself.

DEPLOY ON VERCEL
  1. Create a Vercel project from this folder (push to GitHub, or run:  npx vercel --prod).
     Framework preset: "Other".
  2. In the project: Storage tab > Create Storage > Blob > set access to PRIVATE >
     connect it to the project (Production + Preview, and Development if testing locally).
  3. Redeploy so the project picks up the storage connection.
  4. To view/download prayers.txt: Vercel dashboard > Storage > your Blob store.

TEST WITH THE REAL VERCEL STORAGE LOCALLY (optional)
  npm install
  npx vercel link
  npx vercel env pull
  npx vercel dev          then open http://localhost:3000

EMBED (16:9)
  <div style="position:relative;width:100%;aspect-ratio:16/9;">
    <iframe src="https://YOUR-PROJECT.vercel.app/" title="Prayer Registry"
      style="position:absolute;inset:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
  </div>

NOTES
  - Safari blocks cookies in embedded pages, so in Safari inside the embed people can post
    but won't see the trash icon. Opening the site directly works everywhere.
  - Clearing cookies / switching browser means a person can no longer delete their old notes.
  - Add a rate-limit rule in Vercel Firewall if you want spam protection.
