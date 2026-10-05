<script setup>
import { ref, computed } from 'vue';
import LifeCategoryModal from './LifeCategoryModal.vue';
import LifeEventModal from './LifeEventModal.vue';
import TimelineBar from './TimelineBar.vue';

const props = defineProps({ categories: Array, events: Array, today: String });
const emit = defineEmits([
  'add-category', 'edit-category', 'delete-category',
  'add-event', 'edit-event', 'delete-event',
]);

const PX_PER_DAY = 6;
const MIN_BAR_WIDTH = 14;
const LANE_LABEL_WIDTH = 160;
const ROW_HEIGHT = 26;
const ROW_GAP = 4;
const LANE_PAD = 10;

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

const timelineStart = computed(() =>
  props.events.reduce((min, e) => (!min || e.start < min ? e.start : min), null) || props.today
);
const timelineEnd = computed(() =>
  props.events.reduce((max, e) => {
    const end = e.end || props.today;
    return end > max ? end : max;
  }, props.today)
);
const totalDays = computed(() => daysBetween(timelineStart.value, timelineEnd.value) + 1);
const timelineWidth = computed(() => totalDays.value * PX_PER_DAY);

function barLeft(event) {
  return daysBetween(timelineStart.value, event.start) * PX_PER_DAY;
}
function barWidth(event) {
  const days = daysBetween(event.start, event.end || props.today) + 1; // inclusive of both endpoints
  return Math.max(days * PX_PER_DAY, MIN_BAR_WIDTH);
}

// Greedy interval partitioning: each event goes in the first sub-row whose
// last event ends before this one starts, else it opens a new sub-row.
// This yields the minimum number of sub-rows needed for the lane.
function packLane(catEvents) {
  const sorted = [...catEvents].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const subRowEnds = [];
  const placed = [];
  for (const event of sorted) {
    const effectiveEnd = event.end || props.today;
    let rowIndex = subRowEnds.findIndex((endDate) => endDate < event.start);
    if (rowIndex === -1) {
      rowIndex = subRowEnds.length;
      subRowEnds.push(effectiveEnd);
    } else {
      subRowEnds[rowIndex] = effectiveEnd;
    }
    placed.push({ event, subRow: rowIndex });
  }
  return { placed, subRowCount: subRowEnds.length };
}

const lanes = computed(() => props.categories.map((cat) => {
  const catEvents = props.events.filter((e) => e.categoryId === cat.id);
  const { placed, subRowCount } = packLane(catEvents);
  return { category: cat, placed, subRowCount: Math.max(subRowCount, 1) };
}));

function laneHeight(lane) {
  return lane.subRowCount * ROW_HEIGHT + (lane.subRowCount - 1) * ROW_GAP + LANE_PAD * 2;
}
function barTop(item) {
  return LANE_PAD + item.subRow * (ROW_HEIGHT + ROW_GAP);
}

