<script setup>
import { ref, computed, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  text: String,
  days: { type: Object, default: () => ({}) },
  today: String,
  openDate: Object,
});
const emit = defineEmits(['update-text', 'update-day-note']);

const mode = ref('journal'); // 'journal' | 'freeform'

// ---- Freeform document ----
const fullText = ref(props.text || '');
const selectedIndex = ref(null); // null = whole document
const draftText = ref(fullText.value);
let activeRange = null; // { start, end } offsets in fullText for the section currently open in draftText

function parseSections(source) {
  const regex = /^--(.+)$/gm;
  const matches = [];
  let m;
  while ((m = regex.exec(source))) matches.push(m);

  const sections = [];
  matches.forEach((match, i) => {
    const title = match[1].trim();
    if (!title) return;
    const start = match.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : source.length;
    sections.push({ title, start, end });
  });
  return sections;
}

// Whole-document mode reflects new/removed headers as you type. Section mode keeps
// the outline stable until you commit, so typing "--" inside a section's body doesn't
// resplit the view out from under your cursor mid-edit.
const sections = computed(() =>
  parseSections(selectedIndex.value === null ? draftText.value : fullText.value)
);

function commitFreeform() {
  const next = activeRange
    ? fullText.value.slice(0, activeRange.start) + draftText.value + fullText.value.slice(activeRange.end)
    : draftText.value;
  if (next !== fullText.value) {
    fullText.value = next;
    emit('update-text', next);
  }
}

function selectAll() {
  if (selectedIndex.value === null) return;
  commitFreeform();
  selectedIndex.value = null;
  activeRange = null;
  draftText.value = fullText.value;
}

function selectSection(i) {
  commitFreeform();
  const s = parseSections(fullText.value)[i];
  if (!s) return;
  selectedIndex.value = i;
  activeRange = { start: s.start, end: s.end };
  draftText.value = fullText.value.slice(s.start, s.end);
}

// ---- Journal (per-day entries) ----
const selectedJournalDate = ref(props.today || '');
const draftNote = ref(props.days[selectedJournalDate.value]?.note || '');

function loadNote(dateStr) {
  draftNote.value = props.days[dateStr]?.note || '';
}

function commitJournal() {
  if (!selectedJournalDate.value) return;
  emit('update-day-note', selectedJournalDate.value, draftNote.value);
}

function selectJournalDate(dateStr) {
  if (dateStr === selectedJournalDate.value) return;
  commitJournal();
  selectedJournalDate.value = dateStr;
  loadNote(dateStr);
}

const journalDates = computed(() => {
  const dates = new Set(
    Object.keys(props.days).filter((d) => (props.days[d]?.note || '').trim())
  );
  if (props.today) dates.add(props.today);
  return [...dates].sort((a, b) => (a < b ? 1 : -1));
});

function notePreview(dateStr) {
  const note = (props.days[dateStr]?.note || '').trim();
  if (!note) return '';
  const firstLine = note.split('\n').find((l) => l.trim()) || '';
  return firstLine.length > 46 ? firstLine.slice(0, 46) + '…' : firstLine;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ---- Mode switching ----
function switchMode(next) {
  if (next === mode.value) return;
  if (mode.value === 'freeform') commitFreeform();
  else commitJournal();
  mode.value = next;
}

// Jumping in from the calendar's "Open Journal" link
watch(() => props.openDate, (val) => {
  if (!val) return;
  if (mode.value === 'freeform') commitFreeform();
  else commitJournal();
  mode.value = 'journal';
  selectedJournalDate.value = val.date;
  loadNote(val.date);
});

onBeforeUnmount(() => {
  commitFreeform();
  commitJournal();
});
</script>

<template>
  <div class="notes-view">
    <header class="view-header">
      <h1>Notes</h1>
      <div class="mode-tabs">
        <button class="mode-tab" :class="{ active: mode === 'journal' }" @click="switchMode('journal')">Journal</button>
        <button class="mode-tab" :class="{ active: mode === 'freeform' }" @click="switchMode('freeform')">Freeform</button>
      </div>
    </header>

    <div v-if="mode === 'journal'" class="content">
      <nav class="outline">
        <button
          v-for="d in journalDates"
          :key="d"
          class="journal-item"
          :class="{ active: d === selectedJournalDate }"
          @click="selectJournalDate(d)"
        >
          <div class="journal-item-top">
            <span class="journal-item-date">{{ formatShort(d) }}</span>
            <span v-if="d === today" class="journal-today-badge">Today</span>
          </div>
          <span class="journal-item-preview">{{ notePreview(d) || (d === today ? 'No entry yet' : '') }}</span>
        </button>
      </nav>

      <div class="journal-editor">
        <h2 class="journal-heading">{{ formatFull(selectedJournalDate) }}</h2>
        <textarea
          v-model="draftNote"
          class="journal-textarea"
          spellcheck="false"
          placeholder="Write about your day…"
          @blur="commitJournal"
        />
      </div>
    </div>

    <div v-else class="content">
      <nav class="outline">
        <button
          class="outline-item all"
          :class="{ active: selectedIndex === null }"
          @click="selectAll"
        >
          Whole Text
        </button>

        <div class="outline-list">
          <button
            v-for="(s, i) in sections"
            :key="i"
            class="outline-item"
            :class="{ active: selectedIndex === i }"
            :title="s.title"
            @click="selectSection(i)"
          >
            {{ s.title }}
          </button>
          <p v-if="!sections.length" class="outline-hint">
            Start a line with <code>--</code> followed by a title to create a section, e.g. <code>--Groceries</code>.
          </p>
        </div>
      </nav>

      <textarea
        v-model="draftText"
        class="editor"
        spellcheck="false"
        placeholder="Start typing…"
        @blur="commitFreeform"
      />
    </div>
  </div>
</template>

<style scoped>
.notes-view {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.view-header h1 { font-size: 19px; font-weight: 600; }

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.mode-tab {
  padding: 6px 16px;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 500;
  transition: all 0.15s;
}
.mode-tab:hover { color: var(--text); }
.mode-tab.active { background: var(--accent); color: white; }

.content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.outline {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 10px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

.outline-item {
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.15s;
}
.outline-item:hover { background: var(--surface-2); color: var(--text); }
.outline-item.active { background: rgba(99,102,241,.15); color: var(--accent); }

.outline-item.all {
  font-weight: 700;
  margin-bottom: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
}

.outline-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.outline-hint {
  padding: 8px 10px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--muted);
}
.outline-hint code {
  background: var(--surface-2);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.editor {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
  background: var(--bg);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
}
.editor::placeholder { color: var(--muted); }

/* Journal */
.journal-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  transition: all 0.15s;
}
.journal-item:hover { background: var(--surface-2); color: var(--text); }
.journal-item.active { background: rgba(99,102,241,.15); }

.journal-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.journal-item-date {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
}
.journal-item.active .journal-item-date { color: var(--accent); }

.journal-today-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
  background: rgba(99,102,241,.15);
  padding: 1px 6px;
  border-radius: 100px;
  flex-shrink: 0;
}

.journal-item-preview {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.journal-editor {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 28px 40px;
  overflow-y: auto;
}

.journal-heading {
  font-size: 21px;
  font-weight: 700;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.journal-textarea {
  flex: 1;
  min-height: 360px;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.8;
  resize: none;
  outline: none;
}
.journal-textarea::placeholder { color: var(--muted); }
</style>
