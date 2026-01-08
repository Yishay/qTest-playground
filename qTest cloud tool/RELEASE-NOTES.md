# qTest Cloud Tool - Release Notes

## Version 3.0.1 - On-Prem Support Fix

### Release Date
January 1, 2026

### Bug Fixes
- **Fixed On-Prem Compatibility**: Bulk import now works with both qTest Cloud and On-Prem
  - Added fallback logic to detect and use On-Prem API patterns
  - Automatically tries Cloud releases endpoint first, then falls back to On-Prem root cycles
  - No configuration needed - works automatically for both environments

---

## Version 3.0 - Bulk Import with Recommendations

### Release Date
January 1, 2026

### Major Features

#### 1. Bulk Import from Test Design
- **New Command**: `npm run bulk-import` or `npm run bulk-import:prod`
- Import entire module hierarchies from Test Design into Test Execution
- Interactive navigation through both Test Design and Test Execution hierarchies
- Automatically creates test cycles and test suites mirroring the module structure
- Preserves module hierarchy order from Test Design

#### 2. Recommendations-Based Test Filtering
- Integration with SeaLights recommendations (or mock mode)
- Filters imported tests by `testStage` from recommendations
- Only marks tests in `excludedTests` as skipped
- Other tests in the same testStage remain unmodified
- Configurable via `testStageMapping` in `config.json`

#### 3. Approval Status Filtering
- CLI prompt to choose whether to include unapproved test cases
- Filters test cases by approval status (New, Approved, etc.)
- Shows clear breakdown: "8 approved, 2 unapproved - excluded"
- Reduces "Invalid test case version" errors

#### 4. Silent Error Logging
- All errors logged to `output/bulk-import-errors.log`
- Clean console output without stack traces
- Error summary displayed at the end of execution
- Breakdown by error type (VERSION_NOT_APPROVED, HIERARCHY_CREATION_FAILED, etc.)

### Configuration

#### Mock Recommendations Mode
Add to `config.json`:
```json
{
  "recommendations": {
    "skipStatusName": "SL Skipped",
    "enableMockMode": true
  }
}
```

Then create `mock-recommendations.json`:
```json
{
  "metadata": {
    "testStage": "ADMS Integration E2E Tests",
    ...
  },
  "excludedTests": [
    { "testName": "Some Test" },
    { "testName": "Another Test" }
  ]
}
```

#### Test Stage Mapping
Map test suite names to test stages:
```json
{
  "testStageMapping": {
    "Sealights / ADMS Integration E2E Tests": "ADMS Integration E2E Tests",
    "Sealights / Read only mode": "Read only mode",
    ...
  }
}
```

### Workflow

1. **Select Project** - Choose your qTest project
2. **Navigate Test Execution** - Select destination folder (cycle/suite)
3. **Navigate Test Design** - Select module to import
4. **Approval Filter** - Choose to include/exclude unapproved tests
5. **Confirm Import** - Review and confirm
6. **Import Tests** - Creates hierarchy and test runs
7. **Validate Status** - Ensures skip status exists
8. **Select User** - Choose user for test execution
9. **Load Recommendations** - Loads SeaLights recommendations
10. **Update Test Runs** - Applies skip status to excluded tests
11. **Summary** - Shows results and error log location

### Bug Fixes

- Fixed module hierarchy ordering (now matches Test Design order)
- Fixed test cycle/suite creation with correct parent relationships
- Fixed test case version handling for status updates
- Removed console error noise (now logged to file)
- Fixed inverted excludedTests logic (now correctly skips excluded tests)

### Technical Improvements

- Query parameters for parent relationships (`?parentId=X&parentType=Y`)
- Recursive hierarchy creation
- Error logger class for centralized error handling
- Improved console output formatting
- Better error messages and user guidance

### Breaking Changes

None. Existing commands (`recommendations`, `recommendations:prod`) continue to work as before.

### Known Limitations

1. **Unapproved Test Cases**: Test cases with "New" status may fail to update with errors like "Invalid test case version"
   - **Workaround**: Choose "No" when asked to include unapproved tests
   
2. **Test Stage Mapping**: Requires manual configuration of test suite names to test stages in `config.json`

3. **Mock Mode Only**: Real SeaLights API integration not yet implemented
   - **Workaround**: Use `enableMockMode: true` and `mock-recommendations.json`

### Migration Guide

#### From Version 2.x

No migration needed. New commands are additive and don't affect existing functionality.

#### Configuration Updates

Add these new sections to your `config.json`:

```json
{
  "testStageMapping": {
    "Sealights / Your Test Suite Name": "Your Test Stage"
  },
  "recommendations": {
    "skipStatusName": "SL Skipped",
    "enableMockMode": true
  }
}
```

### Files

- **Core Files**:
  - `src/bulk-import-tests.ts` - Main bulk import logic
  - `src/module-navigator.ts` - Test Design navigation
  - `src/hierarchy-navigator.ts` - Test Execution navigation
  - `src/error-logger.ts` - Error logging utility
  - `src/recommendations-applier.ts` - Status update logic

- **Documentation**:
  - `README.md` - Overview and quickstart
  - `BULK-IMPORT-GUIDE.md` - Detailed bulk import guide
  - `RELEASE-NOTES.md` - This file

- **Configuration**:
  - `config.example.json` - Example configuration
  - `mock-recommendations.json` - Example recommendations

### Support

For issues, questions, or feature requests, please contact the development team.

---

**Previous Version**: 2.0 (Recommendations with Webhook)
**Next Version**: TBD