const monthMarkers = computed(() => {
  const markers = [];
  const startD = new Date(timelineStart.value + 'T00:00:00');
  const endD = new Date(timelineEnd.value + 'T00:00:00');
  let y = startD.getFullYear();
  let m = startD.getMonth();
  while (y < endD.getFullYear() || (y === endD.getFullYear() && m <= endD.getMonth())) {
    const monthStartStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const left = Math.max(0, daysBetween(timelineStart.value, monthStartStr)) * PX_PER_DAY;
    markers.push({
      key: `${y}-${m}`,
      label: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      left,
    });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return markers;
});

// Category modal (add/edit)
const showCategoryModal = ref(false);
const editingCategory = ref(null);

function openAddCategory() {
  editingCategory.value = null;
  showCategoryModal.value = true;
}
function openEditCategory(cat) {
  editingCategory.value = cat;
  showCategoryModal.value = true;
}
function handleCategorySave(data) {
  if (editingCategory.value) emit('edit-category', editingCategory.value.id, data);
  else emit('add-category', data);
  showCategoryModal.value = false;
  editingCategory.value = null;
}
function confirmDeleteCategory(cat) {
  if (!confirm(`Delete category "${cat.name}"? Its events will be deleted too.`)) return;
  emit('delete-category', cat.id);
}

// Event modal (add/edit)
const showEventModal = ref(false);
const editingEvent = ref(null);

function openAddEvent() {
  editingEvent.value = null;
  showEventModal.value = true;
}
function openEditEvent(evt) {
  editingEvent.value = evt;
  showEventModal.value = true;
}
function handleEventSave(data) {
  if (editingEvent.value) emit('edit-event', editingEvent.value.id, data);
  else emit('add-event', data);
  showEventModal.value = false;
  editingEvent.value = null;
}
</script>

<template>
  <div class="timeline-view">
    <header class="view-header">
      <h1>Timeline</h1>
      <div class="toolbar">
        <button class="btn-add" @click="openAddCategory">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          Category
        </button>
        <button class="btn-add" :disabled="!categories.length" @click="openAddEvent">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          Event
        </button>
      </div>
    </header>

    <div v-if="!categories.length" class="empty-state">
      <p>No categories yet</p>
      <p class="sub">Add a category to start plotting life events.</p>
    </div>

    <div v-else class="timeline-scroll">
      <div class="timeline-body" :style="{ width: (LANE_LABEL_WIDTH + timelineWidth) + 'px' }">
        <div class="month-header">
          <div class="corner" :style="{ width: LANE_LABEL_WIDTH + 'px' }" />
          <div class="month-track" :style="{ width: timelineWidth + 'px' }">
            <span v-for="m in monthMarkers" :key="m.key" class="month-marker" :style="{ left: m.left + 'px' }">{{ m.label }}</span>
          </div>
        </div>

        <div v-for="lane in lanes" :key="lane.category.id" class="lane-row" :style="{ height: laneHeight(lane) + 'px' }">
          <div class="lane-label" :style="{ width: LANE_LABEL_WIDTH + 'px' }">
            <span class="dot" :style="{ background: lane.category.color }" />
            <span class="name">{{ lane.category.name }}</span>
            <button class="icon-btn-sm" title="Edit category" @click="openEditCategory(lane.category)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="icon-btn-sm danger" title="Delete category" @click="confirmDeleteCategory(lane.category)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="lane-track" :style="{ width: timelineWidth + 'px' }">
            <TimelineBar
              v-for="item in lane.placed"
              :key="item.event.id"
              :event="item.event"
              :category-color="lane.category.color"
              :left="barLeft(item.event)"
              :width="barWidth(item.event)"
              :top="barTop(item)"
              :height="ROW_HEIGHT"
              @open="openEditEvent(item.event)"
              @delete="emit('delete-event', item.event.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <LifeCategoryModal
      v-if="showCategoryModal"
      :initial="editingCategory"
      @save="handleCategorySave"
      @close="showCategoryModal = false; editingCategory = null"
    />
    <LifeEventModal
      v-if="showEventModal"
      :initial="editingEvent"
      :categories="categories"
      @save="handleEventSave"
      @close="showEventModal = false; editingEvent = null"
    />
  </div>
</template>

<style scoped>
.timeline-view {
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
.btn-add:hover:not(:disabled) { background: var(--accent-hover); }
.btn-add:disabled { opacity: 0.45; cursor: default; }

.icon-btn-sm {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  flex-shrink: 0;
  transition: all 0.15s;
}
.lane-label:hover .icon-btn-sm { opacity: 1; }
.icon-btn-sm:hover { background: var(--surface-2); color: var(--text); }
.icon-btn-sm.danger:hover { background: rgba(239,68,68,.15); color: var(--red); }

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

.timeline-scroll {
  flex: 1;
  overflow: auto;
}

.timeline-body {
  position: relative;
}

.month-header {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.corner {
  position: sticky;
  left: 0;
  z-index: 4;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.month-track {
  position: relative;
  height: 30px;
  flex-shrink: 0;
}

.month-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding-left: 6px;
  border-left: 1px solid var(--border);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
}

.lane-row {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.lane-label {
  position: sticky;
  left: 0;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: var(--surface);
  border-right: 1px solid var(--border);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.lane-label .name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lane-track {
  position: relative;
  flex-shrink: 0;
}
</style>
