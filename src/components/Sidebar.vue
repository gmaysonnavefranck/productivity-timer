<script setup>
defineProps({ activeView: String });
defineEmits(['change-view']);

const VIEWS = [
  {
    id: 'timers',
    label: 'Timers',
    icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 3',
  },
  {
    id: 'kanban',
    label: 'Board',
    icon: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v7h-4z',
  },
  {
    id: 'speedrun',
    label: 'Challenges',
    icon: 'M13 2L4 14h6l-1 8 9-12h-6z',
  },
];
</script>

<template>
  <nav class="sidebar">
    <button
      v-for="view in VIEWS"
      :key="view.id"
      class="nav-btn"
      :class="{ active: activeView === view.id }"
      :title="view.label"
      @click="$emit('change-view', view.id)"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path :d="view.icon" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="nav-label">{{ view.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.sidebar {
  width: 68px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.nav-btn {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 9px 4px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  transition: all 0.15s;
}
.nav-btn:hover { background: var(--surface-2); color: var(--text); }
.nav-btn.active { background: rgba(99,102,241,.15); color: var(--accent); }

.nav-label {
  font-size: 10px;
  font-weight: 600;
}
</style>
