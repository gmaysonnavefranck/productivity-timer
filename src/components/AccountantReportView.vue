<script setup>
import { ref, computed } from 'vue';
import MoneyInput from './MoneyInput.vue';

const props = defineProps({ categories: Array, values: Array });
const emit = defineEmits(['add-category', 'delete-category', 'set-value']);

const newCategoryName = ref('');

function addCategory() {
  if (!newCategoryName.value.trim()) return;
  emit('add-category', { name: newCategoryName.value.trim() });
  newCategoryName.value = '';
}

function handleDeleteCategory(id, name) {
  if (!confirm(`Delete "${name}"? Its past monthly values won't show anywhere anymore.`)) return;
  emit('delete-category', id);
}

const currentMonth = ref(new Date().toISOString().slice(0, 7));

const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
});

function shiftMonth(delta) {
  const [y, m] = currentMonth.value.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function valueFor(categoryId) {
  return props.values.find((v) => v.categoryId === categoryId && v.month === currentMonth.value)?.value ?? null;
}

function onValueChange(categoryId, value) {
  emit('set-value', categoryId, currentMonth.value, value);
}

const total = computed(() => props.categories.reduce((sum, c) => sum + (Number(valueFor(c.id)) || 0), 0));

function formatMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="accountant-view">
    <header class="view-header">
      <h1>Accountant Report</h1>
    </header>

    <div class="content">
      <div class="category-manager">
        <p class="sec-title">Categories</p>
        <div class="add-category-row">
          <input v-model="newCategoryName" placeholder="e.g. Rent, Accountant fee…" @keydown.enter="addCategory" />
          <button class="btn-add-sm" @click="addCategory">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Add
          </button>
        </div>
        <div v-if="categories.length" class="category-list">
          <span v-for="c in categories" :key="c.id" class="category-chip">
            {{ c.name }}
            <button class="chip-del" @click="handleDeleteCategory(c.id, c.name)">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </button>
          </span>
        </div>
      </div>

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

      <div v-if="!categories.length" class="no-items">Add a category above to start tracking this month.</div>
      <table v-else class="report-table">
        <tbody>
          <tr v-for="c in categories" :key="c.id">
            <td class="cat-name">{{ c.name }}</td>
            <td class="cat-value">
              <MoneyInput :model-value="valueFor(c.id)" @update:model-value="(v) => onValueChange(c.id, v)" />
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class="total-label">Total</td>
            <td class="total-value">{{ formatMoney(total) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.accountant-view {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.view-header {
  padding: 22px 28px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.view-header h1 { font-size: 19px; font-weight: 600; }

.content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.no-items { font-size: 12px; color: var(--muted); }

.sec-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}

.category-manager {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
}

.add-category-row { display: flex; gap: 7px; margin-bottom: 10px; }
.add-category-row input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 8px 11px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}
.add-category-row input:focus { border-color: var(--accent); }

.btn-add-sm {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--accent);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  transition: background 0.15s;
  flex-shrink: 0;
}
.btn-add-sm:hover { background: var(--accent-hover); }

.category-list { display: flex; flex-wrap: wrap; gap: 6px; }

.category-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-2);
  border-radius: 100px;
  padding: 4px 6px 4px 12px;
  font-size: 12px;
}

.chip-del {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.chip-del:hover { background: rgba(239,68,68,.15); color: var(--red); }

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

.report-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.report-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
.report-table tbody tr:last-child td { border-bottom: none; }

.cat-name { font-weight: 500; }
.cat-value input {
  width: 120px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 6px 10px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}
.cat-value input:focus { border-color: var(--accent); }

.report-table tfoot td { border-top: 1px solid var(--border); border-bottom: none; font-weight: 700; }
.total-label { color: var(--muted); text-transform: uppercase; font-size: 11px; letter-spacing: 0.6px; }
.total-value { font-size: 14px; }
</style>
