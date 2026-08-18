<script setup>
import { reactive } from 'vue';
import ListFieldInput from './ListFieldInput.vue';

const props = defineProps({ fields: Array, row: { type: Object, default: null } });
const emit = defineEmits(['save', 'close']);

function defaultFor(type) {
  if (type === 'number') return null;
  if (type === 'rating') return 0;
  if (type === 'checkbox') return false;
  return '';
}

const draftValues = reactive(
  Object.fromEntries(
    props.fields.map((f) => [f.id, props.row ? (props.row.values[f.id] ?? defaultFor(f.type)) : defaultFor(f.type)])
  )
);

function setValue(fieldId, value) {
  draftValues[fieldId] = value;
}

function submit() {
  emit('save', { ...draftValues });
}
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ row ? 'Edit Row' : 'Add Row' }}</h2>

      <div class="fields-scroll">
        <div v-for="f in fields" :key="f.id" class="field">
          <label>{{ f.label }}</label>
          <ListFieldInput :field="f" :model-value="draftValues[f.id]" @update:model-value="(v) => setValue(f.id, v)" />
        </div>
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" @click="submit">{{ row ? 'Save Changes' : 'Add Row' }}</button>
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
  width: 380px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal h2 { font-size: 15px; font-weight: 600; flex-shrink: 0; }

.fields-scroll {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field { display: flex; flex-direction: column; gap: 7px; }

.field label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 2px; flex-shrink: 0; }

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
.btn-save:hover { background: var(--accent-hover); }
</style>
