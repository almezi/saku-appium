# Simple Money Tracker — Vibe Automation Testing

This directory contains the test artifacts for vibe (automated) testing of the Simple Money Tracker mobile app using Appium MCP.

## Overview

All tests are designed to run in an OpenCode harness with the **appium-mcp** server connected. The harness provides:
- Native mobile automation via Appium (Android UiAutomator2)
- Integrated browsing for UI inspection
- Session management (create/attach/close)
- Structured test execution with verification

## Test execution plan

### Prerequisites

1. Appium MCP server is running (installed via `opencode mcp add appium-mcp`)
2. Android Emulator/Device:
   - Pixel 10 (API level 34+)
   - Android SDK configured (ANDROID_HOME)
   - USB debugging or emulator running
3. Simple Money Tracker app installed (com.google.android.apps.email? package: `id.almezi.simplemoneytracker_kt`)
4. OpenCode with exa + appium-mcp + playwright (or appropriate tools) configured

### Test runner workflow

1. **Session Setup**
   ```bash
   # Create Android session via Appium MCP
   opencode mcp run --session <session-id> -- npx -y appium-mcp@latest
   ```
   - Platform: Android
   - Device: Pixel 10
   - Capabilities: UiAutomator2, default app launch

2. **Test Execution**
   - Execute test cases using `appium_generate_tests` MCP tool
   - Each test case runs a user flow (tap, type, assert, screenshot)
   - Tests run in the same session, state preserved

3. **Verification**
   - Visual checkpoints via screenshot comparison
   - Data validation via page source inspection
   - UI state verification via element existence

4. **Cleanup**
   - End session after all tests (`appium_session_management` action=delete)

### Test execution examples (plan)

#### Example 1: Add income
```python
steps = [
  "Navigate to Tambah screen",
  "Select income type (Pemasukan)",
  "Enter amount 100000",
  "Select category Bonus & THR",
  "Enter note (optional)",
  "Tap Save",
  "Verify transaction appears in list",
  "Verify income summary updated"
]
```

#### Example 2: Edit transaction
```python
steps = [
  "Navigate to Transaksi screen",
  "Find income transaction from today",
  "Tap Edit (pencil icon)",
  "Update amount to 150000",
  "Change category to Freelance",
  "Tap 'Ubah' button",
  "Verify update in list",
  "Verify summary updated"
]
```

#### Example 3: Full month cycle
```python
steps = [
  "Open Ringkasan screen",
  "Check current month balance",
  "Tap Anggaran button",
  "Verify budget UI",
  "Return to Ringkasan",
  "Add new income via Tambah",
  "Navigate to Transaksi",
  "Verify month summary includes new transaction",
  "Navigate back to Ringkasan",
  "Verify balance updated"
]
```

### Running tests in OpenCode

1. Open OpenCode workspace
2. Use the **Test** command palette (if available) or run:
   ```bash
   opencode run "Run Simple Money Tracker tests"
   ```
3. Provide session ID or create new
4. Monitor progress in real-time

### Test reporting

- Each test case generates a report with:
  - Test case ID (TC-XXX-XX)
  - Status: PASS/FAIL/SKIPPED
  - Screenshots (before/after key actions)
  - Error details (if any)
  - Duration

- Consolidated report at test completion

## Test data specification

### Data types required

#### 1. Transaction data
| Field | Type | Example values | Notes |
|---|---|---|---|
| amount | integer | 10000, 500000 | in cents/smallest unit |
| type | string | "Pemasukan", "Pengeluaran" | UI toggle label |
| category | string | "Bonus & THR", "Freelance", "Makanan & Minuman" | depends on type |
| account | string | "Tunai", "Bank" | default is "Tunai" |
| date | date | 2026-10-23 | formatted dd-MM-yyyy |
| note | string | "Makan siang", "Gajian bulan ini" | optional |

#### 2. Category data
| Field | Type | Example values |
|---|---|---|
| name | string | "Bonus & THR", "Freelance", "Makanan & Minuman" |
| type | string | "Pemasukan", "Pengeluaran" |
| hidden | boolean | false (or true if user hides) |

#### 3. Budget data
| Field | Type | Example values |
|---|---|---|
| category | string | "Makanan & Minuman" |
| limit | integer | 5000000 (Rp 5.000.000) |
| spent | integer | 25000 |
| status | string | "Aman", "Hampir habis", "Melebihi anggaran" |

### Data setup

#### Default test data
All tests use existing default app data (7 income categories, 10+ expense categories).

#### Data isolation
- Each test case should be independent (no side effects)
- Use unique amounts/notes to avoid conflicts
- Example: random amounts for each test run

#### Test data generation
```python
import random

test_data = {
    "amounts": [random.randint(10000, 1000000) for _ in range(10)],
    "notes": [f"Test note {i}" for i in range(10)],
    "dates": ["2026-10-23", "2026-10-22", "2026-10-21"]
}
```

## Test results template

