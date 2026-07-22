<script setup>
import { reactive, onMounted, onUnmounted, ref, computed } from 'vue';
import CalendarView from './components/CalendarView.vue';
import KanbanView from './components/KanbanView.vue';
import SpeedrunView from './components/SpeedrunView.vue';
import InvestmentView from './components/InvestmentView.vue';
import BalanceView from './components/BalanceView.vue';
import AccountantReportView from './components/AccountantReportView.vue';
import Sidebar from './components/Sidebar.vue';
import { matchesRule } from './recurrence.js';

const isLoaded = ref(false);
const activeView = ref('timers');

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
  balanceEntries: [],
  accountantCategories: [],
  accountantValues: [],
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function loadData() {
  const saved = await window.api.loadData();
  if (saved) {
    data.timers = saved.timers || [];
    data.habits = saved.habits || [];
    data.recurringTasks = saved.recurringTasks || [];
    data.days = saved.days || {};
    data.lastDate = saved.lastDate || todayStr();
    data.projects = saved.projects || [];
    data.cards = saved.cards || [];
    data.speedruns = saved.speedruns || [];
    data.investment = saved.investment || [];
    data.balanceEntries = saved.balanceEntries || [];
    data.accountantCategories = saved.accountantCategories || [];
    data.accountantValues = saved.accountantValues || [];
  }

  const today = todayStr();
  if (data.lastDate !== today && data.timers.length > 0) {
    rolloverDay(data.lastDate);
    data.lastDate = today;
  }

  isLoaded.value = true;
  saveData();
}

function isWeekend(dateStr) {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}

function rolloverDay(dateStr) {
  if (!data.days[dateStr]) data.days[dateStr] = { tasks: [], timerResults: [], habitResults: [], note: '' };
  const weekend = isWeekend(dateStr);

  data.days[dateStr].timerResults = data.timers
    .filter((t) => !(t.skipWeekends && weekend))
    .map((t) => ({
      id: t.id, name: t.name, totalSeconds: t.totalSeconds,
      remainingSeconds: t.remainingSeconds, completed: t.remainingSeconds === 0, color: t.color,
    }));

  const activeHabits = data.habits.filter((h) => !(h.skipWeekends && weekend));
  const prevHabitResults = data.days[dateStr].habitResults || [];
  data.days[dateStr].habitResults = activeHabits.map((h) => ({
    id: h.id, name: h.name,
    done: prevHabitResults.find((r) => r.id === h.id)?.done || false,
  }));

  data.timers.forEach((t) => (t.remainingSeconds = t.totalSeconds));
}

async function saveData() {
  await window.api.saveData(JSON.parse(JSON.stringify({
    lastDate: data.lastDate,
    timers: data.timers,
    habits: data.habits,
    recurringTasks: data.recurringTasks,
    days: data.days,
    projects: data.projects,
    cards: data.cards,
    speedruns: data.speedruns,
    investment: data.investment,
    balanceEntries: data.balanceEntries,
    accountantCategories: data.accountantCategories,
    accountantValues: data.accountantValues,
  })));
}

// Timers
function addTimer(timerData) {
  data.timers.push({
    id: uid(),
    name: timerData.name,
    totalSeconds: timerData.totalSeconds,
    remainingSeconds: timerData.totalSeconds,
    color: timerData.color,
    skipWeekends: timerData.skipWeekends ?? false,
  });
  saveData();
}

function updateTimer(id, changes) {
  const t = data.timers.find((t) => t.id === id);
  if (t) Object.assign(t, changes);
}

function editTimer(id, timerData) {
  const t = data.timers.find((t) => t.id === id);
  if (t) {
    t.name = timerData.name;
    t.color = timerData.color;
    t.skipWeekends = timerData.skipWeekends ?? false;
    if (timerData.totalSeconds !== t.totalSeconds) {
      t.totalSeconds = timerData.totalSeconds;
      t.remainingSeconds = timerData.totalSeconds;
    }
  }
  saveData();
}

function deleteTimer(id) {
  const idx = data.timers.findIndex((t) => t.id === id);
  if (idx !== -1) data.timers.splice(idx, 1);
  saveData();
}

function resetTimer(id) {
  const t = data.timers.find((t) => t.id === id);
  if (t) t.remainingSeconds = t.totalSeconds;
  saveData();
}

// Habits
function addHabit(habitData) {
  data.habits.push({ id: uid(), name: habitData.name, skipWeekends: habitData.skipWeekends ?? false });
  saveData();
}

function editHabit(id, habitData) {
  const h = data.habits.find((h) => h.id === id);
  if (h) { h.name = habitData.name; h.skipWeekends = habitData.skipWeekends ?? false; }
  saveData();
}

function deleteHabit(id) {
  const idx = data.habits.findIndex((h) => h.id === id);
  if (idx !== -1) data.habits.splice(idx, 1);
  saveData();
}

