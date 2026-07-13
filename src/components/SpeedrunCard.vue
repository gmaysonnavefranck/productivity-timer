<script setup>
import { computed } from 'vue';
import { useCountdown } from '../composables/useCountdown.js';

const props = defineProps({ speedrun: Object });
const emit = defineEmits(['update', 'delete', 'reset', 'finish', 'save', 'open']);

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const { isRunning, effectiveRemaining, toggle, pause, finishNow } = useCountdown({
  getSpeedrun: () => props.speedrun,
  onUpdate: (changes) => emit('update', changes),
  onFinish: (auto) => {
    emit('finish');
    if (auto) {
      try {
        if (Notification.permission === 'granted') {
          new Notification(`${props.speedrun.name} finished!`, { body: 'Challenge budget reached.' });
        }
      } catch (_) {}
    }
  },
  onSave: () => emit('save'),
});

const progress = computed(() =>
  props.speedrun.totalSeconds === 0
    ? 1
    : 1 - effectiveRemaining.value / props.speedrun.totalSeconds
);

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value));

const timeDisplay = computed(() => {
  const s = effectiveRemaining.value;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
});

function handleReset() {
  if (isRunning.value) pause();
  emit('update', { startedAt: null });
  emit('reset');
}

if (Notification.permission === 'default') Notification.requestPermission();
</script>

<template>
  <div class="card" :class="{ running: isRunning }" @click="$emit('open')">
    <div class="card-top">
      <span class="run-name">{{ speedrun.name }}</span>
      <div class="actions">
        <svg v-if="speedrun.notesLog?.length" class="notes-icon" title="Has notes" width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16v12H8l-4 4V4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
        <button class="icon-btn" title="Finish now" @click.stop="finishNow()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="icon-btn danger" title="Delete" @click.stop="$emit('delete')">
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
          :stroke="speedrun.color"
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
        <span v-if="isRunning" class="running-tag">Running</span>
      </div>
    </div>

    <div class="card-bottom">
      <button
        class="btn-main"
        :class="{ pause: isRunning }"
        @click.stop="toggle"
      >
        <svg v-if="!isRunning" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
        {{ isRunning ? 'Pause' : 'Start' }}
      </button>
      <button class="btn-ghost" title="Reset" @click.stop="handleReset">
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
  cursor: pointer;
}
.card.running { border-color: var(--accent); }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.run-name { font-weight: 600; font-size: 14px; }

.actions { display: flex; align-items: center; gap: 2px; }

.notes-icon { color: var(--muted); margin-right: 2px; }

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
</style>
