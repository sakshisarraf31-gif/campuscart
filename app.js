'use strict';

/* Enable progressive enhancement for animations */
document.documentElement.classList.add('js');

/* CampusCart — front-end demo logic.
   Data lives in the browser (localStorage) so you can test every flow without a backend.
   Replace the functions in the "storage" section with API calls once you pick a backend. */

/* ---------- config ---------- */
const ALLOWED_DOMAINS = ['.edu', '.ac.in', '.edu.in', '.ac.uk']; // university email endings
const CATEGORIES = [
  ['books', 'Books', '📚'],
  ['electronics', 'Electronics', '💻'],
  ['furniture', 'Furniture', '🪑'],
  ['rides', 'Cycles and rides', '🚲'],
  ['clothing', 'Clothing', '👕'],
  ['lab', 'Lab and stationery', '🧪'],
  ['hostel', 'Hostel essentials', '🛏️'],
  ['other', 'Other', '📦'],
];
const MODES = [['sell', 'For sale'], ['rent', 'For rent'], ['swap', 'Swap'], ['free', 'Free']];
const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];

/* ---------- storage ---------- */
const KEY = { users: 'cc_users', session: 'cc_session', listings: 'cc_listings', saved: 'cc_saved', msgs: 'cc_msgs' };
const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

const SEED = [
  { title: 'Engineering Mathematics III (Grewal)', category: 'books', mode: 'sell', price: 180, condition: 'Good', location: 'Block C hostel', description: 'Clean copy, a few pencil notes in chapters 3 and 4. Selling because the semester is over.', sellerName: 'Priya S.', ago: 3 },
  { title: 'Hostel kettle, 1.5 L', category: 'hostel', mode: 'sell', price: 250, condition: 'Like new', location: 'Main gate', description: 'Used for one semester. Auto switch-off works fine.', sellerName: 'Arjun M.', ago: 8 },
  { title: 'Hero Sprint cycle, 21 gear', category: 'rides', mode: 'rent', price: 40, condition: 'Good', location: 'Library parking', description: 'Rent by the day. Helmet included. Deposit of ₹500 returned on drop-off.', sellerName: 'Karthik R.', ago: 20 },
  { title: 'Scientific calculator fx-991EX', category: 'electronics', mode: 'sell', price: 700, condition: 'Like new', location: 'Admin block', description: 'Exam approved. Original cover and manual included.', sellerName: 'Sneha V.', ago: 30 },
  { title: 'Study table with drawer', category: 'furniture', mode: 'sell', price: 1200, condition: 'Good', location: 'Block A hostel', description: 'Sturdy wooden table. Buyer collects. Can help carry it to your room.', sellerName: 'Imran K.', ago: 52 },
  { title: 'Lab coat, size M', category: 'lab', mode: 'free', price: 0, condition: 'Good', location: 'Chemistry dept', description: 'Washed and ironed. Free to a first year who needs one.', sellerName: 'Divya N.', ago: 70 },
  { title: 'Data Structures notes for a Discrete Maths swap', category: 'books', mode: 'swap', price: 0, condition: 'Good', location: 'CSE block', description: 'Handwritten, full syllabus. Looking for Discrete Maths notes in return.', sellerName: 'Rahul T.', ago: 90 },
  { title: 'Formal blazer, navy, size 40', category: 'clothing', mode: 'rent', price: 150, condition: 'Like new', location: 'Main gate', description: 'Perfect for placement interviews and presentations. Dry cleaned between rentals.', sellerName: 'Meera J.', ago: 120 },
].map((s, i) => ({
  id: 'seed' + i, sellerEmail: 'seed' + i + '@campus.edu', sold: false,
  createdAt: Date.now() - s.ago * 3600 * 1000, image: '', ...s,
}));

function allListings() {
  let l = read(KEY.listings, null);
  if (!l) { l = SEED; write(KEY.listings, l); }
  return l;
}
const saveListings = (l) => write(KEY.listings, l);

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const catOf = (id) => CATEGORIES.find((c) => c[0] === id) || CATEGORIES[CATEGORIES.length - 1];
const modeLabel = (id) => (MODES.find((m) => m[0] === id) || [])[1] || id;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function priceText(l) {
  if (l.mode === 'free') return 'Free';
  if (l.mode === 'swap') return 'Swap';
  return '₹' + Number(l.price).toLocaleString('en-IN') + (l.mode === 'rent' ? ' / day' : '');
}
function timeAgo(ts) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}
let toastTimer;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}
function thumbHTML(l) {
  return `<div class="thumb">${l.image ? `<img src="${l.image}" alt="${esc(l.title)}">` : `<span aria-hidden="true">${catOf(l.category)[2]}</span>`}</div>`;
}

