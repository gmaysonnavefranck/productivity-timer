<script setup>
import { ref, computed } from 'vue';
import SpeedrunCard from './SpeedrunCard.vue';
import AddSpeedrunModal from './AddSpeedrunModal.vue';
import ChallengeDetailView from './ChallengeDetailView.vue';

const props = defineProps({ speedruns: Array });
const emit = defineEmits([
  'add-speedrun', 'update-speedrun', 'delete-speedrun',
  'reset-speedrun', 'finish-speedrun', 'add-note', 'delete-note', 'save',
]);

const openId = ref(null);
const openSpeedrun = computed(() => props.speedruns.find((s) => s.id === openId.value) || null);

const active = computed(() => props.speedruns.filter((s) => s.status === 'active' && s.id !== openId.value));
const finished = computed(() => props.speedruns.filter((s) => s.status === 'finished'));

const showAddModal = ref(false);

function handleAdd(data) {
  emit('add-speedrun', data);
  showAddModal.value = false;
}

function handleDelete(id) {
  emit('delete-speedrun', id);
  if (openId.value === id) openId.value = null;
}

function formatDur(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
</script>

<template>
  <ChallengeDetailView
    v-if="openSpeedrun"
    :speedrun="openSpeedrun"
    @update="(changes) => emit('update-speedrun', openSpeedrun.id, changes)"
    @delete="handleDelete(openSpeedrun.id)"
    @reset="emit('reset-speedrun', openSpeedrun.id)"
    @finish="emit('finish-speedrun', openSpeedrun.id)"
    @add-note="(text) => emit('add-note', openSpeedrun.id, text)"
    @delete-note="(noteId) => emit('delete-note', openSpeedrun.id, noteId)"
    @save="emit('save')"
    @back="openId = null"
  />

  <div v-else class="speedrun-view">
    <header class="view-header">
      <h1>Challenges</h1>
      <button class="btn-add" @click="showAddModal = true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        New Challenge
      </button>
    </header>

    <div class="content">
      <div v-if="!speedruns.length" class="empty-state">
        <p>No challenges yet</p>
        <p class="sub">Set a time budget for a goal and see how far you get.</p>
      </div>

      <template v-else>
        <section class="section">
          <p class="sec-title">Active</p>
          <div v-if="!active.length" class="no-items">No active challenges.</div>
          <div v-else class="speedrun-grid">
            <SpeedrunCard
              v-for="s in active"
              :key="s.id"
              :speedrun="s"
              @update="(changes) => emit('update-speedrun', s.id, changes)"
              @delete="handleDelete(s.id)"
              @reset="emit('reset-speedrun', s.id)"
              @finish="emit('finish-speedrun', s.id)"
              @save="emit('save')"
              @open="openId = s.id"
            />
          </div>
        </section>

        <section v-if="finished.length" class="section">
          <p class="sec-title">Finished</p>
          <div class="finished-list">
            <div v-for="s in finished" :key="s.id" class="finished-row" @click="openId = s.id">
              <span class="f-dot" :style="{ background: s.color }" />
              <div class="f-info">
                <span class="f-name">{{ s.name }}</span>
                <span class="f-time">
                  {{ formatDur(s.totalSeconds - s.remainingSeconds) }} / {{ formatDur(s.totalSeconds) }}
                </span>
              </div>
              <span v-if="s.notesLog?.length" class="f-note-count">{{ s.notesLog.length }} note{{ s.notesLog.length !== 1 ? 's' : '' }}</span>
              <button class="del-btn" title="Delete" @click.stop="handleDelete(s.id)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </section>
      </template>
    </div>

    <AddSpeedrunModal v-if="showAddModal" @save="handleAdd" @close="showAddModal = false" />
  </div>
</template>

<style scoped>
.speedrun-view {
  flex: 1;
  min-width: 0;
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

.content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 28px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

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

.section { display: flex; flex-direction: column; gap: 12px; }

.sec-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.no-items { font-size: 12px; color: var(--muted); }

.speedrun-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

.finished-list { display: flex; flex-direction: column; gap: 7px; }

.finished-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s;
}
.finished-row:hover { border-color: var(--accent); }

.f-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.f-info { display: flex; flex-direction: column; gap: 1px; min-width: 120px; }
.f-name { font-size: 12.5px; font-weight: 500; }
.f-time { font-size: 11px; color: var(--muted); }

.f-note-count {
  font-size: 11px;
  color: var(--muted);
  flex: 1;
}

.del-btn {
  width: 22px;
  height: 22px;
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
.finished-row:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
