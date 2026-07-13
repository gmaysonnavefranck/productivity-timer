# Speedrun timer tab

## Problem

The user wants a third view (alongside Timers and Board): a way to set a fixed time budget for an open-ended goal (e.g. "20 hours learning guitar — how far can I get?") and track progress across many sessions/days, not reset daily like the existing Timers tab. Once the budget runs out (or the user decides to stop early), they want to leave notes reflecting on how it went.

## Design

### Data model

New top-level array, same JSON file, same `window.api.saveData`/`loadData` IPC (no `main.js` changes):

```
speedruns: [{ id, name, totalSeconds, remainingSeconds, notes, color, status }]
```

`status` is `'active' | 'finished'`. No `skipWeekends` (doesn't apply — this isn't daily), no persisted `startedAt` (matches `TimerCard.vue`'s existing approach: a component-local `lastTickAt` timestamp drives the countdown while running, not a persisted field — see `src/components/TimerCard.vue` and `src/timerMath.mjs`, already fixed for drift and reused here unchanged).

### Navigation

`Sidebar.vue` gets a third entry, "Speedrun" (`activeView` gains a `'speedrun'` value alongside `'timers'`/`'kanban'`).

### Components

- **`SpeedrunView.vue`** — "+ New Speedrun" button opening `AddSpeedrunModal`. Two sections:
  - **Active** — card grid (same layout pattern as the Timers tab's `.timer-grid`), one `SpeedrunCard` per active speedrun.
  - **Finished** — a compact list below, showing name, final time spent, and a preview of notes (click to open full notes).
- **`SpeedrunCard.vue`** — same ring/countdown visual and Start/Pause/Reset as `TimerCard.vue`, reusing `elapsedSince`/`tickRemaining` from `timerMath.mjs` for the same drift-corrected countdown. Adds:
  - A "Finish now" button — ends the speedrun early, freezing `remainingSeconds` at its current computed value and setting `status = 'finished'`.
  - Auto-finish when computed remaining reaches 0 (same completion-notification pattern as `TimerCard.vue`'s `stop(true)`), also setting `status = 'finished'`.
  - Click (not on a button) opens the notes modal.
- **`AddSpeedrunModal.vue`** — name, target hours + minutes, color swatch picker. Structurally mirrors `AddTimerModal.vue` minus the skip-weekends toggle. The hours input has no upper cap (unlike the daily timer's implicit `max="23"`, since budgets like 20h+ are the whole point).
- **Notes** — reuses `CardDetailModal.vue` unchanged: it already takes a `{title, description}`-shaped object and emits `{title, description}` on save. The speedrun's `name`/`notes` map onto that shape in the parent handler, avoiding a near-duplicate modal component.

### CRUD handlers (`App.vue`)

- `addSpeedrun({name, totalSeconds, color})` — pushes `{id, name, totalSeconds, remainingSeconds: totalSeconds, notes: '', color, status: 'active'}`.
- `updateSpeedrun(id, changes)` — generic `Object.assign`, used by the live countdown tick (mirrors `updateTimer`).
- `editSpeedrunNotes(id, {title, description})` — maps to `name`/`notes` fields.
- `resetSpeedrun(id)` — `remainingSeconds = totalSeconds` (only meaningful while active).
- `deleteSpeedrun(id)`.
- Finishing (auto or manual) goes through `updateSpeedrun` setting `status` and freezing `remainingSeconds` — no separate "finish" handler needed.

## Files touched

- `src/App.vue` — `speedruns` in data model + save/load, CRUD handlers, `activeView` gains `'speedrun'`, template wiring.
- `src/components/Sidebar.vue` — add "Speedrun" nav entry.
- New: `src/components/SpeedrunView.vue`, `src/components/SpeedrunCard.vue`, `src/components/AddSpeedrunModal.vue`.
- Reused unchanged: `src/components/CardDetailModal.vue`, `src/timerMath.mjs`.

## Out of scope (this round)

- Restarting or cloning a finished speedrun (create a new one instead).
- Per-session history/analytics (only current total remaining is tracked, not a log of individual work sessions or a chart of progress over time).
- Skip-weekends or any daily-reset behavior (explicitly not daily by design).

## Testing

- Manual: create a speedrun with a large budget (e.g. 20h), start it, let it run, pause, confirm remaining time is accurate (reusing the already-fixed drift logic).
- Manual: click "Finish now" on an active speedrun, confirm it freezes and moves to the Finished section.
- Manual: let a speedrun's countdown reach 0 naturally, confirm auto-finish + notification.
- Manual: add/edit notes on both an active and a finished speedrun, confirm persistence across restart.
- Manual: delete a speedrun, confirm removal.
