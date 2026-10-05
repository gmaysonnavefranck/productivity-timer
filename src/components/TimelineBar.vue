<script setup>
import { computed } from 'vue';

const props = defineProps({
  event: Object,
  categoryColor: String,
  left: Number,
  width: Number,
  top: Number,
  height: Number,
});
defineEmits(['open', 'delete']);

const rangeLabel = computed(() => `${props.event.title}: ${props.event.start} – ${props.event.end || 'Present'}`);
</script>

<template>
  <div
    class="tbar"
    :style="{ left: left + 'px', width: width + 'px', top: top + 'px', height: height + 'px', background: categoryColor }"
    :title="rangeLabel"
    @click="$emit('open')"
  >
    <span class="label">{{ event.title }}</span>
    <button class="del-btn" title="Delete" @click.stop="$emit('delete')">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.tbar {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,.25);
  transition: filter 0.15s;
}
.tbar:hover { filter: brightness(1.12); }

.label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11.5px;
  font-weight: 600;
  color: white;
}

.del-btn {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: rgba(0,0,0,.25);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
}
.tbar:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(0,0,0,.5); }
</style>
