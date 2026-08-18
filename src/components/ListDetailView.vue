<script setup>
import { ref } from 'vue';
import ListFieldValue from './ListFieldValue.vue';
import ManageFieldsModal from './ManageFieldsModal.vue';
import AddEditListRowModal from './AddEditListRowModal.vue';

const props = defineProps({ list: Object });
const emit = defineEmits(['back', 'rename-list', 'delete-list', 'update-fields', 'add-row', 'update-row', 'delete-row']);

const editingName = ref(false);
const nameDraft = ref('');

function startEditName() {
  nameDraft.value = props.list.name;
  editingName.value = true;
}

function saveName() {
  editingName.value = false;
  if (nameDraft.value.trim() && nameDraft.value.trim() !== props.list.name) {
    emit('rename-list', nameDraft.value.trim());
  }
}

function handleDeleteList() {
  if (!confirm(`Delete "${props.list.name}"? This can't be undone.`)) return;
  emit('delete-list');
}

const showManageFields = ref(false);
const showRowModal = ref(false);
const editingRow = ref(null);

function openAddRow() {
  editingRow.value = null;
  showRowModal.value = true;
}

function openEditRow(row) {
  editingRow.value = row;
  showRowModal.value = true;
}

function handleRowSave(values) {
  if (editingRow.value) emit('update-row', editingRow.value.id, values);
  else emit('add-row', values);
  showRowModal.value = false;
}

function handleDeleteRow(row) {
  if (!confirm("Delete this row? This can't be undone.")) return;
  emit('delete-row', row.id);
}

function handleFieldsSave(fields) {
  emit('update-fields', fields);
  showManageFields.value = false;
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
      <input
        v-if="editingName"
        v-model="nameDraft"
        class="name-input"
        autofocus
        @blur="saveName"
        @keydown.enter="saveName"
        @keydown.escape="editingName = false"
      />
      <h1 v-else @click="startEditName">{{ list.name }}</h1>
      <button class="btn-manage" @click="showManageFields = true">Manage Fields</button>
      <button class="icon-btn danger" title="Delete list" @click="handleDeleteList">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </header>

    <div class="content">
      <div v-if="!list.fields.length" class="empty-state">
        <p>No fields yet</p>
        <p class="sub">Click "Manage Fields" to define what this list tracks.</p>
      </div>

      <template v-else>
        <div class="toolbar">
          <button class="btn-add" @click="openAddRow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Add Row
          </button>
        </div>

        <div v-if="!list.rows.length" class="no-items">No rows yet. Add your first entry above.</div>
        <div v-else class="table-wrap">
          <table class="list-table">
            <thead>
              <tr>
                <th v-for="f in list.fields" :key="f.id">{{ f.label }}</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in list.rows" :key="row.id">
                <td v-for="f in list.fields" :key="f.id">
                  <ListFieldValue :field="f" :value="row.values[f.id]" />
                </td>
                <td class="actions-col">
                  <div class="row-actions">
                    <button class="icon-btn-sm" title="Edit row" @click="openEditRow(row)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </button>
                    <button class="icon-btn-sm danger" title="Delete row" @click="handleDeleteRow(row)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <ManageFieldsModal v-if="showManageFields" :fields="list.fields" @save="handleFieldsSave" @close="showManageFields = false" />
    <AddEditListRowModal
      v-if="showRowModal"
      :fields="list.fields"
      :row="editingRow"
      @save="handleRowSave"
      @close="showRowModal = false"
    />
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
.detail-header h1 { font-size: 17px; font-weight: 600; flex: 1; min-width: 0; cursor: pointer; }

.name-input {
  flex: 1;
  min-width: 0;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 6px 10px;
  font-size: 17px;
  font-weight: 600;
  font-family: inherit;
  outline: none;
}

.btn-manage {
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-size: 12.5px;
  font-weight: 500;
  transition: background 0.15s;
  flex-shrink: 0;
}
.btn-manage:hover { background: var(--border); }

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

.content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--muted);
}
.empty-state p { font-size: 15px; font-weight: 500; }
.empty-state .sub { font-size: 12px; font-weight: 400; }

.toolbar { display: flex; justify-content: flex-end; }

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

.no-items { font-size: 12px; color: var(--muted); }

.table-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: auto;
}

.list-table { width: 100%; border-collapse: collapse; }
.list-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.list-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.list-table tbody tr:last-child td { border-bottom: none; }
.list-table tbody tr:hover { background: var(--surface-2); }

.actions-col { width: 1%; white-space: nowrap; }

.row-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.list-table tbody tr:hover .row-actions { opacity: 1; }

.icon-btn-sm {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.icon-btn-sm:hover { background: var(--border); color: var(--text); }
.icon-btn-sm.danger:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
