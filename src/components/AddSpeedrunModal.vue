<script setup>
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits(['save', 'close']);

const COLORS = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#ef4444'];

const name = ref('');
const hours = ref(20);
const minutes = ref(0);
const color = ref(COLORS[0]);
const description = ref('');

const isValid = computed(() => name.value.trim().length > 0 && (Number(hours.value) > 0 || Number(minutes.value) > 0));

function submit() {
  if (!isValid.value) return;
  emit('save', {
    name: name.value.trim(),
    totalSeconds: Number(hours.value) * 3600 + Number(minutes.value) * 60,
    color: color.value,
    description: description.value.trim(),
  });
}

onMounted(() => document.getElementById('sm-name')?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>New Challenge</h2>

      <div class="field">
        <label>Name</label>
        <input
          id="sm-name"
          v-model="name"
          placeholder="e.g. Learn Guitar, Ship Side Project…"
          @keydown.enter="submit"
          @keydown.escape="$emit('close')"
        />
      </div>

      <div class="field">
        <label>Budget</label>
        <div class="row">
          <div class="dur-group">
            <input type="number" v-model.number="hours" min="0" />
            <span>hours</span>
          </div>
          <div class="dur-group">
            <input type="number" v-model.number="minutes" min="0" max="59" />
            <span>min</span>
          </div>
        </div>
      </div>

      <div class="field">
        <label>Color</label>
        <div class="colors">
          <button
            v-for="c in COLORS"
            :key="c"
            class="swatch"
            :class="{ active: color === c }"
            :style="{ background: c }"
            @click="color = c"
          />
        </div>
      </div>

      <div class="field">
        <label>Objectives (optional)</label>
        <textarea v-model="description" rows="3" placeholder="What are you trying to achieve…" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">Start Challenge</button>
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
  width: 350px;
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

input, textarea {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  font-family: inherit;
  resize: none;
}
input:focus, textarea:focus { border-color: var(--accent); }

.row { display: flex; gap: 8px; }

.dur-group {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
}

.dur-group input { width: 64px; text-align: center; }
.dur-group span { font-size: 12px; color: var(--muted); white-space: nowrap; }

.colors { display: flex; gap: 7px; flex-wrap: wrap; }

.swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.15s;
  flex-shrink: 0;
}
.swatch:hover { transform: scale(1.15); }
.swatch.active { border-color: white; transform: scale(1.15); }

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
