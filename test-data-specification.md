# Simple Money Tracker — Test Data Specification

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
