# Kanban tab

## Problem

The app currently has one view (the calendar/timers screen rendered directly by `App.vue` — there is no sidebar or tab navigation of any kind yet). The user wants a second view: a Kanban board scoped to "projects," so work items separate from daily timers/habits can be tracked through To-do / In Progress / Paused / Done, filterable by project.

Since no navigation shell exists, this round also builds the nav rail itself (with room reserved for a future third tab — a speedrun-style timer, designed separately).

## Design

### Navigation shell

`App.vue` gains an `activeView` ref (`'timers' | 'kanban'`). A new `Sidebar.vue` renders a slim left rail with icon+label buttons for each view; clicking one updates `activeView`. The main content area conditionally renders the existing `CalendarView` or the new `KanbanView` based on `activeView`. No router library — two (soon three) views swapped by a ref is simplest and matches the app's existing complexity level.

### Data model

Two new top-level arrays, persisted in the same JSON file via the existing `window.api.saveData`/`loadData` IPC (no `main.js` changes needed):

```
projects: [{ id, name, color }]
cards: [{ id, projectId, title, status }]
```

`status` is one of `'todo' | 'inprogress' | 'paused' | 'done'`. Card order within a column is array order — dragging splices a card to a new index, no separate `order` field needed.

### Components

- **`Sidebar.vue`** — nav rail. Props: `activeView`. Emits: `change-view`.
- **`KanbanView.vue`** — the board. Contains:
  - Project filter `<select>` (default "All").
  - "Add project" entry point opening `ProjectModal`.
  - Four columns (To-do / In Progress / Paused / Done), each showing cards matching the current filter and that column's status, plus an inline "add card" text input at the bottom of the column (same shape as the existing task-add row in `CalendarView.vue`). If the filter is "All", the add-card row also shows a small project `<select>` (a card must belong to a project); if a specific project is selected, new cards default to it automatically and no picker is shown.
- **`ProjectModal.vue`** — name + color swatch picker, structurally mirrors `AddTimerModal.vue` (reuse the same `COLORS` palette and swatch UI pattern).
- **`KanbanCard.vue`** — one card. Shows title (click to rename inline via a toggled `<input>`), a small project-color dot (only rendered when the filter is "All", since a single-project view makes the dot redundant), and a delete button. Draggable (`draggable="true"`, `dragstart`/`dragend` handlers).

### Drag and drop

Native HTML5 drag-and-drop API — `draggable` attribute plus `dragstart`, `dragover`, `drop` event handlers. No new dependency.

- `dragstart` on a card stores the dragged card's id (component-local state in `KanbanView.vue`, not `dataTransfer`, to keep it simple within a single Vue tree).
- `dragover` on a card computes whether the cursor is above or below that card's vertical midpoint, to determine the insert index — this allows dropping a card above/below any specific card, not just at the end of a column.
- `dragover` on an empty column area (below the last card) inserts at the end.
- `drop` updates the dragged card's `status` to the target column and splices it to the computed index in the `cards` array, then saves.

### Project deletion

Deleting a project also needs a decision for its cards. Simplest, least surprising: deleting a project deletes its cards too, with a confirmation step (native `confirm()` dialog, matching the app's currently-dependency-free style — no custom confirm modal component exists yet and adding one is out of scope for this round).

## Files touched

- `src/App.vue` — `activeView` ref, sidebar render, project/card CRUD handlers (`addProject`, `editProject`, `deleteProject`, `addCard`, `editCard` (rename), `deleteCard`, `moveCard`), extend save/load payload with `projects`/`cards`.
- New: `src/components/Sidebar.vue`, `src/components/KanbanView.vue`, `src/components/ProjectModal.vue`, `src/components/KanbanCard.vue`.

## Out of scope (this round)

- Speedrun timer tab (separate design round).
- Card fields beyond title (no description, due date, attachments).
- Multi-select / bulk card actions.
- Cross-column WIP limits or automation.

## Testing

- Manual: add a project, add cards to each column, drag a card between columns and within a column (reorder), confirm persistence across app restart.
- Manual: filter by project, confirm only matching cards show and the "add card" project picker disappears when a specific project is selected.
- Manual: delete a project with cards, confirm the confirmation prompt and that cards are removed.
- Manual: rename a card inline, confirm it persists.
