# Quick Start Guide

Get up and running with the qTest On-Premise Data Extraction Tool in 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure

Create your config file:

```bash
cp config.example.json config.json
```

Edit `config.json` and add your qTest credentials:

```json
{
  "qTestUrl": "https://your-qtest-instance.qtestnet.com/",
  "auth": {
    "username": "your.email@company.com",
    "password": "your-password",
    "clientCredentials": "base64-encoded-credentials"
  },
  "sealights": {
    "token": "your-sealights-agent-token",
    "backendUrl": "https://dev-staging.dev.sealights.co"
  }
}
```

**Note:** The `sealights` section is optional. If omitted, timestamps will use qTest times without Sealights clock synchronization.

## Step 3: Extract Data

Run the extraction for the last 7 days:

```bash
npm run extract
```

## Step 4: Check Output

Your data will be in the `output/` directory:

```bash
ls output/
```

You'll see:
- `{project}___{teststage}.json` files with event data
- `_summary.json` with extraction summary

## Common Commands

**Extract last 30 days:**
```bash
npm run extract -- --days 30
```

**Extract all data:**
```bash
npm run extract -- --all
```

**Extract specific project:**
```bash
npm run extract -- --project 12345
```

**Get help:**
```bash
npm run extract -- --help
```

## Next Steps

- Review the full [README.md](README.md) for detailed documentation
- Configure Sealights integration for clock synchronization (optional)
- Configure optional user lab mapping
- Configure optional test stage name mapping
- Set up automated extraction with cron jobs or CI/CD

## Need Help?

See [README.md](README.md) for troubleshooting and advanced configuration options.

