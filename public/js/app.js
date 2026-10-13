/* Uno's Dedication Ceremony — invitation website
   One page, four "screens" (Home, Details, Prayer Registry, RSVP) switched with the
   address bar hash (#/, #/details, #/prayer-registry, #/rsvp). Keeping it one page lets
   the music keep playing while guests move between screens. */
(() => {
  'use strict';

  /* ------------------------------ settings ------------------------------ */
  const CONFIG = {
    eventDate: '2026-11-07T17:00:00+08:00',   // Nov 7, 2026 · 5:00 PM Philippine time
    prayersApi: '/api/prayers',
    rsvpApi: '/api/rsvp',
    pollMs: 20000,                             // how often the registry refreshes while open
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ------------------------------ menu (phones) ------------------------------ */
  const nav = $('#nav'), toggle = $('#nav-toggle'), scrim = $('#nav-scrim');
  const desktop = matchMedia('(min-width: 880px)');
  function setMenu(open, returnFocus = true) {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) $('#menu a[aria-current="page"], #menu a').focus({ preventScroll: true });
    else if (returnFocus && !desktop.matches) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $('#menu-close').addEventListener('click', () => setMenu(false));
  scrim.addEventListener('click', () => setMenu(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false); });
  desktop.addEventListener('change', () => setMenu(false, false));
  // tapping the link of the page you are already on does not change the hash, so close the menu here too
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false, false)));

  /* ------------------------------- router ------------------------------- */
  const ROUTES = { '': 'home', '/': 'home', '/details': 'details', '/prayer-registry': 'registry', '/rsvp': 'rsvp' };
  const TITLES = {
    home: "You're Invited — Uno's Dedication Ceremony",
    details: "Details — Uno's Dedication Ceremony",
    registry: 'Prayer Registry for Uno',
    rsvp: "RSVP — Uno's Dedication Ceremony",
  };
  const currentPage = () => ROUTES[location.hash.replace(/^#/, '')] || 'home';

  function route() {
    const page = currentPage();
    $$('.page').forEach(p => { p.hidden = p.dataset.page !== page; });
    $$('#menu a').forEach(a => {
      if (a.dataset.route === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITLES[page];
    if (page === 'home') $('#envelope').classList.remove('is-opening');
    setMenu(false, false);
    window.scrollTo(0, 0);
    registry.setActive(page === 'registry');
    rsvp.setActive(page === 'rsvp');
  }

  /* ----------------------------- home: envelope ----------------------------- */
  $('#envelope').addEventListener('click', e => {
    const env = e.currentTarget;
    if (env.classList.contains('is-opening')) return;
    env.classList.add('is-opening');
    setTimeout(() => { location.hash = '#/details'; }, reduceMotion ? 0 : 850);
  });

  /* ------------------------------ countdown ------------------------------ */
  const target = new Date(CONFIG.eventDate).getTime();
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    const left = Math.max(0, target - Date.now());
    const s = Math.floor(left / 1000);
    $('#cd-d').textContent = pad(Math.floor(s / 86400));
    $('#cd-h').textContent = pad(Math.floor((s % 86400) / 3600));
    $('#cd-m').textContent = pad(Math.floor((s % 3600) / 60));
    $('#cd-s').textContent = pad(s % 60);
    $('#cd-title').textContent = left === 0 ? 'The big day is here!' : 'Until the big day';
  }
  setInterval(tick, 1000);
  tick();

  /* ------------------------------- music ------------------------------- */
  const audio = $('#bgm');
  const vinyl = $('#vinyl');
  vinyl.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); return; }
    try { await audio.play(); }
    catch { toast("The music isn't available right now."); }
  });
  audio.addEventListener('play', () => { vinyl.classList.add('is-playing'); vinyl.setAttribute('aria-pressed', 'true'); });
  audio.addEventListener('pause', () => { vinyl.classList.remove('is-playing'); vinyl.setAttribute('aria-pressed', 'false'); });
  // If the music file is missing or can't load, stop the vinyl spinning and say so.
  audio.addEventListener('error', () => { audio.pause(); toast("The music isn't available right now."); }, true);

  /* ---------------------------- prayer registry ---------------------------- */
  const registry = (() => {
    const wall = $('#wall');
    const dlg = $('#prayer-dialog');
    const form = $('#prayer-form');
    let lastKey = '', current = [], firstLoad = true, lastCols = 0, timer = null, active = false;

    const ago = iso => {
      const s = (Date.now() - new Date(iso)) / 1000;
      if (s < 60) return 'just now';
      if (s < 3600) return Math.floor(s / 60) + ' min ago';
      if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
      if (s < 604800) return Math.floor(s / 86400) + ' d ago';
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
    const rot = id => ((parseInt(id.slice(0, 4), 16) % 41) - 20) / 10 + 'deg';
    const columnCount = () => { const w = wall.clientWidth; return w >= 800 ? 3 : w >= 520 ? 2 : 1; };

    function render(list, force) {
      const key = list.map(n => n.id + (n.mine ? '*' : '')).join();
      if (key === lastKey && !force) return;
      const prev = new Set(lastKey.split(',').map(x => x.replace('*', '')));
      lastKey = key; current = list;
      wall.textContent = '';
      lastCols = columnCount();
      const cols = Array.from({ length: lastCols }, () => { const c = document.createElement('div'); c.className = 'col'; wall.append(c); return c; });
      list.forEach(n => {
        const el = document.createElement('article');
        el.className = 'note ' + n.color + (!firstLoad && !prev.has(n.id) ? ' new' : '');
        el.style.setProperty('--r', rot(n.id));
        const tape = document.createElement('i'); tape.className = 'tape';
        const p = document.createElement('p'); p.textContent = n.message;
        const who = document.createElement('div'); who.className = 'who';
        const b = document.createElement('b'); b.textContent = n.name;
        const t = document.createElement('time'); t.textContent = ago(n.createdAt); t.dateTime = n.createdAt;
        who.append(b, t);
        if (n.mine) who.append(trashButton(n.id));
        el.append(tape, p, who);
        // put each new note in the currently shortest column (masonry look)
        cols.reduce((a, c) => (c.offsetHeight < a.offsetHeight ? c : a)).append(el);
      });
      $('#empty').hidden = list.length > 0;
      firstLoad = false;
    }

    // Trash icon shows only on notes posted from this browser. First tap arms it, second deletes.
    function trashButton(id) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'trash'; b.title = 'Delete my prayer'; b.setAttribute('aria-label', 'Delete my prayer');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
      let timer;
      b.onclick = async () => {
        if (!b.classList.contains('armed')) {
          b.classList.add('armed'); b.title = 'Tap again to delete';
          timer = setTimeout(() => { b.classList.remove('armed'); b.title = 'Delete my prayer'; }, 3000);
          return;
        }
        clearTimeout(timer); b.disabled = true;
        try {
          const r = await fetch(CONFIG.prayersApi + '?id=' + encodeURIComponent(id), { method: 'DELETE' });
          toast(r.ok ? 'Your prayer was deleted.' : 'You can only delete prayers posted from this browser.');
        } catch { toast('Could not delete. Please try again.'); }
        load(true);
      };
      return b;
    }

    async function load(force) {
      const status = $('#wall-status');
      try {
        const r = await fetch(CONFIG.prayersApi, { cache: 'no-store' });
        if (!r.ok) throw new Error('bad status');
        render(await r.json(), force);
        status.textContent = '';
      } catch {
        if (!current.length) status.textContent = "Couldn't load the prayers just now. Trying again…";
      }
    }

    /* dialog */
    const closeDialog = () => { dlg.close(); $('#err').textContent = ''; };
    $('#open-prayer').onclick = () => { dlg.showModal(); $('#msg').focus(); };
    $('#cancel').onclick = closeDialog;
    dlg.addEventListener('click', e => { if (e.target === dlg) closeDialog(); });   // tap on the dimmed backdrop
    $('#msg').oninput = e => { $('#count').textContent = e.target.value.length + ' / 600'; };
    $('#anon').onchange = e => { $('#name').disabled = e.target.checked; if (e.target.checked) $('#name').value = ''; };

    form.onsubmit = async e => {
      e.preventDefault();
      const msg = $('#msg').value.trim();
      const err = $('#err');
      if (!msg) { err.textContent = 'Please write a prayer first.'; return; }
      $('#send').disabled = true;
      try {
        const r = await fetch(CONFIG.prayersApi, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg, name: $('#name').value, anonymous: $('#anon').checked,
            color: $('input[name=color]:checked').value, website: $('#website').value,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Could not post. Please try again.');
        form.reset(); $('#name').disabled = false; $('#count').textContent = '0 / 600';
        closeDialog(); await load(); toast('Your prayer was posted. Thank you!');
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      } catch (ex) { err.textContent = ex.message; }
      $('#send').disabled = false;
    };

    addEventListener('resize', () => { if (active && columnCount() !== lastCols) render(current, true); });

    return {
      // Only refresh while the registry is on screen (and the tab is visible) — saves reads.
      setActive(on) {
        active = on;
        clearInterval(timer);
        if (!on) return;
        load(true);
        timer = setInterval(() => { if (!document.hidden) load(); }, CONFIG.pollMs);
      },
    };
  })();

  /* --------------------------------- RSVP --------------------------------- */
  const rsvp = (() => {
    const dlg = $('#rsvp-dialog');
    const form = $('#rsvp-form');
    const MAX_GUESTS = 10;
    let mine = [], attending = true;

    // guests dropdown: 1..10
    $('#rsvp-guests').innerHTML = Array.from({ length: MAX_GUESTS }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');

    function renderMine() {
      const box = $('#rsvp-mine');
      box.textContent = '';
      const last = mine[0];
      $('#rsvp-yes').setAttribute('aria-pressed', String(!!last && last.attending));
      $('#rsvp-no').setAttribute('aria-pressed', String(!!last && !last.attending));
      mine.forEach(r => {
        const line = document.createElement('div');
        line.textContent = (r.attending ? '✓ ' : '✗ ') + r.name + (r.attending
          ? ' · attending' + (r.guests > 1 ? ' (' + r.guests + ' people)' : '')
          : ' · not attending');
        box.append(line);
      });
      if (mine.length) {
        const hint = document.createElement('small');
        hint.textContent = 'Need to change your reply? Tap a button and send it again with the same name.';
        box.append(hint);
      }
    }

    // Only asks the server for THIS browser's own replies (so the buttons can show what you answered).
    async function load() {
      try {
        const r = await fetch(CONFIG.rsvpApi, { cache: 'no-store' });
        if (!r.ok) throw new Error('bad status');
        mine = (await r.json()).mine || [];
        renderMine();
      } catch { /* not important: the buttons still work */ }
    }

    /* dialog */
    function openDialog(isAttending) {
      attending = isAttending;
      const last = mine[0];
      $('#rsvp-dlg-title').textContent = isAttending ? 'We’ll be there!' : 'Sorry we’ll miss you';
      $('#rsvp-dlg-sub').textContent = isAttending ? 'Let us know who’s coming.' : 'Thank you for letting us know.';
      $('#rsvp-guests-wrap').hidden = !isAttending;
      $('#rsvp-send').textContent = isAttending ? 'Confirm' : 'Send reply';
      if (last) {
        $('#rsvp-name').value = last.name;
        $('#rsvp-msg').value = last.message || '';
        if (isAttending) $('#rsvp-guests').value = String(last.guests || 1);
        $('#rsvp-count').textContent = $('#rsvp-msg').value.length + ' / 300';
      }
      dlg.showModal();
      $('#rsvp-name').focus();
    }
    const closeDialog = () => { dlg.close(); $('#rsvp-err').textContent = ''; };
    $('#rsvp-yes').onclick = () => openDialog(true);
    $('#rsvp-no').onclick = () => openDialog(false);
    $('#rsvp-cancel').onclick = closeDialog;
    dlg.addEventListener('click', e => { if (e.target === dlg) closeDialog(); });
    $('#rsvp-msg').oninput = e => { $('#rsvp-count').textContent = e.target.value.length + ' / 300'; };

    form.onsubmit = async e => {
      e.preventDefault();
      const err = $('#rsvp-err');
      const name = $('#rsvp-name').value.trim();
      if (!name) { err.textContent = 'Please enter your name.'; return; }
      $('#rsvp-send').disabled = true;
      try {
        const r = await fetch(CONFIG.rsvpApi, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, attending, guests: Number($('#rsvp-guests').value),
            message: $('#rsvp-msg').value, website: $('#rsvp-website').value,
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Could not send. Please try again.');
        form.reset(); $('#rsvp-count').textContent = '0 / 300';
        closeDialog(); await load();
        toast(attending ? 'Thank you! See you there.' : 'Thank you for letting us know.');
      } catch (ex) { err.textContent = ex.message; }
      $('#rsvp-send').disabled = false;
    };

    return {
      // Load this browser's own replies once, when the RSVP page opens.
      setActive(on) {
        if (on) load();
      },
    };
  })();

  addEventListener('hashchange', route);
  route();
})();
