<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({ card: Object, projectColor: String, showDot: Boolean });
const emit = defineEmits(['rename', 'delete', 'dragstart', 'dragend', 'dragover-position', 'drop']);

const editing = ref(false);
const draft = ref('');
const dropSide = ref(null); // 'before' | 'after' | null

function startEdit() {
  draft.value = props.card.title;
  editing.value = true;
  nextTick(() => document.getElementById(`kc-${props.card.id}`)?.focus());
}

function commitEdit() {
  editing.value = false;
  const trimmed = draft.value.trim();
  if (trimmed && trimmed !== props.card.title) emit('rename', trimmed);
}

function onDragOver(e) {
  e.preventDefault();
  const rect = e.currentTarget.getBoundingClientRect();
  const before = e.clientY - rect.top < rect.height / 2;
  dropSide.value = before ? 'before' : 'after';
  emit('dragover-position', { cardId: props.card.id, before });
}

function onDrop(e) {
  e.preventDefault();
  dropSide.value = null;
  emit('drop');
}
</script>

<template>
  <div
    class="kcard"
    :class="{ 'drop-before': dropSide === 'before', 'drop-after': dropSide === 'after' }"
    draggable="true"
    @dragstart="$emit('dragstart')"
    @dragend="dropSide = null; $emit('dragend')"
    @dragover="onDragOver"
    @dragleave="dropSide = null"
    @drop="onDrop"
  >
    <span v-if="showDot" class="dot" :style="{ background: projectColor }" />
    <input
      v-if="editing"
      :id="`kc-${card.id}`"
      v-model="draft"
      class="title-input"
      @blur="commitEdit"
      @keydown.enter="commitEdit"
      @keydown.escape="editing = false"
    />
    <span v-else class="title" @click="startEdit">{{ card.title }}</span>
    <button class="del-btn" title="Delete" @click="$emit('delete')">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.kcard {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: grab;
  position: relative;
}
.kcard.drop-before { box-shadow: inset 0 2px 0 var(--accent); }
.kcard.drop-after { box-shadow: inset 0 -2px 0 var(--accent); }

.dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.title { flex: 1; font-size: 12.5px; min-width: 0; word-break: break-word; }
.title-input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 6px;
  color: var(--text);
  padding: 3px 6px;
  font-size: 12.5px;
  outline: none;
  min-width: 0;
}

.del-btn {
  width: 20px;
  height: 20px;
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
.kcard:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
