<script setup>
import { computed } from 'vue';

const props = defineProps({ field: Object, value: { type: null, required: false } });

const isEmpty = computed(() => props.value === null || props.value === undefined || props.value === '');

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}
</script>

<template>
  <span v-if="field.type === 'text' || field.type === 'number' || field.type === 'select'" class="text-val">
    {{ isEmpty ? '—' : value }}
  </span>

  <span v-else-if="field.type === 'textarea'" class="text-val truncate" :title="isEmpty ? '' : String(value)">
    {{ isEmpty ? '—' : value }}
  </span>

  <a v-else-if="field.type === 'url'" v-show="!isEmpty" :href="value" target="_blank" rel="noopener" class="url-val" @click.stop>
    {{ value }}
  </a>
  <span v-else-if="field.type === 'url'" class="text-val">—</span>

  <div v-else-if="field.type === 'image'" class="image-val">
    <img v-if="!isEmpty" class="thumb" :src="value" @error="$event.target.style.visibility = 'hidden'" />
    <span v-else class="text-val">—</span>
  </div>

  <div v-else-if="field.type === 'rating'" class="rating-val">
    <svg
      v-for="n in 5"
      :key="n"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      :fill="n <= (Number(value) || 0) ? 'var(--yellow)' : 'var(--border)'"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
    </svg>
  </div>

  <span v-else-if="field.type === 'checkbox'" class="check-val" :class="{ yes: !!value }">
    {{ value ? '✓' : '—' }}
  </span>

  <span v-else-if="field.type === 'date'" class="text-val">
    {{ isEmpty ? '—' : formatDate(value) }}
  </span>
</template>

<style scoped>
.text-val { font-size: 13px; color: var(--text); }
.truncate {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.url-val { font-size: 13px; color: var(--accent); text-decoration: underline; }

.image-val { display: flex; }
.thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.rating-val { display: flex; gap: 2px; }

.check-val { font-size: 13px; color: var(--muted); font-weight: 700; }
.check-val.yes { color: var(--green); }
</style>
