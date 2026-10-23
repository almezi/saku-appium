# Simple Money Tracker — Test Examples

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
