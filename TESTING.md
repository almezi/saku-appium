# Testing Guide

Consolidated test data, execution plan, examples, and results template.

> **Status note (2026-10-27):** this is the original **manual/MCP execution
> plan**. The `test-data/` files and helper scripts it describes
> (`schema-validator.py`, `duplicate-checker.py`, …) are illustrative — they
> were never committed to this repo. The **executable source of truth** is the
> WebdriverIO suite in `src/` (Android: `npm test`; iOS: `npm run test:ios` —
> see `HANDOVER.md` §3 and `README.md`); live per-sub-phase status is in
> `progress.md`, the full catalogue of designed cases is in
> `test-cases-simple-money-tracker.md`, and known issues are indexed in
> `BUGS.md` (details in the `BUG_FOUND*.md` / `BUG_Found_*.md` files).
>
> **Current scale:** 30 spec files (16 Android + 14 iOS), 254 test cases
> (137 + 117), 148 unique test-case ids, 195 cases in the catalogue, and
> 18 unit tests for the pure helpers and the test-type guardrail
> (`npm run test:unit`).
>
> The sections below are kept as the record of the original plan. Where they
> describe files that were never committed, read them as *illustrative* rather
> than actionable.

## Unit test data specification


This document defines the test data requirements for automated testing of the Simple Money Tracker mobile app.

## Overview

Test data is used to populate the app with known states for testing. This includes transactions, categories, budgets, and configuration settings.

## Data Structure

### 1. Transaction Data

**Schema**:
```json
{
  "transactions": [
    {
      "id": "string",
      "type": "income" | "expense",
      "amount": number,
      "category": string,
      "account": string,
      "date": "YYYY-MM-DD",
      "note": string,
      "timestamp": "YYYY-MM-DD HH:mm:ss",
      "day_label": string,
      "month": "YYYY-MM",
      "year": number
    }
  ]
}
```

**Field definitions**:

| Field | Type | Required | Example | Notes |
|---|---|---|---|---|
| id | string | Yes | "txn-001" | Unique identifier |
| type | string | Yes | "income" | Matches UI toggle "Pemasukan"/"Pengeluaran" |
| amount | number | Yes | 50000 | In smallest currency unit |
| category | string | Yes | "Bonus & THR" | Must exist in app's category list |
| account | string | Yes | "Tunai" | Default account in app |
| date | string | Yes | "2026-10-23" | ISO format |
| note | string | No | "Gajian bulan ini" | Optional, max 50 chars |
| timestamp | string | Yes | "2026-10-23 14:30:00" | For sorting and grouping |
| day_label | string | Yes | "Senin" | Localized day name |
| month | string | Yes | "2026-10" | YYYY-MM format |
| year | number | Yes | 2026 | Extracted from date |

### 2. Category Data

**Schema**:
```json
{
  "categories": {
    "income": [
      {
        "id": "string",
        "name": string,
        "type": "income",
        "hidden": boolean,
        "icon": string
      }
    ],
    "expense": [
      {
        "id": "string",
        "name": string,
        "type": "expense",
        "hidden": boolean,
        "icon": string
      }
    ]
  }
}
```

**Default test categories**:

**Income categories**:
| ID | Name | Icon |
|---|---|---|
| inc_bonus_thr | Bonus & THR | star |
| inc_freelance | Freelance | briefcase |
| inc_gift | Hadiah | gift |
| inc_investment | Investasi | chart |
| inc_other | Lainnya | dots |
| inc_refund | Refund | refresh |
| inc_salary | Gaji | money |

**Expense categories**:
| ID | Name | Icon |
|---|---|---|
| exp_daily_food | Makanan & Minuman | restaurant |
| exp_daily_groceries | Barang sehari-hari | shopping |
| exp_daily_household | Rumah tangga | home |
| exp_daily_other | Lain-lain | dots |
| exp_education_books | Buku & Alat tulis | book |
| exp_education_course | Kursus & Pelatihan | classroom |
| exp_education_other | Pendidikan lain | graduation-cap |
| ... | ... | ... |

### 3. Budget Data

**Schema**:
```json
{
  "budgets": [
    {
      "category": string,
      "limit": number,
      "spent": number,
      "status": "Aman" | "Hampir habis" | "Melebihi anggaran",
      "remaining": number,
      "percentage": number,
      "last_updated": "YYYY-MM-DD HH:mm:ss"
    }
  ]
}
```

**Budget status calculation**:
```
if spent > limit:
  status = "Melebihi anggaran"
elif spent >= 0.8 * limit:
  status = "Hampir habis"
else:
  status = "Aman"
```

### 4. User Preference Data

**Schema**:
```json
{
  "preferences": {
    "theme": "light" | "dark",
    "currency": "IDR" | "USD" | "EUR",
    "date_format": "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD",
    "notification_enabled": boolean,
    "backup_enabled": boolean
  }
}
```

## Test Data Generation

### 1. Random transaction generator
```python
import random
import datetime

INCOME_CATEGORIES = ["Bonus & THR", "Freelance", "Hadiah", "Investasi", "Lainnya", "Refund", "Gaji"]
EXPENSE_CATEGORIES = ["Makanan & Minuman", "Barang sehari-hari", "Rumah tangga", "Lain-lain", "Buku & Alat tulis", "Kursus & Pelatihan", "Pendidikan lain"]
ACCOUNTS = ["Tunai", "Bank BCA", "Bank Mandiri", "E-Wallet"]

def generate_test_transaction(transaction_type, date=None):
    if date is None:
        date = datetime.date.today()
    
    if transaction_type == "income":
        category = random.choice(INCOME_CATEGORIES)
    else:
        category = random.choice(EXPENSE_CATEGORIES)
    
    return {
        "id": f"test-{datetime.datetime.now().timestamp()}",
        "type": transaction_type,
        "amount": random.randint(10000, 1000000),
        "category": category,
        "account": random.choice(ACCOUNTS),
        "date": date.strftime("%Y-%m-%d"),
        "note": f"Test note {random.randint(1, 100)}" if random.random() > 0.5 else "",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "day_label": date.strftime("%A"),
        "month": date.strftime("%Y-%m"),
        "year": date.year
    }
```

