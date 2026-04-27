/* ── SUBNOTE STORAGE ─────────────────────────── */
const SUBNOTES_KEY = 'ctf_subnotes_v1';

function loadSubnotes() {
  try { return JSON.parse(localStorage.getItem(SUBNOTES_KEY) || '{}'); } catch(_) { return {}; }
}
function saveSubnotes(data) {
  try { localStorage.setItem(SUBNOTES_KEY, JSON.stringify(data)); } catch(_) {}
}
function getSubnote(id) {
  return loadSubnotes()[id] || '';
}

/* ── SUBNOTE MODAL ───────────────────────────── */
let _currentSubnoteId = null;

function openSubnoteModal(id, catId, topicIdx, subIdx) {
  _currentSubnoteId = id;
  const cat   = CTF_DATA.find(c => c.id === catId);
  const topic = cat.topics[topicIdx];
  const sub   = topic.subs[subIdx];

  document.getElementById('subnote-title').textContent = sub;
  document.getElementById('subnote-meta').textContent  = `${cat.icon} ${cat.name}  →  ${topic.name}`;
  document.getElementById('subnote-body').value        = getSubnote(id);
  document.getElementById('subnote-modal').classList.add('open');
  setTimeout(() => document.getElementById('subnote-body').focus(), 100);
}

function closeSubnoteModal(e) {
  if (e && e.target !== document.getElementById('subnote-modal')) return;
  document.getElementById('subnote-modal').classList.remove('open');
  _currentSubnoteId = null;
}

function saveSubnote() {
  if (!_currentSubnoteId) return;
  const text = document.getElementById('subnote-body').value.trim();
  const data = loadSubnotes();
  if (text) data[_currentSubnoteId] = text;
  else delete data[_currentSubnoteId];
  saveSubnotes(data);

  // update the note button indicator in the list
  const btn = document.querySelector(`.sub-row[data-id="${_currentSubnoteId}"] .sub-note-btn`);
  if (btn) btn.classList.toggle('has-note', !!text);

  document.getElementById('subnote-modal').classList.remove('open');
  showToast(text ? '📝 Note saved' : '🗑 Note cleared');
  _currentSubnoteId = null;
}

function deleteSubnote() {
  document.getElementById('subnote-body').value = '';
  saveSubnote();
}

// close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('subnote-modal').classList.remove('open');
});

/* ── STANDALONE NOTES PAGE ───────────────────── */
const NOTES_KEY = 'ctf_standalone_notes';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch(_) { return []; }
}
function saveNotes(arr) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(arr)); } catch(_) {}
}

function renderNotesPage() {
  document.getElementById('page-title').textContent = 'Notes';
  document.getElementById('cat-hero').innerHTML = '';
  const notes = loadNotes();

  document.getElementById('topics-list').innerHTML = `
    <div class="notes-page">
      <div class="notes-toolbar">
        <button class="notes-new-btn" onclick="createNote()">＋ New note</button>
        <span class="notes-hint">All notes auto-save as you type</span>
      </div>
      <div class="notes-layout">
        <div class="notes-list" id="notes-list">
          ${notes.length === 0
            ? '<div class="notes-empty">No notes yet — hit New note</div>'
            : notes.map((n, i) => noteListItem(n, i)).join('')}
        </div>
        <div class="notes-editor-pane" id="notes-editor-pane">
          <div class="notes-editor-placeholder">← Select a note or create a new one</div>
        </div>
      </div>
    </div>`;

  if (notes.length > 0) openNoteEditor(0);
}

function noteListItem(note, idx) {
  const preview = note.body ? note.body.slice(0, 60).replace(/\n/g, ' ') : 'Empty note';
  const date    = note.updated ? new Date(note.updated).toLocaleDateString() : '';
  return `
    <div class="note-list-item" id="nli_${idx}" onclick="openNoteEditor(${idx})">
      <div class="nli-title">${escHtml(note.title || 'Untitled')}</div>
      <div class="nli-preview">${escHtml(preview)}</div>
      <div class="nli-date">${date}</div>
    </div>`;
}

let _activeNoteIdx = null;
let _noteAutoSave  = null;

function openNoteEditor(idx) {
  _activeNoteIdx = idx;
  const notes = loadNotes();
  const note  = notes[idx];

  // highlight list item
  document.querySelectorAll('.note-list-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  document.getElementById('notes-editor-pane').innerHTML = `
    <div class="note-editor">
      <input class="note-title-input" id="note-title-input" value="${escHtml(note.title || '')}"
             placeholder="Note title..." oninput="scheduleNoteSave()" />
      <div class="note-editor-meta">
        <span>${note.updated ? 'Last saved ' + new Date(note.updated).toLocaleString() : 'Not saved yet'}</span>
        <button class="note-delete-btn" onclick="deleteNote(${idx})">🗑 Delete</button>
      </div>
      <textarea class="note-body-input" id="note-body-input"
                placeholder="Write anything — progress logs, commands, scripts, findings, URLs..."
                oninput="scheduleNoteSave()">${escHtml(note.body || '')}</textarea>
    </div>`;
  document.getElementById('note-body-input').focus();
}

function scheduleNoteSave() {
  clearTimeout(_noteAutoSave);
  _noteAutoSave = setTimeout(persistActiveNote, 800);
}

function persistActiveNote() {
  if (_activeNoteIdx === null) return;
  const notes = loadNotes();
  const titleEl = document.getElementById('note-title-input');
  const bodyEl  = document.getElementById('note-body-input');
  if (!titleEl || !bodyEl) return;

  notes[_activeNoteIdx] = {
    ...notes[_activeNoteIdx],
    title:   titleEl.value,
    body:    bodyEl.value,
    updated: Date.now()
  };
  saveNotes(notes);

  // update list item preview
  const li = document.getElementById(`nli_${_activeNoteIdx}`);
  if (li) {
    li.querySelector('.nli-title').textContent   = titleEl.value || 'Untitled';
    li.querySelector('.nli-preview').textContent = bodyEl.value.slice(0, 60).replace(/\n/g, ' ') || 'Empty note';
    li.querySelector('.nli-date').textContent    = new Date().toLocaleDateString();
  }

  // update badge
  try { document.getElementById('notes-count').textContent = notes.length; } catch(_) {}
}

function createNote() {
  const notes = loadNotes();
  notes.unshift({ title: '', body: '', updated: Date.now() });
  saveNotes(notes);
  renderNotesPage();
  openNoteEditor(0);
  try { document.getElementById('notes-count').textContent = notes.length; } catch(_) {}
}

function deleteNote(idx) {
  if (!confirm('Delete this note?')) return;
  const notes = loadNotes();
  notes.splice(idx, 1);
  saveNotes(notes);
  renderNotesPage();
  try { document.getElementById('notes-count').textContent = notes.length; } catch(_) {}
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
