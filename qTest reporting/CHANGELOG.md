# Changelog

All notable changes to the qTest Reporting Tool will be documented in this file.

## [1.3.2] - 2026-01-07

### Changed
- **Test Stage Fallback**: When testStageMapping is configured but no mapping matches a test, the tool now uses the qTest path (e.g., "eTerraDistribution / Grid Tabular") instead of marking it as "UNKNOWN"
- **Improved Output**: Console now shows how many tests matched configured mappings vs. using qTest paths
- **Better Default Behavior**: All tests now get a meaningful test stage name, even without explicit mapping

### Benefits
- No need to map every test suite in configuration
- Only map test suites you want custom stage names for
- Unmapped tests appear in reports with their qTest path, making them easy to identify
- Reduces configuration overhead while maintaining full visibility

## [1.3.1] - 2026-01-07

### Fixed
- **Version Compatibility**: Added robust date field handling for qTest On-Prem 2024.2.1.1 and other versions
- **Fallback Logic**: exe_end_date now falls back to exe_start_date or test_step_logs[0].exe_date if not populated
- **Date Validation**: Added validation to detect and skip test logs with invalid or missing dates
- **Type Safety**: Made exe_start_date and exe_end_date optional in type definitions
- **Better Warnings**: Console warnings now show which test logs are skipped and why

### Changed
- Date field priority: exe_end_date > exe_start_date > test_step_logs[0].exe_date
- Duration calculation now handles missing date fields gracefully
- Test logs without ANY date fields are now skipped with warning instead of causing parse errors

### Compatibility
- ✅ Works with qTest Cloud (all versions)
- ✅ Works with qTest On-Prem 2024.2.x (including 2024.2.1.1)
- ✅ Works with qTest On-Prem 2024.1.x
- ✅ Handles NULL/undefined exe_end_date fields

## [1.3.0] - 2026-01-06

### Added
- **User Lab Mapping**: Optional `userLabMapping` configuration to associate users with lab/environment IDs
- **Enhanced CSV Output**: Added Lab ID column (now 12 columns total)
- **Lab Filtering**: New `--lab` command-line option to filter reports by lab ID
- **New JSON Structure**: Replaced `executionsByDateAndUser` with `executionsByStageAndLab` for better organization
- **Lab Statistics**: Lab information in console output and JSON summary
- **Combined Filtering**: Support for filtering by both stage and lab simultaneously

### Changed
- **CSV Format**: Expanded from 11 to 12 columns (added Lab ID after User Email)
- **JSON Output**: Replaced `executionsByDateAndUser` with `executionsByStageAndLab` structure
- **Console Output**: Simplified to show grouped summary by test stage and lab combination
- **JSON Summary**: Added `labs` array when mapping is enabled

### Features
- Lab mapping based on user email addresses
- Flexible configuration - works with or without lab mapping
- Lab-based filtering with helpful error messages showing available labs
- Support for multiple filters (e.g., `--stage "Regression" --lab "lab-01"`)
- Organized output by test stage and lab combinations

## [1.2.0] - 2026-01-06

### Added
- **Test Stage Mapping**: Optional `testStageMapping` configuration to organize tests by logical stages
- **Enhanced CSV Output**: Added Test Cycle, Test Suite, and Test Stage columns
- **Stage Filtering**: New `--stage` command-line option to filter reports by test stage
- **Hierarchical Console Output**: Tests now grouped by test stage when mapping is configured
- **Enhanced JSON Output**: Includes test stage information and statistics in summary

### Changed
- CSV format expanded from 8 to 11 columns (added Test Cycle, Test Suite, Test Stage)
- Console output now shows test stage grouping with 📂 icon when mapping is configured
- JSON summary now includes `testStages` array when mapping is enabled

### Features
- Test stage mapping tries multiple key formats automatically (Project/Cycle/Suite, Project/Suite, Suite, Cycle)
- Flexible mapping configuration - works with or without test stage mapping
- Stage-based filtering with helpful error messages showing available stages

## [1.1.0] - 2025-12-23

### Added
- Duration calculation in minutes for test executions
- Proper user name and email resolution from user ID
- Enhanced console output showing start time, end time, and duration

### Changed
- **CSV Format**: Replaced "Start Time" and "End Time" columns with "Duration (minutes)" column
- Duration is calculated and rounded to 2 decimal places for accuracy
- User information now properly displays user name and email instead of user ID
- Console output now shows duration alongside start and end times

### Fixed
- Fixed issue where User and User Email columns showed user ID instead of actual name and email
- Improved user information extraction from test logs
- Better handling of user ID to email/name mapping

## [1.0.0] - 2025-12-23

### Added
- Initial release of qTest Test Execution Reporting Tool
- Support for querying test executions from qTest API
- Multiple output formats: Console, JSON, and CSV
- Flexible date range filtering (--days, --all)
- Project-specific filtering (--project)
- OAuth and Bearer Token authentication support
- Hierarchical test structure traversal (Projects → Test Cycles → Test Suites → Test Runs → Test Logs)
- Comprehensive documentation (README.md, QUICKSTART.md)
- Example configuration file
- TypeScript support with full type definitions

