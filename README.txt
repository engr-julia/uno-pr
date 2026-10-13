UNO'S DEDICATION CEREMONY — INVITATION WEBSITE  (Vercel version)

PAGES (all in public/index.html, switched with the address hash)
  #/                  Home: click the envelope
  #/details           Details: invitation, map, prayer registry link, music, RSVP link, countdown
  #/prayer-registry   Prayer Registry: guests leave notes
  #/rsvp              RSVP: Attending / Not Attending, guest count and an optional private message (no public wall)

FOLDER
  public/index.html        page structure
  public/css/styles.css    all styling
  public/js/app.js         router, menu, countdown, music, prayer wall, RSVP   (settings at the top: CONFIG)
  public/fonts/            the site's fonts, hosted with the site (works offline, no Google Fonts)
  public/assets/           all artwork. Replace any PNG with a sharper original of the SAME filename.
                             (Cut from the PDF's clipart sheets and upscaled 4x; originals would be sharper still.)
  api/prayers.js           backend for the Prayer Registry (list, post, delete)
  api/rsvp.js              backend for the RSVP page (post, and read back your own reply)
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
  Every RSVP is also emailed to you (engr.julia.rt@gmail.com) with the name, answer, number of guests and message.
  1. Go to https://web3forms.com, type engr.julia.rt@gmail.com and press "Create Access Key".
     The key is emailed to you (free plan: 250 emails a month, no sign-up needed).
  2. Paste it into web3formsKey at the top of public/js/app.js (CONFIG), then redeploy.
  3. Send a test RSVP. The first email may land in Spam: mark it "Not spam".
  The key is meant to be public (it can only SEND to your address). The email is sent from the guest's browser
  because Web3Forms' free plan does not allow server-side sends. If the email fails, the RSVP is still saved in
  rsvps.txt, and guests are never shown an error for it. rsvps.txt stays your source of truth.
  Optional hardening: in the Web3Forms dashboard turn on domain restriction (paid plan) once your site is live.

PRAYER REGISTRY RULES
  - All prayers live in ONE text file (prayers.txt), one note per line.
  - Each browser gets a random cookie; only that browser sees the trash icon on its own notes
    (tap twice to delete). The file stores only a hash of the cookie.
  - Limits (top of api/prayers.js): 10 prayers per browser, 500 in total, 600 characters each.
  - A hidden honeypot field blocks simple bots. To remove a guest's note yourself, edit prayers.txt in the Blob store.
  - Clearing cookies / switching browser means a person can no longer delete their old notes.

RSVP RULES
  - Replies live in ONE text file (rsvps.txt), one JSON line per reply:
      name, attending (true/false), guests, message, createdAt
    "guests" is the number of people coming (1-10, including the person replying). Add up the
    guests of the attending lines for your headcount. Add them up for your headcount.
  - There is no public guest wall. A guest only ever sees their own reply on their own browser;
    their message is read by you in rsvps.txt.
  - Sending again from the same browser with the SAME name changes that reply (no duplicates).
    A different name from the same browser adds another reply, so one phone can answer for a family.
  - Limits (top of api/rsvp.js): 10 replies per browser, 300 in total, 10 guests per reply,
    40 characters for the name, 300 for the message. The same hidden honeypot as the registry blocks bots.
  - Guests cannot delete a reply; to remove one yourself, edit rsvps.txt in the Blob store.
  - The RSVP deadline (Oct 20, 2026) is only a note on the page. Replies are not blocked after it.