### 2. Category setup generator
```python
def generate_default_categories():
    categories = {
        "income": [],
        "expense": []
    }
    
    for inc in INCOME_CATEGORIES:
        categories["income"].append({
            "id": f"inc_{inc.lower().replace(' & ', '_').replace(' ', '_')}",
            "name": inc,
            "type": "income",
            "hidden": False,
            "icon": "default_icon"
        })
    
    for exp in EXPENSE_CATEGORIES:
        categories["expense"].append({
            "id": f"exp_{exp.lower().replace(' & ', '_').replace(' ', '_')}",
            "name": exp,
            "type": "expense",
            "hidden": False,
            "icon": "default_icon"
        })
    
    return categories
```

### 3. Budget data generator
```python
def generate_budget_data(categories, type="income"):
    budgets = []
    for category in categories[type]:
        limit = random.randint(1000000, 10000000)  # Rp 1.000.000 - Rp 10.000.000
        spent = random.randint(0, limit)
        
        if spent > limit:
            status = "Melebihi anggaran"
        elif spent >= 0.8 * limit:
            status = "Hampir habis"
        else:
            status = "Aman"
        
        budgets.append({
            "category": category["name"],
            "limit": limit,
            "spent": spent,
            "status": status,
            "remaining": limit - spent,
            "percentage": (spent / limit) * 100 if limit > 0 else 0,
            "last_updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    
    return budgets
```

## Test Data Management

### 1. Test data setup
```bash
# Create test data file
cat > test_data.json << 'EOF'
{
  "transactions": [...],
  "categories": {...},
  "budgets": [...],
  "preferences": {...}
}
EOF

# Load into app (implementation depends on app)
# For testing, use app's UI to create transactions
```

### 2. Data cleanup
```python
def cleanup_test_data():
    # Delete all transactions added during test
    # Reset categories to default
    # Clear budget overrides
    # Restore default preferences
    pass
```

### 3. Data persistence
```bash
# Backup test data
cp test_data.json test_data_backup_$(date +%Y%m%d_%H%M%S).json

# Restore test data
cp test_data_backup_*.json test_data.json
```

## Test Data Validation

### 1. Schema validation
```python
import jsonschema

# Define JSON schemas for each data type
schema_transaction = {
    "type": "object",
    "required": ["id", "type", "amount", "category", "account", "date"],
    "properties": {
        "type": {"enum": ["income", "expense"]},
        "amount": {"minimum": 0},
        "date": {"pattern": "^\\d{4}-\\d{2}-\\d{2}$"}
    }
}

def validate_test_data(data, schema):
    try:
        jsonschema.validate(data, schema)
        return True, "Valid"
    except jsonschema.ValidationError as e:
        return False, f"Validation error: {e}"
```

### 2. Business rule validation
```python
def validate_transaction_rules(transaction):
    errors = []
    
    # Rule 1: Amount must be positive
    if transaction["amount"] <= 0:
        errors.append("Amount must be positive")
    
    # Rule 2: Category type must match transaction type
    if transaction["type"] == "income":
        if transaction["category"] not in INCOME_CATEGORIES:
            errors.append("Category not in income list")
    else:
        if transaction["category"] not in EXPENSE_CATEGORIES:
            errors.append("Category not in expense list")
    
    # Rule 3: Amount should not exceed 100 million
    if transaction["amount"] > 100000000:
        errors.append("Amount exceeds maximum allowed")
    
    return errors
```

## Test Data Files Organization

```
/test-data/
├── transactions/
│   ├── income/
│   │   ├── 2026-10-23.json
│   │   └── 2026-10-24.json
│   └── expense/
│       ├── 2026-10-23.json
│       └── 2026-10-24.json
├── categories/
│   ├── income.json
│   └── expense.json
├── budgets/
│   └── current.json
├── preferences/
│   └── default.json
├── backup/
│   ├── test_data_2026-10-23_120000.json
│   └── test_data_2026-10-24_143000.json
└── README.md
```

## Test Data Usage in Tests

### 1. Loading test data
```python
import json

def load_test_data(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def setup_test_data():
    # Load all test data files
    data = {}
    
    # Load transactions
    for date_dir in ["income", "expense"]:
        for file in os.listdir(f"test-data/transactions/{date_dir}"):
            with open(f"test-data/transactions/{date_dir}/{file}", 'r') as f:
                if "transactions" not in data:
                    data["transactions"] = []
                data["transactions"].extend(json.load(f))
    
    # Load categories
    with open("test-data/categories/income.json", 'r') as f:
        data["categories"] = {"income": json.load(f)}
    with open("test-data/categories/expense.json", 'r') as f:
        if "categories" not in data:
            data["categories"] = {}
        data["categories"]["expense"] = json.load(f)
    
    # Load budgets
    with open("test-data/budgets/current.json", 'r') as f:
        data["budgets"] = json.load(f)
    
    # Load preferences
    with open("test-data/preferences/default.json", 'r') as f:
        data["preferences"] = json.load(f)
    
    return data
```

### 2. Using test data in tests
```python
class TestSetup:
    def __init__(self):
        self.test_data = load_test_data("test-data/")
    
    def setup_environment(self):
        # Setup app with test data
        self.setup_categories()
        self.setup_budgets()
        self.setup_preferences()
    
    def setup_categories(self):
        # Use category data to verify app categories
        income_categories = self.test_data["categories"]["income"]
        expense_categories = self.test_data["categories"]["expense"]
        
        # Verify income categories in app
        for category in income_categories:
            self.verify_category_exists(category["name"], "income")
        
        # Verify expense categories in app
        for category in expense_categories:
            self.verify_category_exists(category["name"], "expense")
    
    def verify_category_exists(self, category_name, type):
        # Implementation depends on app
        # Could use appium_find_element to verify category in UI
        pass
    
    def setup_budgets(self):
        # Setup budget data in app
        for budget in self.test_data["budgets"]:
            self.set_budget(budget["category"], budget["limit"], budget["spent"])
    
    def set_budget(self, category_name, limit, spent):
        # Implementation depends on app
        # Could use appium_gesture to navigate and set budget
        pass
    
    def setup_preferences(self):
        # Setup app preferences
        prefs = self.test_data["preferences"]
        self.set_theme(prefs["theme"])
        self.set_currency(prefs["currency"])
        self.set_date_format(prefs["date_format"])
    
    def cleanup_environment(self):
        # Reset app to default state
        self.reset_categories()
        self.reset_budgets()
        self.reset_preferences()
    
    def reset_categories(self):
        # Implementation depends on app
        pass
    
    def reset_budgets(self):
        # Implementation depends on app
        pass
    
    def reset_preferences(self):
        # Implementation depends on app
        pass
```

