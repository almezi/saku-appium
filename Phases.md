# Phases.md — Test Execution Roadmap

This file breaks test execution into logical phases, matching the Appium MCP workflow.

## Phase 1: Core Flows

- **Tambah Transaksi**: Add income/expense with all fields (amount, category, account, date, note)
- **Transaksi List**: Verify transaction appears in list with correct formatting
- **Ringkasan**: Validate summary cards update correctly
- **Edit/Delete**: Modify and remove transactions with undo verification

## Phase 2: Advanced Features

- **Category Budgeting**: Set monthly limits and verify status indicators
- **Category Management**: Add/rename/hide/delete custom categories
- **Data Backup**: Export/import JSON/CSV with duplicate detection

## Phase 3: Edge Cases

- **Validation**: Empty fields, invalid amounts, future dates
- **Persistence**: Verify data survives app restarts and reinstalls
- **Accessibility**: Test with TalkBack and screen reader focus
- **Performance**: Measure response times for large transaction lists

Each phase corresponds to a user flow group in `test-cases-simple-money-tracker.md`. The agent executes tests in this order, verifying each phase before proceeding.