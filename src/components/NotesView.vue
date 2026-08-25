<script setup>
import { ref, computed, onBeforeUnmount, watch, nextTick } from 'vue';
import { buildTagIndex, normalizeTag } from '../tags.js';
import { getCaretCoordinates } from '../caretPosition.js';
import { splitParagraphs, formatClockTime } from '../journalTime.js';

const props = defineProps({
  text: String,
  days: { type: Object, default: () => ({}) },
  today: String,
  openDate: Object,
});
const emit = defineEmits(['update-text', 'update-day-note']);

const mode = ref('journal'); // 'journal' | 'freeform' | 'tags'

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
// Each day's note is a set of blank-line-separated paragraphs, each with its own
// timestamp (noteTimes[i]). Paragraphs are addressed by index, not by matching text,
// so editing or adding one entry never touches another entry's recorded time.
const selectedJournalDate = ref(props.today || '');

const noteParagraphs = computed(() => {
  const day = props.days[selectedJournalDate.value];
  const times = day?.noteTimes || [];
  return splitParagraphs(day?.note || '').map((text, i) => ({ text, time: times[i] || '' }));
});

// Editing an existing paragraph in place
const editingIndex = ref(null); // null | paragraph index
const editDraft = ref('');
const editTextareaRef = ref(null);

// Always-available composer for a new, freshly-timestamped entry
const newEntryDraft = ref('');
const newEntryTextareaRef = ref(null);