## Test Data Files (examples)

### 1. Example transaction file (`test-data/transactions/income/2026-10-23.json`)
```json
[
  {
    "id": "txn-income-001",
    "type": "income",
    "amount": 5000000,
    "category": "Gaji",
    "account": "Bank BCA",
    "date": "2026-10-23",
    "note": "Gajian bulan Oktober",
    "timestamp": "2026-10-23 09:00:00",
    "day_label": "Minggu",
    "month": "2026-10",
    "year": 2026
  },
  {
    "id": "txn-income-002",
    "type": "income",
    "amount": 2500000,
    "category": "Freelance",
    "account": "Tunai",
    "date": "2026-10-23",
    "note": "",
    "timestamp": "2026-10-23 14:30:00",
    "day_label": "Minggu",
    "month": "2026-10",
    "year": 2026
  }
]
```

### 2. Example category file (`test-data/categories/income.json`)
```json
[
  {
    "id": "inc_gaji",
    "name": "Gaji",
    "type": "income",
    "hidden": false,
    "icon": "money"
  },
  {
    "id": "inc_freelance",
    "name": "Freelance",
    "type": "income",
    "hidden": false,
    "icon": "briefcase"
  }
]
```

### 3. Example budget file (`test-data/budgets/current.json`)
```json
[
  {
    "category": "Makanan & Minuman",
    "limit": 5000000,
    "spent": 2500000,
    "status": "Aman",
    "remaining": 2500000,
    "percentage": 50.0,
    "last_updated": "2026-10-23 10:30:00"
  },
  {
    "category": "Barang sehari-hari",
    "limit": 3000000,
    "spent": 2800000,
    "status": "Hampir habis",
    "remaining": 200000,
    "percentage": 93.33,
    "last_updated": "2026-10-23 11:15:00"
  }
]
```

## Test Data Validation Tools

### 1. JSON schema validator
```bash
# Install dependencies
pip install jsonschema

# Run validation
schema-validator.py test-data/transactions/income/2026-10-23.json
```

### 2. Data consistency checker
```bash
# Check for duplicate IDs
duplicate-checker.py test-data/

# Check for missing required fields
missing-fields-checker.py test-data/

# Check data type consistency
type-checker.py test-data/
```

## Best Practices for Test Data

### 1. Realistic data
- Use realistic amounts (not round numbers)
- Include edge cases (zero amounts, maximum values)
- Test boundary conditions

### 2. Diverse data
- Mix different categories, types, and accounts
- Include various dates (weekdays, weekends)
- Test both income and expense scenarios

### 3. Validated data
- Ensure all data meets business rules
- Validate dates, amounts, categories
- Check for data consistency

### 4. Isolated data
- Each test should use unique data
- Clean up test data after each test
- Avoid data contamination between tests

### 5. Documented data
- Document the purpose of each data point
- Explain why specific values were chosen
- Note any assumptions or limitations

## Test Data Version Control

### 1. Use git for test data
```bash
# Add test data files
git add test-data/

# Commit with descriptive message
git commit -m "Add test data for October 2026 tests
- Income transactions: gaji, freelance
- Expense categories: makanan, barang sehari-hari
- Budget limits: 5M for makanan, 3M for barang sehari-hari"

# Tag releases
git tag -a test-data-2026-10-23 -m "Test data for October 23, 2026"
```

### 2. Backup test data
```bash
# Create backup script
cat > backup-test-data.sh << 'EOF'
#!/bin/bash

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/test-data-$TIMESTAMP"

mkdir -p $BACKUP_DIR
cp -r test-data/* $BACKUP_DIR/

echo "Test data backed up to $BACKUP_DIR"
EOF

chmod +x backup-test-data.sh
./backup-test-data.sh
```

## Conclusion

Test data is a critical component of automated testing. Proper test data management ensures:
- Consistent test execution
- Reliable test results
- Easy test maintenance
- Better test coverage

This document provides a comprehensive guide to managing test data for Simple Money Tracker automation.

---

## Unit test execution plan


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

---

## Unit test examples


This document provides concrete examples of how to write and execute tests for the Simple Money Tracker mobile app using Appium MCP.

## Overview

These examples demonstrate the three main ways to write tests:
1. **Natural language test generation** using `appium_generate_tests`
2. **Manual test scripts** using Python
3. **Shell script execution** for test suites

## Example 1: Natural Language Test Generation

### Scenario: Add income

**Input** (as provided to `appium_generate_tests`):
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

**Generated Output** (conceptual):
```python
{
  "steps": [
    {
      "id": "step-1",
      "description": "Navigate to Tambah screen",
      "action": "navigate",
      "target": "tambah_screen",
      "expected": "tambah_screen is visible"
    },
    {
      "id": "step-2",
      "description": "Select income type (Pemasukan)",
      "action": "tap",
      "target": "tambah_toggle_type_0",
      "expected": "Type switched to income"
    },
    {
      "id": "step-3",
      "description": "Enter amount 100000",
      "action": "input",
      "target": "tambah_input_amount",
      "value": "100000",
      "expected": "Amount field shows Rp 100.000"
    },
    {
      "id": "step-4",
      "description": "Select category Bonus & THR",
      "action": "tap",
      "target": "tambah_category_pager",
      "expected": "Category picker opens, Bonus & THR selected"
    },
    {
      "id": "step-5",
      "description": "Enter note (optional)",
      "action": "input",
      "target": "tambah_input_note",
      "value": "Gajian bulan Oktober",
      "expected": "Note field shows 'Gajian bulan Oktober'"
    },
    {
      "id": "step-6",
      "description": "Tap Save",
      "action": "tap",
      "target": "tambah_button_save",
      "expected": "Save successful, form resets"
    },
    {
      "id": "step-7",
      "description": "Verify transaction appears in list",
      "action": "verify",
      "target": "transaksi_list",
      "expected": "New transaction appears in list"
    },
    {
      "id": "step-8",
      "description": "Verify income summary updated",
      "action": "verify",
      "target": "ringkasan_summary_income",
      "expected": "Income summary updated by Rp 100.000"
    }
  ],
  "metadata": {
    "test_id": "TC-INC-01",
    "estimated_duration": "30 seconds",
    "difficulty": "Easy",
    "prerequisites": ["Appium session running", "App installed"]
  }
}
```

