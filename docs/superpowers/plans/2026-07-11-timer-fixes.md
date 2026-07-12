# Timer Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix timer countdown drift, let the user manually correct today's elapsed time on a timer, stop config edits from wiping progress, and keep timers running in a Windows tray icon instead of quitting on window close.

**Architecture:** `TimerCard.vue`'s countdown switches from "subtract 1 per tick" to "subtract real elapsed seconds since the last tick" (a local `lastTickAt` timestamp), which self-corrects regardless of how much Electron throttles the interval. The two pure clamp/elapsed calculations are extracted into a tiny `src/timerMath.mjs` so they have a plain-`node`-runnable self-check (project has no test framework — see spec). `main.js` gets a system tray: closing the window hides it instead of quitting, so the renderer (and its running timers) stay alive; `backgroundThrottling: false` keeps the interval firing near-real-time while hidden.

**Tech Stack:** Vue 3 (`<script setup>`), Electron (main process: `Tray`, `Menu`, `nativeImage`), no new dependencies.

---

### Task 1: Timer math util with self-check

**Files:**
- Create: `src/timerMath.mjs`

- [ ] **Step 1: Write the util file with an inline self-check**

```js
import { fileURLToPath } from 'node:url';

export function elapsedSince(lastTickAt, now = Date.now()) {
  return lastTickAt ? Math.max(0, Math.round((now - lastTickAt) / 1000)) : 1;
}

export function tickRemaining(remainingSeconds, elapsedSeconds) {
  return Math.max(0, remainingSeconds - elapsedSeconds);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  console.assert(elapsedSince(null) === 1, 'FAIL: first tick with no prior timestamp should assume 1s');
  console.assert(elapsedSince(Date.now() - 5000) === 5, 'FAIL: should measure real elapsed seconds since last tick');
  console.assert(tickRemaining(10, 3) === 7, 'FAIL: should subtract elapsed from remaining');
  console.assert(tickRemaining(2, 30) === 0, 'FAIL: should clamp at zero, never go negative');
  console.log('timerMath self-check passed');
}
```

- [ ] **Step 2: Run the self-check**

Run: `node src/timerMath.mjs`
Expected output: `timerMath self-check passed` (no `FAIL:` lines — `console.assert` only prints on failure, so no output at all besides the final line means every assertion held).

- [ ] **Step 3: Commit**

```bash
git add src/timerMath.mjs
git commit -m "feat: add timestamp-based timer math with self-check"
```

---

### Task 2: Stop config edits from wiping today's progress

**Files:**
- Modify: `src/App.vue:98-108`

- [ ] **Step 1: Replace the unconditional reset in `editTimer`**

Find:
```js
function editTimer(id, timerData) {
  const t = data.timers.find((t) => t.id === id);
  if (t) {
    t.name = timerData.name;
    t.color = timerData.color;
    t.totalSeconds = timerData.totalSeconds;
    t.remainingSeconds = timerData.totalSeconds;
    t.skipWeekends = timerData.skipWeekends ?? false;
  }
  saveData();
}
```

Replace with:
```js
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
```

- [ ] **Step 2: Manual check**

Run: `npm start`
In the app: add a timer, let it accumulate some progress (start it, wait a few seconds, pause), then edit it and only change the name. Confirm the ring/remaining time is unchanged after saving. Then edit again and change the duration — confirm progress resets this time (expected, since the duration itself changed).

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "fix: only reset timer progress on edit when duration actually changes"
```

---

### Task 3: Fix drift + add manual "time spent today" adjustment

**Files:**
- Modify: `src/components/TimerCard.vue` (full rewrite of `<script setup>` and template additions below)

- [ ] **Step 1: Replace the `<script setup>` block**

Find the entire existing `<script setup>...</script>` block (lines 1-76) and replace with:

```vue
<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { tickRemaining, elapsedSince } from '../timerMath.mjs';

const props = defineProps({ timer: Object });
const emit = defineEmits(['update', 'delete', 'reset', 'edit', 'save']);

const isRunning = ref(false);
let intervalId = null;
let lastTickAt = null;

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const progress = computed(() =>
  props.timer.totalSeconds === 0
    ? 1
    : 1 - props.timer.remainingSeconds / props.timer.totalSeconds
);

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value));

const isCompleted = computed(() => props.timer.remainingSeconds === 0);

const timeDisplay = computed(() => {
  const s = props.timer.remainingSeconds;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
});

function tick() {
  const elapsed = elapsedSince(lastTickAt);
  lastTickAt = Date.now();
  const remaining = tickRemaining(props.timer.remainingSeconds, elapsed);
  emit('update', { remainingSeconds: remaining });
  if (remaining <= 0) stop(true);
}

