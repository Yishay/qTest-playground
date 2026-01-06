# Changelog

All notable changes to the qTest Reporting Tool will be documented in this file.

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