### How to use natural language generation:

```python
import asyncio
from appium_mcp import appium_generate_tests

async def run_income_test():
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
    
    result = await appium_generate_tests(steps)
    print(f"Generated test: {result['test_id']}")
    
    # Execute the generated test
    await execute_generated_test(result)

async def execute_generated_test(test_spec):
    # Implementation depends on your test framework
    # This would execute each step using appium_mcp tools
    pass
```

## Example 2: Manual Python Test Script

### Basic test structure:
```python
import asyncio
import time
from appium_mcp import (
    appium_session_management,
    appium_find_element,
    appium_gesture,
    appium_get_page_source,
    appium_get_text,
    appium_screenshot
)

class SimpleMoneyTrackerTests:
    def __init__(self, session_id):
        self.session_id = session_id
    
    async def setup(self):
        """Setup test environment"""
        # Create session if not exists
        await self.ensure_session()
        # Clear app data if needed
        await self.clear_app_data()
        # Load test data
        await self.load_test_data()
    
    async def teardown(self):
        """Clean up after tests"""
        await self.cleanup_test_data()
    
    async def ensure_session(self):
        """Ensure Appium session is running"""
        try:
            # Try to find session
            await appium_session_management(
                action="attach",
                sessionId=self.session_id
            )
        except:
            # Create new session
            await appium_session_management(
                action="create",
                platform="android",
                capabilities={
                    "deviceName": "Pixel 10",
                    "platformName": "Android",
                    "automationName": "UiAutomator2"
                }
            )
    
    async def clear_app_data(self):
        """Clear app data before each test"""
        # Implementation depends on app structure
        # Could use appium_gesture to clear
        pass
    
    async def load_test_data(self):
        """Load test data into app"""
        # Implementation depends on app
        # Could use appium_gesture to input data
        pass
    
    async def test_add_income(self, test_data):
        """Test adding income transaction"""
        try:
            # 1. Navigate to Tambah screen
            await self.navigate_to_tambah()
            
            # 2. Select income type
            await self.select_income_type()
            
            # 3. Enter amount
            await self.enter_amount(test_data["amount"])
            
            # 4. Select category
            await self.select_category(test_data["category"])
            
            # 5. Add note if provided
            if test_data.get("note"):
                await self.enter_note(test_data["note"])
            
            # 6. Save transaction
            await self.save_transaction()
            
            # 7. Verify transaction appears
            result = await self.verify_transaction_appears(
                test_data["amount"], test_data["category"]
            )
            
            return {"status": "PASS", "details": result}
            
        except Exception as e:
            return {"status": "FAIL", "error": str(e)}
    
    async def navigate_to_tambah(self):
        """Navigate to Tambah screen"""
        # Try to find and tap Tambah tab
        try:
            element = await appium_find_element(
                strategy="xpath",
                selector='//*[@resource-id="component_nav_bottom_tambah"]'
            )
            await appium_gesture("tap", elementUUID=element)
        except:
            # Fallback: check current screen and navigate
            await self.check_current_screen_and_navigate("tambah")
    
    async def select_income_type(self):
        """Select income type"""
        element = await appium_find_element(
            strategy="xpath",
            selector='//*[@resource-id="tambah_toggle_type_0"]'
        )
        await appium_gesture("tap", elementUUID=element)
    
    async def enter_amount(self, amount):
        """Enter amount in the amount field"""
        element = await appium_find_element(
            strategy="xpath",
            selector='//*[@resource-id="tambah_input_amount"]'
        )
        # Clear existing text
        await appium_gesture("tap", elementUUID=element)
        # Enter new amount
        await appium_gesture("type", text=str(amount), elementUUID=element)
    
    async def select_category(self, category_name):
        """Select category from category picker"""
        # Open category picker
        element = await appium_find_element(
            strategy="xpath",
            selector='//*[@resource-id="tambah_category_pager"]'
        )
        await appium_gesture("tap", elementUUID=element)
        
        # Search for category
        search_field = await appium_find_element(
            strategy="xpath",
            selector='//*[@resource-id="component_field_search"]//android.widget.EditText'
        )
        await appium_gesture("type", text=category_name, elementUUID=search_field)
        
        # Select the category
        # Implementation depends on how categories are displayed
        # Could search by text or use known resource-ids
        await self.select_category_by_name(category_name)
    
    async def select_category_by_name(self, category_name):
        """Select category by name - implementation depends on app structure"""
        # This is app-specific logic
        # Could use appium_find_element with text matching
        # or use known resource-ids for common categories
        
        # Example for Bonus & THR
        if category_name == "Bonus & THR":
            element = await appium_find_element(
                strategy="xpath",
                selector='//*[@resource-id="kategori_row_inc_bonus_thr"]']
            )
            await appium_gesture("tap", elementUUID=element)
        else:
            # Generic search implementation
            pass
    
    async def enter_note(self, note):
        """Enter note in the note field"""
        element = await appium_find_element(
            strategy="xpath",
            selector='//*[@resource-id="tambah_input_note"]'
        )
        await appium_gesture("type", text=note, elementUUID=element)
    
    async def save_transaction(self):
        """Save transaction"""
        element = await appium_find_element(
            strategy="xpath",
            selector='//*[@resource-id="tambah_button_save"]'
        )
        await appium_gesture("tap", elementUUID=element)
        
        # Wait for save to complete
        await asyncio.sleep(2)
    
    async def verify_transaction_appears(self, amount, category):
        """Verify transaction appears in the list"""
        # Navigate to Transaksi screen
        await self.navigate_to_transaksi()
        
        # Check if transaction appears
        # This could involve scanning the list or checking specific elements
        result = await self.check_transaction_in_list(amount, category)
        
        return result
    
    async def navigate_to_transaksi(self):
        """Navigate to Transaksi screen"""
        try:
            element = await appium_find_element(
                strategy="xpath",
                selector='//*[@resource-id="component_nav_bottom_daftar"]'
            )
            await appium_gesture("tap", elementUUID=element)
        except:
            await self.check_current_screen_and_navigate("transaksi")
    
    async def check_transaction_in_list(self, amount, category):
        """Check if transaction with given amount and category is in the list"""
        # Implementation depends on how transactions are displayed
        # Could search for text elements matching amount and category
        pass
    
    async def check_current_screen_and_navigate(self, target_screen):
        """Check current screen and navigate if needed"""
        # Get current page source
        page_source = await appium_get_page_source()
        
        # Check if we're on the right screen
        if target_screen == "tambah":
            if "tambah_screen" in page_source:
                return
        elif target_screen == "transaksi":
            if "daftar_screen" in page_source:
                return
        
        # If not on target screen, navigate
        if target_screen == "tambah":
            await self.select_bottom_tab("tambah")
        elif target_screen == "transaksi":
            await self.select_bottom_tab("transaksi")
    
    async def select_bottom_tab(self, tab_name):
        """Select bottom navigation tab"""
        if tab_name == "tambah":
            element = await appium_find_element(
                strategy="xpath",
                selector='//*[@resource-id="component_nav_bottom_tambah"]'
            )
        elif tab_name == "transaksi":
            element = await appium_find_element(
                strategy="xpath",
                selector='//*[@resource-id="component_nav_bottom_daftar"]'
            )
        elif tab_name == "ringkasan":
            element = await appium_find_element(
                strategy="xpath",
                selector='//*[@resource-id="component_nav_bottom_ringkasan"]'
            )
        
        await appium_gesture("tap", elementUUID=element)
    
    async def cleanup_test_data(self):
        """Clean up test data after test"""
        # Delete transactions added during test
        await self.delete_recent_transactions()
        # Reset app to default state
        await self.reset_app_to_default()
    
    async def delete_recent_transactions(self):
        """Delete transactions added during test"""
        # Implementation depends on app structure
        # Could use swipe/delete actions or reset app data
        pass
    
    async def reset_app_to_default(self):
        """Reset app to default state"""
        # Implementation depends on app
        # Could use app settings or clear data
        pass

# Example usage:
async def main():
    # Initialize test runner
    tester = SimpleMoneyTrackerTests(session_id="smtt-test-session")
    
    # Setup test environment
    await tester.setup()
    
    try:
        # Run test cases
        test_cases = [
            {
                "test_id": "TC-INC-01",
                "data": {
                    "amount": 100000,
                    "category": "Bonus & THR"
                }
            },
            {
                "test_id": "TC-EXP-01",
                "data": {
                    "amount": 50000,
                    "category": "Makanan & Minuman"
                }
            }
        ]
        
        results = []
        for test_case in test_cases:
            result = await tester.test_add_income(test_case["data"])
            result["test_id"] = test_case["test_id"]
            results.append(result)
            
            # Add delay between tests
            await asyncio.sleep(1)
        
        # Print results
        for result in results:
            print(f"Test {result['test_id']}: {result['status']}")
            if result["status"] == "FAIL":
                print(f"Error: {result['error']}")
        
    finally:
        # Cleanup
        await tester.teardown()

if __name__ == "__main__":
    asyncio.run(main())
```

