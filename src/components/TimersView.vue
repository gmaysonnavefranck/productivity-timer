<script setup>
import { ref } from 'vue';
import TimerCard from './TimerCard.vue';
import AddTimerModal from './AddTimerModal.vue';

const props = defineProps({ timers: Array });
const emit = defineEmits(['add', 'edit', 'update', 'delete', 'reset', 'save']);

const showModal = ref(false);
const editingTimer = ref(null);

function openAdd() {
  editingTimer.value = null;
  showModal.value = true;
}

function openEdit(timer) {
  editingTimer.value = timer;
  showModal.value = true;
}

function handleSave(timerData) {
  if (editingTimer.value) {
    emit('edit', editingTimer.value.id, timerData);
  } else {
    emit('add', timerData);
  }
  showModal.value = false;
  editingTimer.value = null;
}

function handleClose() {
  showModal.value = false;
  editingTimer.value = null;
}
</script>

<template>
  <div class="timers-view">
    <header class="view-header">
      <div>
        <h1>Timers</h1>
        <p class="date-label">
          {{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
        </p>
      </div>
      <button class="btn-add" @click="openAdd">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        Add Timer
      </button>
    </header>

    <div v-if="timers.length === 0" class="empty-state">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.2" />
        <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
      <p>No timers yet</p>
      <p class="sub">Add your first timer to start tracking your goals.</p>
    </div>

    <div v-else class="timer-grid">
      <TimerCard
        v-for="timer in timers"
        :key="timer.id"
        :timer="timer"
        @update="(changes) => emit('update', timer.id, changes)"
        @delete="emit('delete', timer.id)"
        @reset="emit('reset', timer.id)"
        @edit="openEdit(timer)"
        @save="emit('save')"
      />
    </div>

    <AddTimerModal
      v-if="showModal"
      :initial="editingTimer"
      @save="handleSave"
      @close="handleClose"
    />
  </div>
</template>

<style scoped>
.timers-view {
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
.date-label { font-size: 12px; color: var(--muted); margin-top: 3px; }

.btn-add {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}
.btn-add:hover { background: var(--accent-hover); }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--muted);
}
.empty-state p { font-size: 15px; font-weight: 500; }
.empty-state .sub { font-size: 12px; font-weight: 400; }

.timer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
  padding: 22px 28px;
  overflow-y: auto;
  align-content: start;
}
</style>
