# Bulk Import Tests from Test Design

## Overview

The **Bulk Import Tests** feature allows you to import test cases from Test Design modules into Test Execution locations. This is useful when you want to:

- Copy an entire module hierarchy from Test Design to Test Execution
- Set up test runs for a specific release or test cycle
- Apply initial status to newly imported tests

## Command

```bash
npm run bulk-import
```

Or in production:

```bash
npm run bulk-import:prod
```

## How It Works

The wizard guides you through the following steps:

### Step 1: Select Project
Choose the qTest project you want to work with.

### Step 2: Navigate to Test Execution Location
Navigate through your Test Execution hierarchy (Releases → Test Cycles → Test Suites) to select where you want to import the tests.

**Key Feature:** You can stop at any level during navigation and select "Use current location" to import tests there.

### Step 3: Select Module from Test Design
Navigate through your Test Design module hierarchy and select the module you want to import.

**Options at each level:**
- **Select "Module Name" and copy all** - Imports the selected module and all its children
- **Navigate into "Module Name"** - Drill down into child modules (only shown if the module has children)

### Step 4: Confirm Import
Review the source and destination, then confirm the import operation.

### Step 5: Import Tests
The tool will:
1. Fetch all test cases from the selected module (including descendants)
2. Create test runs in the selected Test Execution location
3. Display progress and results

### Step 6: Validate Status Configuration
The tool validates that the configured skip status exists in your project.

### Step 7: Select User
Choose which user these tests are for (uses the `userLabMapping` from config.json).

### Step 8: Update Test Runs
Apply the configured status to all newly created test runs.

## Configuration

Make sure your `config.json` includes:

```json
{
  "qTestUrl": "https://your-qtest-instance.com",
  "auth": {
    "username": "your-email@example.com",
    "bearerToken": "your-token"
  },
  "userLabMapping": {
    "user1@example.com": "lab-id-1",
    "user2@example.com": "lab-id-2"
  },
  "recommendations": {
    "skipStatusName": "Skipped by SeaLights"
  }
}
```

## Example Workflow

1. **Start the wizard:**
   ```bash
   npm run bulk-import
   ```

2. **Select your project:**
   ```
   📦 Select a Project:
   0. My Project
   ```

3. **Navigate to Test Execution location:**
   ```
   📂 Select location in "My Project":
   0. 📂 Release 1.0
   1. 📂 Sprint 1
   
   Current: "My Project / Sprint 1" - Select location:
   0. ✓ Use current location (My Project / Sprint 1)
   1. 📁 Integration Tests - 15 test run(s)
   2. 📁 Unit Tests - 8 test run(s)
   ```

4. **Select module from Test Design:**
   ```
   📂 Test Design (Root) - Select module:
   0. ✓ Select "Authentication" and copy all (includes 3 child module(s))
   1. 📁 Navigate into "Authentication" (3 children)
   2. ✓ Select "Payment" and copy all
   3. 📁 Navigate into "Payment" (2 children)
   ```

5. **Confirm and import:**
   ```
   You are about to import:
     FROM: Test Design → Authentication
     TO: Test Execution → My Project / Sprint 1 / Integration Tests
   
   This will create test runs for all test cases in the module (including children).
   
   Proceed with import? (yes/no): yes
   ```

6. **Review results:**
   ```
   ✅ Found 25 test case(s)
   📝 Creating test runs in Test Execution...
   ✅ Successfully created 25 test run(s)
   ```

## Important Notes

1. **Test Suite Requirement:** Test runs can only be created in Test Suites, not directly in Test Cycles or Releases. Make sure to navigate to a Test Suite location.

2. **Hierarchy Preservation:** The import includes all test cases from the selected module and its child modules, preserving the full hierarchy.

3. **Existing Tests:** The tool creates new test runs. It does not check for duplicates or update existing test runs.

4. **Status Application:** After creating test runs, the tool applies the configured status (e.g., "Skipped by SeaLights") to all newly created tests.

## Differences from Recommendations Command

| Feature | Recommendations | Bulk Import |
|---------|----------------|-------------|
| **Purpose** | Apply SeaLights recommendations to existing tests | Import new tests from Test Design |
| **Source** | Existing test runs in Test Execution | Test cases in Test Design modules |
| **Action** | Updates status of existing test runs | Creates new test runs |
| **SeaLights Integration** | Yes - fetches recommendations | No - just imports and sets status |
| **Navigation** | Must navigate to location with tests | Can stop at any level |

## Troubleshooting

### "Cannot create test runs directly in a test cycle"
**Solution:** Navigate deeper into a Test Suite location instead of stopping at a Test Cycle or Release level.

### "No modules found in Test Design"
**Solution:** Verify that your project has modules set up in the Test Design section of qTest.

### "No test cases found in selected module"
**Solution:** The selected module and its children don't contain any test cases. Try selecting a different module.

## See Also

- [README.md](./README.md) - Main documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [RECOMMENDATIONS-DESIGN.md](./RECOMMENDATIONS-DESIGN.md) - Recommendations feature design

