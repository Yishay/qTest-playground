# Changelog

All notable changes to the qTest On-Premise Data Extraction Tool will be documented in this file.

## [1.0.0] - 2024-12-24

### Added
- Initial release of qTest On-Premise Data Extraction Tool
- Extract test execution data from qTest instances
- Generate event-based JSON output (testStart/testEnd events)
- **Clock synchronization with Sealights backend**
  - Calculate drift between qTest Server and Integration Runtime (clockDriftMs)
  - Sync with Sealights BE via `/api/sync` endpoint (slDriftMs)
  - Adjust all event timestamps: adjustedTime = originalQTestTime + clockDriftMs + slDriftMs
- Support for OAuth and Bearer Token authentication
- Date range filtering (--days, --all)
- Project-specific extraction (--project)
- User lab mapping configuration
- Test stage name mapping configuration
- Automatic file merging for incremental extractions
- Summary file generation
- Safe filename generation from project/test stage names
- Comprehensive error handling and logging
- TypeScript support with full type definitions

### Features
- Query qTest API v3 for projects, test suites, test runs, and test logs
- Convert test logs to testStart and testEnd events
- Three-way clock synchronization (qTest, Integration Runtime, Sealights BE)
- Map qTest statuses (pass/fail/skip) to event results
- Associate users with lab IDs via configuration
- Rename test stages via configuration mapping
- Sort events chronologically
- Write output to individual JSON files per test stage
- Generate summary of all extracted data
- Command-line interface with flexible options