// Message log scrolls to the newest entry like a chat thread
const journalLogRef = ref(null);
function scrollLogToBottom() {
  nextTick(() => {
    const el = journalLogRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}
watch(() => [selectedJournalDate.value, noteParagraphs.value.length], scrollLogToBottom, { immediate: true });

function activeDraft() {
  return editingIndex.value !== null ? editDraft : newEntryDraft;
}
function activeTextareaEl() {
  return editingIndex.value !== null ? editTextareaRef.value : newEntryTextareaRef.value;
}

function startEditParagraph(i) {
  if (editingIndex.value === i) return;
  commitParagraphEdit();
  editingIndex.value = i;
  editDraft.value = noteParagraphs.value[i]?.text || '';
  nextTick(() => editTextareaRef.value?.focus());
}

function commitParagraphEdit() {
  closeAutocomplete();
  if (editingIndex.value === null) return;
  const i = editingIndex.value;
  const day = props.days[selectedJournalDate.value];
  const paras = splitParagraphs(day?.note || '');
  const times = [...(day?.noteTimes || [])];
  const text = editDraft.value.trim();
  editingIndex.value = null;
  if (text === (paras[i] || '')) return;
  if (text) {
    paras[i] = text;
  } else {
    paras.splice(i, 1);
    times.splice(i, 1);
  }
  emit('update-day-note', selectedJournalDate.value, paras.join('\n\n'), times);
}

function deleteMessage(i) {
  if (!confirm('Delete this message?')) return;
  const day = props.days[selectedJournalDate.value];
  const paras = splitParagraphs(day?.note || '');
  const times = [...(day?.noteTimes || [])];
  paras.splice(i, 1);
  times.splice(i, 1);
  if (editingIndex.value !== null && i < editingIndex.value) editingIndex.value--;
  emit('update-day-note', selectedJournalDate.value, paras.join('\n\n'), times);
}

function commitNewEntry() {
  closeAutocomplete();
  const text = newEntryDraft.value.trim();
  if (!text) return;
  const day = props.days[selectedJournalDate.value];
  const paras = splitParagraphs(day?.note || '');
  const times = [...(day?.noteTimes || [])];
  while (times.length < paras.length) times.push(''); // older entries recorded before noteTimes existed
  paras.push(text);
  times.push(formatClockTime());
  newEntryDraft.value = '';
  emit('update-day-note', selectedJournalDate.value, paras.join('\n\n'), times);
}

function handleComposerKeydown(e) {
  handleJournalKeydown(e);
  if (e.defaultPrevented) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    commitNewEntry();
  }
}

function commitJournalDrafts() {
  commitParagraphEdit();
  commitNewEntry();
}

function selectJournalDate(dateStr) {
  if (dateStr === selectedJournalDate.value) return;
  commitJournalDrafts();
  selectedJournalDate.value = dateStr;
  newEntryDraft.value = '';
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

// ---- Journal tag autocomplete ----
const tagIndex = computed(() => buildTagIndex(props.days));
const sortedTags = computed(() =>
  [...tagIndex.value.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
);

const autocompleteOpen = ref(false);
const autocompleteMatches = ref([]);
const autocompleteActiveIndex = ref(0);
const autocompletePos = ref({ top: 0, left: 0 });
let autocompleteTriggerStart = null; // index in the active draft of the opening `**`

function detectTagTrigger(text, caret) {
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
  const line = text.slice(lineStart, caret);
  const m = /\*\*([^*]*)$/.exec(line);
  if (!m) return null;
  return { start: lineStart + m.index, query: m[1] };
}

function closeAutocomplete() {
  autocompleteOpen.value = false;
  autocompleteMatches.value = [];
  autocompleteTriggerStart = null;
}

function handleJournalInput() {
  const el = activeTextareaEl();
  if (!el) return;
  const caret = el.selectionStart;
  const trigger = detectTagTrigger(el.value, caret);
  if (!trigger) { closeAutocomplete(); return; }

  const query = normalizeTag(trigger.query);
  const matches = sortedTags.value.filter((t) => !query || t.key.includes(query)).slice(0, 8);
  if (!matches.length) { closeAutocomplete(); return; }

  autocompleteTriggerStart = trigger.start;
  autocompleteMatches.value = matches;
  autocompleteActiveIndex.value = 0;
  autocompleteOpen.value = true;

  const coords = getCaretCoordinates(el, caret);
  autocompletePos.value = { top: coords.top + coords.lineHeight, left: coords.left };
}

function acceptAutocomplete(name) {
  const el = activeTextareaEl();
  const draft = activeDraft();
  if (!el || autocompleteTriggerStart === null) return;
  const caret = el.selectionStart;
  const before = draft.value.slice(0, autocompleteTriggerStart);
  const after = draft.value.slice(caret);
  const insertion = `**${name}**`;
  draft.value = before + insertion + after;
  const newCaret = before.length + insertion.length;
  closeAutocomplete();
  nextTick(() => {
    el.focus();
    el.setSelectionRange(newCaret, newCaret);
  });
}

function handleJournalKeydown(e) {
  if (!autocompleteOpen.value) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    autocompleteActiveIndex.value = (autocompleteActiveIndex.value + 1) % autocompleteMatches.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    autocompleteActiveIndex.value =
      (autocompleteActiveIndex.value - 1 + autocompleteMatches.value.length) % autocompleteMatches.value.length;
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    acceptAutocomplete(autocompleteMatches.value[autocompleteActiveIndex.value].name);
  } else if (e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
    closeAutocomplete();
  }
}

// ---- Tags browser ----
const selectedTagKey = ref(null);
const selectedTagData = computed(() =>
  selectedTagKey.value ? tagIndex.value.get(selectedTagKey.value) : null
);
const selectedTagTimeline = computed(() =>
  selectedTagData.value ? [...selectedTagData.value.dates].reverse() : []
);

function selectTag(key) {
  selectedTagKey.value = key;
}

function jumpToTagEntry(date) {
  mode.value = 'journal';
  selectJournalDate(date);
}

// ---- Mode switching ----
function switchMode(next) {
  if (next === mode.value) return;
  if (mode.value === 'freeform') commitFreeform();
  else if (mode.value === 'journal') commitJournalDrafts();
  mode.value = next;
}

// Jumping in from the calendar's "Open Journal" link
watch(() => props.openDate, (val) => {
  if (!val) return;
  if (mode.value === 'freeform') commitFreeform();
  else if (mode.value === 'journal') commitJournalDrafts();
  mode.value = 'journal';
  selectedJournalDate.value = val.date;
  newEntryDraft.value = '';
});

onBeforeUnmount(() => {
  commitFreeform();
  commitJournalDrafts();
});
</script>

<template>
  <div class="notes-view">
    <header class="view-header">
      <h1>Notes</h1>
      <div class="mode-tabs">
        <button class="mode-tab" :class="{ active: mode === 'journal' }" @click="switchMode('journal')">Journal</button>
        <button class="mode-tab" :class="{ active: mode === 'freeform' }" @click="switchMode('freeform')">Freeform</button>
        <button class="mode-tab" :class="{ active: mode === 'tags' }" @click="switchMode('tags')">Tags</button>
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

        <div ref="journalLogRef" class="journal-log">
          <p v-if="!noteParagraphs.length" class="journal-empty">No entries yet — say something below.</p>

          <div v-for="(p, i) in noteParagraphs" :key="i" class="journal-message">
            <template v-if="editingIndex !== i">
              <div class="journal-message-text" title="Click to edit" @click="startEditParagraph(i)">{{ p.text }}</div>
              <div class="journal-message-meta">
                <span class="journal-message-time">{{ p.time }}</span>
                <button class="journal-msg-del" title="Delete" @click.stop="deleteMessage(i)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </template>
            <div v-else class="journal-input-wrap">
              <textarea
                ref="editTextareaRef"
                v-model="editDraft"
                class="journal-message-input"
                rows="1"
                spellcheck="false"
                @input="handleJournalInput"
                @keydown="handleJournalKeydown"
                @blur="commitParagraphEdit"
              />
              <ul
                v-if="autocompleteOpen && editingIndex === i"
                class="tag-autocomplete"
                :style="{ top: autocompletePos.top + 'px', left: autocompletePos.left + 'px' }"
                @mousedown.prevent
              >
                <li
                  v-for="(match, m) in autocompleteMatches"
                  :key="match.key"
                  class="tag-autocomplete-item"
                  :class="{ active: m === autocompleteActiveIndex }"
                  @click="acceptAutocomplete(match.name)"
                >
                  <span class="tag-autocomplete-name">{{ match.name }}</span>
                  <span class="tag-autocomplete-count">{{ match.count }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="journal-composer">
          <div class="journal-input-wrap">
            <textarea
              ref="newEntryTextareaRef"
              v-model="newEntryDraft"
              class="journal-composer-input"
              rows="1"
              spellcheck="false"
              :placeholder="noteParagraphs.length ? 'Add to today… wrap a word in **bold** to tag it' : 'Write about your day… wrap a word in **bold** to tag it'"
              @input="handleJournalInput"
              @keydown="handleComposerKeydown"
              @blur="commitNewEntry"
            />
            <ul
              v-if="autocompleteOpen && editingIndex === null"
              class="tag-autocomplete"
              :style="{ top: autocompletePos.top + 'px', left: autocompletePos.left + 'px' }"
              @mousedown.prevent
            >
              <li
                v-for="(match, m) in autocompleteMatches"
                :key="match.key"
                class="tag-autocomplete-item"
                :class="{ active: m === autocompleteActiveIndex }"
                @click="acceptAutocomplete(match.name)"
              >
                <span class="tag-autocomplete-name">{{ match.name }}</span>
                <span class="tag-autocomplete-count">{{ match.count }}</span>
              </li>
            </ul>
          </div>
          <button
            class="journal-send-btn"
            type="button"
            :disabled="!newEntryDraft.trim()"
            title="Send"
            @mousedown.prevent
            @click="commitNewEntry"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="mode === 'freeform'" class="content">
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

    <div v-else class="content">
      <nav class="outline">
        <button
          v-for="t in sortedTags"
          :key="t.key"
          class="outline-item tag-item"
          :class="{ active: t.key === selectedTagKey }"
          @click="selectTag(t.key)"
        >
          <span class="tag-item-name">{{ t.name }}</span>
          <span class="tag-item-count">{{ t.count }}</span>
        </button>
        <p v-if="!sortedTags.length" class="outline-hint">
          Wrap a word in <code>**bold**</code> while journaling to create your first tag.
        </p>
      </nav>

      <div class="tag-detail">
        <template v-if="selectedTagData">
          <h2 class="journal-heading">{{ selectedTagData.name }}</h2>
          <p class="tag-detail-count">
            {{ selectedTagData.count }} mention{{ selectedTagData.count === 1 ? '' : 's' }}
          </p>
          <ul class="tag-timeline">
            <li
              v-for="(entry, i) in selectedTagTimeline"
              :key="i"
              class="tag-timeline-item"
              @click="jumpToTagEntry(entry.date)"
            >
              <span class="tag-timeline-date">{{ formatShort(entry.date) }}</span>
              <span class="tag-timeline-excerpt">{{ entry.excerpt }}</span>
            </li>
          </ul>
        </template>
        <p v-else class="outline-hint">Select a tag to see when it happened.</p>
      </div>
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
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 28px 40px 20px;
}

.journal-heading {
  font-size: 21px;
  font-weight: 700;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.journal-log {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-right: 4px;
  padding-bottom: 8px;
}

.journal-empty {
  font-size: 13px;
  color: var(--muted);
}

.journal-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  max-width: 680px;
}

.journal-message-text {
  padding: 4px 6px;
  margin: 0 -6px;
  border-radius: 6px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
  white-space: pre-wrap;
  cursor: text;
  transition: background 0.15s;
}
.journal-message-text:hover { background: var(--surface-2); }

.journal-message-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.journal-message-time {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.journal-msg-del {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
  flex-shrink: 0;
}
.journal-message:hover .journal-msg-del { opacity: 1; }
.journal-msg-del:hover { background: rgba(239,68,68,.15); color: var(--red); }

.journal-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  width: 100%;
}

.journal-message-input {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 15px;
  line-height: 1.7;
  resize: none;
  outline: none;
  field-sizing: content;
}
.journal-message-input::placeholder { color: var(--muted); }

.journal-composer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding: 9px 9px 9px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.journal-composer-input {
  display: block;
  width: 100%;
  max-height: 160px;
  overflow-y: auto;
  padding: 5px 0;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  field-sizing: content;
}
.journal-composer-input::placeholder { color: var(--muted); }

.journal-send-btn {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  transition: opacity 0.15s;
}
.journal-send-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Tag autocomplete */
.tag-autocomplete {
  position: absolute;
  z-index: 20;
  min-width: 180px;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgba(0,0,0,.25);
}

.tag-autocomplete-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}
.tag-autocomplete-item:hover,
.tag-autocomplete-item.active { background: rgba(99,102,241,.15); }

.tag-autocomplete-count {
  font-size: 11px;
  color: var(--muted);
}

/* Tags browser */
.tag-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tag-item-count {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  background: var(--surface-2);
  padding: 1px 6px;
  border-radius: 100px;
  flex-shrink: 0;
}
.tag-item.active .tag-item-count { color: var(--accent); }

.tag-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 28px 40px;
  overflow-y: auto;
}

.tag-detail-count {
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 20px;
}

.tag-timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-timeline-item {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.tag-timeline-item:hover { background: var(--surface-2); }

.tag-timeline-date {
  flex-shrink: 0;
  width: 56px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}

.tag-timeline-excerpt {
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
}
</style>
