# Testing Guide for Recommendations Wizard

## Pre-Testing Setup

### 1. Build the Project
```bash
cd "/Users/y.haspel/qTest Integration/qTest cloud tool"
npm install
npm run build
```

### 2. Verify Configuration
Ensure your `config.json` has the following structure:
```json
{
  "qTestUrl": "https://your-qtest-instance.qtestnet.com",
  "auth": {
    "username": "your.email@company.com",
    "password": "your-password",
    "clientCredentials": "base64-encoded-credentials"
  },
  "sealights": {
    "token": "your-sealights-agent-token",
    "backendUrl": "https://your-sealights-backend.com"
  },
  "userLabMapping": {
    "your.email@company.com": "lab-id"
  },
  "testStageMapping": {
    "Project / Suite Name": "Stage Name"
  },
  "recommendations": {
    "skipStatusName": "SL Skipped",
    "enableMockMode": true
  }
}
```

### 3. Edit Mock Data
Customize `mock-recommendations.json` with test names that exist in your qTest instance:
```json
{
  "metadata": {
    "appName": "YourProject",
    "branchName": "main",
    "buildName": "build-123",
    "testStage": "Regression",
    "testGroupId": "group-1",
    "testSelectionEnabled": true,
    "isFullRun": false,
    "status": "ready"
  },
  "excludedTests": [
    {
      "testName": "Exact Test Name from qTest"
    },
    {
      "testName": "Another Exact Test Name"
    }
  ]
}
```

**Important:** Use exact test run names as they appear in qTest!

## Test Scenarios

### Scenario 1: Happy Path (All Steps Successful)

**Steps:**
1. Run `npm run recommendations`
2. Select a project with test data
3. Navigate through the hierarchy
4. Status "SL Skipped" exists
5. Select a test stage
6. Select a user
7. Mock recommendations match test names
8. Updates are applied successfully

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Test runs are updated in qTest
- ✅ Output file created in `output/` directory
- ✅ Summary displays correct counts
- ✅ Console shows success messages

### Scenario 2: Status Doesn't Exist

**Setup:**
- Remove "SL Skipped" status from qTest project
- Or change `skipStatusName` in config to non-existent name

**Steps:**
1. Run `npm run recommendations`
2. Complete navigation
3. Wait for status validation

**Expected Results:**
- ⚠️ Warning: Status not found
- 📋 List of available statuses shown
- ✅ User can select alternative status
- ✅ Config.json is updated with selected status
- ✅ Recommendation continues with selected status

### Scenario 3: No Matching Tests

**Setup:**
- Set `excludedTests` to test names that don't exist in selected location

**Steps:**
1. Run `npm run recommendations`
2. Complete all steps

**Expected Results:**
- ✅ Wizard completes successfully
- ℹ️ Message: "No tests recommended for skipping"
- ✅ No updates made to qTest

### Scenario 4: Full Run Required

**Setup:**
- Edit `mock-recommendations.json`:
```json
{
  "metadata": {
    ...
    "isFullRun": true,
    "fullRunReason": "No statistical model available"
  }
}
```

**Expected Results:**
- ℹ️ Message: "Full run is recommended"
- ℹ️ Displays reason
- ✅ Wizard exits gracefully
- ✅ No updates made to qTest

### Scenario 5: SeaLights Not Ready

**Setup:**
- Edit `mock-recommendations.json`:
```json
{
  "metadata": {
    ...
    "status": "notReady"
  }
}
```

**Expected Results:**
- ⚠️ Warning: Recommendations not ready
- ℹ️ Displays status
- ✅ Wizard exits gracefully
- ✅ No updates made to qTest

### Scenario 6: Nested Hierarchy Navigation

**Setup:**
- Use a project with:
  - Test Cycles (Releases)
  - Test Suites within Cycles
  - Sub-folders within Suites

**Steps:**
1. Navigate through multiple levels
2. Test "back" navigation (if implemented)
3. Select different levels

**Expected Results:**
- ✅ All levels displayed correctly
- ✅ Test counts shown accurately
- ✅ Path formatting is correct
- ✅ Icons display appropriately (📦📁📋✓)

