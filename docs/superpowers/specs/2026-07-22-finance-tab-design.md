# Finance tab

## Problem

The user wants to track personal finance alongside the existing Timers/Board/Challenges views: (1) how an investment account's value evolves over time, (2) a running income/expense ledger, and (3) a small monthly spreadsheet of ~7 recurring bills that gets sent to an accountant each month.

## Design

### Navigation

Three new top-level sidebar entries (not grouped under one "Finance" tab — confirmed with the user, plenty of sidebar room): "Investment", "Balance", "Accountant". `activeView` gains `'investment'`, `'balance'`, `'accountant'`.

### Data model

New top-level arrays in the same JSON file, same `window.api.saveData`/`loadData` IPC (no `main.js` changes):

```
investment: [{ id, date, value }]
balanceEntries: [{ id, date, name, amount, category }]
accountantCategories: [{ id, name }]
accountantValues: [{ id, categoryId, month, value }]   // month = 'YYYY-MM'
```

- `investment` — snapshots of total account value, added whenever the user checks it. Sorted by `date` for display.
- `balanceEntries.amount` — signed number: positive = income, negative = expense. `category` is free text (an autocomplete `<datalist>` sourced from distinct categories already used, no managed category list — matches the app's existing free-text style, e.g. habit/timer names).
- `accountantCategories` — the recurring bill names (e.g. "Rent", "Accountant fee"), managed (add/delete) from the Report view itself.
- `accountantValues` — one row per `(categoryId, month)`. Deleting a category does not cascade-delete its historical values (they simply stop appearing since the Report view only renders rows for categories that still exist — same "un-cascaded" tolerance the app already has for deleted habits/timers).

All Finance dates use the real system date (`new Date()`), independent of the Timers view's dev "Test date" override — confirmed with the user.

### Components

- **`InvestmentView.vue`** — header with "+ Add Snapshot" button opening a small modal (value, date — defaults to today). Body: a small inline SVG line chart (hand-drawn `<polyline>`, no charting library) plotting `value` over `date`. Below it, a list of snapshots newest-first, each showing the delta (absolute + %) vs. the previous snapshot, with a delete button per entry.
- **`BalanceView.vue`** — header with "+ Add Entry" button opening a modal (name, amount, Income/Expense toggle that determines the sign, category text input with `<datalist>` autocomplete, date — defaults to today). Body: running total at top (sum of all `amount`), then a list newest-first — date, name, category tag, amount (green if positive/red if negative), delete button.
- **`AccountantReportView.vue`** — small manage-list at the top: add/delete category names (mirrors the recurring-task manage list already in `TaskModal.vue` — name input + list with delete buttons). Below it, a month picker (prev/next arrows, same pattern as `CalendarView.vue`'s `month-nav`, defaulting to the current month). Then a table: one row per category, one value input for the selected month (blank if no `accountantValues` entry yet for that `categoryId`+`month`, pre-filled otherwise), saving on blur/change. A total row at the bottom sums the visible month's values.

### CRUD handlers (`App.vue`)

- `addInvestmentSnapshot({date, value})`, `deleteInvestmentSnapshot(id)`.
- `addBalanceEntry({date, name, amount, category})`, `deleteBalanceEntry(id)`.
- `addAccountantCategory({name})`, `deleteAccountantCategory(id)`.
- `setAccountantValue(categoryId, month, value)` — finds existing `{categoryId, month}` row and updates it, or pushes a new one (same find-or-create pattern as `toggleHabit`/`toggleRecurringTask`).

## Files touched

- `src/App.vue` — 4 new arrays in data model + save/load, CRUD handlers above, `activeView` gains 3 new values, template wiring for 3 new view components.
- `src/components/Sidebar.vue` — 3 new nav entries.
- New: `src/components/InvestmentView.vue`, `src/components/AddInvestmentModal.vue`, `src/components/BalanceView.vue`, `src/components/AddBalanceModal.vue`, `src/components/AccountantReportView.vue`.

## Out of scope (this round)

- Multiple investment accounts (single account only).
- Managed (non-free-text) category list for Balance entries.
- Filtering/sorting the Balance list by category or date range.
- Monthly bucketing/grouping for the Investment chart (raw snapshot-to-snapshot deltas only).
- Export/print of the Accountant Report (the table itself, read off-screen, is the deliverable for now).
- Cascade-deleting `accountantValues` when a category is deleted.

## Testing

- Manual: add an investment snapshot, confirm it appears in the chart and list with a correct delta vs. the previous one; delete one, confirm removal.
- Manual: add a Balance income entry and an expense entry, confirm running total and color-coding are correct; confirm category autocomplete suggests previously used categories.
- Manual: add an accountant category, fill in a value for the current month, navigate to another month via prev/next, confirm the value is blank there and unaffected; navigate back, confirm the original value persisted; confirm the total row sums correctly; delete a category, confirm its row disappears.
- Manual: restart the app, confirm all Finance data persisted across reload (same `data:save`/`data:load` IPC as everything else).
