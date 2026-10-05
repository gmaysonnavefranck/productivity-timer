<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({ initial: Object, categories: Array });
const emit = defineEmits(['save', 'close']);

const title = ref(props.initial?.title || '');
const categoryId = ref(props.initial?.categoryId || props.categories[0]?.id || null);
const start = ref(props.initial?.start || '');
const ongoing = ref(props.initial ? !props.initial.end : false);
const end = ref(props.initial?.end || '');

const isValid = computed(() =>
  title.value.trim().length > 0 &&
  !!categoryId.value &&
  !!start.value &&
  (ongoing.value || !end.value || end.value >= start.value)
);

function submit() {
  if (!isValid.value) return;
  emit('save', {
    title: title.value.trim(),
    categoryId: categoryId.value,
    start: start.value,
    end: ongoing.value ? null : (end.value || null),
  });
}

onMounted(() => document.getElementById('lem-title')?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ initial ? 'Edit Event' : 'New Event' }}</h2>

      <div class="field">
        <label>Title</label>
        <input
          id="lem-title"
          v-model="title"
          placeholder="e.g. Trip to Lisbon, Started dating…"
          @keydown.enter="submit"
          @keydown.escape="$emit('close')"
        />
      </div>

      <div class="field">
        <label>Category</label>
        <select v-model="categoryId" class="select">
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="field">
        <label>Start</label>
        <input v-model="start" type="date" />
      </div>

      <label class="toggle-row">
        <span class="toggle-label">Ongoing</span>
        <button type="button" class="toggle" :class="{ on: ongoing }" @click="ongoing = !ongoing">
          <span class="thumb" />
        </button>
      </label>

      <div v-if="!ongoing" class="field">
        <label>End</label>
        <input v-model="end" type="date" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">
          {{ initial ? 'Save Changes' : 'Add Event' }}
        </button>
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
  width: 340px;
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

input, .select {
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
input:focus, .select:focus { border-color: var(--accent); }

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.toggle-label { font-size: 13px; color: var(--text); }
.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  padding: 0;
}
.toggle.on { background: var(--accent); }
.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s;
}
.toggle.on .thumb { left: 19px; }

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