/* ---------- auth ---------- */
const session = () => read(KEY.session, null);
function requireAuth() {
  const s = session();
  if (!s) { location.replace('index.html'); return null; }
  return s;
}
function validEmail(email) {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email address.';
  if (!ALLOWED_DOMAINS.some((d) => e.endsWith(d))) return 'Use your university email (ending in ' + ALLOWED_DOMAINS.join(', ') + ').';
  return '';
}
function signup(name, email, password) {
  const err = validEmail(email);
  if (err) return err;
  if (name.trim().length < 2) return 'Enter your full name.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  const users = read(KEY.users, []);
  const e = email.trim().toLowerCase();
  if (users.some((u) => u.email === e)) return 'That email already has an account. Log in instead.';
  users.push({ name: name.trim(), email: e, password, joined: Date.now() });
  write(KEY.users, users);
  write(KEY.session, { name: name.trim(), email: e });
  return '';
}
function login(email, password) {
  const e = email.trim().toLowerCase();
  const u = read(KEY.users, []).find((x) => x.email === e);
  if (!u) return 'No account found for that email. Create one first.';
  if (u.password !== password) return 'Wrong password. Try again.';
  write(KEY.session, { name: u.name, email: u.email });
  return '';
}
function logout() { localStorage.removeItem(KEY.session); location.href = 'index.html'; }

function renderNav(active) {
  const u = session(); const el = $('#nav'); if (!el || !u) return;
  const link = (href, id, label) => `<a href="${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`;
  el.innerHTML = `<a class="brand" href="home.html">CampusCart</a>
    <nav aria-label="Main">${link('home.html', 'home', 'Home')}${link('buy.html', 'buy', 'Buy')}${link('sell.html', 'sell', 'Sell')}</nav>
    <div class="who"><span>${esc(u.name.split(' ')[0])}</span><button class="btn ghost" id="logout" type="button">Log out</button></div>`;
  $('#logout').addEventListener('click', logout);
}

/* ---------- page: landing / auth ---------- */
function initLanding() {
  if (session()) { location.replace('home.html'); return; }
  const tabs = document.querySelectorAll('.tabs button');
  const forms = { login: $('#loginForm'), signup: $('#signupForm') };
  function show(which) {
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === which)));
    Object.entries(forms).forEach(([k, f]) => (f.hidden = k !== which));
  }
  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  show('login');

  forms.login.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const err = login($('#lEmail').value, $('#lPass').value);
    if (err) { $('#lErr').textContent = err; return; }
    location.href = 'home.html';
  });
  forms.signup.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if ($('#sPass').value !== $('#sPass2').value) { $('#sErr').textContent = 'Passwords do not match.'; return; }
    const err = signup($('#sName').value, $('#sEmail').value, $('#sPass').value);
    if (err) { $('#sErr').textContent = err; return; }
    location.href = 'home.html';
  });

  // "just listed" teaser from real listing data
  const list = $('#justListed');
  if (list) {
    list.innerHTML = allListings().filter((l) => !l.sold).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)
      .map((l) => `<li><span>${esc(l.title)}</span><span>${priceText(l)}</span></li>`).join('');
  }
}

/* ---------- page: home (choose buy or sell) ---------- */
function initHome() {
  const u = requireAuth(); if (!u) return;
  renderNav('home');
  $('#hello').textContent = 'Hi ' + u.name.split(' ')[0] + '.';
  const listings = allListings();
  const msgs = read(KEY.msgs, []);
  $('#cBuy').textContent = listings.filter((l) => !l.sold).length + ' items listed on campus';
  const mine = listings.filter((l) => l.sellerEmail === u.email && !l.sold).length;
  $('#sMine').textContent = mine;
  $('#sSaved').textContent = (read(KEY.saved, {})[u.email] || []).length;
  $('#sMsgs').textContent = msgs.filter((m) => m.to === u.email).length;
}

