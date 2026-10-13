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
    $$('.nav a').forEach(a => {
      if (a.dataset.route === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITLES[page];
    if (page === 'home') $('#envelope').classList.remove('is-opening');
    window.scrollTo(0, 0);
    registry.setActive(page === 'registry');
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

  addEventListener('hashchange', route);
  route();
})();
