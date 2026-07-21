<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  today: String,
  recurringTasks: { type: Array, default: () => [] },
});
const emit = defineEmits(['save', 'save-recurring', 'delete-recurring', 'close']);

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const text = ref('');
const time = ref('');
const date = ref(props.today || '');

const repeats = ref(false);
const repeatType = ref('monthly');
const repeatDay = ref(1);
const repeatMonth = ref(1);
const shiftWeekends = ref(true);

const isValid = computed(() => {
  if (!text.value.trim()) return false;
  if (repeats.value) return repeatDay.value >= 1 && repeatDay.value <= 31;
  return !!date.value;
});

function submit() {
  if (!isValid.value) return;
  if (repeats.value) {
    const rule = repeatType.value === 'monthly'
      ? { type: 'monthly', day: Number(repeatDay.value), shiftWeekends: shiftWeekends.value }
      : { type: 'yearly', month: Number(repeatMonth.value), day: Number(repeatDay.value), shiftWeekends: shiftWeekends.value };
    emit('save-recurring', { text: text.value.trim(), reminderTime: time.value || null, rule });
  } else {
    emit('save', { date: date.value, text: text.value.trim(), reminderTime: time.value || null });
  }
}

function ruleLabel(rule) {
  const base = rule.type === 'monthly'
    ? `Every month, day ${rule.day}`
    : `Every year, ${MONTHS[rule.month - 1]} ${rule.day}`;
  return rule.shiftWeekends === false ? base : `${base} (weekends → Friday)`;
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

      <label class="toggle-row">
        <span class="toggle-label">Repeats</span>
        <button type="button" class="toggle" :class="{ on: repeats }" @click="repeats = !repeats">
          <span class="thumb" />
        </button>
      </label>

      <div v-if="!repeats" class="field">
        <label>Date</label>
        <input v-model="date" type="date" />
      </div>

      <template v-else>
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

      <div class="field">
        <label>Reminder time (optional)</label>
        <input v-model="time" type="time" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">
          {{ repeats ? 'Add Recurring Task' : 'Add Task' }}
        </button>
      </div>

      <div v-if="recurringTasks.length" class="recurring-list">
        <p class="field-label">Recurring tasks</p>
        <div v-for="rt in recurringTasks" :key="rt.id" class="recurring-row">
          <div class="recurring-info">
            <span class="recurring-text">{{ rt.text }}</span>
            <span class="recurring-rule">{{ ruleLabel(rt.rule) }}</span>
          </div>
          <button class="icon-btn-sm" @click="$emit('delete-recurring', rt.id)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
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

.field label, .field-label {
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

.recurring-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 4px;
  border-top: 1px solid var(--border);
}

.recurring-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.recurring-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.recurring-text { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recurring-rule { font-size: 10px; color: var(--muted); }

.icon-btn-sm {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.icon-btn-sm:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
