<script setup>
import { ref, computed } from 'vue';
import ListFieldEditorRow from './ListFieldEditorRow.vue';

const props = defineProps({ fields: Array });
const emit = defineEmits(['save', 'close']);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const draft = ref(
  props.fields.map((f) => ({
    tempId: uid(),
    id: f.id,
    label: f.label,
    type: f.type,
    optionsRaw: (f.options || []).join('\n'),
  }))
);

function addField() {
  draft.value.push({ tempId: uid(), id: null, label: '', type: 'text', optionsRaw: '' });
}

function removeField(tempId) {
  const idx = draft.value.findIndex((f) => f.tempId === tempId);
  if (idx !== -1) draft.value.splice(idx, 1);
}

function moveField(index, dir) {
  const target = index + dir;
  if (target < 0 || target >= draft.value.length) return;
  const [item] = draft.value.splice(index, 1);
  draft.value.splice(target, 0, item);
}

function parseOptions(raw) {
  const seen = new Set();
  return (raw || '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

const isValid = computed(() => {
  if (!draft.value.length) return false;
  return draft.value.every((f) => {
    if (!f.label.trim()) return false;
    if (f.type === 'select' && parseOptions(f.optionsRaw).length === 0) return false;
    return true;
  });
});

function submit() {
  if (!isValid.value) return;
  emit('save', draft.value.map((f) => ({
    id: f.id,
    label: f.label.trim(),
    type: f.type,
    options: f.type === 'select' ? parseOptions(f.optionsRaw) : [],
  })));
}
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>Manage Fields</h2>

      <div class="field">
        <div class="field-list">
          <div v-for="(f, i) in draft" :key="f.tempId" class="field-row-wrap">
            <div class="reorder-btns">
              <button class="reorder-btn" :disabled="i === 0" @click="moveField(i, -1)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="reorder-btn" :disabled="i === draft.length - 1" @click="moveField(i, 1)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
            <ListFieldEditorRow
              class="field-row-fill"
              :model-value="f"
              :can-remove="draft.length > 1"
              @update:model-value="(v) => Object.assign(f, v)"
              @remove="removeField(f.tempId)"
            />
          </div>
        </div>
        <button class="btn-add-field" @click="addField">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          Add Field
        </button>
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">Save Fields</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 26px;
  width: 440px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal h2 { font-size: 15px; font-weight: 600; }

.field { display: flex; flex-direction: column; gap: 7px; }
.field-list { display: flex; flex-direction: column; gap: 8px; }

.field-row-wrap { display: flex; align-items: stretch; gap: 6px; }
.field-row-fill { flex: 1; min-width: 0; }

.reorder-btns {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}
.reorder-btn {
  width: 22px;
  height: 20px;
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.reorder-btn:hover:not(:disabled) { color: var(--text); }
.reorder-btn:disabled { opacity: 0.3; cursor: default; }

.btn-add-field {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 500;
  transition: all 0.15s;
}
.btn-add-field:hover { color: var(--text); }

.actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 2px; }

.btn-cancel {
  padding: 8px 15px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  transition: color 0.15s;
}
.btn-cancel:hover { color: var(--text); }

.btn-save {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) { background: var(--accent-hover); }
.btn-save:disabled { opacity: 0.45; cursor: default; }
</style>
