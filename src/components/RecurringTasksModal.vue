<script setup>
import { ref, computed, onMounted } from 'vue';
import { describeRule } from '../recurrence.js';

const props = defineProps({
  recurringTasks: { type: Array, default: () => [] },
});
defineEmits(['delete', 'close']);

const filter = ref('');

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return props.recurringTasks;
  return props.recurringTasks.filter((rt) => rt.text.toLowerCase().includes(q));
});

onMounted(() => document.getElementById('recurring-filter')?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Recurring Tasks</h2>
        <span class="count-badge">{{ recurringTasks.length }}</span>
      </div>

      <input
        id="recurring-filter"
        v-model="filter"
        type="text"
        class="filter-input"
        placeholder="Filter recurring tasks…"
        @keydown.escape="$emit('close')"
      />

      <div class="list">
        <div v-for="rt in filtered" :key="rt.id" class="row">
          <div class="row-info">
            <span class="row-text">{{ rt.text }}</span>
            <span class="row-rule">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ describeRule(rt.rule) }}
            </span>
            <span v-if="rt.reminderTime" class="row-reminder">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              {{ rt.reminderTime }}
            </span>
          </div>
          <button class="del-btn" @click="$emit('delete', rt.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <p v-if="!filtered.length" class="empty-hint">
          {{ recurringTasks.length ? 'No matches.' : 'No recurring tasks yet.' }}
        </p>
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Close</button>
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
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.modal-header h2 { font-size: 15px; font-weight: 600; }

.count-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  background: var(--surface-2);
  border-radius: 100px;
  padding: 1px 8px;
}

.filter-input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  flex-shrink: 0;
}
.filter-input:focus { border-color: var(--accent); }

.list {
  flex: 1;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 2px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.row-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.row-text { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.row-rule, .row-reminder {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: var(--muted);
}

.empty-hint {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  padding: 20px 0;
}

.actions { display: flex; justify-content: flex-end; flex-shrink: 0; }

.btn-cancel {
  padding: 8px 15px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  transition: color 0.15s;
}
.btn-cancel:hover { color: var(--text); }

.del-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