## Example 3: Shell Script for Test Suite Execution

### Basic test suite runner:
```bash
#!/bin/bash

# Configuration
SESSION_ID="smtt-test-$(date +%Y%m%d%H%M%S)"
APP_PACKAGE="id.almezi.simplemoneytracker_kt"
TEST_DATA_DIR="/path/to/test-data"
RESULTS_DIR="/path/to/test-results"
TIMEOUT=300

# Create directories
mkdir -p "$RESULTS_DIR"

# Function to run tests
run_tests() {
    echo "Starting test suite..."
    echo "Session ID: $SESSION_ID"
    
    # Start Appium session
    echo "Creating Appium session..."
    opencode mcp run --session "$SESSION_ID" -- npx -y appium-mcp@latest --timeout $TIMEOUT &
    APPUIM_PID=$!
    
    # Wait for session to be ready
    echo "Waiting for session to be ready..."
    sleep 15
    
    # Run test cases
    echo "Running test cases..."
    python3 /path/to/run_tests.py "$SESSION_ID" "$TEST_DATA_DIR" "$RESULTS_DIR"
    
    # Capture results
    TEST_RESULTS="$RESULTS_DIR/test_results_$(date +%Y%m%d_%H%M%S).json"
    
    # Generate report
    python3 /path/to/generate_report.py "$RESULTS_DIR" "$TEST_RESULTS"
    
    # Display results
    echo "Test execution completed."
    echo "Results saved to: $TEST_RESULTS"
    
    # Display summary
    cat "$TEST_RESULTS" | python3 /path/to/display_summary.py
}

# Function to cleanup
cleanup() {
    echo "Cleaning up..."
    
    # End session
    if [ ! -z "$APPUIM_PID" ]; then
        echo "Ending Appium session..."
        opencode mcp run --session "$SESSION_ID" -- "appium_session_management" "action=delete"
        
        # Wait for cleanup
        sleep 5
    fi
    
    echo "Cleanup completed."
}

# Trap for cleanup on script exit
trap cleanup EXIT

# Main execution
run_tests
```

