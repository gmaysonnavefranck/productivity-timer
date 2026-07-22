# Finance Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new top-level views — Investment (value-over-time snapshots), Balance (income/expense ledger), and Accountant Report (monthly per-category values table) — per `docs/superpowers/specs/2026-07-22-finance-tab-design.md`.

**Architecture:** Each feature is a vertical slice: a new array in the same `productivity-data.json` (via the existing `window.api.saveData`/`loadData` IPC, no `main.js` changes), one or two CRUD handlers in `App.vue` following the exact `addX`/`deleteX`/find-or-create patterns already used for habits/recurring tasks, a dedicated view component (same `.view-header` + `.content` shell already used by `SpeedrunView.vue`), and — for Investment/Balance — a small add-modal component matching `HabitModal.vue`'s structure. The Accountant Report's category add is inline in its own view (not a modal) since category management *is* that view's primary content, unlike the other "+Add" flows which are secondary actions on a view. All three read/write real system dates (`new Date().toISOString().slice(...)`), independent of the Timers view's dev "Test date" override — confirmed in the spec. No new dependencies: the Investment chart is a hand-drawn SVG `<polyline>`. CRUD handlers are small and entangled with the reactive `data` object (same as `toggleHabit`/`toggleRecurringTask`), so — matching those — they get manual verification, not a standalone self-check.

**Tech Stack:** Vue 3 (`<script setup>`), no new dependencies.

---

### Task 1: Sidebar nav entries

**Files:**
- Modify: `src/components/Sidebar.vue:5-21`

- [ ] **Step 1: Add three new entries to the `VIEWS` array**

Find:
```js
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
```

Replace with:
```js
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
  {
    id: 'investment',
    label: 'Investment',
    icon: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  },
  {
    id: 'balance',
    label: 'Balance',
    icon: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM16 12h2',
  },
  {
    id: 'accountant',
    label: 'Report',
    icon: 'M6 2h9l4 4v16H6zM9 9h8M9 13h8M9 17h5',
  },
];
```

- [ ] **Step 2: Manual check**

Run: `npm start`
Confirm the sidebar now shows 6 icons: Timers, Board, Challenges, Investment, Balance, Report. Click each of the 3 new ones — confirm the icon highlights as active (blank main content area for now is expected; `App.vue` doesn't render anything for these views yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.vue
git commit -m "feat: add Investment/Balance/Report nav entries"
```

---

### Task 2: Investment view

**Files:**
- Create: `src/components/AddInvestmentModal.vue`
- Create: `src/components/InvestmentView.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Create the add-snapshot modal**

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';

const emit = defineEmits(['save', 'close']);

const value = ref('');
const date = ref(new Date().toISOString().slice(0, 10));

const isValid = computed(() => value.value !== '' && !isNaN(Number(value.value)) && !!date.value);

function submit() {
  if (!isValid.value) return;
  emit('save', { date: date.value, value: Number(value.value) });
}

onMounted(() => document.getElementById('inv-value')?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>Add Snapshot</h2>

      <div class="field">
        <label>Value</label>
        <input
          id="inv-value"
          v-model="value"
          type="number"
          step="0.01"
          placeholder="e.g. 15000"
          @keydown.enter="submit"
          @keydown.escape="$emit('close')"
        />
      </div>

      <div class="field">
        <label>Date</label>
        <input v-model="date" type="date" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">Add Snapshot</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 26px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal h2 { font-size: 15px; font-weight: 600; }

.field { display: flex; flex-direction: column; gap: 7px; }

.field label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  color-scheme: dark;
}
input:focus { border-color: var(--accent); }

.actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 2px; }

.btn-cancel {
  padding: 8px 15px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  transition: color 0.15s;
}
.btn-cancel:hover { color: var(--text); }

.btn-save {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) { background: var(--accent-hover); }
.btn-save:disabled { opacity: 0.45; cursor: default; }
</style>
```

- [ ] **Step 2: Create the view**

```vue
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

function formatMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

      <div v-if="!newestFirst.length" class="no-items">No snapshots yet.</div>
      <div v-else class="snapshot-list">
        <div v-for="s in newestFirst" :key="s.id" class="snapshot-row">
          <span class="snap-date">{{ s.date }}</span>
          <span class="snap-value">{{ formatMoney(s.value) }}</span>
          <span v-if="s.delta !== null" class="snap-delta" :class="s.delta >= 0 ? 'up' : 'down'">
            {{ s.delta >= 0 ? '+' : '' }}{{ formatMoney(s.delta) }}
            <template v-if="s.pct !== null">({{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(1) }}%)</template>
          </span>
          <button class="del-btn" @click="emit('delete-snapshot', s.id)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
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