/* ---------- page: buy ---------- */
function initBuy() {
  const u = requireAuth(); if (!u) return;
  renderNav('buy');
  const state = { q: '', cat: 'all', mode: 'all', sort: 'new' };
  const dlg = $('#detail');

  $('#chips').innerHTML = [['all', 'All'], ...CATEGORIES.map((c) => [c[0], c[1]])]
    .map(([id, label]) => `<button type="button" class="chip" data-cat="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('');
  $('#modeSel').innerHTML = '<option value="all">Any type</option>' + MODES.map((m) => `<option value="${m[0]}">${m[1]}</option>`).join('');

  const savedIds = () => (read(KEY.saved, {})[u.email] || []);
  function toggleSaved(id) {
    const all = read(KEY.saved, {}); const cur = all[u.email] || [];
    all[u.email] = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    write(KEY.saved, all);
    return all[u.email].includes(id);
  }

  function render() {
    let items = allListings().filter((l) => !l.sold);
    if (state.cat !== 'all') items = items.filter((l) => l.category === state.cat);
    if (state.mode !== 'all') items = items.filter((l) => l.mode === state.mode);
    if (state.q) { const q = state.q.toLowerCase(); items = items.filter((l) => (l.title + ' ' + l.description + ' ' + l.location).toLowerCase().includes(q)); }
    const sorters = { new: (a, b) => b.createdAt - a.createdAt, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price };
    items.sort(sorters[state.sort]);
    $('#count').textContent = items.length + (items.length === 1 ? ' item' : ' items');
    $('#grid').innerHTML = items.length ? items.map((l) => `
      <button class="item" type="button" data-id="${l.id}">
        ${thumbHTML(l)}
        <span class="body">
          <span class="tag${l.mode === 'sell' ? ' plain' : ''}">${modeLabel(l.mode)}</span>
          <span class="t">${esc(l.title)}</span>
          <span class="p">${priceText(l)}</span>
          <span class="m">${esc(l.location)}, ${timeAgo(l.createdAt)}</span>
        </span>
      </button>`).join('')
      : `<div class="empty" style="grid-column:1/-1"><b>Nothing matches yet</b>Try another category or clear your search. Have one to offer? <a href="sell.html">List it</a>.</div>`;
  }

  function openDetail(id) {
    const l = allListings().find((x) => x.id === id); if (!l) return;
    const own = l.sellerEmail === u.email;
    const saved = savedIds().includes(id);
    dlg.innerHTML = `
      <div class="closebar"><button type="button" id="dClose" aria-label="Close">Close</button></div>
      <div class="dlg">
        ${thumbHTML(l)}
        <div class="info">
          <h2>${esc(l.title)}</h2>
          <div class="price">${priceText(l)}</div>
          <div class="row"><span class="tag">${modeLabel(l.mode)}</span><span class="tag plain">${esc(l.condition)}</span><span class="tag plain">${catOf(l.category)[1]}</span></div>
          <p>${esc(l.description) || 'No description added.'}</p>
          <p class="hint">Listed by ${esc(l.sellerName)}, meet at ${esc(l.location)}. ${timeAgo(l.createdAt)}.</p>
          ${own ? '<p class="hint"><b>This is your listing.</b> Manage it from the Sell page.</p>' : `
          <form id="msgForm">
            <label for="msgText">Message ${esc(l.sellerName.split(' ')[0])}</label>
            <textarea id="msgText" required placeholder="Is this still available? Can we meet near the library?"></textarea>
            <div class="row"><button class="btn hi" type="submit">Send message</button>
            <button class="btn ghost" type="button" id="saveBtn">${saved ? 'Saved' : 'Save for later'}</button></div>
          </form>`}
        </div>
      </div>`;
    $('#dClose').addEventListener('click', () => dlg.close());
    const form = $('#msgForm');
    if (form) {
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const msgs = read(KEY.msgs, []);
        msgs.push({ id: uid(), listingId: l.id, title: l.title, from: u.email, fromName: u.name, to: l.sellerEmail, text: $('#msgText').value.trim(), at: Date.now() });
        write(KEY.msgs, msgs);
        dlg.close(); toast('Message sent to ' + l.sellerName.split(' ')[0]);
      });
      $('#saveBtn').addEventListener('click', (ev) => { ev.target.textContent = toggleSaved(id) ? 'Saved' : 'Save for later'; });
    }
    dlg.showModal();
  }

  $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); render(); });
  $('#modeSel').addEventListener('change', (e) => { state.mode = e.target.value; render(); });
  $('#sortSel').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat;
    document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    render();
  });
  $('#grid').addEventListener('click', (e) => { const b = e.target.closest('.item'); if (b) openDetail(b.dataset.id); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  render();
}

/* ---------- page: sell ---------- */
function initSell() {
  const u = requireAuth(); if (!u) return;
  renderNav('sell');
  let imageData = '';

  $('#fCat').innerHTML = CATEGORIES.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('');
  $('#fMode').innerHTML = MODES.map((m) => `<option value="${m[0]}">${m[1]}</option>`).join('');
  $('#fCond').innerHTML = CONDITIONS.map((c) => `<option>${c}</option>`).join('');

  function syncPrice() {
    const m = $('#fMode').value;
    const needs = m === 'sell' || m === 'rent';
    $('#priceWrap').hidden = !needs;
    $('#fPrice').required = needs;
    $('#priceLabel').textContent = m === 'rent' ? 'Rent per day (₹)' : 'Price (₹)';
  }
  $('#fMode').addEventListener('change', syncPrice); syncPrice();

  // resize photo so it fits in browser storage
  $('#fPhoto').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 640; const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * scale; c.height = img.height * scale;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      imageData = c.toDataURL('image/jpeg', 0.72); URL.revokeObjectURL(url);
      $('#preview').src = imageData; $('#preview').hidden = false;
    };
    img.onerror = () => toast('That file is not a readable image.');
    img.src = url;
  });

  $('#sellForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = $('#fMode').value;
    const listing = {
      id: uid(), title: $('#fTitle').value.trim(), category: $('#fCat').value, mode,
      price: mode === 'sell' || mode === 'rent' ? Number($('#fPrice').value) : 0,
      condition: $('#fCond').value, location: $('#fLoc').value.trim(), description: $('#fDesc').value.trim(),
      image: imageData, sellerEmail: u.email, sellerName: u.name, sold: false, createdAt: Date.now(),
    };
    const all = allListings(); all.unshift(listing);
    if (!saveListings(all)) { all.shift(); toast('Storage is full. Remove a photo or an old listing.'); return; }
    e.target.reset(); imageData = ''; $('#preview').hidden = true; syncPrice();
    renderMine(); toast('Listed. Students can see it now.');
  });

  function renderMine() {
    const mine = allListings().filter((l) => l.sellerEmail === u.email);
    $('#mine').innerHTML = mine.length ? mine.map((l) => `
      <li>${thumbHTML(l)}
        <div class="grow"><b>${esc(l.title)}</b><span>${priceText(l)}${l.sold ? ', marked sold' : ''}</span></div>
        <div class="acts">
          ${l.sold ? '' : `<button class="btn ghost" data-act="sold" data-id="${l.id}" type="button">Mark sold</button>`}
          <button class="btn danger" data-act="del" data-id="${l.id}" type="button">Delete</button>
        </div></li>`).join('')
      : '<li class="empty" style="display:block"><b>No listings yet</b>Fill in the form to post your first item.</li>';

    const msgs = read(KEY.msgs, []).filter((m) => m.to === u.email).sort((a, b) => b.at - a.at);
    $('#inbox').innerHTML = msgs.length ? msgs.map((m) => `
      <div class="msg"><b>${esc(m.fromName)}</b> about <i>${esc(m.title)}</i>
        <small>${esc(m.from)}, ${timeAgo(m.at)}</small><div>${esc(m.text)}</div></div>`).join('')
      : '<div class="empty"><b>No messages yet</b>Buyers who write to you will show up here.</div>';
  }

  $('#mine').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    let all = allListings();
    if (b.dataset.act === 'del') { all = all.filter((l) => l.id !== b.dataset.id); toast('Listing deleted.'); }
    else { all.find((l) => l.id === b.dataset.id).sold = true; toast('Marked as sold.'); }
    saveListings(all); renderMine();
  });
  renderMine();
}

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', () => {

    initMotion();

    const page = document.body.dataset.page;

    ({
        landing: initLanding,
        home: initHome,
        buy: initBuy,
        sell: initSell
    })[page]?.();

});


/* =====================================
   CAMPUSCART — ANIMATION CONTROLLER
===================================== */

function initMotion() {

    // Animate elements when they enter the screen
    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }

        });

    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -35px 0px"
    });

    function observeElements(root = document) {

        const elements = root.querySelectorAll(
            '.reveal, .item, .panel, .stat, .choice'
        );

        elements.forEach(element => {

            if (element.dataset.motionReady) return;

            element.dataset.motionReady = 'true';
            element.classList.add('reveal');

            observer.observe(element);

        });
    }

    // Initial page elements
    observeElements();

    // Observe dynamically generated product cards
    const grid = document.querySelector('#grid');

    if (grid) {

        const mutationObserver = new MutationObserver(() => {
            observeElements(grid);
        });

        mutationObserver.observe(grid, {
            childList: true,
            subtree: true
        });

    }

    // Navigation shadow on scroll
    const nav = document.querySelector('.top');

    window.addEventListener('scroll', () => {

        if (nav) {
            nav.classList.toggle(
                'is-scrolled',
                window.scrollY > 20
            );
        }

    }, { passive: true });

}

// End animation controller