### Successful test case report
```markdown
## Test Case: TC-INC-01
**Status**: ✅ PASS  
**Duration**: 2.3s  
**Screens**: Tambah, Transaksi, Ringkasan  

**Steps**:
1. Navigate to Tambah screen → ✅  
2. Select income type (Pemasukan) → ✅  
3. Enter amount 100000 → ✅  
4. Select category Bonus & THR → ✅  
5. Enter note "Gajian bulan ini" → ✅  
6. Tap Save → ✅  
7. Verify transaction appears in list → ✅  
8. Verify income summary updated → ✅  

**Evidence**:
- Screenshot: `screenshot_20261023_001.png`  
- Page source snippet: [transaction element at index 3]

**Notes**: All assertions passed. No errors observed.
```

### Failed test case report
```markdown
## Test Case: TC-VAL-07
**Status**: ❌ FAIL  
**Duration**: 1.8s  
**Screens**: Tambah  
**Error**: Save button remained disabled after entering amount only

**Steps**:
1. Navigate to Tambah screen → ✅  
2. Enter amount 50000 → ✅  
3. Verify save button is enabled → ❌  

**Expected**: Save button should be enabled when amount > 0, category selected
**Actual**: Save button remained disabled

**Evidence**:
- Screenshot before: `screenshot_before_fail.png`  
- Screenshot after: `screenshot_after_fail.png`  
- Error log: `appium_find_element` returned null for category picker

**Root cause**: Category picker not responding to taps (UI blocked)
**Fix suggested**: Wait for UI thread, retry taps with coordinates
```

## Test structure examples

### Test case format
```markdown
### TC-[AREA]-[NUM]: [Brief description]

**Status**: [PENDING/EXECUTING/PASS/FAIL/SKIPPED]  
**Duration**: Xs  
**Screens**: [Screen names]

**Steps**:
1. [Action 1] → [Result/Status]
2. [Action 2] → [Result/Status]
...

**Evidence**:
- Screenshots: [list]
- Page source: [reference]

**Notes**: [Any observations or issues]
```

### Grouping test cases

**By area**:
- `TC-NAV-*` – Navigation and smoke tests
- `TC-INC-*` – Income-related tests
- `TC-EXP-*` – Expense-related tests
- `TC-VAL-*` – Validation and negative tests
- `TC-EDIT-*` – Edit transaction tests
- `TC-DEL-*` – Delete transaction tests
- `TC-LIST-*` – List and pagination tests
- `TC-SUM-*` – Summary and calculation tests
- `TC-CONS-*` – Cross-screen consistency
- `TC-KAT-*` – Category management tests
- `TC-BUDGET-*` – Budget/anggaran tests
- `TC-PERS-*` – Persistence tests
- `TC-ROT-*` – Rotation and configuration tests
- `TC-A11Y-*` – Accessibility tests
- `TC-PERF-*` – Performance tests

## Test execution scripts (plan)

### Shell script template (for local execution)
```bash
#!/bin/bash

# Configuration
SESSION_ID="smtt-${RANDOM}"
APP_PACKAGE="id.almezi.simplemoneytracker_kt"
TIMEOUT=120

# Start session
echo "Creating Appium session..."
opencode mcp run --session "$SESSION_ID" -- npx -y appium-mcp@latest --timeout $TIMEOUT &

# Wait for session to be ready
sleep 10

# Run tests
python3 run_tests.py "$SESSION_ID"

# Cleanup
echo "Ending session..."
opencode mcp run --session "$SESSION_ID" -- "appium_session_management" "action=delete"

# Wait for cleanup
sleep 5
echo "Tests completed."
```

### Python test runner (plan)
```python
import asyncio
import subprocess
import json
import time

async def run_test_suite():
    # Load test cases
    with open('test-cases-simple-money-tracker.md', 'r') as f:
        test_content = f.read()
    
    # Parse test cases (implementation depends on format)
    test_cases = parse_test_cases(test_content)
    
    results = []
    for test_case in test_cases:
        result = await execute_test_case(test_case)
        results.append(result)
        await asyncio.sleep(0.5)  # small delay between tests
    
    # Generate report
    generate_report(results)

if __name__ == "__main__":
    asyncio.run(run_test_suite())
```

## Best practices

### 1. Test independence
- Each test case should be runnable independently
- Clean up after each test (delete added transactions)
- Use unique test data to avoid conflicts

### 2. Error handling
- Retry flaky interactions (element not found, UI not responding)
- Capture screenshots on failure
- Log detailed error messages with context

### 3. Test stability
- Add small delays for UI rendering
- Use explicit waits when possible
- Handle orientation changes gracefully

### 4. Reporting
- Consistent report format across all tests
- Include visual evidence for failures
- Provide clear pass/fail criteria

### 5. Maintenance
- Update locators when UI changes
- Regular review of test coverage
- Keep test data realistic and relevant

## Quick start

1. Ensure Appium MCP is installed:
   ```bash
   opencode mcp list
   ```

2. Start the session:
   ```bash
   opencode mcp run --session smtt-001 -- npx -y appium-mcp@latest
   ```

3. Run a sample test:
   ```bash
   python3 -c "
   import asyncio
   from appium_mcp import appium_generate_tests
   
   async def main():
       result = await appium_generate_tests(['Navigate to Tambah screen', 'Enter amount 50000'])
       print(result)
   
   asyncio.run(main())
   "
   ```

4. Check results in the OpenCode output

---

*All files are versioned and should be committed to your test automation repository.*