function toggleHabit(dateStr, habitId) {
  if (!data.days[dateStr]) data.days[dateStr] = { tasks: [], timerResults: [], habitResults: [], note: '' };
  if (!data.days[dateStr].habitResults) data.days[dateStr].habitResults = [];
  const existing = data.days[dateStr].habitResults.find((r) => r.id === habitId);
  if (existing) {
    existing.done = !existing.done;
  } else {
    const habit = data.habits.find((h) => h.id === habitId);
    if (habit) data.days[dateStr].habitResults.push({ id: habitId, name: habit.name, done: true });
  }
  saveData();
}

// Dev: manual date override
function changeDate(newDate) {
  if (!newDate || newDate === data.lastDate) return;
  rolloverDay(data.lastDate);
  data.lastDate = newDate;
  saveData();
}

// Notes
function updateNote(dateStr, text) {
  if (!data.days[dateStr]) data.days[dateStr] = { tasks: [], timerResults: [], habitResults: [], note: '' };
  data.days[dateStr].note = text;
  saveData();
}

// Streak
const streak = computed(() => {
  let count = 0;
  const d = new Date(data.lastDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const dateStr = toDateStr(d);
    const dayData = data.days[dateStr];
    if (!dayData) break;
    const timers = dayData.timerResults || [];
    const habits = dayData.habitResults || [];
    if (timers.length === 0 && habits.length === 0) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (!timers.every((t) => t.completed) || !habits.every((h) => h.done)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
});

// Tasks
function addTask(dateStr, task) {
  if (!data.days[dateStr]) data.days[dateStr] = { tasks: [], timerResults: [] };
  data.days[dateStr].tasks.push({
    id: uid(),
    text: task.text,
    done: false,
    reminderTime: task.reminderTime || null,
  });
  saveData();
}

function toggleTask(dateStr, taskId) {
  const day = data.days[dateStr];
  if (!day) return;
  const task = day.tasks.find((t) => t.id === taskId);
  if (task) task.done = !task.done;
  saveData();
}

function deleteTask(dateStr, taskId) {
  const day = data.days[dateStr];
  if (!day) return;
  const idx = day.tasks.findIndex((t) => t.id === taskId);
  if (idx !== -1) day.tasks.splice(idx, 1);
  saveData();
}

// Recurring tasks
function addRecurringTask(taskData) {
  data.recurringTasks.push({
    id: uid(),
    text: taskData.text,
    reminderTime: taskData.reminderTime || null,
    rule: taskData.rule,
  });
  saveData();
}

function deleteRecurringTask(id) {
  const idx = data.recurringTasks.findIndex((r) => r.id === id);
  if (idx !== -1) data.recurringTasks.splice(idx, 1);
  saveData();
}

function toggleRecurringTask(dateStr, recurringId) {
  if (!data.days[dateStr]) data.days[dateStr] = { tasks: [], timerResults: [], habitResults: [], note: '' };
  if (!data.days[dateStr].recurringTaskResults) data.days[dateStr].recurringTaskResults = [];
  const existing = data.days[dateStr].recurringTaskResults.find((r) => r.id === recurringId);
  if (existing) existing.done = !existing.done;
  else data.days[dateStr].recurringTaskResults.push({ id: recurringId, done: true });
  saveData();
}

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

// Kanban: projects
function addProject(projectData) {
  data.projects.push({
    id: uid(),
    name: projectData.name,
    color: projectData.color,
    description: projectData.description || '',
  });
  saveData();
}

function editProject(id, projectData) {
  const p = data.projects.find((p) => p.id === id);
  if (p) { p.name = projectData.name; p.color = projectData.color; p.description = projectData.description || ''; }
  saveData();
}

function deleteProject(id) {
  const idx = data.projects.findIndex((p) => p.id === id);
  if (idx !== -1) data.projects.splice(idx, 1);
  data.cards = data.cards.filter((c) => c.projectId !== id);
  saveData();
}

// Kanban: cards
function addCard(cardData) {
  data.cards.push({
    id: uid(),
    title: cardData.title,
    description: '',
    projectId: cardData.projectId,
    status: cardData.status,
  });
  saveData();
}

function editCard(id, changes) {
  const c = data.cards.find((c) => c.id === id);
  if (c) { c.title = changes.title; c.description = changes.description; }
  saveData();
}

function deleteCard(id) {
  const idx = data.cards.findIndex((c) => c.id === id);
  if (idx !== -1) data.cards.splice(idx, 1);
  saveData();
}

function moveCard({ id, status, beforeCardId, afterCardId }) {
  if (beforeCardId === id || afterCardId === id) return;
  const idx = data.cards.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const [card] = data.cards.splice(idx, 1);
  card.status = status;
  let insertAt;
  if (beforeCardId) insertAt = data.cards.findIndex((c) => c.id === beforeCardId);
  else if (afterCardId) insertAt = data.cards.findIndex((c) => c.id === afterCardId) + 1;
  else insertAt = data.cards.length;
  if (insertAt === -1) insertAt = data.cards.length;
  data.cards.splice(insertAt, 0, card);
  saveData();
}

// Speedruns
function addSpeedrun(speedrunData) {
  data.speedruns.push({
    id: uid(),
    name: speedrunData.name,
    totalSeconds: speedrunData.totalSeconds,
    remainingSeconds: speedrunData.totalSeconds,
    color: speedrunData.color,
    description: speedrunData.description || '',
    notesLog: [],
    status: 'active',
    startedAt: null,
  });
  saveData();
}

function updateSpeedrun(id, changes) {
  const s = data.speedruns.find((s) => s.id === id);
  if (s) Object.assign(s, changes);
}

function resetSpeedrun(id) {
  const s = data.speedruns.find((s) => s.id === id);
  if (s) { s.remainingSeconds = s.totalSeconds; s.startedAt = null; }
  saveData();
}

function finishSpeedrun(id) {
  const s = data.speedruns.find((s) => s.id === id);
  if (s) s.status = 'finished';
  saveData();
}

function deleteSpeedrun(id) {
  const idx = data.speedruns.findIndex((s) => s.id === id);
  if (idx !== -1) data.speedruns.splice(idx, 1);
  saveData();
}

function addSpeedrunNote(id, text) {
  const s = data.speedruns.find((s) => s.id === id);
  if (s) {
    if (!s.notesLog) s.notesLog = [];
    s.notesLog.push({ id: uid(), text, createdAt: Date.now() });
  }
  saveData();
}

function deleteSpeedrunNote(id, noteId) {
  const s = data.speedruns.find((s) => s.id === id);
  if (s?.notesLog) {
    const idx = s.notesLog.findIndex((n) => n.id === noteId);
    if (idx !== -1) s.notesLog.splice(idx, 1);
  }
  saveData();
}

// Midnight rollover
let midnightTimer = null;
function scheduleMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 1, 0);
  midnightTimer = setTimeout(() => {
    const today = todayStr();
    if (data.lastDate !== today) {
      rolloverDay(data.lastDate);
      data.lastDate = today;
      saveData();
    }
    scheduleMidnight();
  }, tomorrow - now);
}

