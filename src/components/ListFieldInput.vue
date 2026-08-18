<script setup>
const props = defineProps({ field: Object, modelValue: { type: null, required: false } });
const emit = defineEmits(['update:modelValue']);

function onNumberInput(e) {
  const v = e.target.value;
  emit('update:modelValue', v === '' ? null : Number(v));
}
</script>

<template>
  <input
    v-if="field.type === 'text' || field.type === 'url'"
    :type="field.type === 'url' ? 'url' : 'text'"
    :value="modelValue ?? ''"
    @input="$emit('update:modelValue', $event.target.value)"
  />

  <textarea
    v-else-if="field.type === 'textarea'"
    rows="3"
    :value="modelValue ?? ''"
    @input="$emit('update:modelValue', $event.target.value)"
  />

  <input
    v-else-if="field.type === 'number'"
    type="number"
    :value="modelValue ?? ''"
    @input="onNumberInput"
  />

  <div v-else-if="field.type === 'rating'" class="rating-input">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      class="star-btn"
      :class="{ filled: n <= (Number(modelValue) || 0) }"
      @click="$emit('update:modelValue', n === Number(modelValue) ? 0 : n)"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
      </svg>
    </button>
  </div>

  <select
    v-else-if="field.type === 'select'"
    :value="modelValue ?? ''"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option value="">—</option>
    <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
  </select>

  <label v-else-if="field.type === 'checkbox'" class="checkbox-input">
    <input
      type="checkbox"
      :checked="!!modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span>{{ modelValue ? 'Yes' : 'No' }}</span>
  </label>

  <input
    v-else-if="field.type === 'date'"
    type="date"
    :value="modelValue ?? ''"
    @input="$emit('update:modelValue', $event.target.value)"
  />

  <div v-else-if="field.type === 'image'" class="image-input">
    <input
      type="url"
      placeholder="Image URL"
      :value="modelValue ?? ''"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <img v-if="modelValue" class="preview" :src="modelValue" @error="$event.target.style.visibility = 'hidden'" />
  </div>
</template>

<style scoped>
input, textarea, select {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  color-scheme: dark;
}
input:focus, textarea:focus, select:focus { border-color: var(--accent); }
textarea { resize: vertical; }

.rating-input { display: flex; gap: 4px; }
.star-btn {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  background: transparent;
  color: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}
.star-btn:hover { color: var(--yellow); }
.star-btn.filled { color: var(--yellow); }

.checkbox-input {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.checkbox-input input { width: auto; accent-color: var(--accent); }

.image-input { display: flex; flex-direction: column; gap: 8px; }
.preview {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
</style>