function stop(completed = false) {
  isRunning.value = false;
  clearInterval(intervalId);
  intervalId = null;
  lastTickAt = null;
  emit('save');
  if (completed) {
    try {
      if (Notification.permission === 'granted') {
        new Notification(`${props.timer.name} complete!`, { body: 'Your timer has finished.' });
      }
    } catch (_) {}
  }
}

function toggle() {
  if (isCompleted.value) return;
  if (isRunning.value) {
    stop();
  } else {
    isRunning.value = true;
    lastTickAt = Date.now();
    intervalId = setInterval(tick, 1000);
  }
}

function handleReset() {
  if (isRunning.value) stop();
  emit('reset');
}

// Manual "time spent today" adjustment
const showAdjust = ref(false);
const adjustH = ref(0);
const adjustM = ref(0);

function openAdjust() {
  const spent = props.timer.totalSeconds - props.timer.remainingSeconds;
  adjustH.value = Math.floor(spent / 3600);
  adjustM.value = Math.floor((spent % 3600) / 60);
  showAdjust.value = true;
}

function saveAdjust() {
  const spentSeconds = Math.max(0, Number(adjustH.value) || 0) * 3600 + Math.max(0, Number(adjustM.value) || 0) * 60;
  const newRemaining = Math.min(props.timer.totalSeconds, Math.max(0, props.timer.totalSeconds - spentSeconds));
  emit('update', { remainingSeconds: newRemaining });
  emit('save');
  showAdjust.value = false;
}

if (Notification.permission === 'default') Notification.requestPermission();

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>
```

- [ ] **Step 2: Add the "adjust time" button next to Edit/Delete**

Find:
```html
        <button class="icon-btn" title="Edit" @click="$emit('edit')">
```

Insert immediately before it:
```html
        <button class="icon-btn" title="Adjust time spent" @click="openAdjust">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
```

- [ ] **Step 3: Add the inline adjust panel**

Find:
```html
    <div class="card-bottom">
```

Insert immediately before it:
```html
    <div v-if="showAdjust" class="adjust-panel">
      <span class="adjust-label">Time spent today</span>
      <div class="adjust-row">
        <input type="number" v-model.number="adjustH" min="0" max="23" />
        <span>h</span>
        <input type="number" v-model.number="adjustM" min="0" max="59" />
        <span>m</span>
      </div>
      <div class="adjust-actions">
        <button class="btn-ghost" @click="showAdjust = false">Cancel</button>
        <button class="btn-main" @click="saveAdjust">Save</button>
      </div>
    </div>
```

- [ ] **Step 4: Add styles for the adjust panel**

Find (end of `<style scoped>` block):
```css
.btn-ghost:hover { color: var(--text); }
```

Insert after it:
```css

.adjust-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}
.adjust-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.adjust-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.adjust-row input {
  width: 48px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 5px 6px;
  font-size: 12px;
  text-align: center;
  outline: none;
}
.adjust-row span { font-size: 11px; color: var(--muted); }
.adjust-actions { display: flex; gap: 6px; justify-content: flex-end; }
```

- [ ] **Step 5: Manual check**

Run: `npm start`
- Start a timer, minimize the app window (before Task 4 lands this just backgrounds/unfocuses it — full tray behavior comes next task), wait 60+ seconds, bring it back — remaining time should reflect ~60 real seconds elapsed, not be off.
- Click the new clock icon, set "1h 0m", save — remaining time should show `totalSeconds - 1h`.

- [ ] **Step 6: Commit**

```bash
git add src/components/TimerCard.vue
git commit -m "fix: compute timer countdown from real elapsed time; add manual time adjustment"
```

---

### Task 4: Minimize to tray, keep running

**Files:**
- Create: `src/trayIcon.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create the tray icon module**

The icon is embedded as a base64 data URL so it works identically in dev and packaged builds with no asset-path/copy configuration needed.