.snapshot-list { display: flex; flex-direction: column; gap: 7px; }

.snapshot-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

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
```

- [ ] **Step 3: Add `investment` to the data model**

Find (`src/App.vue`):
```js
const data = reactive({
  lastDate: todayStr(),
  timers: [],
  habits: [],
  recurringTasks: [],
  days: {},
  projects: [],
  cards: [],
  speedruns: [],
});
```

Replace with:
```js
const data = reactive({
  lastDate: todayStr(),
  timers: [],
  habits: [],
  recurringTasks: [],
  days: {},
  projects: [],
  cards: [],
  speedruns: [],
  investment: [],
});
```

- [ ] **Step 4: Load and save `investment`**

Find:
```js
    data.cards = saved.cards || [];
    data.speedruns = saved.speedruns || [];
  }
```

Replace with:
```js
    data.cards = saved.cards || [];
    data.speedruns = saved.speedruns || [];
    data.investment = saved.investment || [];
  }
```

Find:
```js
    cards: data.cards,
    speedruns: data.speedruns,
  })));
}
```

Replace with:
```js
    cards: data.cards,
    speedruns: data.speedruns,
    investment: data.investment,
  })));
}
```

- [ ] **Step 5: Add CRUD handlers**

Find:
```js
// Kanban: projects
```

Insert immediately before it:
```js
// Investment
function addInvestmentSnapshot({ date, value }) {
  data.investment.push({ id: uid(), date, value: Number(value) });
  saveData();
}

function deleteInvestmentSnapshot(id) {
  const idx = data.investment.findIndex((s) => s.id === id);
  if (idx !== -1) data.investment.splice(idx, 1);
  saveData();
}

```

- [ ] **Step 6: Import and wire the view**

Find:
```js
import SpeedrunView from './components/SpeedrunView.vue';
import Sidebar from './components/Sidebar.vue';
```

Replace with:
```js
import SpeedrunView from './components/SpeedrunView.vue';
import InvestmentView from './components/InvestmentView.vue';
import Sidebar from './components/Sidebar.vue';
```

Find:
```js
    <SpeedrunView
      v-else-if="activeView === 'speedrun'"
      :speedruns="data.speedruns"
      @add-speedrun="addSpeedrun"
      @update-speedrun="updateSpeedrun"
      @delete-speedrun="deleteSpeedrun"
      @reset-speedrun="resetSpeedrun"
      @finish-speedrun="finishSpeedrun"
      @add-note="addSpeedrunNote"
      @delete-note="deleteSpeedrunNote"
      @save="saveData"
    />
  </template>
```

Replace with:
```js
    <SpeedrunView
      v-else-if="activeView === 'speedrun'"
      :speedruns="data.speedruns"
      @add-speedrun="addSpeedrun"
      @update-speedrun="updateSpeedrun"
      @delete-speedrun="deleteSpeedrun"
      @reset-speedrun="resetSpeedrun"
      @finish-speedrun="finishSpeedrun"
      @add-note="addSpeedrunNote"
      @delete-note="deleteSpeedrunNote"
      @save="saveData"
    />
    <InvestmentView
      v-else-if="activeView === 'investment'"
      :snapshots="data.investment"
      @add-snapshot="addInvestmentSnapshot"
      @delete-snapshot="deleteInvestmentSnapshot"
    />
  </template>
```

- [ ] **Step 7: Manual check**

Run: `npm start`
- Click "Investment" in the sidebar. Click "+ Add Snapshot", enter a value (e.g. `10000`) and today's date, save — confirm it appears in the list with no delta shown (first entry).
- Add a second snapshot with a different value/date — confirm the delta (absolute + %) shows correctly, colored green if up / red if down, and the chart now renders a line.
- Delete a snapshot — confirm it's removed and the remaining delta recalculates.

- [ ] **Step 8: Commit**

```bash
git add src/App.vue src/components/InvestmentView.vue src/components/AddInvestmentModal.vue
git commit -m "feat: add Investment tracker view"
```

---

### Task 3: Balance view

**Files:**
- Create: `src/components/AddBalanceModal.vue`
- Create: `src/components/BalanceView.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Create the add-entry modal**

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({ categories: { type: Array, default: () => [] } });
const emit = defineEmits(['save', 'close']);

const name = ref('');
const amount = ref('');
const type = ref('expense');
const category = ref('');
const date = ref(new Date().toISOString().slice(0, 10));

