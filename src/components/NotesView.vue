<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';

const props = defineProps({ text: String });
const emit = defineEmits(['update-text']);

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

function commit() {
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
  commit();
  selectedIndex.value = null;
  activeRange = null;
  draftText.value = fullText.value;
}

function selectSection(i) {
  commit();
  const s = parseSections(fullText.value)[i];
  if (!s) return;
  selectedIndex.value = i;
  activeRange = { start: s.start, end: s.end };
  draftText.value = fullText.value.slice(s.start, s.end);
}

onBeforeUnmount(commit);
</script>

<template>
  <div class="notes-view">
    <header class="view-header">
      <h1>Notes</h1>
    </header>

    <div class="content">
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
        @blur="commit"
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

.content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.outline {
  width: 200px;
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
</style>
