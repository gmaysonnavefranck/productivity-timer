# Timer fixes: drift, manual adjustment, tray persistence

## Problem

1. **Drift bug**: `TimerCard.vue` decrements `remainingSeconds` by exactly 1 per `setInterval` firing. Electron throttles interval timers on unfocused/hidden windows, so tick count no longer matches real elapsed seconds — the countdown becomes inaccurate after being unattended.
2. **No way to fix a missed start**: if the user forgets to press Start, there's no way to retroactively record time spent on a timer for today.
3. **Editing a timer's config wipes progress**: `editTimer` in `App.vue` always resets `remainingSeconds = totalSeconds`, even for a pure rename/recolor with no duration change.
4. **App must stay in the foreground to track time**: closing the window quits the app (`window-all-closed` on non-macOS), so a timer can't keep running "in the background" the way the user wants (visible from the Windows taskbar/tray, surviving window close).

## Design

### 1. Timestamp-based countdown (fixes drift)

Data model: each timer gains `startedAt: number | null` (ms epoch), persisted alongside existing fields.

- **Start**: set `startedAt = Date.now()`, save immediately.
- **While running**: displayed/effective remaining = `remainingSeconds - floor((Date.now() - startedAt) / 1000)`, recomputed every interval firing (still ~1/sec) and on mount. Correct regardless of how many ticks actually fired, since it's derived from wall-clock time, not tick count.
- **Pause**: fold elapsed into `remainingSeconds` (`remainingSeconds -= elapsed`, clamped to 0), clear `startedAt`, save.
- **Completion**: when computed remaining reaches 0, stop and fire the existing notification. Checked on every interval tick and on mount (covers the case where the app was hidden/throttled past completion).
- `BrowserWindow` gets `backgroundThrottling: false` in `webPreferences` (main.js) so the interval still fires close to real-time while hidden, keeping completion notifications prompt.

### 2. Manual "time spent today" adjustment

New small control on `TimerCard.vue`, separate from the existing pencil (config) edit — lets the user directly set elapsed time for today (e.g. hours/minutes input: "time spent today").

- If the timer is currently running, auto-pause first (fold in real elapsed, clear `startedAt`) before applying the manual value, so the two mechanisms don't fight.
- On save: `remainingSeconds = clamp(totalSeconds - enteredElapsedSeconds, 0, totalSeconds)`, persist.

### 3. Fix progress wipe on config edit

`App.vue`'s `editTimer`: only reset `remainingSeconds = totalSeconds` when `totalSeconds` actually changes. Renaming or recoloring a timer no longer wipes today's progress.

### 4. Minimize to tray, keep running

`main.js`:
- Add a `Tray` with a small bundled icon (new asset, none exists in repo currently) and a context menu: "Show" (focus/show the window) and "Quit" (actually exits).
- Track an `isQuitting` flag, set `true` only via the tray's Quit action or `before-quit`.
- Intercept the `BrowserWindow`'s `close` event: if not `isQuitting`, `event.preventDefault()` and `mainWindow.hide()` instead of letting the window (and app) close.
- `window-all-closed` behavior effectively becomes moot for the main window on Windows since it's hidden, not destroyed — timers keep counting because the renderer process keeps running.
- No main-process timer logic needed: the renderer stays alive while hidden, and the timestamp-based calc from part 1 means whatever throttling still applies doesn't cause drift, just possible delay in a completion notification (mitigated by `backgroundThrottling: false`).

## Data model changes

```
timer: {
  id, name, totalSeconds, remainingSeconds, color, skipWeekends,
  startedAt: number | null   // new
}
```

## Files touched

- `src/components/TimerCard.vue` — timestamp-based countdown, manual adjustment control
- `src/App.vue` — persist `startedAt`, fix `editTimer` reset condition
- `src/main.js` — tray, close-to-hide, `backgroundThrottling: false`
- new small icon asset for the tray

## Out of scope (this round)

- Kanban tab (separate design round)
- Speedrun timer tab (separate design round)
- macOS/Linux tray polish (Windows taskbar is the stated target; tray API is cross-platform so it should work, but not specifically tested elsewhere)

## Testing

- Manual: start a timer, minimize window to tray via X, wait >1 min, reopen — remaining time should reflect real elapsed time, not be stuck.
- Manual: edit a timer's name only — progress (`remainingSeconds`) unchanged.
- Manual: use the new "time spent today" control while a timer is running and while paused.
- Small self-check (per ponytail): a `demo()`/assert-style check for the timestamp math (e.g. given `totalSeconds`, `remainingSeconds`, `startedAt`, and a mocked `Date.now()`, effective remaining computes correctly), since this is the core non-trivial logic being changed.