const isValid = computed(() =>
  name.value.trim().length > 0 &&
  amount.value !== '' &&
  !isNaN(Number(amount.value)) &&
  Number(amount.value) > 0 &&
  !!date.value
);

function submit() {
  if (!isValid.value) return;
  const signed = type.value === 'expense' ? -Math.abs(Number(amount.value)) : Math.abs(Number(amount.value));
  emit('save', { date: date.value, name: name.value.trim(), amount: signed, category: category.value.trim() });
}

onMounted(() => document.getElementById('bal-name')?.focus());
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>Add Entry</h2>

      <div class="field">
        <label>Name</label>
        <input
          id="bal-name"
          v-model="name"
          placeholder="e.g. Salary, Groceries…"
          @keydown.enter="submit"
          @keydown.escape="$emit('close')"
        />
      </div>

      <label class="toggle-row">
        <span class="toggle-label">{{ type === 'income' ? 'Income' : 'Expense' }}</span>
        <button
          type="button"
          class="toggle"
          :class="{ on: type === 'income' }"
          @click="type = type === 'income' ? 'expense' : 'income'"
        >
          <span class="thumb" />
        </button>
      </label>

      <div class="field">
        <label>Amount</label>
        <input v-model="amount" type="number" step="0.01" min="0" placeholder="0.00" />
      </div>

      <div class="field">
        <label>Category</label>
        <input v-model="category" list="bal-categories" placeholder="e.g. food, salary…" />
        <datalist id="bal-categories">
          <option v-for="c in categories" :key="c" :value="c" />
        </datalist>
      </div>

      <div class="field">
        <label>Date</label>
        <input v-model="date" type="date" />
      </div>

      <div class="actions">
        <button class="btn-cancel" @click="$emit('close')">Cancel</button>
        <button class="btn-save" :disabled="!isValid" @click="submit">Add Entry</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 26px;
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal h2 { font-size: 15px; font-weight: 600; }

.field { display: flex; flex-direction: column; gap: 7px; }

.field label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 9px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  color-scheme: dark;
}
input:focus { border-color: var(--accent); }

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.toggle-label { font-size: 13px; color: var(--text); }
.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
  padding: 0;
}
.toggle.on { background: var(--accent); }
.thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s;
}
.toggle.on .thumb { left: 19px; }

.actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 2px; }

.btn-cancel {
  padding: 8px 15px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  transition: color 0.15s;
}
.btn-cancel:hover { color: var(--text); }

.btn-save {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s;
}
.btn-save:hover:not(:disabled) { background: var(--accent-hover); }
.btn-save:disabled { opacity: 0.45; cursor: default; }
</style>
```

- [ ] **Step 2: Create the view**

```vue
<script setup>
import { ref, computed } from 'vue';
import AddBalanceModal from './AddBalanceModal.vue';

const props = defineProps({ entries: Array });
const emit = defineEmits(['add-entry', 'delete-entry']);

const showModal = ref(false);

const newestFirst = computed(() => [...props.entries].sort((a, b) => b.date.localeCompare(a.date)));
const total = computed(() => props.entries.reduce((sum, e) => sum + e.amount, 0));
const categories = computed(() => [...new Set(props.entries.map((e) => e.category).filter(Boolean))]);

function handleSave(entry) {
  emit('add-entry', entry);
  showModal.value = false;
}

function formatMoney(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      <div class="total-card">
        <span class="total-label">Total balance</span>
        <span class="total-value" :class="total >= 0 ? 'up' : 'down'">
          {{ total >= 0 ? '+' : '' }}{{ formatMoney(total) }}
        </span>
      </div>

      <div v-if="!entries.length" class="no-items">No entries yet.</div>
      <div v-else class="entry-list">
        <div v-for="e in newestFirst" :key="e.id" class="entry-row">
          <div class="entry-info">
            <span class="entry-name">{{ e.name }}</span>
            <span class="entry-meta">
              {{ e.date }}
              <span v-if="e.category" class="entry-tag">{{ e.category }}</span>
            </span>
          </div>
          <span class="entry-amount" :class="e.amount >= 0 ? 'up' : 'down'">
            {{ e.amount >= 0 ? '+' : '' }}{{ formatMoney(e.amount) }}
          </span>
          <button class="del-btn" @click="emit('delete-entry', e.id)">
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

.total-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.total-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; }
.total-value { font-size: 20px; font-weight: 700; }
.total-value.up { color: var(--green); }
.total-value.down { color: var(--red); }

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
```

- [ ] **Step 3: Add `balanceEntries` to the data model**

Find (`src/App.vue`):
```js
  speedruns: [],
  investment: [],
});
```

Replace with:
```js
  speedruns: [],
  investment: [],
  balanceEntries: [],
});
```

- [ ] **Step 4: Load and save `balanceEntries`**

Find:
```js
    data.speedruns = saved.speedruns || [];
    data.investment = saved.investment || [];
  }
