<script setup>
const props = defineProps({ modelValue: Object, canRemove: { type: Boolean, default: true } });
const emit = defineEmits(['update:modelValue', 'remove']);

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'Link' },
  { value: 'image', label: 'Image URL' },
];

function patch(changes) {
  emit('update:modelValue', { ...props.modelValue, ...changes });
}
</script>

<template>
  <div class="field-row">
    <div class="field-row-main">
      <input
        class="label-input"
        placeholder="Field label"
        :value="modelValue.label"
        @input="patch({ label: $event.target.value })"
      />
      <select class="type-select" :value="modelValue.type" @change="patch({ type: $event.target.value })">
        <option v-for="t in FIELD_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <button v-if="canRemove" class="del-btn" title="Remove field" @click="$emit('remove')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <textarea
      v-if="modelValue.type === 'select'"
      class="options-input"
      rows="2"
      placeholder="One option per line"
      :value="modelValue.optionsRaw"
      @input="patch({ optionsRaw: $event.target.value })"
    />
  </div>
</template>

<style scoped>
.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.field-row-main { display: flex; align-items: center; gap: 8px; }

.label-input, .type-select, .options-input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 8px 10px;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  color-scheme: dark;
}
.label-input:focus, .type-select:focus, .options-input:focus { border-color: var(--accent); }

.label-input { flex: 1; min-width: 0; }
.type-select { flex-shrink: 0; width: 140px; }
.options-input { width: 100%; resize: vertical; }

.del-btn {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