### Test runner script:
```python
#!/usr/bin/env python3

import sys
import json
import asyncio
import time
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from simple_money_tracker_tests import SimpleMoneyTrackerTests

async def main():
    if len(sys.argv) < 4:
        print("Usage: python3 run_tests.py <session_id> <test_data_dir> <results_dir>")
        sys.exit(1)
    
    session_id = sys.argv[1]
    test_data_dir = sys.argv[2]
    results_dir = sys.argv[3]
    
    # Initialize test runner
    tester = SimpleMoneyTrackerTests(session_id)
    
    try:
        # Setup test environment
        await tester.setup()
        
        # Load test cases from data files
        test_cases = load_test_cases(test_data_dir)
        
        # Run test cases
        results = []
        for i, test_case in enumerate(test_cases):
            print(f"Running test case {i+1}/{len(test_cases)}: {test_case['test_id']}")
            
            try:
                result = await tester.test_add_income(test_case["data"])
                result["test_id"] = test_case["test_id"]
                result["start_time"] = time.time()
                result["end_time"] = time.time()
                
            except Exception as e:
                result = {
                    "test_id": test_case["test_id"],
                    "status": "ERROR",
                    "error": str(e),
                    "start_time": time.time(),
                    "end_time": time.time()
                }
            
            results.append(result)
            
            # Delay between tests
            await asyncio.sleep(2)
        
        # Save results
        results_file = f"{results_dir}/test_results_{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"Test results saved to: {results_file}")
        
        # Generate summary
        generate_summary(results)
        
    finally:
        # Cleanup
        await tester.teardown()

def load_test_cases(data_dir):
    """Load test cases from test data directory"""
    test_cases = []
    
    # Load income test cases
    income_file = f"{data_dir}/income_test_cases.json"
    if Path(income_file).exists():
        with open(income_file, 'r') as f:
            test_cases.extend(json.load(f))
    
    # Load expense test cases
    expense_file = f"{data_dir}/expense_test_cases.json"
    if Path(expense_file).exists():
        with open(expense_file, 'r') as f:
            test_cases.extend(json.load(f))
    
    return test_cases

def generate_summary(test_results):
    """Generate test summary"""
    total = len(test_results)
    passed = sum(1 for r in test_results if r.get("status") == "PASS")
    failed = sum(1 for r in test_results if r.get("status") == "FAIL")
    error = sum(1 for r in test_results if r.get("status") == "ERROR")
    skipped = sum(1 for r in test_results if r.get("status") == "SKIP")
    
    success_rate = (passed / total) * 100 if total > 0 else 0
    
    print("\n" + "="*50)
    print("TEST EXECUTION SUMMARY")
    print("="*50)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Error: {error}")
    print(f"Skipped: {skipped}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if failed > 0 or error > 0:
        print("\nFailed/Error Tests:")
        for result in test_results:
            if result.get("status") in ["FAIL", "ERROR"]:
                print(f"  - {result['test_id']}: {result.get('error', 'Unknown error')}")
    
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
```

### Example test data files:

#### Income test cases (`test-data/income_test_cases.json`):
```json
[
  {
    "test_id": "TC-INC-01",
    "data": {
      "amount": 5000000,
      "category": "Gaji",
      "account": "Bank BCA",
      "note": "Gajian bulan Oktober"
    }
  },
  {
    "test_id": "TC-INC-02",
    "data": {
      "amount": 2500000,
      "category": "Freelance",
      "account": "Tunai"
    }
  }
]
```

#### Expense test cases (`test-data/expense_test_cases.json`):
```json
[
  {
    "test_id": "TC-EXP-01",
    "data": {
      "amount": 500000,
      "category": "Makanan & Minuman",
      "account": "Tunai",
      "note": "Makan siang di restoran"
    }
  },
  {
    "test_id": "TC-EXP-02",
    "data": {
      "amount": 1000000,
      "category": "Barang sehari-hari",
      "account": "Bank Mandiri"
    }
  }
]
```

## Best Practices for Test Scripts

### 1. Error handling
- Implement comprehensive error handling
- Capture screenshots on failures
- Log detailed error messages

### 2. Test data management
- Use unique test data for each test
- Clean up test data after each test
- Avoid test data pollution

### 3. Test execution
- Add delays between tests
- Implement retry mechanisms for flaky tests
- Use proper test ordering

### 4. Reporting
- Generate detailed test reports
- Include visual evidence
- Provide actionable feedback

### 5. Maintenance
- Keep tests up-to-date with app changes
- Regularly review and update test data
- Maintain test documentation

## Testing Strategy Summary

### 1. Unit testing (appium_mcp level)
- Test individual Appium MCP tools
- Mock app interactions
- Test tool communication

### 2. Integration testing (app level)
- Test complete user flows
- Test app interactions with tools
- Test data persistence

### 3. End-to-end testing (user perspective)
- Test complete user journeys
- Test real-world scenarios
- Test app stability and performance

### 4. Performance testing
- Test app performance under load
- Test response times
- Test memory usage

### 5. Accessibility testing
- Test app accessibility features
- Test screen reader compatibility
- Test contrast and visibility

This comprehensive testing approach ensures the Simple Money Tracker app is thoroughly tested from unit level to end-to-end user experience.

---

## Unit test results template


This document defines the template and format for reporting test results in the Simple Money Tracker automation testing.

## Overview

Test results are collected during automated test execution and reported in a structured format that allows for easy analysis, tracking, and trend identification.

## Test Results Report Structure

### 1. Executive Summary
```markdown
# Simple Money Tracker — Test Results Report
**Date**: 2026-10-23  
**Test Session**: SMST-20261023-001  
**Total Tests**: 142  
**Passed**: 138  
**Failed**: 4  
**Skipped**: 0  
**Success Rate**: 97.2%  
**Total Duration**: 12.5 minutes
```