```

Replace with:
```js
    data.speedruns = saved.speedruns || [];
    data.investment = saved.investment || [];
    data.balanceEntries = saved.balanceEntries || [];
  }
```

Find:
```js
    speedruns: data.speedruns,
    investment: data.investment,
  })));
}
```

Replace with:
```js
    speedruns: data.speedruns,
    investment: data.investment,
    balanceEntries: data.balanceEntries,
  })));
}
```

- [ ] **Step 5: Add CRUD handlers**

Find:
```js
// Kanban: projects
```

Insert immediately before it:
```js
// Balance
function addBalanceEntry({ date, name, amount, category }) {
  data.balanceEntries.push({ id: uid(), date, name, amount: Number(amount), category: category || '' });
  saveData();
}

function deleteBalanceEntry(id) {
  const idx = data.balanceEntries.findIndex((e) => e.id === id);
  if (idx !== -1) data.balanceEntries.splice(idx, 1);
  saveData();
}

```

- [ ] **Step 6: Import and wire the view**

Find:
```js
import InvestmentView from './components/InvestmentView.vue';
import Sidebar from './components/Sidebar.vue';
```

Replace with:
```js
import InvestmentView from './components/InvestmentView.vue';
import BalanceView from './components/BalanceView.vue';
import Sidebar from './components/Sidebar.vue';
```

Find:
```js
    <InvestmentView
      v-else-if="activeView === 'investment'"
      :snapshots="data.investment"
      @add-snapshot="addInvestmentSnapshot"
      @delete-snapshot="deleteInvestmentSnapshot"
    />
  </template>
```

Replace with:
```js
    <InvestmentView
      v-else-if="activeView === 'investment'"
      :snapshots="data.investment"
      @add-snapshot="addInvestmentSnapshot"
      @delete-snapshot="deleteInvestmentSnapshot"
    />
    <BalanceView
      v-else-if="activeView === 'balance'"
      :entries="data.balanceEntries"
      @add-entry="addBalanceEntry"
      @delete-entry="deleteBalanceEntry"
    />
  </template>
```

- [ ] **Step 7: Manual check**

Run: `npm start`
- Click "Balance". Click "+ Add Entry", enter name "Salary", amount `3000`, toggle to Income, category "salary", today's date — save. Confirm it shows in the list with a `+` green amount and the total updates.
- Add another entry, name "Groceries", amount `150`, leave as Expense, category "food" — save. Confirm it shows red with a `-` amount, and typing "foo" in a new entry's category field autocompletes "food" (browser-native `<datalist>` behavior).
- Confirm the total balance card reflects `3000 - 150 = 2850`.
- Delete an entry, confirm the total recalculates.

- [ ] **Step 8: Commit**

```bash
git add src/App.vue src/components/BalanceView.vue src/components/AddBalanceModal.vue
git commit -m "feat: add Balance income/expense ledger view"
```

---

### Task 4: Accountant Report view

**Files:**
- Create: `src/components/AccountantReportView.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Create the view**

```vue
<script setup>
import { ref, computed } from 'vue';

const props = defineProps({ categories: Array, values: Array });
const emit = defineEmits(['add-category', 'delete-category', 'set-value']);

const newCategoryName = ref('');

function addCategory() {
  if (!newCategoryName.value.trim()) return;
  emit('add-category', { name: newCategoryName.value.trim() });
  newCategoryName.value = '';
}

const currentMonth = ref(new Date().toISOString().slice(0, 7));

const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

function shiftMonth(delta) {
  const [y, m] = currentMonth.value.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  currentMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function valueFor(categoryId) {
  return props.values.find((v) => v.categoryId === categoryId && v.month === currentMonth.value)?.value ?? '';
}

function onValueChange(categoryId, event) {
  emit('set-value', categoryId, currentMonth.value, event.target.value);
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
            <button class="chip-del" @click="emit('delete-category', c.id)">
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
              <input type="number" step="0.01" :value="valueFor(c.id)" placeholder="0.00" @change="onValueChange(c.id, $event)" />
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
.month-label { font-weight: 600; font-size: 14px; }

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
```

- [ ] **Step 2: Add `accountantCategories`/`accountantValues` to the data model**

Find (`src/App.vue`):
```js
  investment: [],
  balanceEntries: [],
});
```

Replace with:
```js
  investment: [],
  balanceEntries: [],
  accountantCategories: [],
  accountantValues: [],
});
```

