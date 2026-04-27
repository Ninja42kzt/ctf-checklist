/* ── STATE ───────────────────────────────────── */
const STORAGE_KEY = 'ctf_checklist_v1';
const THEME_KEY   = 'ctf_theme_v1';

let state       = {};   // { subId: true/false }
let activeCatId = CTF_DATA[0].id;
let sidebarOpen = true;
let toastTimer  = null;

/* ── PERSISTENCE ─────────────────────────────── */
function loadState() {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) state = JSON.parse(s); } catch(_) {}
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_) {}
}
function loadTheme() {
  const t = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', t);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch(_) {}
}

/* ── ID HELPERS ──────────────────────────────── */
function subId(catId, topicIdx, subIdx) {
  return `${catId}__${topicIdx}__${subIdx}`;
}

/* ── COUNT HELPERS ───────────────────────────── */
function countCat(cat) {
  let done = 0, total = 0;
  cat.topics.forEach((t, ti) =>
    t.subs.forEach((_, si) => { total++; if (state[subId(cat.id, ti, si)]) done++; })
  );
  return { done, total };
}

function countTopic(catId, topic, topicIdx) {
  let done = 0;
  topic.subs.forEach((_, si) => { if (state[subId(catId, topicIdx, si)]) done++; });
  return { done, total: topic.subs.length };
}

function countAll() {
  let done = 0, total = 0;
  CTF_DATA.forEach(c => { const r = countCat(c); done += r.done; total += r.total; });
  return { done, total };
}

function pct(done, total) { return total ? Math.round(done / total * 100) : 0; }

/* ── TOAST ───────────────────────────────────── */
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ── SIDEBAR TOGGLE ──────────────────────────── */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth <= 700) {
    sb.classList.toggle('open');
  } else {
    sidebarOpen = !sidebarOpen;
    sb.classList.toggle('collapsed', !sidebarOpen);
  }
}

/* ── NAVIGATION ──────────────────────────────── */
function navigateTo(catId) {
  activeCatId = catId;
  renderNav();
  renderContent();
  // close sidebar on mobile after nav
  if (window.innerWidth <= 700) {
    document.getElementById('sidebar').classList.remove('open');
  }
  window.scrollTo(0, 0);
  document.getElementById('content-area').scrollTop = 0;
}

/* ── SIDEBAR NAV RENDER ──────────────────────── */
function renderNav() {
  const nav = document.getElementById('cat-nav');
  nav.innerHTML = CTF_DATA.map(cat => {
    const { done, total } = countCat(cat);
    const p = pct(done, total);
    const active = cat.id === activeCatId;
    return `
      <button class="nav-item${active ? ' active' : ''}"
              style="--accent:${cat.accent}"
              onclick="navigateTo('${cat.id}')">
        <span class="nav-icon">${cat.icon}</span>
        <span class="nav-text">${cat.name}</span>
        <span class="nav-pill">${p}%</span>
        <div class="nav-bar-bg">
          <div class="nav-bar-fill" style="width:${p}%;background:${cat.accent}"></div>
        </div>
      </button>`;
  }).join('');
}

/* ── OVERALL STATS ───────────────────────────── */
function renderOverall() {
  const { done, total } = countAll();
  const p = pct(done, total);
  document.getElementById('nav-done').textContent   = done;
  document.getElementById('nav-total').textContent  = total;
  document.getElementById('overall-fill').style.width = p + '%';
  document.getElementById('overall-pct').textContent  = p + '%';
}

/* ── HERO CARD ───────────────────────────────── */
function renderHero(cat) {
  const { done, total } = countCat(cat);
  const p = pct(done, total);
  document.getElementById('cat-hero').innerHTML = `
    <div class="hero-card" style="--cat-accent:${cat.accent}">
      <div class="hero-top">
        <div class="hero-left">
          <div class="hero-emoji">${cat.icon}</div>
          <div>
            <div class="hero-name">${cat.name}</div>
            <div class="hero-desc">${cat.desc}</div>
          </div>
        </div>
        <div class="hero-stats">
          <div class="h-stat">
            <div class="h-stat-num" style="color:${cat.accent}">${done}</div>
            <div class="h-stat-label">done</div>
          </div>
          <div class="h-stat">
            <div class="h-stat-num" style="color:${cat.accent}">${total - done}</div>
            <div class="h-stat-label">left</div>
          </div>
          <div class="h-stat">
            <div class="h-stat-num" style="color:${cat.accent}">${p}%</div>
            <div class="h-stat-label">complete</div>
          </div>
        </div>
      </div>
      <div class="hero-progress-bg">
        <div class="hero-progress-fill" style="width:${p}%;background:${cat.accent}"></div>
      </div>
    </div>`;
}

