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
    Object.entries(forms).forEach(([k, f]) => {
      if (f) f.hidden = k !== which;
    });
  }
  
  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  show('login');

  if (forms.login) {
    forms.login.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const err = login($('#lEmail').value, $('#lPass').value);
      if (err) { $('#lErr').textContent = err; return; }
      location.href = 'home.html';
    });
  }

  if (forms.signup) {
    forms.signup.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const err = signup($('#sName').value, $('#sEmail').value, $('#sPass').value);
      if (err) { $('#sErr').textContent = err; return; }
      location.href = 'home.html';
    });
  }
}

/* ---------- global router initialization ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const pageType = document.body.getAttribute('data-page');
  if (pageType === 'landing') {
    initLanding();
  }
});
