UNO'S DEDICATION CEREMONY — INVITATION WEBSITE  (Vercel version)

PAGES (all in public/index.html, switched with the address hash)
  #/                  Home: click the envelope
  #/details           Details: invitation, map, prayer registry link, music, RSVP link, countdown
  #/prayer-registry   Prayer Registry: guests leave notes
  #/rsvp              RSVP: Attending / Not Attending and an optional private message, one reply per browser (no public wall)

FOLDER
  public/index.html        page structure
  public/css/styles.css    all styling
  public/js/app.js         router, menu, countdown, music, prayer wall, RSVP   (settings at the top: CONFIG)
  public/fonts/            the site's fonts, hosted with the site (works offline, no Google Fonts)
  public/assets/           all artwork. Replace any PNG with a sharper original of the SAME filename.
                             (Cut from the PDF's clipart sheets and upscaled 4x; originals would be sharper still.)
  api/prayers.js           backend for the Prayer Registry (list, post, delete)
  api/rsvp.js              backend for the RSVP page (post, and read back your own reply)
  api/status.js            open /api/status to check that saving works
  local.js                 run on your computer
  package.json             needs @vercel/blob

THINGS TO DO
  1. MUSIC: public/assets/music.mp3 is already in place (Steadfast Love, piano). To change it, replace that file (same name).
     It starts when a guest taps the envelope (or the Details link in the menu) and keeps playing across pages.
     Browsers block sound until a tap, so a guest who opens #/details directly starts it with their first tap.
     If a guest stops it with the vinyl, it stays off until they tap the vinyl again.
  2. MAP: every map link and the RSVP page's embedded map use the exact pin 14.7217646,121.0522609
     (Jollibee Mindanao Ave). To change it, search public/index.html for "14.7217646".
  3. DATE/TIME: change eventDate in public/js/app.js (CONFIG) for the countdown.

RUN ON YOUR COMPUTER
  1. Install Node.js (LTS).  2. In this folder run:  node local.js  3. Open http://localhost:3000
  Prayers are saved in prayers.txt and RSVPs in rsvps.txt in this folder. Stop with Ctrl+C.

DEPLOY ON VERCEL
  1. Create a Vercel project from this folder (push to GitHub, or: npx vercel --prod). Framework preset: "Other".
  2. Storage tab > Create Storage > Blob > access PRIVATE > connect to the project. Redeploy.
  3. View/download prayers.txt and rsvps.txt: Vercel dashboard > Storage > your Blob store.

RSVP EMAIL NOTIFICATIONS (Web3Forms)
  Every RSVP is also emailed to you (engr.julia.rt@gmail.com) with the name, answer and message.
  1. Go to https://web3forms.com, type engr.julia.rt@gmail.com and press "Create Access Key".
     The key is emailed to you (free plan: 250 emails a month, no sign-up needed).
  2. Paste it into web3formsKey at the top of public/js/app.js (CONFIG), then redeploy.
  3. Send a test RSVP. The first email may land in Spam: mark it "Not spam".
  The key is meant to be public (it can only SEND to your address). The email is sent from the guest's browser
  because Web3Forms' free plan does not allow server-side sends. If the email fails, the RSVP is still saved in
  rsvps.txt, and guests are never shown an error for it. rsvps.txt stays your source of truth.
  Optional hardening: in the Web3Forms dashboard turn on domain restriction (paid plan) once your site is live.

IF POSTING OR RSVP SAYS "COULD NOT POST / COULD NOT SEND"
  Open  https://YOUR-SITE.vercel.app/api/status  (locally: http://localhost:3000/api/status). It says whether saving works and why not.
  Most common cause: the Blob store is missing, was created PUBLIC, or was never connected to the project.
  Fix: Vercel dashboard > Storage > Create > Blob > access PRIVATE > Connect to the project > Redeploy.
  (Creating the store AFTER a deploy needs a redeploy, or the token is not seen.) /api/status also shows the exact error.

  If /api/status says ok but posting still fails, the failed request's Response tab in the browser DevTools
  (Network) shows "code" and "detail" with the real reason.
  (Saving overwrites the whole text file. If Blob rejects the "has anyone else changed it?" check, the code retries and
  then saves without it, so a reply is not lost.)

PRAYER REGISTRY RULES
  - All prayers live in ONE text file (prayers.txt), one note per line.
  - Each browser gets a random cookie; only that browser sees the trash icon on its own notes
    (tap twice to delete). The file stores only a hash of the cookie.
  - Limits (top of api/prayers.js): 10 prayers per browser, 500 in total, 600 characters each.
  - A hidden honeypot field blocks simple bots. To remove a guest's note yourself, edit prayers.txt in the Blob store.
  - Clearing cookies / switching browser means a person can no longer delete their old notes.

RSVP RULES
  - Replies live in ONE text file (rsvps.txt), one JSON line per reply:
      name, attending (true/false), message, createdAt
    (There is no guest count. Older lines from before may still show a "guests" number; ignore it.)
  - There is no public guest wall. A guest only ever sees their own reply on their own browser;
    their message is read by you in rsvps.txt and in the email.
  - ONE reply per browser. Once a browser has replied, the Attending / Not Attending buttons are
    disabled and the server refuses a second reply (even from another tab). This is tied to the
    browser (a cookie), not to a person: someone who clears cookies, uses private mode or another
    phone could reply again.
  - TO TEST AGAIN after replying: open the site in a private/incognito window, or clear the site's
    cookies, or delete that line from rsvps.txt in the Blob store (Storage > your Blob > rsvps.txt).
  - Limits (top of api/rsvp.js): 300 replies in total, 40 characters for the name, 300 for the message.
    The same hidden honeypot as the registry blocks bots.
  - Guests cannot delete a reply; to remove one yourself, edit rsvps.txt in the Blob store.
  - The RSVP deadline (Oct 20, 2026) is only a note on the page. Replies are not blocked after it.
