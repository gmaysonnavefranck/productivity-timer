<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import TimerCard from './TimerCard.vue';
import AddTimerModal from './AddTimerModal.vue';
import HabitModal from './HabitModal.vue';
import TaskModal from './TaskModal.vue';
import RecurringTasksModal from './RecurringTasksModal.vue';
import { matchesRule } from '../recurrence.js';

const props = defineProps({
  days: Object,
  timers: Array,
  habits: Array,
  recurringTasks: Array,
  anytimeTasks: { type: Array, default: () => [] },
  streak: Number,
  today: String,
});
const emit = defineEmits([
  'add-task', 'toggle-task', 'delete-task',
  'add-recurring-task', 'delete-recurring-task', 'toggle-recurring-task',
  'add-anytime-task', 'toggle-anytime-task', 'delete-anytime-task',
  'add-timer', 'edit-timer', 'update-timer', 'delete-timer', 'reset-timer', 'save',
  'add-habit', 'edit-habit', 'delete-habit', 'toggle-habit', 'change-date', 'open-journal',
]);

const showTimerModal = ref(false);
const editingTimer = ref(null);

function openAddTimer() {
  editingTimer.value = null;
  showTimerModal.value = true;
}

function openEditTimer(timer) {
  editingTimer.value = timer;
  showTimerModal.value = true;
}

function handleTimerSave(timerData) {
  if (editingTimer.value) {
    emit('edit-timer', editingTimer.value.id, timerData);
  } else {
    emit('add-timer', timerData);
  }
  showTimerModal.value = false;
  editingTimer.value = null;
}

function closeTimerModal() {
  showTimerModal.value = false;
  editingTimer.value = null;
}

// Habits
const showHabitModal = ref(false);
const editingHabit = ref(null);

function openAddHabit() { editingHabit.value = null; showHabitModal.value = true; }
function openEditHabit(h) { editingHabit.value = h; showHabitModal.value = true; }
function handleHabitSave(habitData) {
  if (editingHabit.value) emit('edit-habit', editingHabit.value.id, habitData);
  else emit('add-habit', habitData);
  showHabitModal.value = false;
  editingHabit.value = null;
}
function closeHabitModal() { showHabitModal.value = false; editingHabit.value = null; }

function activeHabitsForDate(dateStr) {
  if (!dateStr || !props.habits) return [];
  const weekend = isWeekend(dateStr);
  return props.habits.filter((h) => !(h.skipWeekends && weekend));
}

const habitsForSelected = computed(() => {
  if (!selectedDate.value || isSelectedFuture.value) return [];
  const active = activeHabitsForDate(selectedDate.value);
  if (isSelectedToday.value) {
    const results = props.days[selectedDate.value]?.habitResults || [];
    return active.map((h) => ({ ...h, done: results.find((r) => r.id === h.id)?.done || false }));
  }
  return props.days[selectedDate.value]?.habitResults || [];
});

const futureHabits = computed(() => {
  if (!selectedDate.value || !isSelectedFuture.value) return [];
  return activeHabitsForDate(selectedDate.value);
});

// Weekly stats
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const weeklyStats = computed(() => {
  const today = new Date(props.today + 'T00:00:00');
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
  let totalSecs = 0, habitDone = 0, habitTotal = 0;

  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    const dateStr = toDateStr(d);
    if (dateStr > props.today) break;

    if (dateStr === props.today) {
      props.timers.filter((t) => !(t.skipWeekends && isWeekend(dateStr)))
        .forEach((t) => { totalSecs += t.totalSeconds - t.remainingSeconds; });
      const todayActive = activeHabitsForDate(dateStr);
      const results = props.days[dateStr]?.habitResults || [];
      todayActive.forEach((h) => {
        habitTotal++;
        if (results.find((r) => r.id === h.id)?.done) habitDone++;
      });
    } else {
      const day = props.days[dateStr];
      if (day) {
        day.timerResults?.forEach((t) => { totalSecs += t.totalSeconds - t.remainingSeconds; });
        day.habitResults?.forEach((h) => { habitTotal++; if (h.done) habitDone++; });
      }
    }
  }

  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const timeStr = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : (m > 0 ? `${m}m` : null);
  return { timeStr, habitDone, habitTotal, totalSecs };
});

