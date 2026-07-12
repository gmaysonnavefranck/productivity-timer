<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { tickRemaining, elapsedSince } from '../timerMath.mjs';

const props = defineProps({ timer: Object });
const emit = defineEmits(['update', 'delete', 'reset', 'edit', 'save']);

const isRunning = ref(false);
let intervalId = null;
let lastTickAt = null;

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const progress = computed(() =>
  props.timer.totalSeconds === 0
    ? 1
    : 1 - props.timer.remainingSeconds / props.timer.totalSeconds
);

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value));

const isCompleted = computed(() => props.timer.remainingSeconds === 0);

const timeDisplay = computed(() => {
  const s = props.timer.remainingSeconds;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
});

function tick() {
  const elapsed = elapsedSince(lastTickAt);
  lastTickAt = Date.now();
  const remaining = tickRemaining(props.timer.remainingSeconds, elapsed);
  emit('update', { remainingSeconds: remaining });
  if (remaining <= 0) stop(true);
}

function stop(completed = false) {
  isRunning.value = false;
  clearInterval(intervalId);
  intervalId = null;
  lastTickAt = null;
  emit('save');
  if (completed) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(`${props.timer.name} complete!`, { body: 'Your timer has finished.' });
      }
    } catch (_) {}
  }
}

function toggle() {
  if (isCompleted.value) return;
  if (isRunning.value) {
    stop();
  } else {
    isRunning.value = true;
    lastTickAt = Date.now();
    intervalId = setInterval(tick, 1000);
  }
}

function handleReset() {
  if (isRunning.value) stop();
  emit('reset');
}

// Manual "time spent today" adjustment
const showAdjust = ref(false);
const adjustH = ref(0);
const adjustM = ref(0);

function openAdjust() {
  const spent = props.timer.totalSeconds - props.timer.remainingSeconds;
  adjustH.value = Math.floor(spent / 3600);
  adjustM.value = Math.floor((spent % 3600) / 60);
  showAdjust.value = true;
}

function saveAdjust() {
  const spentSeconds = Math.max(0, Number(adjustH.value) || 0) * 3600 + Math.max(0, Number(adjustM.value) || 0) * 60;
  const newRemaining = Math.min(props.timer.totalSeconds, Math.max(0, props.timer.totalSeconds - spentSeconds));
  emit('update', { remainingSeconds: newRemaining });
  emit('save');
  showAdjust.value = false;
}

if (Notification.permission === 'default') Notification.requestPermission();

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="card" :class="{ running: isRunning, completed: isCompleted }">
    <div class="card-top">
      <span class="timer-name">{{ timer.name }}</span>
      <div class="actions">
        <button class="icon-btn" title="Adjust time spent" @click="openAdjust">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="icon-btn" title="Edit" @click="$emit('edit')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="icon-btn danger" title="Delete" @click="$emit('delete')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="ring-wrap">
      <svg width="124" height="124" viewBox="0 0 124 124">
        <circle cx="62" cy="62" :r="RADIUS" fill="none" stroke="var(--border)" stroke-width="7" />
        <circle
          cx="62" cy="62" :r="RADIUS"
          fill="none"
          :stroke="isCompleted ? 'var(--green)' : timer.color"
          stroke-width="7"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 62 62)"
          style="transition: stroke-dashoffset 0.6s ease"
        />
      </svg>
      <div class="time-overlay">
        <span class="time">{{ timeDisplay }}</span>
        <span v-if="isCompleted" class="done-tag">Done!</span>
        <span v-else-if="isRunning" class="running-tag">Running</span>
      </div>
    </div>

    <div v-if="showAdjust" class="adjust-panel">
      <span class="adjust-label">Time spent today</span>
      <div class="adjust-row">
        <input type="number" v-model.number="adjustH" min="0" max="23" />
        <span>h</span>
        <input type="number" v-model.number="adjustM" min="0" max="59" />
        <span>m</span>
      </div>
      <div class="adjust-actions">
        <button class="btn-ghost" @click="showAdjust = false">Cancel</button>
        <button class="btn-main" @click="saveAdjust">Save</button>
      </div>
    </div>

    <div class="card-bottom">
      <button
        class="btn-main"
        :class="{ pause: isRunning, done: isCompleted }"
        :disabled="isCompleted"
        @click="toggle"
      >
        <svg v-if="!isRunning" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
        {{ isCompleted ? 'Completed' : isRunning ? 'Pause' : 'Start' }}
      </button>
      <button class="btn-ghost" title="Reset" @click="handleReset">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M3 3v5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Reset
      </button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: border-color 0.2s;
}
.card.running { border-color: var(--accent); }
.card.completed { border-color: var(--green); }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.timer-name { font-weight: 600; font-size: 14px; }

.actions { display: flex; gap: 2px; }

.icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.icon-btn:hover { background: var(--surface-2); color: var(--text); }
.icon-btn.danger:hover { background: rgba(239,68,68,.15); color: var(--red); }

.ring-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-overlay {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
}

.time {
  font-size: 21px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}

.done-tag { font-size: 10px; color: var(--green); font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
.running-tag { font-size: 10px; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }

.card-bottom {
  display: flex;
  gap: 7px;
  width: 100%;
}

.btn-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.btn-main:hover:not(:disabled) { background: var(--accent-hover); }
.btn-main.pause { background: var(--surface-2); color: var(--text); }
.btn-main.done { background: rgba(34,197,94,.15); color: var(--green); cursor: default; }

.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 11px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.btn-ghost:hover { color: var(--text); }

.adjust-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}
.adjust-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.adjust-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.adjust-row input {
  width: 48px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 5px 6px;
  font-size: 12px;
  text-align: center;
  outline: none;
}
.adjust-row span { font-size: 11px; color: var(--muted); }
.adjust-actions { display: flex; gap: 6px; justify-content: flex-end; }
</style>
