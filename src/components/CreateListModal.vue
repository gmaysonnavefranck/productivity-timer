<script setup>
import { ref, computed, onMounted } from 'vue';
import ListFieldEditorRow from './ListFieldEditorRow.vue';

const emit = defineEmits(['save', 'close']);

const name = ref('');
const draftFields = ref([]);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function addField() {
  draftFields.value.push({ tempId: uid(), label: '', type: 'text', optionsRaw: '' });
}

function removeField(tempId) {
  const idx = draftFields.value.findIndex((f) => f.tempId === tempId);
  if (idx !== -1) draftFields.value.splice(idx, 1);
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
  if (!name.value.trim()) return false;
  if (!draftFields.value.length) return false;
  return draftFields.value.every((f) => {
    if (!f.label.trim()) return false;
    if (f.type === 'select' && parseOptions(f.optionsRaw).length === 0) return false;
    return true;
  });
});

function submit() {
  if (!isValid.value) return;
  emit('save', {
    name: name.value.trim(),
    fields: draftFields.value.map((f) => ({
      label: f.label.trim(),
      type: f.type,
      options: f.type === 'select' ? parseOptions(f.optionsRaw) : [],
    })),
  });
}

const nameInput = ref(null);
onMounted(() => {
  addField();
  nameInput.value?.focus();
});
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>New List</h2>

      <div class="field">
        <label>Name</label>
        <input ref="nameInput" v-model="name" placeholder="e.g. Yu-Gi-Oh Cards" @keydown.escape="$emit('close')" />
      </div>

      <div class="field">
        <label>Fields</label>
        <div class="field-list">
          <ListFieldEditorRow
            v-for="f in draftFields"
            :key="f.tempId"
            :model-value="f"
            :can-remove="draftFields.length > 1"
            @update:model-value="(v) => Object.assign(f, v)"
            @remove="removeField(f.tempId)"
          />
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
        <button class="btn-save" :disabled="!isValid" @click="submit">Create List</button>
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
  width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal h2 { font-size: 15px; font-weight: 600; }

.field { display: flex; flex-direction: column; gap: 7px; }

.field label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.field > input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  color-scheme: dark;
}
.field > input:focus { border-color: var(--accent); }

.field-list { display: flex; flex-direction: column; gap: 8px; }

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