### Scenario 7: Mixed Folder (Tests + Subfolders)

**Setup:**
- Navigate to a test suite that has:
  - Direct test runs
  - Sub-suites with more tests

**Expected Results:**
- ✅ Option 1: "✓ Tests in current folder" with count
- ✅ Remaining options: Sub-folders
- ✅ Can select either current folder or navigate deeper

### Scenario 8: Empty Project

**Setup:**
- Select a project with no test cycles or suites

**Expected Results:**
- ⚠️ Warning message displayed
- ✅ Wizard exits gracefully

### Scenario 9: Network Errors

**Setup:**
- Temporarily disable network or use invalid credentials

**Expected Results:**
- ❌ Clear error message
- ℹ️ Helpful troubleshooting info
- ✅ No partial updates

### Scenario 10: Partial Update Failures

**Setup:**
- Mock network instability (requires code modification)
- Or use test runs with special characters in names

**Expected Results:**
- ✅ Successful updates complete
- ❌ Failed updates logged
- 📊 Summary shows both successes and failures
- 💾 Output file includes error details

## Manual Verification Checklist

After running the wizard:

### In qTest:
- [ ] Navigate to the selected test location
- [ ] Verify test runs have updated status
- [ ] Check status is correct (e.g., "SL Skipped")
- [ ] Verify only recommended tests were updated
- [ ] Confirm other tests remain unchanged

### In Output File:
- [ ] File exists in `output/` directory
- [ ] Filename includes timestamp
- [ ] JSON is valid and readable
- [ ] All fields populated correctly:
  - [ ] `timestamp`
  - [ ] `project` and `projectId`
  - [ ] `testStage`
  - [ ] `user` and `labId`
  - [ ] `path`
  - [ ] `skipStatus`
  - [ ] `sealightsMetadata`
  - [ ] `recommendations` array
  - [ ] `summary` counts

### In Config File:
- [ ] `recommendations.skipStatusName` updated (if changed)
- [ ] `recommendations.enableMockMode` present
- [ ] JSON formatting preserved
- [ ] No corruption or syntax errors

## TypeScript Compilation

Verify no TypeScript errors:
```bash
npm run build
```

Expected: Clean compilation with no errors

## Common Issues and Solutions

### Issue: "Cannot find module"
**Solution:** Run `npm install` to ensure all dependencies are installed

### Issue: "Status not found"
**Solution:** Create the status in qTest or select an existing one

### Issue: "No test runs found"
**Solution:** Ensure the selected location has test runs with execution data

### Issue: "Test names don't match"
**Solution:** Use exact test run names (case-sensitive) in `mock-recommendations.json`

### Issue: "Authentication failed"
**Solution:** Verify credentials in `config.json` are correct and not expired

### Issue: "Permission denied" during npm commands
**Solution:** Check file permissions or run with appropriate access rights

## Performance Testing

### Large Projects:
- Test with projects containing:
  - 100+ test cycles
  - 500+ test suites
  - 1000+ test runs

**Expected:**
- Reasonable response times (< 5 seconds per API call)
- No memory issues
- Proper pagination handling

## Integration Testing

### With Real SeaLights API:
When ready to test with real API:

1. Set `enableMockMode: false` in config
2. Ensure SeaLights token is valid
3. Run wizard
4. Verify API communication
5. Check response handling

## Regression Testing

After any code changes, re-run:
1. Scenario 1 (Happy Path)
2. Scenario 2 (Status Validation)
3. Scenario 6 (Hierarchy Navigation)

## Test Coverage Goals

- [ ] All user interactions tested
- [ ] All error scenarios handled
- [ ] All qTest API endpoints working
- [ ] Mock mode fully functional
- [ ] Config updates working
- [ ] Output files generated correctly
- [ ] Status validation complete
- [ ] User selection working
- [ ] Test stage mapping functional
- [ ] Hierarchy navigation robust

## Next Steps

After successful testing:
1. Update version number in package.json
2. Create release notes
3. Update main README if needed
4. Package for distribution
5. Deploy to production environment