### 2. Detailed Test Results
```markdown
## Test Results Detail

### ✅ Passed Tests: 138

#### A. Smoke & Navigation (TC-NAV)
- TC-NAV-01: App launches successfully  
- TC-NAV-02: Tambah tab functionality verified  
- TC-NAV-03: Transaksi tab functionality verified  
- TC-NAV-04: Ringkasan tab functionality verified  
- TC-NAV-05: Full navigation flow completed  
- TC-NAV-06: Back navigation functional  
- TC-NAV-07: Selected tab persistence verified  
- TC-NAV-08: Rapid tab switching stability tested  

#### B. Add Income (TC-INC) - [7/7 PASSED]
- TC-INC-01: Income type + amount + category → save → transaction appears  
- TC-INC-02: Income appears in list same day  
- TC-INC-03: Income summary updates correctly  
- TC-INC-04: Ringkasan income card + balance update  
- TC-INC-05: Income with note persists  
- TC-INC-06: Income on non-default account recorded  
- TC-INC-07: Multiple incomes same day aggregate  
- TC-INC-08: Form reset after save  
- TC-INC-09: Save confirmation shown  

#### C. Add Expense (TC-EXP) - [6/6 PASSED]
- TC-EXP-01: Expense + amount + category → save → transaction appears  
- TC-EXP-02: Expense appears with negative sign  
- TC-EXP-03: Expense summary updates  
- TC-EXP-04: Balance decrements correctly  
- TC-EXP-05: Expense breakdown shows 100% for single item  
- TC-EXP-06: Expense on default account  
- TC-EXP-07: Mixed income+expense same day  
- TC-EXP-08: Expense > balance (negative balance)  

#### D. Form Validation (TC-VAL) - [9/9 PASSED]
- TC-VAL-01: Empty amount + empty category → save disabled  
- TC-VAL-02: Amount only → save disabled  
- TC-VAL-03: Category only → save disabled  
- TC-VAL-04: Amount 0 → save disabled  
- TC-VAL-05: Negative amount → rejected  
- TC-EXP-06: Letters in amount → rejected  
- TC-EXP-07: Symbols in amount → rejected  
- TC-EXP-08: Scientific notation → handled  
- TC-EXP-09: Overflow amount → handled  

#### E. Amount Input Behavior (TC-AMT) - [7/7 PASSED]
- TC-AMT-01: Numeric keyboard appears  
- TC-AMT-02: Amount format live as Rp X.XXX  
- TC-AMT-03: Backspace to empty works  
- TC-AMT-04: Clear field disables save  
- TC-AMT-05: Thousand separator auto-inserts  
- TC-AMT-06: Cursor position stable  
- TC-AMT-07: Max digits respected  

#### F. Category Selection (TC-CAT) - [8/8 PASSED]
- TC-CAT-01: Picker opens on tap  
- TC-CAT-02: Categories filtered by type  
- TC-CAT-03: Type switch after selection  
- TC-CAT-04: Selected category displayed  
- TC-CAT-05: Dismiss picker without select  
- TC-CAT-06: Kelola kategori opens  
- TC-CAT-07: Selected category shown in saved list  
- TC-CAT-08: Category avatar renders correctly  

#### G. Account Selection (TC-ACC) - [5/5 PASSED]
- TC-ACC-01: Picker opens on tap  
- TC-ACC-02: Default account = Tunai  
- TC-ACC-03: Account switch updates label  
- TC-ACC-04: Dismiss without select  
- TC-ACC-05: Account persisted in saved transaction  

#### H. Date Picker (TC-DATE) - [8/8 PASSED]
- TC-DATE-01: Date dialog opens  
- TC-DATE-02: Default date = today  
- TC-DATE-03: Past date lands in month  
- TC-DATE-04: Future date allowed/blocked  
- TC-DATE-05: Cancel dialog  
- TC-DATE-06: Leap day 29 Feb 2028 accepted  
- TC-DATE-07: Date locale format  
- TC-DATE-08: Backdated transaction shows correctly  

#### I. Save Button State (TC-SAVE) - [6/6 PASSED]
- TC-SAVE-01: Initial state disabled  
- TC-SAVE-02: Enabled when amount + category  
- TC-SAVE-03: Disable when amount cleared  
- TC-SAVE-04: Disable when category cleared  
- TC-SAVE-05: Visual contrast for enabled state  
- TC-SAVE-06: Tap disabled button → no action  

#### J. Transaction List (TC-LIST) - [11/11 PASSED]

> Historical: this section keeps the original manual-plan numbering, which
> differs from the live catalog. TC-LIST-11 here ("No stale or duplicate
> items") is not the catalogued TC-LIST-11, and "TC-LIST-10: Pull-to-refresh
> works" predates the retirement — pull-to-refresh is out of scope in
> `UI_SPEC.md` §7 (see `BUG_Found_09.md`). Authoritative list:
> `test-cases-simple-money-tracker.md` §J.
- TC-LIST-01: Empty month handled  
- TC-LIST-02: Day header with weekday + date + total  
- TC-LIST-03: Items grouped by day header  
- TC-LIST-04: Items sorted newest first  
- TC-LIST-05: Row shows category, type, amount  
- TC-LIST-06: Income amount no minus, expense with minus  
- TC-LIST-07: Long category name truncation/wrap  
- TC-LIST-08: Scroll list with 100+ items  
- TC-LIST-09: Summary matches totals  
- TC-LIST-10: Pull-to-refresh works  
- TC-LIST-11: No stale or duplicate items  

#### K. Edit Transaction (TC-EDIT) - [7/7 PASSED]
- TC-EDIT-01: Edit button opens form prefilled  
- TC-EDIT-02: Change amount updates list  
- TC-EDIT-03: Change category updates breakdown  
- TC-EDIT-04: Change type swaps summaries  
- TC-EDIT-05: Change date moves item to new month  
- TC-EDIT-06: Edit note only keeps other fields  
- TC-EDIT-07: Cancel edit → no change  
- TC-EDIT-08: Edit invalid state blocks save  

#### L. Delete Transaction (TC-DEL) - [7/7 PASSED]
- TC-DEL-01: Delete button → confirmation  
- TC-DEL-02: Confirm → row removed, summaries decrease  
- TC-DEL-03: Cancel → row remains  
- TC-DEL-04: Delete last item of month → empty state  
- TC-DEL-05: Delete affects Ringkasan  
- TC-DEL-06: Delete removes stale breakdown  
- TC-DEL-07: Rapid delete two items → both removed  

#### M. Month Switcher (TC-MON) - [9/9 PASSED]
- TC-MON-01: Prev decrements month label  
- TC-MON-02: Next increments month  
- TC-MON-03: Next disabled on current month  
- TC-MON-04: Prev far back → empty list  
- TC-MON-05: Month label format  
- TC-MON-06: Transaksi vs Ringkasan independence  
- TC-MON-07: Switch month with items → correct data  
- TC-MON-08: Switch back → original data  
- TC-MON-09: Year boundary Dec→Jan correct  

#### N. Summary / Ringkasan (TC-SUM) - [13/13 PASSED]
- TC-SUM-01: Balance = income − expense  
- TC-SUM-02: Income card == daftar_summary_masuk  
- TC-SUM-03: Expense card == daftar_summary_keluar  
- TC-SUM-04: Savings rate formula correct  
- TC-SUM-05: Savings rate = 0% when income 0  
- TC-SUM-06: Comparison amounts match cards  
- TC-SUM-07: Income breakdown sum 100%  
- TC-SUM-08: Expense breakdown sum 100%  
- TC-SUM-09: Breakdown bar width proportional  
- TC-SUM-10: Empty month → all zeros  
- TC-SUM-11: Large values format  
- TC-SUM-12: Negative balance renders minus  
- TC-SUM-13: Scroll to bottom → all sections  

#### O. Cross-screen Consistency (TC-CONS) - [5/5 PASSED]
- TC-CONS-01: Add → Transaksi + Ringkasan update  
- TC-CONS-02: Edit → all three screens consistent  
- TC-CONS-03: Delete → all three screens consistent  
- TC-CONS-04: Month switch independent  
- TC-CONS-05: Totals on Transaksi == totals on Ringkasan  

#### P. Backup & Export (TC-BACKUP) - [6/6 PASSED]
- TC-BACKUP-01: Backup button opens UI  
- TC-BACKUP-02: Export creates file / share sheet  
- TC-BACKUP-03: Exported file contains transactions  
- TC-BACKUP-04: Import backup restores data  
- TC-BACKUP-05: Cancel export → no side effects  
- TC-BACKUP-06: Export with zero transactions → valid file  

#### Q. Budget / Anggaran (TC-BUDGET) - [11/11 PASSED]
- TC-BUDGET-01: Anggaran button opens  
- TC-BUDGET-02: Title "Anggaran"  
- TC-BUDGET-03: Total card shows amount  
- TC-BUDGET-04: Per-category card shows info  
- TC-BUDGET-05: "Ubah" / "Hapus" buttons work  
- TC-BUDGET-06: "Atur anggaran baru" button  
- TC-BUDGET-07: Set budget → saved  
- TC-BUDGET-08: Budget progress reflects expense  
- TC-BUDGET-09: Over-budget state shows warning  
- TC-BUDGET-10: Edit/remove budget works  
- TC-BUDGET-11: Back button returns  

#### R. Category Management (TC-KAT) - [15/15 PASSED]
- TC-KAT-01: Ringkasan kelola button  
- TC-KAT-02: Tambah kelola kategori  
- TC-KAT-03: Type toggle income/expense  
- TC-KAT-04: Income list 7 default categories  
- TC-KAT-05: Expense list 10+ default categories  
- TC-KAT-06: Search field filters  
- TC-KAT-07: Edit opens "Ubah kategori" dialog  
- TC-KAT-08: Rename category  
- TC-KAT-09: Rename empty/invalid blocked  
- TC-KAT-10: Cancel edit dialog  
- TC-KAT-11: Hide toggles visibility  
- TC-KAT-12: Hidden category not shown  
- TC-KAT-13: Category shows "Bawaan · N transaksi"  
- TC-KAT-14: Category mark color renders  
- TC-KAT-15: Back button returns  

#### S. Persistence (TC-PERS) - [5/5 PASSED]
- TC-PERS-01: Kill app, relaunch → transactions persist  
- TC-PERS-02: Relaunch → selected tab resets  
- TC-PERS-03: Relaunch → selected month resets  
- TC-PERS-04: Force-stop mid-save → no corrupt DB  
- TC-PERS-05: Reinstall → data cleared  

#### T. Rotation & Config (TC-ROT) - [6/6 PASSED]
- TC-ROT-01: Rotate on Tambah with form  
- TC-ROT-02: Rotate on Transaksi  
- TC-ROT-03: Rotate on Ringkasan  
- TC-ROT-04: Dark mode toggle  
- TC-ROT-05: App backgrounded → resumed  
- TC-ROT-06: Font scale 200%  

#### U. Accessibility (TC-A11Y) - [7/7 PASSED]
- TC-A11Y-01: All interactive elements have content-desc  
- TC-A11Y-02: Save button disabled state announced  
- TC-A11Y-03: Tap targets ≥ 48dp  
- TC-A11Y-04: Contrast ratio ≥ 4.5:1  
- TC-A11Y-05: TalkBack traversal order logical  
- TC-A11Y-06: Icon-only buttons have labels  
- TC-A11Y-07: Amount values readable as currency  

#### V. Performance (TC-PERF) - [5/5 PASSED]
- TC-PERF-01: Cold start < 3s  
- TC-PERF-02: Tab switch < 500ms  
- TC-PERF-03: List scroll 60fps  
- TC-PERF-04: Save transaction < 1s  
- TC-PERF-05: No memory growth after cycles  

### ❌ Failed Tests: 4

#### A. Validation Failures (TC-VAL)
- TC-VAL-05: Negative amount (expected rejection, accepted)
- TC-VAL-06: Letters in amount (expected rejection, accepted)
- TC-VAL-07: Symbols in amount (expected rejection, accepted)
- TC-EXP-08: Scientific notation (expected handling, crash)

#### B. Technical Issues
- [Issue description and resolution]

### 📋 Test Summary

**Total Tests**: 142  
**Passed**: 138  
**Failed**: 4  
**Skipped**: 0  
**Success Rate**: 97.2%  
**Total Duration**: 12.5 minutes  
**Average Time per Test**: 5.8 seconds

**Key Findings**:
1. Core functionality (add/edit/delete transactions) working correctly
2. Validation rules need reinforcement for negative amounts and non-numeric input
3. Scientific notation input causes crash
4. UI performance within acceptable limits

**Recommendations**:
1. Implement stricter validation for amount input
2. Add input sanitization for scientific notation
3. Consider adding visual feedback for validation errors
4. Continue monitoring for edge cases in real-world usage

---

*Generated by Appium MCP test automation system*

---

