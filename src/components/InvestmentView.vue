<script setup>
import { ref, computed } from 'vue';
import AddInvestmentModal from './AddInvestmentModal.vue';

const props = defineProps({ snapshots: Array });
const emit = defineEmits(['add-snapshot', 'delete-snapshot']);

const showModal = ref(false);

const chronological = computed(() => [...props.snapshots].sort((a, b) => a.date.localeCompare(b.date)));

const withDeltas = computed(() =>
  chronological.value.map((s, i) => {
    const prev = i > 0 ? chronological.value[i - 1] : null;
    const delta = prev ? s.value - prev.value : null;
    const pct = prev && prev.value !== 0 ? (delta / prev.value) * 100 : null;
    return { ...s, delta, pct };
  })
);

const newestFirst = computed(() => [...withDeltas.value].reverse());

const chartPoints = computed(() => {
  const data = chronological.value;
  if (data.length < 2) return '';
  const values = data.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return data
    .map((s, i) => {
      const x = (i / (data.length - 1)) * 300;
      const y = 75 - ((s.value - min) / range) * 65;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
});

function handleSave(snapshot) {
  emit('add-snapshot', snapshot);
  showModal.value = false;
}

function handleDelete(id) {
  if (!confirm("Delete this snapshot? This can't be undone.")) return;
  emit('delete-snapshot', id);
  const idx = selectedIds.value.indexOf(id);
  if (idx !== -1) selectedIds.value.splice(idx, 1);
}

// Compare any two snapshots (not just consecutive)
const selectedIds = ref([]);

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx !== -1) { selectedIds.value.splice(idx, 1); return; }
  if (selectedIds.value.length === 2) selectedIds.value.shift();
  selectedIds.value.push(id);
}

const comparison = computed(() => {
  if (selectedIds.value.length !== 2) return null;
  const [a, b] = selectedIds.value.map((id) => props.snapshots.find((s) => s.id === id));
  if (!a || !b) return null;
  const [earlier, later] = a.date <= b.date ? [a, b] : [b, a];
  const delta = later.value - earlier.value;
  const pct = earlier.value !== 0 ? (delta / earlier.value) * 100 : null;
  return { earlier, later, delta, pct };
});

function formatMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}
</script>

<template>
  <div class="investment-view">
    <header class="view-header">
      <h1>Investment</h1>
      <button class="btn-add" @click="showModal = true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        Add Snapshot
      </button>
    </header>

    <div class="content">
      <div class="chart-card">
        <svg v-if="chartPoints" viewBox="0 0 300 80" class="chart" preserveAspectRatio="none">
          <polyline :points="chartPoints" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p v-else class="no-items">Add at least 2 snapshots to see a chart.</p>
      </div>

      <div v-if="comparison" class="compare-card">
        <div class="compare-side">
          <span class="compare-date">{{ formatDate(comparison.earlier.date) }}</span>
          <span class="compare-value">{{ formatMoney(comparison.earlier.value) }}</span>
        </div>
        <span class="compare-arrow">→</span>
        <div class="compare-side">
          <span class="compare-date">{{ formatDate(comparison.later.date) }}</span>
          <span class="compare-value">{{ formatMoney(comparison.later.value) }}</span>
        </div>
        <span class="compare-delta" :class="comparison.delta >= 0 ? 'up' : 'down'">
          {{ comparison.delta >= 0 ? '+' : '' }}{{ formatMoney(comparison.delta) }}
          <template v-if="comparison.pct !== null">({{ comparison.pct >= 0 ? '+' : '' }}{{ comparison.pct.toFixed(1) }}%)</template>
        </span>
      </div>

      <div v-if="!newestFirst.length" class="no-items">No snapshots yet.</div>
      <template v-else>
        <p class="hint">Click two snapshots to compare them.</p>
        <div class="snapshot-list">
          <div
            v-for="s in newestFirst"
            :key="s.id"
            class="snapshot-row"
            :class="{ selected: selectedIds.includes(s.id) }"
            @click="toggleSelect(s.id)"
          >
            <span class="snap-date">{{ formatDate(s.date) }}</span>
            <span class="snap-value">{{ formatMoney(s.value) }}</span>
            <span v-if="s.delta !== null" class="snap-delta" :class="s.delta >= 0 ? 'up' : 'down'">
              {{ s.delta >= 0 ? '+' : '' }}{{ formatMoney(s.delta) }}
              <template v-if="s.pct !== null">({{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(1) }}%)</template>
            </span>
            <button class="del-btn" @click.stop="handleDelete(s.id)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <AddInvestmentModal v-if="showModal" @save="handleSave" @close="showModal = false" />
  </div>
</template>

<style scoped>
.investment-view {
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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.no-items { font-size: 12px; color: var(--muted); }

.chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}
.chart { width: 100%; height: 90px; }

.hint { font-size: 11px; color: var(--muted); margin: 0; }

.compare-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
}
.compare-side { display: flex; flex-direction: column; gap: 2px; }
.compare-date { font-size: 11px; color: var(--muted); }
.compare-value { font-size: 14px; font-weight: 600; }
.compare-arrow { color: var(--muted); }
.compare-delta { font-size: 13px; font-weight: 600; margin-left: auto; }
.compare-delta.up { color: var(--green); }
.compare-delta.down { color: var(--red); }

.snapshot-list { display: flex; flex-direction: column; gap: 7px; }

.snapshot-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s;
}
.snapshot-row.selected { border-color: var(--accent); background: var(--surface-2); }

.snap-date { font-size: 12px; color: var(--muted); width: 90px; flex-shrink: 0; }
.snap-value { font-size: 13px; font-weight: 600; }

.snap-delta { font-size: 12px; margin-left: auto; }
.snap-delta.up { color: var(--green); }
.snap-delta.down { color: var(--red); }

.del-btn {
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
  flex-shrink: 0;
}
.snapshot-row:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
