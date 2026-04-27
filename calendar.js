/* ── CALENDAR STORAGE ────────────────────────── */
const CAL_EVENTS_KEY = 'ctf_cal_events_v1';
const CAL_PLAN_KEY   = 'ctf_cal_plan_v1';

function loadEvents() {
  try { return JSON.parse(localStorage.getItem(CAL_EVENTS_KEY) || '[]'); } catch(_) { return []; }
}
function saveEvents(arr) {
  try { localStorage.setItem(CAL_EVENTS_KEY, JSON.stringify(arr)); } catch(_) {}
}
function loadPlan() {
  try { return JSON.parse(localStorage.getItem(CAL_PLAN_KEY) || '{}'); } catch(_) { return {}; }
}
function savePlan(obj) {
  try { localStorage.setItem(CAL_PLAN_KEY, JSON.stringify(obj)); } catch(_) {}
}

/* ── STATE ───────────────────────────────────── */
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed
let calSelectedDate = null;

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* ── MAIN RENDER ─────────────────────────────── */
function renderCalendarPage() {
  document.getElementById('page-title').textContent = 'Calendar';
  document.getElementById('cat-hero').innerHTML = '';

  document.getElementById('topics-list').innerHTML = `
    <div class="cal-page">
      <!-- LEFT: calendar grid + upcoming events -->
      <div class="cal-left">
        <div class="cal-grid-wrap">
          <div class="cal-nav">
            <button class="cal-nav-btn" onclick="calShiftMonth(-1)">&#8592;</button>
            <span class="cal-month-label" id="cal-month-label"></span>
            <button class="cal-nav-btn" onclick="calShiftMonth(1)">&#8594;</button>
          </div>
          <div class="cal-grid" id="cal-grid"></div>
        </div>

        <div class="cal-section-title">Upcoming CTF Events</div>
        <div class="cal-events-list" id="cal-events-list"></div>
        <button class="cal-add-event-btn" onclick="openEventForm()">＋ Add CTF Event</button>
      </div>

      <!-- RIGHT: day detail panel -->
      <div class="cal-right" id="cal-right">
        <div class="cal-right-placeholder">← Select a day to add or view study plan & events</div>
      </div>
    </div>

    <!-- ADD EVENT FORM (hidden by default) -->
    <div class="cal-event-form" id="cal-event-form" style="display:none">
      <div class="cal-form-title">Add CTF Event</div>
      <input id="evf-name"  class="cal-input" placeholder="Event name (e.g. SK-CERT CyberGame 2026)" />
      <input id="evf-date"  class="cal-input" type="date" />
      <input id="evf-url"   class="cal-input" placeholder="URL (optional)" />
      <input id="evf-notes" class="cal-input" placeholder="Notes (optional)" />
      <div class="cal-form-row">
        <button class="cal-save-btn" onclick="saveEvent()">Save event</button>
        <button class="cal-cancel-btn" onclick="closeEventForm()">Cancel</button>
      </div>
    </div>`;

  renderCalGrid();
  renderEventsList();
}

/* ── CALENDAR GRID ───────────────────────────── */
function renderCalGrid() {
  document.getElementById('cal-month-label').textContent = `${MONTHS[calMonth]} ${calYear}`;
  const grid    = document.getElementById('cal-grid');
  const events  = loadEvents();
  const plan    = loadPlan();
  const today   = new Date();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = DAYS.map(d => `<div class="cal-day-hdr">${d}</div>`).join('');

  // empty cells before first day
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday  = today.getFullYear()===calYear && today.getMonth()===calMonth && today.getDate()===d;
    const isSel    = calSelectedDate === dateStr;
    const hasEvent = events.some(e => e.date === dateStr);
    const hasPlan  = plan[dateStr] && plan[dateStr].cats && plan[dateStr].cats.length > 0;

    let cls = 'cal-cell';
    if (isToday) cls += ' today';
    if (isSel)   cls += ' selected';

    const dots = (hasEvent ? '<span class="dot dot-event"></span>' : '') +
                 (hasPlan  ? '<span class="dot dot-plan"></span>'  : '');

    html += `<div class="${cls}" onclick="selectDay('${dateStr}')">
               <span class="cal-day-num">${d}</span>
               <div class="cal-dots">${dots}</div>
             </div>`;
  }

  grid.innerHTML = html;
}

function calShiftMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth <  0) { calMonth = 11; calYear--; }
  renderCalGrid();
}

/* ── DAY DETAIL ──────────────────────────────── */
function selectDay(dateStr) {
  calSelectedDate = dateStr;
  renderCalGrid();
  renderDayPanel(dateStr);
}

