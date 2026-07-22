<script setup>
import { ref, computed, onMounted } from 'vue';
import MoneyInput from './MoneyInput.vue';

const props = defineProps({ categories: { type: Array, default: () => [] } });
const emit = defineEmits(['save', 'close']);

const name = ref('');
const amount = ref(null);
const type = ref('expense');
const category = ref('');
const date = ref(new Date().toISOString().slice(0, 10));

const isValid = computed(() =>
  name.value.trim().length > 0 &&
  amount.value !== null &&
  !isNaN(amount.value) &&
  amount.value > 0 &&
  !!date.value
);

function submit() {
  if (!isValid.value) return;
  const signed = type.value === 'expense' ? -Math.abs(amount.value) : Math.abs(amount.value);
  emit('save', { date: date.value, name: name.value.trim(), amount: signed, category: category.value.trim() });
}

const nameInputRef = ref(null);
onMounted(() => nameInputRef.value?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>Add Entry</h2>

      <div class="field">
        <label>Name</label>
        <input
          ref="nameInputRef"
          v-model="name"
          placeholder="e.g. Salary, Groceries…"
          @keydown.enter="submit"
          @keydown.escape="$emit('close')"
        />
      </div>

      <label class="toggle-row">
        <span class="toggle-label">{{ type === 'income' ? 'Income' : 'Expense' }}</span>
        <button
          type="button"
          class="toggle"
          :class="{ on: type === 'income' }"
          @click="type = type === 'income' ? 'expense' : 'income'"
        >
          <span class="thumb" />
        </button>
      </label>

      <div class="field">
        <label>Amount</label>
        <MoneyInput v-model="amount" @keydown.enter="submit" @keydown.escape="$emit('close')" />
      </div>

      <div class="field">
        <label>Category</label>
        <input v-model="category" list="bal-categories" placeholder="e.g. food, salary…" />
        <datalist id="bal-categories">
          <option v-for="c in categories" :key="c" :value="c" />
        </datalist>
      </div>

      <div class="field">
        <label>Date</label>
        <input v-model="date" type="date" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">Add Entry</button>
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
  width: 320px;
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
  color-scheme: dark;
}
input:focus { border-color: var(--accent); }

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
