# Quick Start Guide - qTest Reporting Tool

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure

Copy and edit the configuration file:

```bash
cp config.example.json config.json
```

Edit `config.json` with your qTest URL and credentials:

```json
{
  "qTestUrl": "https://your-qtest-instance.qtestnet.com/",
  "auth": {
    "username": "your.email@company.com",
    "password": "your-password",
    "clientCredentials": "base64-encoded-credentials"
  }
}
```

## 3. Run Your First Report

```bash
npm run report
```

This will query the last 7 days of test executions and generate:
- Console output with formatted results
- JSON file in `output/test-execution-report-YYYY-MM-DD.json`
- CSV file in `output/test-execution-report-YYYY-MM-DD.csv`

## Common Commands

```bash
# Last 7 days (default)
npm run report

# Last 30 days
npm run report -- --days 30

# All time
npm run report -- --all

# Specific project only
npm run report -- --project 1636

# Get help
npm run report -- --help
```

## Output Location

All reports are saved in the `output/` directory with the date in the filename.

## That's It!

You're ready to generate test execution reports from qTest. See `README.md` for detailed documentation.

