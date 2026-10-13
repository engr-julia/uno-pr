UNO'S DEDICATION CEREMONY — INVITATION WEBSITE  (Vercel version)

PAGES (all in public/index.html, switched with the address hash)
  #/                  Home: click the envelope
  #/details           Details: invitation, map, prayer registry link, music, RSVP link, countdown
  #/prayer-registry   Prayer Registry: guests leave notes
  #/rsvp              RSVP: blank for now (see the "coming soon" line in index.html)

FOLDER
  public/index.html        page structure
  public/css/styles.css    all styling
  public/js/app.js         router, countdown, music, prayer wall   (settings at the top: CONFIG)
  public/assets/           all artwork. Replace any PNG with a sharper original of the SAME filename.
  api/prayers.js           backend (list, post, delete)
  local.js                 run on your computer
  package.json             needs @vercel/blob

THINGS TO DO
  1. MUSIC: put your song at public/assets/music.mp3 (until then the vinyl shows "music isn't available").
  2. MAP: the bear/sign link searches the address. For an exact pin, replace the two Google Maps
     links in public/index.html (search for "google.com/maps") with your pin's share link.
  3. DATE/TIME: change eventDate in public/js/app.js (CONFIG) for the countdown.
  4. RSVP: add your form inside <section data-page="rsvp"> in public/index.html.

RUN ON YOUR COMPUTER
  1. Install Node.js (LTS).  2. In this folder run:  node local.js  3. Open http://localhost:3000
  Prayers are saved in prayers.txt in this folder. Stop with Ctrl+C.

DEPLOY ON VERCEL
  1. Create a Vercel project from this folder (push to GitHub, or: npx vercel --prod). Framework preset: "Other".
  2. Storage tab > Create Storage > Blob > access PRIVATE > connect to the project. Redeploy.
  3. View/download prayers.txt: Vercel dashboard > Storage > your Blob store.

PRAYER REGISTRY RULES
  - All prayers live in ONE text file (prayers.txt), one note per line.
  - Each browser gets a random cookie; only that browser sees the trash icon on its own notes
    (tap twice to delete). The file stores only a hash of the cookie.
  - Limits (top of api/prayers.js): 10 prayers per browser, 500 in total, 600 characters each.
  - A hidden honeypot field blocks simple bots. To remove a guest's note yourself, edit prayers.txt in the Blob store.
  - Clearing cookies / switching browser means a person can no longer delete their old notes.
