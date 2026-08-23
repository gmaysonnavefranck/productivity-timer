<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  today: String,
});
const emit = defineEmits(['save', 'save-recurring', 'save-anytime', 'close']);

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const text = ref('');
const time = ref('');
const date = ref(props.today || '');

const mode = ref('once'); // 'once' | 'repeating' | 'anytime'
const repeatType = ref('monthly');
const repeatDay = ref(1);
const repeatMonth = ref(1);
const shiftWeekends = ref(true);

const isValid = computed(() => {
  if (!text.value.trim()) return false;
  if (mode.value === 'repeating') return repeatDay.value >= 1 && repeatDay.value <= 31;
  if (mode.value === 'anytime') return true;
  return !!date.value;
});

const saveLabel = computed(() => {
  if (mode.value === 'repeating') return 'Add Recurring Task';
  if (mode.value === 'anytime') return 'Add Reminder';
  return 'Add Task';
});

function submit() {
  if (!isValid.value) return;
  if (mode.value === 'repeating') {
    const rule = repeatType.value === 'monthly'
      ? { type: 'monthly', day: Number(repeatDay.value), shiftWeekends: shiftWeekends.value }
      : { type: 'yearly', month: Number(repeatMonth.value), day: Number(repeatDay.value), shiftWeekends: shiftWeekends.value };
    emit('save-recurring', { text: text.value.trim(), reminderTime: time.value || null, rule });
  } else if (mode.value === 'anytime') {
    emit('save-anytime', { text: text.value.trim(), reminderTime: time.value || null });
  } else {
    emit('save', { date: date.value, text: text.value.trim(), reminderTime: time.value || null });
  }
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

      <div class="mode-tabs">
        <button type="button" class="mode-tab" :class="{ active: mode === 'once' }" @click="mode = 'once'">One-time</button>
        <button type="button" class="mode-tab" :class="{ active: mode === 'repeating' }" @click="mode = 'repeating'">Repeating</button>
        <button type="button" class="mode-tab" :class="{ active: mode === 'anytime' }" @click="mode = 'anytime'">Anytime</button>
      </div>

      <div v-if="mode === 'once'" class="field">
        <label>Date</label>
        <input v-model="date" type="date" />
      </div>

      <template v-else-if="mode === 'repeating'">
        <div class="field">
          <label>Frequency</label>
          <select v-model="repeatType" class="select">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div v-if="repeatType === 'yearly'" class="field">
          <label>Month</label>
          <select v-model.number="repeatMonth" class="select">
            <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
        <div class="field">
          <label>Day of month</label>
          <input type="number" v-model.number="repeatDay" min="1" max="31" />
        </div>

        <label class="toggle-row">
          <span class="toggle-label">Shift weekends to Friday</span>
          <button type="button" class="toggle" :class="{ on: shiftWeekends }" @click="shiftWeekends = !shiftWeekends">
            <span class="thumb" />
          </button>
        </label>
      </template>

      <p v-else class="hint">No date — this stays on your list until you check it off.</p>

      <div class="field">
        <label>{{ mode === 'anytime' ? 'Daily reminder time (optional)' : 'Reminder time (optional)' }}</label>
        <input v-model="time" type="time" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">{{ saveLabel }}</button>
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
  max-height: 85vh;
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

.hint { font-size: 11px; color: var(--muted); }

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.mode-tab {
  flex: 1;
  padding: 6px 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s;
}
.mode-tab:hover { color: var(--text); }
.mode-tab.active { background: var(--accent); color: white; }

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
