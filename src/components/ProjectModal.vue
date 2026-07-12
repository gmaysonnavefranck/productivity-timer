<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({ initial: Object });
const emit = defineEmits(['save', 'close']);

const COLORS = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#ef4444'];

const name = ref(props.initial?.name || '');
const color = ref(props.initial?.color || COLORS[0]);

const isValid = computed(() => name.value.trim().length > 0);

function submit() {
  if (!isValid.value) return;
  emit('save', { name: name.value.trim(), color: color.value });
}

onMounted(() => document.getElementById('pm-name')?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ initial ? 'Edit Project' : 'New Project' }}</h2>

      <div class="field">
        <label>Name</label>
        <input
          id="pm-name"
          v-model="name"
          placeholder="e.g. Website Redesign"
          @keydown.enter="submit"
          @keydown.escape="$emit('close')"
        />
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

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">
          {{ initial ? 'Save Changes' : 'Add Project' }}
        </button>
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
}
input:focus { border-color: var(--accent); }

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
