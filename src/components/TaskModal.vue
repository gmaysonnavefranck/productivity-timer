<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({ today: String });
const emit = defineEmits(['save', 'close']);

const text = ref('');
const time = ref('');
const date = ref(props.today || '');

const isValid = computed(() => text.value.trim().length > 0 && date.value);

function submit() {
  if (!isValid.value) return;
  emit('save', { date: date.value, text: text.value.trim(), reminderTime: time.value || null });
}

onMounted(() => document.getElementById('task-text')?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>New Task</h2>

      <div class="field">
        <label>Task</label>
        <input
          id="task-text"
          v-model="text"
          placeholder="e.g. Call the dentist…"
          @keydown.enter="submit"
          @keydown.escape="$emit('close')"
        />
      </div>

      <div class="field">
        <label>Date</label>
        <input v-model="date" type="date" />
      </div>

      <div class="field">
        <label>Reminder time (optional)</label>
        <input v-model="time" type="time" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">Add Task</button>
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

input {
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
input:focus { border-color: var(--accent); }

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
