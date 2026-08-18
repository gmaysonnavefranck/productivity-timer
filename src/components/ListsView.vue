<script setup>
import { ref, computed } from 'vue';
import ListDetailView from './ListDetailView.vue';
import CreateListModal from './CreateListModal.vue';

const props = defineProps({ lists: Array });
const emit = defineEmits([
  'add-list', 'rename-list', 'delete-list', 'update-fields', 'add-row', 'update-row', 'delete-row',
]);

const openId = ref(null);
const openList = computed(() => props.lists.find((l) => l.id === openId.value) || null);

const showCreateModal = ref(false);

function handleCreate(data) {
  emit('add-list', data);
  showCreateModal.value = false;
}

function handleGalleryDelete(list) {
  if (!confirm(`Delete "${list.name}"? This can't be undone.`)) return;
  emit('delete-list', list.id);
}
</script>

<template>
  <ListDetailView
    v-if="openList"
    :list="openList"
    @back="openId = null"
    @rename-list="(name) => emit('rename-list', openList.id, name)"
    @delete-list="() => { emit('delete-list', openList.id); openId = null; }"
    @update-fields="(fields) => emit('update-fields', openList.id, fields)"
    @add-row="(values) => emit('add-row', openList.id, values)"
    @update-row="(rowId, values) => emit('update-row', openList.id, rowId, values)"
    @delete-row="(rowId) => emit('delete-row', openList.id, rowId)"
  />

  <div v-else class="lists-view">
    <header class="view-header">
      <h1>Lists</h1>
      <button class="btn-add" @click="showCreateModal = true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        New List
      </button>
    </header>

    <div class="content">
      <div v-if="!lists.length" class="empty-state">
        <p>No lists yet</p>
        <p class="sub">Create a list to track anything — series, collectibles, restaurants, and more.</p>
      </div>

      <div v-else class="list-grid">
        <div v-for="l in lists" :key="l.id" class="list-card" @click="openId = l.id">
          <span class="l-name">{{ l.name }}</span>
          <span class="l-meta">
            {{ l.fields.length }} field{{ l.fields.length !== 1 ? 's' : '' }} · {{ l.rows.length }} row{{ l.rows.length !== 1 ? 's' : '' }}
          </span>
          <button class="del-btn" title="Delete list" @click.stop="handleGalleryDelete(l)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <CreateListModal v-if="showCreateModal" @save="handleCreate" @close="showCreateModal = false" />
  </div>
</template>

<style scoped>
.lists-view {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.view-header h1 { font-size: 19px; font-weight: 600; }

.btn-add {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}
.btn-add:hover { background: var(--accent-hover); }

.content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 28px;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--muted);
}
.empty-state p { font-size: 15px; font-weight: 500; }
.empty-state .sub { font-size: 12px; font-weight: 400; text-align: center; max-width: 280px; }

.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}

.list-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s;
}
.list-card:hover { border-color: var(--accent); }

.l-name { font-size: 14px; font-weight: 600; padding-right: 20px; }
.l-meta { font-size: 11.5px; color: var(--muted); }

.del-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
}
.list-card:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
