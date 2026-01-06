# qTest Reporting Tool - Version 3 Release Notes

## Version 1.3.0 - January 6, 2026

This release introduces **Lab/Environment Mapping** and **Enhanced JSON Output Structure** to provide better organization and filtering capabilities for test execution reports.

---

## 🎯 Key Features

### 1. User Lab Mapping
- **New Configuration**: `userLabMapping` - Map user email addresses to lab/environment IDs
- **Automatic Assignment**: Test executions are automatically tagged with lab IDs based on the user who executed them
- **Flexible Configuration**: Works with or without lab mapping enabled

### 2. Lab-Based Filtering
- **New CLI Option**: `--lab <labId>` - Filter reports by specific lab/environment
- **Combined Filtering**: Use both `--stage` and `--lab` filters together
- **Smart Validation**: Shows available labs if an invalid lab ID is provided

### 3. Enhanced Output Structure

#### JSON Output
- **New Structure**: `executionsByStageAndLab` - Groups test executions by both test stage and lab
- **Simplified Format**: Removed `executionsByDateAndUser` and `allExecutions` for cleaner output
- **Enhanced Summary**: Added `labs` array to summary statistics

#### CSV Output
- **Added Column**: Lab ID column (now 12 columns total)
- **Order**: Project, Release, Test Cycle, Test Suite, Test Run, Test Case, User, User Email, **Lab ID**, Test Stage, Status, Duration

#### Console Output
- **Grouped Display**: Shows test results organized by test stage and lab combination
- **Clear Statistics**: Summary shows execution counts per stage/lab combination
- **Clean Layout**: Simplified output format for better readability

---

## 📋 Configuration

### New Configuration Options

```json
{
  "userLabMapping": {
    "user1@company.com": "lab-01",
    "user2@company.com": "lab-02",
    "user3@company.com": "lab-01"
  }
}
```

### Complete Example

```json
{
  "qTestUrl": "https://your-qtest-instance.com",
  "authType": "oauth",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "testStageMapping": {
    "MyProject/Regression Suite": "Regression",
    "MyProject/Smoke Tests": "Smoke"
  },
  "userLabMapping": {
    "qa.engineer@company.com": "lab-01",
    "dev.engineer@company.com": "lab-02"
  }
}
```

---

## 🚀 Usage Examples

### Filter by Lab
```bash
npm run report -- --lab lab-01
```

### Filter by Stage and Lab
```bash
npm run report -- --stage "Regression" --lab lab-01
```

### Generate Report for Specific Project and Lab
```bash
npm run report -- --project "MyProject" --lab lab-02 --days 30
```

---

## 🔄 Migration Notes

### Breaking Changes
- **JSON Output Structure**: The JSON output no longer includes `executionsByDateAndUser` or `allExecutions`. If you have automation consuming the JSON output, update it to use the new `executionsByStageAndLab` structure.

### New JSON Structure Example

```json
{
  "summary": {
    "totalExecutions": 100,
    "passedExecutions": 85,
    "failedExecutions": 10,
    "skippedExecutions": 5,
    "testStages": ["Regression", "Smoke"],
    "labs": ["lab-01", "lab-02"]
  },
  "executionsByStageAndLab": [
    {
      "testStage": "Regression",
      "labId": "lab-01",
      "tests": [
        {
          "project": "MyProject",
          "release": "Release 1.0",
          "testCycle": "Sprint 10",
          "testSuite": "Login Suite",
          "testRun": "Test Login Success",
          "testCase": "TC-001",
          "user": "John Doe",
          "userEmail": "john.doe@company.com",
          "labId": "lab-01",
          "testStage": "Regression",
          "status": "Passed",
          "duration": 2.5
        }
      ]
    }
  ]
}
```

---

## 📦 What's Included

- Source code (`src/` directory)
- Configuration example (`config.example.json`)
- Documentation:
  - `README.md` - Complete documentation
  - `QUICKSTART.md` - Quick start guide
  - `CHANGELOG.md` - Full change history
  - `PROJECT_INFO.md` - Project information
  - `RELEASE-NOTES-v3.md` - This file
- TypeScript configuration
- Package files

---

## 🔧 Installation

1. Extract the zip file
2. Run `npm install`
3. Copy `config.example.json` to `config.json` and configure with your qTest credentials
4. (Optional) Add `testStageMapping` to organize tests by logical stages
5. (Optional) Add `userLabMapping` to associate users with labs
6. Run `npm run report` to generate your first report

---

## 📚 Additional Resources

- See `README.md` for complete documentation
- See `QUICKSTART.md` for step-by-step setup guide
- See `CHANGELOG.md` for detailed version history

---

## 🐛 Bug Fixes and Improvements

- Enhanced TypeScript type definitions
- Improved error handling for lab filtering
- Better validation messages for configuration
- Optimized data processing for large result sets

---

## 💡 Coming Soon

Future versions may include:
- Additional filtering options (by status, user, date range combinations)
- Export to additional formats (Excel, HTML)
- Trend analysis and historical comparisons
- Custom report templates

---

For questions or support, please refer to the documentation or contact your qTest administrator.

