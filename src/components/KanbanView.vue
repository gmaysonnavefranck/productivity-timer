<script setup>
import { ref, reactive, computed } from 'vue';
import KanbanCard from './KanbanCard.vue';
import ProjectModal from './ProjectModal.vue';

const props = defineProps({ projects: Array, cards: Array });
const emit = defineEmits([
  'add-project', 'edit-project', 'delete-project',
  'add-card', 'rename-card', 'delete-card', 'move-card',
]);

const COLUMNS = [
  { id: 'todo', label: 'To-do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'paused', label: 'Paused' },
  { id: 'done', label: 'Done' },
];

// Project filter
const filterProjectId = ref(null);
const selectedProject = computed(() => props.projects.find((p) => p.id === filterProjectId.value) || null);

function projectColor(id) {
  return props.projects.find((p) => p.id === id)?.color;
}

// Project modal (add/edit)
const showProjectModal = ref(false);
const editingProject = ref(null);

function openAddProject() {
  editingProject.value = null;
  showProjectModal.value = true;
}

function openEditProject(project) {
  editingProject.value = project;
  showProjectModal.value = true;
}

function handleProjectSave(projectData) {
  if (editingProject.value) emit('edit-project', editingProject.value.id, projectData);
  else emit('add-project', projectData);
  showProjectModal.value = false;
  editingProject.value = null;
}

function confirmDeleteProject(project) {
  if (!confirm(`Delete project "${project.name}"? Its cards will be deleted too.`)) return;
  emit('delete-project', project.id);
  if (filterProjectId.value === project.id) filterProjectId.value = null;
}

// New card forms (one text draft per column, one shared project picker for "All" view)
const newCardText = reactive({ todo: '', inprogress: '', paused: '', done: '' });
const newCardProjectId = ref(null);

function targetProjectId() {
  return filterProjectId.value || newCardProjectId.value || props.projects[0]?.id || null;
}

function addCard(status) {
  const title = newCardText[status].trim();
  const projectId = targetProjectId();
  if (!title || !projectId) return;
  emit('add-card', { title, projectId, status });
  newCardText[status] = '';
}

function cardsForColumn(status) {
  return props.cards.filter((c) => (!filterProjectId.value || c.projectId === filterProjectId.value) && c.status === status);
}

// Drag and drop
const draggingCardId = ref(null);
const dropTarget = ref(null); // { status, beforeCardId, afterCardId }

function onDragStart(cardId) {
  draggingCardId.value = cardId;
}

function onDragEnd() {
  draggingCardId.value = null;
  dropTarget.value = null;
}

function onCardDragOverPosition({ cardId, before }) {
  const hovered = props.cards.find((c) => c.id === cardId);
  if (!hovered) return;
  dropTarget.value = before
    ? { status: hovered.status, beforeCardId: cardId, afterCardId: null }
    : { status: hovered.status, beforeCardId: null, afterCardId: cardId };
}

function onColumnDragOver(e, status) {
  e.preventDefault();
  if (e.target === e.currentTarget) {
    dropTarget.value = { status, beforeCardId: null, afterCardId: null };
  }
}

function onDrop() {
  if (draggingCardId.value && dropTarget.value) {
    emit('move-card', { id: draggingCardId.value, ...dropTarget.value });
  }
  draggingCardId.value = null;
  dropTarget.value = null;
}
</script>

<template>
  <div class="kanban-view">
    <header class="view-header">
      <h1>Board</h1>
      <div class="toolbar">
        <select v-model="filterProjectId" class="filter-select">
          <option :value="null">All Projects</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <template v-if="selectedProject">
          <button class="icon-btn-sm" title="Edit project" @click="openEditProject(selectedProject)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="icon-btn-sm danger" title="Delete project" @click="confirmDeleteProject(selectedProject)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </template>
        <button class="btn-add" @click="openAddProject">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          Project
        </button>
      </div>
    </header>

    <div v-if="!projects.length" class="empty-state">
      <p>No projects yet</p>
      <p class="sub">Add a project to start creating cards.</p>
    </div>

    <div v-else class="board">
      <div
        v-for="col in COLUMNS"
        :key="col.id"
        class="column"
        @dragover="onColumnDragOver($event, col.id)"
        @drop="onDrop"
      >
        <div class="col-header">
          <span class="col-title">{{ col.label }}</span>
          <span class="col-count">{{ cardsForColumn(col.id).length }}</span>
        </div>

        <div class="col-cards">
          <KanbanCard
            v-for="card in cardsForColumn(col.id)"
            :key="card.id"
            :card="card"
            :project-color="projectColor(card.projectId)"
            :show-dot="!filterProjectId"
            @rename="(title) => emit('rename-card', card.id, title)"
            @delete="emit('delete-card', card.id)"
            @dragstart="onDragStart(card.id)"
            @dragend="onDragEnd"
            @dragover-position="onCardDragOverPosition"
            @drop="onDrop"
          />
        </div>

        <div class="add-card-form">
          <select v-if="!filterProjectId" v-model="newCardProjectId" class="mini-select">
            <option :value="null" disabled>Project…</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <input
            v-model="newCardText[col.id]"
            placeholder="Add a card…"
            @keydown.enter="addCard(col.id)"
          />
        </div>
      </div>
    </div>

    <ProjectModal
      v-if="showProjectModal"
      :initial="editingProject"
      @save="handleProjectSave"
      @close="showProjectModal = false; editingProject = null"
    />
  </div>
</template>

<style scoped>
.kanban-view {
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

.toolbar { display: flex; align-items: center; gap: 8px; }

.filter-select {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 7px 10px;
  font-size: 12.5px;
  outline: none;
}

.icon-btn-sm {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.icon-btn-sm:hover { background: var(--surface-2); color: var(--text); }
.icon-btn-sm.danger:hover { background: rgba(239,68,68,.15); color: var(--red); }

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  transition: background 0.15s;
}
.btn-add:hover { background: var(--accent-hover); }

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--muted);
}
.empty-state p { font-size: 15px; font-weight: 500; }
.empty-state .sub { font-size: 12px; font-weight: 400; }

.board {
  flex: 1;
  display: flex;
  gap: 14px;
  padding: 20px 28px;
  overflow-x: auto;
  overflow-y: hidden;
}

.column {
  width: 250px;
  min-width: 250px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
}

.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.col-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
.col-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  background: var(--surface-2);
  border-radius: 100px;
  padding: 1px 7px;
}

.col-cards {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow-y: auto;
  min-height: 40px;
}

.add-card-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.add-card-form input, .mini-select {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 7px 9px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}
.add-card-form input:focus, .mini-select:focus { border-color: var(--accent); }
</style>
