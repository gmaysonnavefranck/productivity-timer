<script setup>
import { ref, computed } from 'vue';
import AddBalanceModal from './AddBalanceModal.vue';

const props = defineProps({ entries: Array });
const emit = defineEmits(['add-entry', 'delete-entry']);

const showModal = ref(false);

const currentMonth = ref(new Date().toISOString().slice(0, 7));

const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
});

function shiftMonth(delta) {
  const [y, m] = currentMonth.value.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  activeCategory.value = null;
}

const monthEntries = computed(() => props.entries.filter((e) => e.date.startsWith(currentMonth.value)));
const monthCategories = computed(() => [...new Set(monthEntries.value.map((e) => e.category).filter(Boolean))]);

const activeCategory = ref(null);
function toggleCategory(cat) {
  activeCategory.value = activeCategory.value === cat ? null : cat;
}

const filteredEntries = computed(() =>
  activeCategory.value ? monthEntries.value.filter((e) => e.category === activeCategory.value) : monthEntries.value
);
const newestFirst = computed(() => [...filteredEntries.value].sort((a, b) => b.date.localeCompare(a.date)));

const allTimeTotal = computed(() => props.entries.reduce((sum, e) => sum + e.amount, 0));
const total = computed(() => monthEntries.value.reduce((sum, e) => sum + e.amount, 0));
const categorySubtotal = computed(() =>
  activeCategory.value ? filteredEntries.value.reduce((sum, e) => sum + e.amount, 0) : null
);
const categories = computed(() => [...new Set(props.entries.map((e) => e.category).filter(Boolean))]);

function handleSave(entry) {
  emit('add-entry', entry);
  showModal.value = false;
}

function handleDelete(id) {
  if (!confirm("Delete this entry? This can't be undone.")) return;
  emit('delete-entry', id);
}

function formatMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}
</script>

<template>
  <div class="balance-view">
    <header class="view-header">
      <h1>Balance</h1>
      <button class="btn-add" @click="showModal = true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        Add Entry
      </button>
    </header>

    <div class="content">
      <div class="month-nav">
        <button class="nav-btn" @click="shiftMonth(-1)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="nav-btn" @click="shiftMonth(1)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="totals-row">
        <div class="total-card">
          <span class="total-label">All-time balance</span>
          <span class="total-value" :class="allTimeTotal >= 0 ? 'up' : 'down'">
            {{ allTimeTotal >= 0 ? '+' : '' }}{{ formatMoney(allTimeTotal) }}
          </span>
        </div>
        <div class="total-card">
          <span class="total-label">Month total</span>
          <span class="total-value" :class="total >= 0 ? 'up' : 'down'">
            {{ total >= 0 ? '+' : '' }}{{ formatMoney(total) }}
          </span>
        </div>
      </div>

      <div v-if="monthCategories.length" class="category-filter">
        <button
          v-for="cat in monthCategories"
          :key="cat"
          class="category-chip"
          :class="{ active: activeCategory === cat }"
          @click="toggleCategory(cat)"
        >
          {{ cat }}
        </button>
        <span v-if="categorySubtotal !== null" class="category-subtotal" :class="categorySubtotal >= 0 ? 'up' : 'down'">
          {{ categorySubtotal >= 0 ? '+' : '' }}{{ formatMoney(categorySubtotal) }}
        </span>
      </div>

      <div v-if="!newestFirst.length" class="no-items">
        {{ activeCategory ? `No entries for "${activeCategory}" this month.` : 'No entries this month.' }}
      </div>
      <div v-else class="entry-list">
        <div v-for="e in newestFirst" :key="e.id" class="entry-row">
          <div class="entry-info">
            <span class="entry-name">{{ e.name }}</span>
            <span class="entry-meta">
              {{ formatDate(e.date) }}
              <span v-if="e.category" class="entry-tag">{{ e.category }}</span>
            </span>
          </div>
          <span class="entry-amount" :class="e.amount >= 0 ? 'up' : 'down'">
            {{ e.amount >= 0 ? '+' : '' }}{{ formatMoney(e.amount) }}
          </span>
          <button class="del-btn" @click="handleDelete(e.id)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <AddBalanceModal v-if="showModal" :categories="categories" @save="handleSave" @close="showModal = false" />
  </div>
</template>

<style scoped>
.balance-view {
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

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.month-label { font-weight: 600; font-size: 14px; text-transform: capitalize; }

.nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.nav-btn:hover { background: var(--surface-2); color: var(--text); }

.totals-row { display: flex; gap: 14px; }

.total-card {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.total-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; }
.total-value { font-size: 20px; font-weight: 700; }
.total-value.up { color: var(--green); }
.total-value.down { color: var(--red); }

.category-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.category-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 5px 12px;
  font-size: 11px;
  color: var(--muted);
  transition: all 0.15s;
}
.category-chip:hover { color: var(--text); border-color: var(--text); }
.category-chip.active { background: var(--accent); border-color: var(--accent); color: white; }

.category-subtotal { font-size: 12px; font-weight: 600; margin-left: auto; }
.category-subtotal.up { color: var(--green); }
.category-subtotal.down { color: var(--red); }

.entry-list { display: flex; flex-direction: column; gap: 7px; }

.entry-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.entry-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.entry-name { font-size: 13px; font-weight: 500; }
.entry-meta { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
.entry-tag {
  background: var(--surface-2);
  border-radius: 100px;
  padding: 1px 8px;
  font-size: 10px;
}

.entry-amount { font-size: 13px; font-weight: 600; }
.entry-amount.up { color: var(--green); }
.entry-amount.down { color: var(--red); }

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
.entry-row:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }
</style>