/* ── TOPIC CARDS ─────────────────────────────── */
function renderTopics(cat) {
  const list = document.getElementById('topics-list');
  list.innerHTML = cat.topics.map((topic, ti) => {
    const { done, total } = countTopic(cat.id, topic, ti);
    const p = pct(done, total);
    const topicKey = `topic_${cat.id}_${ti}`;
    const isOpen = sessionStorage.getItem(topicKey) !== 'closed';

    const subs = topic.subs.map((sub, si) => {
      const id   = subId(cat.id, ti, si);
      const done = !!state[id];
      return `
        <div class="sub-row${done ? ' done' : ''}" data-id="${id}" onclick="toggleSub('${id}','${cat.id}',${ti},${si})">
          <div class="checkbox${done ? ' checked' : ''}" style="${done ? '--cat-accent:'+cat.accent : ''}"></div>
          <span class="sub-text">${sub}</span>
        </div>`;
    }).join('');

    return `
      <div class="topic-card${isOpen ? ' open' : ''}" id="tc_${cat.id}_${ti}">
        <div class="topic-header" onclick="toggleTopic('${cat.id}',${ti})">
          <div class="topic-left">
            <span class="topic-chevron">&#9654;</span>
            <span class="topic-name">${topic.name}</span>
          </div>
          <div class="topic-right">
            <div class="topic-mini-bar">
              <div class="topic-mini-fill" style="width:${p}%;background:${cat.accent}"></div>
            </div>
            <span class="topic-badge">${done}/${total}</span>
          </div>
        </div>
        <div class="topic-subs">${subs}</div>
      </div>`;
  }).join('');
}

/* ── FULL CONTENT RENDER ─────────────────────── */
function renderContent() {
  const cat = CTF_DATA.find(c => c.id === activeCatId);
  if (!cat) return;
  document.getElementById('page-title').textContent = cat.name;
  renderHero(cat);
  renderTopics(cat);
}

/* ── TOGGLE SUB ──────────────────────────────── */
function toggleSub(id, catId, topicIdx, subIdx) {
  state[id] = !state[id];
  saveState();

  // update the clicked row
  const row = document.querySelector(`.sub-row[data-id="${id}"]`);
  if (row) {
    const cat = CTF_DATA.find(c => c.id === catId);
    row.classList.toggle('done', !!state[id]);
    const box = row.querySelector('.checkbox');
    box.classList.toggle('checked', !!state[id]);
    if (state[id]) box.style.cssText = `--cat-accent:${cat.accent}`;
    else box.style.cssText = '';
  }

  // update topic badge & mini bar
  const cat   = CTF_DATA.find(c => c.id === catId);
  const topic = cat.topics[topicIdx];
  const { done, total } = countTopic(catId, topic, topicIdx);
  const p = pct(done, total);
  const card = document.getElementById(`tc_${catId}_${topicIdx}`);
  if (card) {
    card.querySelector('.topic-badge').textContent = `${done}/${total}`;
    card.querySelector('.topic-mini-fill').style.width = p + '%';
  }

  // update hero
  renderHero(cat);

  // update nav + overall
  renderNav();
  renderOverall();

  // toast
  if (state[id]) showToast(`✓ ${topic.subs[subIdx].slice(0, 45)}${topic.subs[subIdx].length > 45 ? '…' : ''}`);
}

/* ── TOGGLE TOPIC ────────────────────────────── */
function toggleTopic(catId, topicIdx) {
  const card = document.getElementById(`tc_${catId}_${topicIdx}`);
  if (!card) return;
  const key = `topic_${catId}_${topicIdx}`;
  const isOpen = card.classList.toggle('open');
  sessionStorage.setItem(key, isOpen ? 'open' : 'closed');
}

/* ── EXPAND / COLLAPSE ALL ───────────────────── */
function expandAll() {
  const cat = CTF_DATA.find(c => c.id === activeCatId);
  cat.topics.forEach((_, ti) => {
    const card = document.getElementById(`tc_${cat.id}_${ti}`);
    if (card) {
      card.classList.add('open');
      sessionStorage.setItem(`topic_${cat.id}_${ti}`, 'open');
    }
  });
}

function collapseAll() {
  const cat = CTF_DATA.find(c => c.id === activeCatId);
  cat.topics.forEach((_, ti) => {
    const card = document.getElementById(`tc_${cat.id}_${ti}`);
    if (card) {
      card.classList.remove('open');
      sessionStorage.setItem(`topic_${cat.id}_${ti}`, 'closed');
    }
  });
}

/* ── RESET ───────────────────────────────────── */
function confirmReset() {
  if (confirm('Reset ALL progress? This cannot be undone.')) {
    state = {};
    saveState();
    renderNav();
    renderOverall();
    renderContent();
    showToast('Progress reset.');
  }
}

/* ── KEYBOARD NAV ────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const idx = CTF_DATA.findIndex(c => c.id === activeCatId);
  if (e.key === 'ArrowRight' || e.key === 'l') {
    if (idx < CTF_DATA.length - 1) navigateTo(CTF_DATA[idx + 1].id);
  } else if (e.key === 'ArrowLeft' || e.key === 'h') {
    if (idx > 0) navigateTo(CTF_DATA[idx - 1].id);
  } else if (e.key === 't') {
    toggleTheme();
  }
});

/* ── SWIPE (mobile) ──────────────────────────── */
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) < 60) return;
  const sb = document.getElementById('sidebar');
  if (dx > 0 && window.innerWidth <= 700) sb.classList.add('open');
  if (dx < 0 && window.innerWidth <= 700) sb.classList.remove('open');
});

/* ── PWA SERVICE WORKER ──────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* ── INIT ────────────────────────────────────── */
loadTheme();
loadState();
renderNav();
renderOverall();
renderContent();