function renderDayPanel(dateStr) {
  const plan   = loadPlan();
  const events = loadEvents();
  const dayPlan  = plan[dateStr] || { cats: [], note: '' };
  const dayEvents = events.filter(e => e.date === dateStr);

  const d = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const catOptions = CTF_DATA.map(c =>
    `<label class="cal-cat-check">
       <input type="checkbox" value="${c.id}"
              ${dayPlan.cats.includes(c.id) ? 'checked' : ''}
              onchange="togglePlanCat('${dateStr}', '${c.id}', this.checked)" />
       <span>${c.icon} ${c.name}</span>
     </label>`
  ).join('');

  document.getElementById('cal-right').innerHTML = `
    <div class="cal-day-panel">
      <div class="cal-day-panel-title">${label}</div>

      ${dayEvents.length > 0 ? `
        <div class="cal-dp-section">CTF Events</div>
        ${dayEvents.map((e,i) => `
          <div class="cal-dp-event">
            <div class="cal-dp-event-name">${escHtml(e.name)}</div>
            ${e.url ? `<a class="cal-dp-event-url" href="${escHtml(e.url)}" target="_blank">${escHtml(e.url)}</a>` : ''}
            ${e.notes ? `<div class="cal-dp-event-notes">${escHtml(e.notes)}</div>` : ''}
            <button class="cal-dp-del" onclick="deleteEvent(${events.indexOf(e)})">✕ remove</button>
          </div>`).join('')}
      ` : ''}

      <div class="cal-dp-section">Study Plan — which categories?</div>
      <div class="cal-cat-checks">${catOptions}</div>

      <div class="cal-dp-section">Day notes</div>
      <textarea class="cal-day-note" id="cal-day-note"
                placeholder="Goals for today, what to focus on, resources to check..."
                oninput="schedulePlanSave('${dateStr}')">${escHtml(dayPlan.note || '')}</textarea>
    </div>`;
}

let _planSaveTimer = null;
function schedulePlanSave(dateStr) {
  clearTimeout(_planSaveTimer);
  _planSaveTimer = setTimeout(() => persistPlan(dateStr), 700);
}

function togglePlanCat(dateStr, catId, checked) {
  const plan    = loadPlan();
  const dayPlan = plan[dateStr] || { cats: [], note: '' };
  if (checked) { if (!dayPlan.cats.includes(catId)) dayPlan.cats.push(catId); }
  else { dayPlan.cats = dayPlan.cats.filter(c => c !== catId); }
  plan[dateStr] = dayPlan;
  savePlan(plan);
  renderCalGrid();
}

function persistPlan(dateStr) {
  const plan    = loadPlan();
  const noteEl  = document.getElementById('cal-day-note');
  if (!noteEl) return;
  const dayPlan = plan[dateStr] || { cats: [], note: '' };
  dayPlan.note  = noteEl.value;
  plan[dateStr] = dayPlan;
  savePlan(plan);
}

/* ── CTF EVENTS LIST ─────────────────────────── */
function renderEventsList() {
  const el     = document.getElementById('cal-events-list');
  if (!el) return;
  const events = loadEvents();
  const today  = new Date().toISOString().slice(0,10);
  const upcoming = events
    .filter(e => e.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  if (upcoming.length === 0) {
    el.innerHTML = '<div class="cal-no-events">No upcoming events — add one below</div>';
    return;
  }

  el.innerHTML = upcoming.map((e, i) => {
    const d    = new Date(e.date + 'T12:00:00');
    const diff = Math.ceil((d - new Date()) / 86400000);
    const countdown = diff === 0 ? 'Today!' : diff === 1 ? 'Tomorrow' : `in ${diff} days`;
    return `
      <div class="cal-event-item" onclick="selectDay('${e.date}')">
        <div class="cal-event-dot"></div>
        <div class="cal-event-info">
          <div class="cal-event-name">${escHtml(e.name)}</div>
          <div class="cal-event-date">${d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · <span class="cal-event-countdown">${countdown}</span></div>
        </div>
      </div>`;
  }).join('');
}

/* ── ADD/DELETE EVENT ────────────────────────── */
function openEventForm() {
  const f = document.getElementById('cal-event-form');
  f.style.display = 'block';
  if (calSelectedDate) document.getElementById('evf-date').value = calSelectedDate;
  f.scrollIntoView({ behavior: 'smooth' });
}
function closeEventForm() {
  document.getElementById('cal-event-form').style.display = 'none';
}
function saveEvent() {
  const name  = document.getElementById('evf-name').value.trim();
  const date  = document.getElementById('evf-date').value;
  const url   = document.getElementById('evf-url').value.trim();
  const notes = document.getElementById('evf-notes').value.trim();
  if (!name || !date) { showToast('Name and date are required'); return; }
  const events = loadEvents();
  events.push({ name, date, url, notes });
  saveEvents(events);
  closeEventForm();
  renderEventsList();
  renderCalGrid();
  showToast('🏁 CTF event added');
}
function deleteEvent(idx) {
  const events = loadEvents();
  events.splice(idx, 1);
  saveEvents(events);
  if (calSelectedDate) renderDayPanel(calSelectedDate);
  renderEventsList();
  renderCalGrid();
  showToast('Event removed');
}
