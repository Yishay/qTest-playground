# 🚨 Quick Reference - Remote Debug Session

## Customer Commands (in order)

### 1️⃣ Verify Installation
```bash
node --version
npm --version
```

### 2️⃣ Test Authentication (MAIN DIAGNOSTIC)
```bash
npm run test-auth
```

### 3️⃣ Test Report Generation
```bash
npm run report -- --days 7
```

---

## Quick Fixes

### Fix 1: qTestUrl
```json
✅ "qTestUrl": "https://company.qtestnet.com/"
❌ "qTestUrl": "https://company.qtestnet.com"       (missing /)
❌ "qTestUrl": "https://company.qtestnet.com/login" (has /login)
```

### Fix 2: Username
```json
✅ "username": "john.doe@company.com"
❌ "username": "John Doe"
❌ "username": "johndoe"
```

### Fix 3: Password with Special Characters
```json
Real password: MyPass"123\
JSON format:   "password": "MyPass\"123\\"

Rules:
" → \"
\ → \\
```

### Fix 4: ClientCredentials
```json
✅ "clientCredentials": "bGluaC1sb2dpbjo="
❌ "clientCredentials": "linhaC1sb2dpbjo="
```

---

## Error Messages & Solutions

| Error | Quick Fix |
|-------|-----------|
| "Invalid password" | Test web login → check password escaping |
| "Bad credentials" | Check clientCredentials value |
| "404 Not Found" | Verify qTestUrl matches browser exactly |
| "Cannot connect" | Check network, URL spelling |
| "ENOTFOUND" | qTestUrl is wrong domain |

---

## Alternative: Bearer Token

If OAuth fails, switch to Bearer Token:

1. Customer: Login to qTest web → Resources → API & SDK → Generate Token
2. Copy token
3. Update config.json:

```json
{
  "qTestUrl": "https://...",
  "auth": {
    "bearerToken": "paste-token-here"
  }
}
```

4. Remove username, password, clientCredentials
5. Run `npm run test-auth`

---

## Session Checklist

- [ ] Customer can login to qTest web
- [ ] qTestUrl matches browser URL exactly
- [ ] Username is exact login email
- [ ] Password special chars escaped if needed
- [ ] clientCredentials = bGluaC1sb2dpbjo=
- [ ] `npm run test-auth` succeeds
- [ ] `npm run report -- --days 7` succeeds

---

## Success Indicators

```
✅ ✅ ✅  AUTHENTICATION SUCCESSFUL! ✅ ✅ ✅
```

Then:
```
Fetching projects...
✓ Found X projects
```

---

## Common Issues (by frequency)

1. **40%** - Password has `"` or `\` not escaped
2. **25%** - qTestUrl wrong (missing `/` or wrong domain)
3. **15%** - Username not exact email
4. **10%** - Password actually wrong (reset needed)
5. **5%** - File named config.json.txt
6. **3%** - JSON syntax error
7. **2%** - Network/proxy issues

---

## If All Else Fails

1. Capture output from `npm run test-auth`
2. Screenshot config.json (REDACT password)
3. Screenshot qTest browser URL
4. Try Bearer Token method
5. Escalate with captured info