const currentMonth = ref(new Date());
const selectedDate = ref(props.today);

function goToToday() {
  currentMonth.value = new Date(props.today + 'T00:00:00');
  selectedDate.value = props.today;
}

watch(() => props.today, (newDate) => {
  selectedDate.value = newDate;
  const d = new Date(newDate + 'T00:00:00');
  currentMonth.value = d;
});

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const monthLabel = computed(() =>
  currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
);

const calendarDays = computed(() => {
  const y = currentMonth.value.getFullYear();
  const m = currentMonth.value.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Mon=0
  const lastDay = new Date(y, m + 1, 0).getDate();
  const days = Array(firstDow).fill(null);
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
});

function prevMonth() {
  const d = currentMonth.value;
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function nextMonth() {
  const d = currentMonth.value;
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function dayStatus(dateStr) {
  if (!dateStr || dateStr > props.today) return null;

  if (dateStr === props.today) {
    const todayTimers = props.timers.filter((t) => !(t.skipWeekends && isWeekend(dateStr)));
    if (!todayTimers.length) return null;
    const done = todayTimers.filter((t) => t.remainingSeconds === 0).length;
    if (done === todayTimers.length) return 'completed';
    if (done > 0) return 'partial';
    return null;
  }

  const results = props.days[dateStr]?.timerResults;
  if (!results?.length) return null;
  const done = results.filter((r) => r.completed).length;
  if (done === results.length) return 'completed';
  if (done > 0) return 'partial';
  return 'failed';
}

function taskDots(dateStr) {
  if (!dateStr) return [];
  return (props.days[dateStr]?.tasks || []).slice(0, 3);
}

// Selected day
const selectedDay = computed(() => {
  if (!selectedDate.value) return null;
  return props.days[selectedDate.value] || { tasks: [], timerResults: [] };
});

const selectedLabel = computed(() => {
  if (!selectedDate.value) return '';
  const d = new Date(selectedDate.value + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
});

const isSelectedToday = computed(() => selectedDate.value === props.today);
const isSelectedFuture = computed(() => selectedDate.value > props.today);

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00').getDay();
  return d === 0 || d === 6;
}

const activeTimers = computed(() => {
  if (!selectedDate.value) return props.timers;
  const weekend = isWeekend(selectedDate.value);
  return props.timers.filter((t) => !(t.skipWeekends && weekend));
});

const timerSummary = computed(() => {
  if (!selectedDate.value) return [];
  if (isSelectedFuture.value) return [];

  if (isSelectedToday.value) {
    return props.timers.map((t) => ({
      ...t,
      completed: t.remainingSeconds === 0,
      spentSeconds: t.totalSeconds - t.remainingSeconds,
    }));
  }

  return (selectedDay.value?.timerResults || []).map((r) => ({
    ...r,
    spentSeconds: r.totalSeconds - r.remainingSeconds,
  }));
});

function formatDur(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Task form
const showTaskModal = ref(false);

function openAddTask() { showTaskModal.value = true; }

function handleTaskSave({ date, text, reminderTime }) {
  emit('add-task', date, { text, reminderTime });
  showTaskModal.value = false;
}

function handleRecurringSave(taskData) {
  emit('add-recurring-task', taskData);
  showTaskModal.value = false;
}

function handleAnytimeSave(taskData) {
  emit('add-anytime-task', taskData);
  showTaskModal.value = false;
}

// Quick-add for anytime reminders: type, Enter, type, Enter — no modal round-trip
const anytimeDraft = ref('');
const anytimeInputRef = ref(null);

function submitQuickAnytime() {
  const text = anytimeDraft.value.trim();
  if (!text) return;
  emit('add-anytime-task', { text, reminderTime: null });
  anytimeDraft.value = '';
  nextTick(() => anytimeInputRef.value?.focus());
}

function closeTaskModal() { showTaskModal.value = false; }

// Recurring task management (browsed/deleted in their own modal)
const showRecurringModal = ref(false);

// Journal preview (full editing lives on the Notes page)
const journalPreview = computed(() => {
  const note = (selectedDate.value && props.days[selectedDate.value]?.note || '').trim();
  if (!note) return '';
  return note.length > 160 ? note.slice(0, 160) + '…' : note;
});

// Recurring task occurrences for the selected day
const recurringForSelected = computed(() => {
  if (!selectedDate.value) return [];
  const results = props.days[selectedDate.value]?.recurringTaskResults || [];
  return (props.recurringTasks || [])
    .filter((rt) => matchesRule(rt.rule, selectedDate.value))
    .map((rt) => ({
      id: rt.id,
      text: rt.text,
      reminderTime: rt.reminderTime,
      done: results.find((r) => r.id === rt.id)?.done || false,
      recurring: true,
    }));
});

const allTasksForSelected = computed(() => [
  ...recurringForSelected.value,
  ...(selectedDay.value?.tasks || []).map((t) => ({ ...t, recurring: false })),
]);

// Month-wide task list: every day in the displayed month that has tasks,
// so they can be ticked off without navigating the calendar day by day.
const taskViewMode = ref('day'); // 'day' | 'month'

const monthTasks = computed(() => {
  const y = currentMonth.value.getFullYear();
  const m = currentMonth.value.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const groups = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const results = props.days[dateStr]?.recurringTaskResults || [];
    const recurring = (props.recurringTasks || [])
      .filter((rt) => matchesRule(rt.rule, dateStr))
      .map((rt) => ({
        id: rt.id,
        text: rt.text,
        reminderTime: rt.reminderTime,
        done: results.find((r) => r.id === rt.id)?.done || false,
        recurring: true,
      }));
    const oneTime = (props.days[dateStr]?.tasks || []).map((t) => ({ ...t, recurring: false }));
    const tasks = [...recurring, ...oneTime];
    if (tasks.length) groups.push({ date: dateStr, tasks });
  }
  return groups;
});

function formatGroupLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return dateStr === props.today ? `${label} · Today` : label;
}
</script>

<template>
  <div class="cal-layout">
    <header class="app-header">
      <div class="brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        FocusTimer
      </div>
      <div class="header-right">
        <div v-if="streak > 0" class="streak-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10zm-1 13a1 1 0 002 0 1 1 0 01-2 0z"/>
          </svg>
          {{ streak }} day{{ streak !== 1 ? 's' : '' }}
        </div>
        <button class="btn-add-sm" @click="openAddTask">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          Add Task
        </button>
        <div class="dev-date">
          <span class="dev-label">Test date</span>
          <input
            type="date"
            :value="today"
            class="dev-input"
            @change="emit('change-date', $event.target.value)"
          />
        </div>
      </div>
    </header>

  <div class="cal-view">
    <!-- Left: calendar grid -->
    <div class="cal-panel">
      <div class="month-nav">
        <button class="nav-btn" @click="prevMonth">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="month-label-group">
          <span class="month-label">{{ monthLabel }}</span>
          <button class="today-link" @click="goToToday">Today</button>
        </div>
        <button class="nav-btn" @click="nextMonth">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="weekdays">
        <span v-for="d in WEEKDAYS" :key="d">{{ d }}</span>
      </div>

      <div class="grid">
        <div
          v-for="(ds, i) in calendarDays"
          :key="i"
          :class="[
            'day',
            {
              empty: !ds,
              today: ds === today,
              selected: ds === selectedDate,
              future: ds > today,
              'st-completed': dayStatus(ds) === 'completed',
              'st-partial': dayStatus(ds) === 'partial',
              'st-failed': dayStatus(ds) === 'failed',
            },
          ]"
          @click="ds && (selectedDate = ds)"
        >
          <span v-if="ds" class="day-num">{{ parseInt(ds.slice(8)) }}</span>
          <div v-if="ds && taskDots(ds).length" class="dots">
            <span
              v-for="(task, ti) in taskDots(ds)"
              :key="ti"
              class="dot"
              :class="{ done: task.done }"
            />
          </div>
        </div>
      </div>

      <div class="legend">
        <span class="leg"><span class="leg-dot c" />All done</span>
        <span class="leg"><span class="leg-dot p" />Partial</span>
        <span class="leg"><span class="leg-dot f" />Missed</span>
      </div>

      <div v-if="weeklyStats.timeStr || weeklyStats.habitTotal > 0" class="weekly-stats">
        <p class="weekly-label">This week</p>
        <div class="weekly-row">
          <span v-if="weeklyStats.timeStr" class="weekly-item">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {{ weeklyStats.timeStr }} logged
          </span>
          <span v-if="weeklyStats.habitTotal > 0" class="weekly-item">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            {{ weeklyStats.habitDone }}/{{ weeklyStats.habitTotal }} habits
          </span>
        </div>
      </div>

      <!-- Anytime reminders (no date) -->
      <div class="section tasks-section">
        <p class="sec-title">Anytime</p>
        <form class="quick-add" @submit.prevent="submitQuickAnytime">
          <input
            ref="anytimeInputRef"
            v-model="anytimeDraft"
            class="quick-add-input"
            placeholder="Add a reminder… press Enter"
          />
        </form>
        <div v-if="anytimeTasks.length" class="task-list">
          <div v-for="task in anytimeTasks" :key="task.id" class="task">
            <button
              class="check"
              :class="{ done: task.done }"
              @click="emit('toggle-anytime-task', task.id)"
            >
              <svg v-if="task.done" width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </button>
            <div class="task-body">
              <span :class="['task-text', { done: task.done }]">{{ task.text }}</span>
              <span v-if="task.reminderTime" class="reminder">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                {{ task.reminderTime }} daily
              </span>
            </div>
            <button class="del-btn" @click="emit('delete-anytime-task', task.id)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Recurring tasks (browsed/managed in their own modal) -->
      <div v-if="recurringTasks.length" class="section">
        <div class="sec-header">
          <p class="sec-title">Recurring ({{ recurringTasks.length }})</p>
          <button class="btn-add-sm" @click="showRecurringModal = true">Manage</button>
        </div>
      </div>

      <!-- Tasks -->
      <div class="section tasks-section">
        <div class="sec-header">
          <p class="sec-title">Tasks & Reminders</p>
          <div class="view-toggle">
            <button class="view-toggle-btn" :class="{ active: taskViewMode === 'day' }" @click="taskViewMode = 'day'">Day</button>
            <button class="view-toggle-btn" :class="{ active: taskViewMode === 'month' }" @click="taskViewMode = 'month'">Month</button>
          </div>
        </div>

        <template v-if="taskViewMode === 'day'">
          <div v-if="!allTasksForSelected.length" class="no-tasks">No tasks for this day</div>

          <div v-else class="task-list">
            <div v-for="task in allTasksForSelected" :key="(task.recurring ? 'r-' : 'o-') + task.id" class="task">
              <button
                class="check"
                :class="{ done: task.done }"
                @click="task.recurring
                  ? emit('toggle-recurring-task', selectedDate, task.id)
                  : emit('toggle-task', selectedDate, task.id)"
              >
                <svg v-if="task.done" width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </button>
              <div class="task-body">
                <span :class="['task-text', { done: task.done }]">{{ task.text }}</span>
                <span v-if="task.reminderTime" class="reminder">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  {{ task.reminderTime }}
                </span>
              </div>
              <svg v-if="task.recurring" class="repeat-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" title="Recurring — edit or remove from Add Task">
                <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <button
                v-else
                class="del-btn"
                @click="emit('delete-task', selectedDate, task.id)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="!monthTasks.length" class="no-tasks">No tasks this month</div>

          <div v-else class="month-task-groups">
            <div v-for="group in monthTasks" :key="group.date" class="month-task-group">
              <p class="month-group-label" :class="{ 'is-today': group.date === today }">{{ formatGroupLabel(group.date) }}</p>
              <div class="task-list">
                <div v-for="task in group.tasks" :key="(task.recurring ? 'r-' : 'o-') + task.id" class="task">
                  <button
                    class="check"
                    :class="{ done: task.done }"
                    @click="task.recurring
                      ? emit('toggle-recurring-task', group.date, task.id)
                      : emit('toggle-task', group.date, task.id)"
                  >
                    <svg v-if="task.done" width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                  <div class="task-body">
                    <span :class="['task-text', { done: task.done }]">{{ task.text }}</span>
                    <span v-if="task.reminderTime" class="reminder">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                      {{ task.reminderTime }}
                    </span>
                  </div>
                  <svg v-if="task.recurring" class="repeat-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" title="Recurring — edit or remove from Add Task">
                    <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <button
                    v-else
                    class="del-btn"
                    @click="emit('delete-task', group.date, task.id)"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Right: day detail -->
    <div class="detail-panel">
      <template v-if="selectedDate">
        <div class="detail-header">
          <h2>{{ selectedLabel }}</h2>
          <span v-if="isSelectedToday" class="badge">Today</span>
          <span v-else-if="isSelectedFuture" class="badge future-badge">Upcoming</span>
        </div>

        <!-- Today: interactive timers -->
        <div v-if="isSelectedToday" class="section">
          <div class="sec-header">
            <p class="sec-title">Timers</p>
            <button class="btn-add-sm" @click="openAddTimer">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              Add Timer
            </button>
          </div>
          <div v-if="!activeTimers.length" class="no-tasks">
            {{ timers.length ? 'No timers scheduled for today.' : 'No timers configured yet.' }}
          </div>
          <div v-else class="timer-grid-inline">
            <TimerCard
              v-for="timer in activeTimers"
              :key="timer.id"
              :timer="timer"
              @update="(changes) => emit('update-timer', timer.id, changes)"
              @delete="emit('delete-timer', timer.id)"
              @reset="emit('reset-timer', timer.id)"
              @edit="openEditTimer(timer)"
              @save="emit('save')"
            />
          </div>
        </div>

        <!-- Future days: scheduled timer preview -->
        <div v-else-if="isSelectedFuture && activeTimers.length" class="section">
          <p class="sec-title">Scheduled Timers</p>
          <div class="timer-list">
            <div v-for="t in activeTimers" :key="t.id" class="t-row">
              <span class="t-dot" :style="{ background: t.color }" />
              <div class="t-info">
                <span class="t-name">{{ t.name }}</span>
                <span class="t-time">{{ formatDur(t.totalSeconds) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Past days: read-only timer summary -->
        <div v-else-if="timerSummary.length" class="section">
          <p class="sec-title">Timers</p>
          <div class="timer-list">
            <div v-for="t in timerSummary" :key="t.id" class="t-row">
              <span class="t-dot" :style="{ background: t.color }" />
              <div class="t-info">
                <span class="t-name">{{ t.name }}</span>
                <span class="t-time">
                  {{ formatDur(t.spentSeconds) }} / {{ formatDur(t.totalSeconds) }}
                </span>
              </div>
              <span class="t-status" :class="t.completed ? 'ok' : 'no'">
                {{ t.completed ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Journal (today and past) -->
        <div v-if="!isSelectedFuture" class="section">
          <div class="sec-header">
            <p class="sec-title">Journal</p>
            <button class="btn-add-sm" @click="emit('open-journal', selectedDate)">Open Journal</button>
          </div>
          <p v-if="journalPreview" class="journal-preview">{{ journalPreview }}</p>
          <p v-else class="no-tasks">No entry yet for this day.</p>
        </div>

        <!-- Daily Habits (today: interactive) -->
        <div v-if="isSelectedToday" class="section">
          <div class="sec-header">
            <p class="sec-title">Daily Habits</p>
            <button class="btn-add-sm" @click="openAddHabit">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              Add
            </button>
          </div>
          <div v-if="!habitsForSelected.length" class="no-tasks">
            {{ habits?.length ? 'No habits scheduled today.' : 'No habits configured yet.' }}
          </div>
          <div v-else class="habit-list">
            <div v-for="habit in habitsForSelected" :key="habit.id" class="habit-row">
              <button
                class="habit-check"
                :class="{ done: habit.done }"
                @click="emit('toggle-habit', selectedDate, habit.id)"
              >
                <svg v-if="habit.done" width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
              </button>
              <span :class="['habit-name', { done: habit.done }]">{{ habit.name }}</span>
              <div class="habit-actions">
                <button class="icon-btn-sm" @click="openEditHabit(habit)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <button class="icon-btn-sm danger" @click="emit('delete-habit', habit.id)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Daily Habits (past: read-only) -->
        <div v-else-if="!isSelectedFuture && habitsForSelected.length" class="section">
          <p class="sec-title">Daily Habits</p>
          <div class="habit-list">
            <div v-for="habit in habitsForSelected" :key="habit.id" class="habit-row">
              <span class="habit-status" :class="habit.done ? 'ok' : 'no'">{{ habit.done ? '✓' : '✗' }}</span>
              <span :class="['habit-name', { done: habit.done, 'muted': !habit.done }]">{{ habit.name }}</span>
            </div>
          </div>
        </div>

        <!-- Daily Habits (future: preview) -->
        <div v-else-if="isSelectedFuture && futureHabits.length" class="section">
          <p class="sec-title">Daily Habits</p>
          <div class="habit-list">
            <div v-for="habit in futureHabits" :key="habit.id" class="habit-row">
              <span class="habit-dot" />
              <span class="habit-name">{{ habit.name }}</span>
            </div>
          </div>
        </div>

      </template>

      <div v-else class="no-sel">Select a day to view details</div>
    </div>
  </div>
  </div>

  <AddTimerModal
    v-if="showTimerModal"
    :initial="editingTimer"
    @save="handleTimerSave"
    @close="closeTimerModal"
  />
  <HabitModal
    v-if="showHabitModal"
    :initial="editingHabit"
    @save="handleHabitSave"
    @close="closeHabitModal"
  />
  <TaskModal
    v-if="showTaskModal"
    :today="today"
    @save="handleTaskSave"
    @save-recurring="handleRecurringSave"
    @save-anytime="handleAnytimeSave"
    @close="closeTaskModal"
  />
  <RecurringTasksModal
    v-if="showRecurringModal"
    :recurring-tasks="recurringTasks"
    @delete="emit('delete-recurring-task', $event)"
    @close="showRecurringModal = false"
  />
</template>

<style scoped>
.cal-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
  min-width: 0;
}

.app-header {
  display: flex;
  align-items: center;
  padding: 14px 22px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.dev-date {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dev-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dev-input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 12px;
  padding: 3px 7px;
  outline: none;
  color-scheme: dark;
  cursor: pointer;
  transition: border-color 0.15s;
}
.dev-input:focus { border-color: var(--accent); }

.streak-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245,158,11,.12);
  border-radius: 100px;
  padding: 4px 11px;
}

.cal-view {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Calendar panel */
.cal-panel {
  width: 320px;
  min-width: 320px;
  border-right: 1px solid var(--border);
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month-label-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.month-label { font-weight: 600; font-size: 14px; }

.today-link {
  padding: 0;
  background: transparent;
  color: var(--accent);
  font-size: 10px;
  font-weight: 600;
  transition: opacity 0.15s;
}
.today-link:hover { opacity: 0.7; }

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

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
}
.weekdays span {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}
.day.empty { cursor: default; pointer-events: none; }
.day.future { opacity: 0.5; }
.day:not(.empty):hover { background: var(--surface-2); }

.day.today .day-num {
  background: var(--accent);
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.day.selected:not(.today) { outline: 1.5px solid var(--accent); }

.day.st-completed { background: rgba(34,197,94,.13); }
.day.st-partial { background: rgba(245,158,11,.13); }
.day.st-failed { background: rgba(239,68,68,.1); }

.day-num { font-size: 12px; line-height: 1; }

.dots { display: flex; gap: 2px; }
.dot {
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  background: var(--muted);
}
.dot.done { background: var(--green); }

.legend {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 2px;
}
.leg {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--muted);
}
.leg-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
}
.leg-dot.c { background: var(--green); }
.leg-dot.p { background: var(--yellow); }
.leg-dot.f { background: var(--red); }

/* Detail panel */
.detail-panel {
  flex: 1;
  padding: 22px 26px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.detail-header h2 { font-size: 17px; font-weight: 600; }

.badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(99,102,241,.2);
  color: var(--accent);
}
.future-badge { background: rgba(148,163,184,.15); color: var(--muted); }

.section { display: flex; flex-direction: column; gap: 10px; }

.sec-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

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
}
.btn-add-sm:hover { background: var(--accent-hover); }

.timer-grid-inline {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

/* Timer list */
.timer-list { display: flex; flex-direction: column; gap: 7px; }

.t-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.t-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.t-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.t-name { font-size: 12px; font-weight: 500; }
.t-time { font-size: 11px; color: var(--muted); }
.t-status { font-size: 13px; font-weight: 600; }
.t-status.ok { color: var(--green); }
.t-status.no { color: var(--muted); }

.no-tasks { font-size: 12px; color: var(--muted); }

.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  flex-shrink: 0;
}
.view-toggle-btn {
  padding: 3px 8px;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 600;
  transition: all 0.15s;
}
.view-toggle-btn:hover { color: var(--text); }
.view-toggle-btn.active { background: var(--accent); color: white; }

.month-task-groups { display: flex; flex-direction: column; gap: 12px; }
.month-task-group { display: flex; flex-direction: column; gap: 5px; }
.month-group-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.month-group-label.is-today { color: var(--accent); }

.quick-add-input {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 7px 10px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  color-scheme: dark;
}
.quick-add-input::placeholder { color: var(--muted); }
.quick-add-input:focus { border-color: var(--accent); }

/* Task list */
.task-list { display: flex; flex-direction: column; gap: 5px; }

.task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.check {
  width: 17px;
  height: 17px;
  border-radius: 4px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.check.done { background: var(--green); border-color: var(--green); }

.task-body { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }

.task-text { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-text.done { text-decoration: line-through; color: var(--muted); }

.reminder {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--muted);
}

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
.task:hover .del-btn { opacity: 1; }
.del-btn:hover { background: rgba(239,68,68,.15); color: var(--red); }

.repeat-icon { color: var(--muted); flex-shrink: 0; }

/* Weekly stats */
.weekly-stats {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.weekly-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.weekly-row { display: flex; flex-wrap: wrap; gap: 10px; }
.weekly-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
}

/* Journal preview */
.journal-preview {
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  white-space: pre-wrap;
}

/* Habit list */
.habit-list { display: flex; flex-direction: column; gap: 4px; }

.habit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.habit-check {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.habit-check.done { background: var(--accent); border-color: var(--accent); }

.habit-name { font-size: 12px; flex: 1; min-width: 0; }
.habit-name.done { text-decoration: line-through; color: var(--muted); }
.habit-name.muted { color: var(--muted); }

.habit-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
}

.habit-status { font-size: 12px; font-weight: 600; width: 16px; text-align: center; flex-shrink: 0; }
.habit-status.ok { color: var(--green); }
.habit-status.no { color: var(--muted); }

.habit-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.habit-row:hover .habit-actions { opacity: 1; }

.icon-btn-sm {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.icon-btn-sm:hover { background: var(--surface-2); color: var(--text); }
.icon-btn-sm.danger:hover { background: rgba(239,68,68,.15); color: var(--red); }

.no-sel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 13px;
}
</style>