```js
export const TRAY_ICON_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALJSURBVFiFxZbLb81REMc/F9EGVdySknqTbgQh9YyWWCCxKNpI2bMgImxJroUd/wAJicTKIy5NrOqxEKLYVIlKrYpU2gpNqh71szjzu7+5t7/HOb/exCQnv2/OnPnO3Dtz5kwGd/ES9BkXskkpAiirTElhc0O+dcBmwU+BvrJE5CCtmHR4glPJf0/B5BhdFvgRsr8a2Ae0APWyVwlUA7+AfgeuSMkBn5SDKuA00Evwt0etXjlbJbb1wpWzdd6myD4Cx+Sb5Lh0hdm22QQwFchHkA4DlzApWIq5RRWCm4ErwPcI27xwW0kF5lr5xr+BC8AsC9usnP2j7PuE01rOKuNBoCnm7F5gFeNvVBMwpHjO2DrfCIyJ0TdgTcJ538Fn4BxB8QGsFQ5POBuSnGeA54q02SLg0lx/KAn6gNI9SyLboQ7ftnAeFoAHDBBcYYB7StcYR3ZdHVw/gQA8oJOgLhrU/rUoogymi3nAa0vncQF4wH51rpugVgpPtq7cZcA8wR0OAcTJYYUfybcWWBIWwCKFe8oUwAaF3yq80Ad6Hpit8JDCLThOOUpqFP6qcKGh6QBGFK5U+DJ2HTBMNKfmKLyMOgX6GV2ucHdK56W2dQp/CQvgDabnA2xS+3cnEEBeYf/+/xRfofKQ4PGZK3tzMO+B63M8QFBXtQTtPfaGHVUE59X+IUfnf4GDyv6i0h2JC2AGQTMaBlYo3Sn1K+LWGHBS2a0ERkXXLz5i5YQi6wSmK91OoCvGeRfmPfFlJkEH9IDjSc7BFKZfCx7wADNwan0jZsa7iuntOWAbxf2iBniseDpwmMIXUDyA9gBbbY2B7SX274H5DvYALBZDXVh3gD2Ej1fTMPNDO8VpeUdxm3eSauAW43M9iqmPduA+JvcjIeduUpy+1LIbeBniIGq9AHbZELs+MuswI9YWzMSTlf1BzF/9BDNJvbIl/AdEjR3dX7Y6UQAAAABJRU5ErkJggg==';
```

- [ ] **Step 2: Wire up the tray, close-to-hide, and background throttling in `main.js`**

Find:
```js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

if (started) app.quit();

let dataPath;

const createWindow = () => {
  dataPath = path.join(app.getPath('userData'), 'productivity-data.json');

  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 820,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f172a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

ipcMain.handle('data:load', () => {
  if (!fs.existsSync(dataPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  } catch {
    return null;
  }
});

ipcMain.handle('data:save', (_, data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data:', err);
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

Replace with:
```js
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { TRAY_ICON_DATA_URL } from './trayIcon.js';

if (started) app.quit();

let dataPath;
let mainWindow;
let tray;
let isQuitting = false;

const createWindow = () => {
  dataPath = path.join(app.getPath('userData'), 'productivity-data.json');

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 820,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
    backgroundColor: '#0f172a',
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

const createTray = () => {
  const icon = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL);
  tray = new Tray(icon);
  tray.setToolTip('Productivity Timer');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
};

ipcMain.handle('data:load', () => {
  if (!fs.existsSync(dataPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  } catch {
    return null;
  }
});

ipcMain.handle('data:save', (_, data) => {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data:', err);
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else { mainWindow.show(); mainWindow.focus(); }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) app.quit();
});
```

- [ ] **Step 3: Manual check**

Run: `npm start`
- Start a timer, click the window's X button — window should disappear but the app should still show an icon in the Windows system tray (notification area), not exit.
- Wait a couple minutes, click the tray icon (or "Show" from its right-click menu) — window reappears, timer's remaining time reflects real elapsed time (confirms Task 3's fix + `backgroundThrottling: false` together).
- Right-click tray icon, click "Quit" — app fully exits (process ends, tray icon disappears).

- [ ] **Step 4: Commit**

```bash
git add src/trayIcon.js src/main.js
git commit -m "feat: minimize to system tray on close instead of quitting"
```

---

### Task 5: Full end-to-end verification pass

**Files:** none (manual verification only)

- [ ] **Step 1: Run through the complete flow**

Run: `npm start`

1. Add a new timer (e.g. "Deep Work", 30 min).
2. Start it, let it run ~10 seconds, confirm the ring/time updates roughly once per second.
3. Pause it. Confirm remaining time is sane (~20 seconds elapsed).
4. Rename the timer via the pencil icon only (don't change duration) — confirm remaining time is unchanged after save.
5. Use the new clock-icon control to set "time spent today" to 5 minutes — confirm remaining time updates to `30m - 5m = 25m`.
6. Start the timer again, close the window via the X button — confirm it minimizes to tray instead of quitting.
7. Wait at least 2 minutes with the window closed/hidden, reopen from the tray icon — confirm the remaining time dropped by ~2 real minutes, not by some drifted/incorrect amount.
8. Let the timer run down to completion (or manually adjust it to a few seconds left first) — confirm the "complete" notification and UI state fire correctly.
9. Quit via the tray's "Quit" option — confirm the process actually exits.

- [ ] **Step 2: Confirm no regressions in habits/tasks/calendar**

Since no files owned by those features were touched, a quick smoke check is enough: add a task, toggle a habit, navigate between calendar days — confirm all still behave as before.