// Reminder check (every minute)
const remindedIds = new Set();
let reminderInterval = null;
function checkReminders() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  const todayTasks = data.days[data.lastDate]?.tasks || [];
  todayTasks.forEach((task) => {
    if (task.reminderTime === timeStr && !task.done && !remindedIds.has(task.id)) {
      remindedIds.add(task.id);
      try { if (Notification.permission === 'granted') new Notification('Reminder', { body: task.text }); } catch (_) {}
    }
  });

  const recurringResults = data.days[data.lastDate]?.recurringTaskResults || [];
  data.recurringTasks.forEach((rt) => {
    if (rt.reminderTime !== timeStr) return;
    if (!matchesRule(rt.rule, data.lastDate)) return;
    const done = recurringResults.find((r) => r.id === rt.id)?.done;
    const key = `r:${data.lastDate}:${rt.id}`;
    if (!done && !remindedIds.has(key)) {
      remindedIds.add(key);
      try { if (Notification.permission === 'granted') new Notification('Reminder', { body: rt.text }); } catch (_) {}
    }
  });
}

onMounted(() => {
  loadData();
  scheduleMidnight();
  reminderInterval = setInterval(checkReminders, 60000);
  if (Notification.permission === 'default') Notification.requestPermission();
  window.addEventListener('beforeunload', saveData);
});

onUnmounted(() => {
  clearTimeout(midnightTimer);
  clearInterval(reminderInterval);
  window.removeEventListener('beforeunload', saveData);
});
</script>

<template>
  <div v-if="!isLoaded" class="loading">
    <div class="spinner" />
  </div>
  <template v-else>
    <Sidebar :active-view="activeView" @change-view="activeView = $event" />
    <CalendarView
      v-if="activeView === 'timers'"
      :days="data.days"
      :timers="data.timers"
      :habits="data.habits"
      :recurring-tasks="data.recurringTasks"
      :streak="streak"
      :today="data.lastDate"
      @add-task="addTask"
      @toggle-task="toggleTask"
      @delete-task="deleteTask"
      @add-recurring-task="addRecurringTask"
      @delete-recurring-task="deleteRecurringTask"
      @toggle-recurring-task="toggleRecurringTask"
      @add-timer="addTimer"
      @edit-timer="editTimer"
      @update-timer="updateTimer"
      @delete-timer="deleteTimer"
      @reset-timer="resetTimer"
      @save="saveData"
      @add-habit="addHabit"
      @edit-habit="editHabit"
      @delete-habit="deleteHabit"
      @toggle-habit="toggleHabit"
      @update-note="updateNote"
      @change-date="changeDate"
    />
    <KanbanView
      v-else-if="activeView === 'kanban'"
      :projects="data.projects"
      :cards="data.cards"
      @add-project="addProject"
      @edit-project="editProject"
      @delete-project="deleteProject"
      @add-card="addCard"
      @edit-card="editCard"
      @delete-card="deleteCard"
      @move-card="moveCard"
    />
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
</template>

<style scoped>
.loading {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 2.5px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