- [ ] **Step 3: Load and save them**

Find:
```js
    data.investment = saved.investment || [];
    data.balanceEntries = saved.balanceEntries || [];
  }
```

Replace with:
```js
    data.investment = saved.investment || [];
    data.balanceEntries = saved.balanceEntries || [];
    data.accountantCategories = saved.accountantCategories || [];
    data.accountantValues = saved.accountantValues || [];
  }
```

Find:
```js
    investment: data.investment,
    balanceEntries: data.balanceEntries,
  })));
}
```

Replace with:
```js
    investment: data.investment,
    balanceEntries: data.balanceEntries,
    accountantCategories: data.accountantCategories,
    accountantValues: data.accountantValues,
  })));
}
```

- [ ] **Step 4: Add CRUD handlers**

Find:
```js
// Kanban: projects
```

Insert immediately before it:
```js
// Accountant report
function addAccountantCategory({ name }) {
  data.accountantCategories.push({ id: uid(), name });
  saveData();
}

function deleteAccountantCategory(id) {
  const idx = data.accountantCategories.findIndex((c) => c.id === id);
  if (idx !== -1) data.accountantCategories.splice(idx, 1);
  saveData();
}

function setAccountantValue(categoryId, month, value) {
  const existing = data.accountantValues.find((v) => v.categoryId === categoryId && v.month === month);
  if (value === '' || value === null || value === undefined) {
    if (existing) {
      const idx = data.accountantValues.indexOf(existing);
      data.accountantValues.splice(idx, 1);
    }
  } else if (existing) {
    existing.value = Number(value);
  } else {
    data.accountantValues.push({ id: uid(), categoryId, month, value: Number(value) });
  }
  saveData();
}

```

- [ ] **Step 5: Import and wire the view**

Find:
```js
import BalanceView from './components/BalanceView.vue';
import Sidebar from './components/Sidebar.vue';
```

Replace with:
```js
import BalanceView from './components/BalanceView.vue';
import AccountantReportView from './components/AccountantReportView.vue';
import Sidebar from './components/Sidebar.vue';
```

Find:
```js
    <BalanceView
      v-else-if="activeView === 'balance'"
      :entries="data.balanceEntries"
      @add-entry="addBalanceEntry"
      @delete-entry="deleteBalanceEntry"
    />
  </template>
```

Replace with:
```js
    <BalanceView
      v-else-if="activeView === 'balance'"
      :entries="data.balanceEntries"
      @add-entry="addBalanceEntry"
      @delete-entry="deleteBalanceEntry"
    />
    <AccountantReportView
      v-else-if="activeView === 'accountant'"
      :categories="data.accountantCategories"
      :values="data.accountantValues"
      @add-category="addAccountantCategory"
      @delete-category="deleteAccountantCategory"
      @set-value="setAccountantValue"
    />
  </template>
```

- [ ] **Step 6: Manual check**

Run: `npm start`
- Click "Report". Add a category "Rent" — confirm it appears as a chip and as a table row.
- Add a value `1200` in the Rent row (tab/click away to blur and trigger `@change`) — confirm the Total row shows `1200.00`.
- Click the right month-nav arrow — confirm the Rent row is now blank (different month) and the total is `0.00`.
- Click the left arrow back — confirm `1200` is still there (persisted per-month).
- Add a second category "Internet", give it a value in the current month, confirm the total sums both.
- Delete a category — confirm its row and chip disappear (the other category's data is unaffected).

- [ ] **Step 7: Commit**

```bash
git add src/App.vue src/components/AccountantReportView.vue
git commit -m "feat: add Accountant Report monthly category tracker"
```

---

### Task 5: Full end-to-end verification pass

**Files:** none (manual verification only)

- [ ] **Step 1: Full flow across all three new views**

Run: `npm start`

1. Investment: add 3 snapshots on different dates with increasing then decreasing values — confirm the chart line goes up then down, and deltas/colors match.
2. Balance: add one income and two expense entries with different categories — confirm total, colors, and category autocomplete all work.
3. Accountant Report: add all ~7 real category names you actually track, fill in this month's values, confirm the total matches what you'd expect to send.
4. Quit the app fully and restart it (`npm start` again) — confirm all Investment/Balance/Accountant data persisted (same `productivity-data.json` used by everything else).

- [ ] **Step 2: Confirm no regressions elsewhere**

Since no files owned by Timers/Board/Challenges were touched, a quick smoke check is enough: add a task, toggle a habit, start a timer, open the Kanban board, open a Challenge — confirm all still behave as before.
