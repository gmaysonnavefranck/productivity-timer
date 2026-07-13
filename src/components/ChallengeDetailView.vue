<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useCountdown } from '../composables/useCountdown.js';

const props = defineProps({ speedrun: Object });
const emit = defineEmits(['update', 'delete', 'reset', 'finish', 'save', 'add-note', 'delete-note', 'back']);

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const isActive = computed(() => props.speedrun.status === 'active');

const { isRunning, toggle, stopInterval, finishNow } = useCountdown({
  getRemaining: () => props.speedrun.remainingSeconds,
  onTick: (remaining) => emit('update', { remainingSeconds: remaining }),
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
    : 1 - props.speedrun.remainingSeconds / props.speedrun.totalSeconds
);

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value));

const timeDisplay = computed(() => {
  const s = props.speedrun.remainingSeconds;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
});

function handleReset() {
  if (isRunning.value) stopInterval();
  emit('reset');
}

const sortedNotes = computed(() =>
  [...(props.speedrun.notesLog || [])].sort((a, b) => a.createdAt - b.createdAt)
);

function formatTimestamp(ms) {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const draft = ref('');
const messagesEl = ref(null);

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  });
}

watch(() => props.speedrun.notesLog?.length, scrollToBottom, { immediate: true });

function addNote() {
  const text = draft.value.trim();
  if (!text) return;
  emit('add-note', text);
  draft.value = '';
}

function handleComposerKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addNote();
  }
}
</script>

<template>
  <div class="detail-view">
    <header class="detail-header">
      <button class="back-btn" title="Back" @click="$emit('back')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1>{{ speedrun.name }}</h1>
      <span v-if="!isActive" class="badge">Finished</span>
      <button class="icon-btn danger" title="Delete" @click="$emit('delete')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </header>

    <div class="detail-body">
      <div class="timer-panel">
        <div class="ring-wrap">
          <svg width="164" height="164" viewBox="0 0 164 164">
            <circle cx="82" cy="82" :r="RADIUS" fill="none" stroke="var(--border)" stroke-width="8" />
            <circle
              cx="82" cy="82" :r="RADIUS"
              fill="none"
              :stroke="speedrun.color"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="dashOffset"
              transform="rotate(-90 82 82)"
              style="transition: stroke-dashoffset 0.6s ease"
            />
          </svg>
          <div class="time-overlay">
            <span class="time">{{ timeDisplay }}</span>
            <span v-if="isRunning" class="running-tag">Running</span>
          </div>
        </div>

        <div v-if="isActive" class="timer-actions">
          <button class="btn-main" :class="{ pause: isRunning }" @click="toggle">
            <svg v-if="!isRunning" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            {{ isRunning ? 'Pause' : 'Start' }}
          </button>
          <button class="btn-ghost" @click="handleReset">Reset</button>
          <button class="btn-ghost" @click="finishNow()">Finish now</button>
        </div>
      </div>

      <div class="notes-panel">
        <div ref="messagesEl" class="messages">
          <div v-if="!sortedNotes.length" class="no-notes">No notes yet — jot down what you're working on as you go.</div>
          <div v-for="note in sortedNotes" :key="note.id" class="bubble-row">
            <div class="bubble">
              <button class="del-btn" title="Delete note" @click="$emit('delete-note', note.id)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
              <p class="bubble-text">{{ note.text }}</p>
              <span class="bubble-time">{{ formatTimestamp(note.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="composer">
          <textarea
            v-model="draft"
            rows="1"
            placeholder="What did you work on… (Enter to send, Shift+Enter for a new line)"
            @keydown="handleComposerKeydown"
          />
          <button class="send-btn" title="Send" :disabled="!draft.trim()" @click="addNote">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 20l16-8L4 4v6l10 2-10 2v6z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-view {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.detail-header h1 { font-size: 17px; font-weight: 600; flex: 1; min-width: 0; }

.back-btn, .icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.back-btn:hover, .icon-btn:hover { background: var(--surface-2); color: var(--text); }
.icon-btn.danger:hover { background: rgba(239,68,68,.15); color: var(--red); }

.badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(34,197,94,.15);
  color: var(--green);
  flex-shrink: 0;
}

.detail-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.timer-panel {
  width: 320px;
  min-width: 320px;
  border-right: 1px solid var(--border);
  padding: 30px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.ring-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
.time-overlay {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  pointer-events: none;
}
.time { font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
.running-tag { font-size: 11px; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; }

.timer-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }

.btn-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.btn-main:hover { background: var(--accent-hover); }
.btn-main.pause { background: var(--surface-2); color: var(--text); }

.btn-ghost {
  padding: 9px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.btn-ghost:hover { color: var(--text); }

.notes-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-notes {
  margin: auto;
  font-size: 12.5px;
  color: var(--muted);
  text-align: center;
  max-width: 220px;
}

.bubble-row { display: flex; justify-content: flex-end; }

.bubble {
  position: relative;
  max-width: 70%;
  background: var(--accent);
  color: white;
  padding: 9px 34px 16px 13px;
  border-radius: 14px 14px 3px 14px;
}

.bubble-text { font-size: 13px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }

.bubble-time {
  position: absolute;
  right: 13px;
  bottom: 5px;
  font-size: 10px;
  color: rgba(255,255,255,.75);
}

.del-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: transparent;
  color: rgba(255,255,255,.75);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
}
.bubble:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(0,0,0,.2); color: white; }

.composer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.composer textarea {
  flex: 1;
  min-width: 0;
  max-height: 140px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 18px;
  color: var(--text);
  padding: 10px 16px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: none;
  transition: border-color 0.15s;
}
.composer textarea:focus { border-color: var(--accent); }

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.send-btn:hover:not(:disabled) { background: var(--accent-hover); }
.send-btn:disabled { opacity: 0.4; cursor: default; }
</style>
