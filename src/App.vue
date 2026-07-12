<script setup>
import { reactive, onMounted, onUnmounted, ref, computed } from 'vue';
import CalendarView from './components/CalendarView.vue';

const isLoaded = ref(false);

const data = reactive({
  lastDate: todayStr(),
  timers: [],
  habits: [],
  days: {},
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
    data.days = saved.days || {};
    data.lastDate = saved.lastDate || todayStr();
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
    days: data.days,
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
  <CalendarView
    v-else
    :days="data.days"
    :timers="data.timers"
    :habits="data.habits"
    :streak="streak"
    :today="data.lastDate"
    @add-task="addTask"
    @toggle-task="toggleTask"
    @delete-task="deleteTask"
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
