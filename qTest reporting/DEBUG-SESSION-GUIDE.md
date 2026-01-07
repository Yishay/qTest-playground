# qTest Reporting Tool - Remote Debugging Session Guide

## 🎯 Purpose
This guide is for a **live debugging session** to diagnose authentication failures with the qTest Reporting Tool.

---

## 📋 Pre-Session Checklist

### For Customer:
- [ ] Have qTest web interface open and logged in
- [ ] Know your qTest login email and password
- [ ] Have terminal/command prompt ready
- [ ] Have config.json file open in a text editor
- [ ] Screen sharing enabled

### For Support Engineer:
- [ ] This debugging guide ready
- [ ] Screen sharing/remote viewing enabled
- [ ] Notepad ready for recording findings

---

## 🔧 Debugging Steps

### Step 1: Verify Installation (1 minute)

**Customer runs:**
```bash
npm --version
node --version
```

**Expected output:**
- npm: 8.x or higher
- node: 16.x or higher

**If missing:** Install Node.js from https://nodejs.org/

---

### Step 2: Verify qTest Web Access (1 minute)

**Ask customer to:**
1. Open qTest in browser
2. Note exact URL from browser address bar (including https://)
3. Confirm they are logged in successfully

**Record:**
- [ ] qTest URL: _________________________________
- [ ] Can login to web: YES / NO

---

### Step 3: Check config.json Structure (2 minutes)

**Customer opens:** `config.json`

**Verify structure:**
```json
{
  "qTestUrl": "https://...",
  "auth": {
    "username": "...",
    "password": "...",
    "clientCredentials": "..."
  }
}
```

**Common issues to check:**
- [ ] Missing comma after qTestUrl
- [ ] Missing quotes around values
- [ ] Extra comma after last item in object
- [ ] File saved as config.json.txt (Windows)

---

### Step 4: Verify qTestUrl Exactly (2 minutes)

**Compare:**
- Browser URL: _________________________________
- config.json qTestUrl: _________________________________

**Must match exactly!**

**Common mistakes:**
❌ `"qTestUrl": "https://company.qtestnet.com"` (missing trailing /)
✅ `"qTestUrl": "https://company.qtestnet.com/"`

❌ `"qTestUrl": "https://company.qtestnet.com/login"` (includes /login)
✅ `"qTestUrl": "https://company.qtestnet.com/"`

**Customer should update if needed and save file.**

---

### Step 5: Verify Username (1 minute)

**Ask customer:**
- What email do you use to login to qTest? _________________________________

**Check config.json:**
```json
"username": "exact.email@company.com"
```

**Must be:**
- [ ] Exact email used for qTest login
- [ ] No extra spaces
- [ ] Surrounded by double quotes

---

### Step 6: Check Password for Special Characters (3 minutes)

**Ask customer:**
"Does your password contain any of these characters?"
- Quotes: " or '
- Backslash: \
- Other special: { } [ ]

**If YES, password needs escaping in JSON:**

| Password Character | How to Write in JSON |
|-------------------|---------------------|
| `"` (quote) | `\"` |
| `\` (backslash) | `\\` |

**Example:**
- Real password: `MyPass"123\`
- In JSON: `"password": "MyPass\"123\\"`

**Customer should update and save if needed.**

---

### Step 7: Verify clientCredentials (1 minute)

**Check config.json has:**
```json
"clientCredentials": "bGluaC1sb2dpbjo="
```

**Must be EXACTLY this value for standard qTest.**

- [ ] Matches exactly
- [ ] No extra spaces
- [ ] No line breaks

---

### Step 8: Run Authentication Test Tool (5 minutes)

**This is the key diagnostic step!**

**Customer runs:**
```bash
npm run test-auth
```

**This tool will:**
1. ✅ Load and validate configuration
2. ✅ Show detailed authentication attempt
3. ✅ Display exact error if it fails
4. ✅ Provide specific solutions

**Watch the output carefully!**

---

### Step 9: Analyze Debug Output

The test-auth tool shows verbose debugging. Look for:

#### 9A. Configuration Validation
```
🔍 Configuration Summary:
qTest URL: ...
Username: ...
Password length: ...
```

**Check for warnings (⚠️ symbols)**

#### 9B. Authentication Request
```
📤 DEBUG: Request Details
✓ Method: POST
✓ URL: https://...
```

**Verify URL is correct**

#### 9C. Response Analysis

**If SUCCESSFUL:**
```
✅ ✅ ✅  AUTHENTICATION SUCCESSFUL! ✅ ✅ ✅
```
→ Authentication is working! Problem is elsewhere.

**If FAILED - Check error details:**

##### Error: "Invalid password"
**Cause:** Username or password is incorrect

**Solutions:**
1. Try logging into qTest web with same credentials
2. If web login fails → reset qTest password
3. If web login works → check password special characters in JSON

##### Error: "Bad credentials"
**Cause:** ClientCredentials or overall auth setup issue

**Solutions:**
1. Verify clientCredentials = "bGluaC1sb2dpbjo="
2. Check if qTest uses custom OAuth setup (rare)

##### Error: "404 Not Found" or "Cannot connect"
**Cause:** Wrong qTestUrl

**Solutions:**
1. Copy exact URL from browser (when logged into qTest)
2. Ensure URL ends with /
3. Remove any path after domain (like /login, /project, etc.)

##### Error: SSL/Certificate errors
**Cause:** Network or SSL issues

**Solutions:**
1. Check if customer is behind corporate proxy
2. Verify network can reach qTest URL
3. May need to configure proxy settings

---

### Step 10: Test Web Login with Exact Credentials (3 minutes)

**If auth test failed, do this:**

1. Ask customer to **logout** of qTest web
2. Ask them to login using the **exact** username and password from config.json
3. Have them copy/paste if possible to avoid typos

**Results:**
- [ ] Web login successful → Password special character issue in JSON
- [ ] Web login failed → Need to reset qTest password

---

### Step 11: Password Reset (if needed) (5 minutes)

**If web login failed:**

1. Customer resets qTest password (use qTest "Forgot Password")
2. Set new **simple** password (no special characters initially)
3. Update config.json with new password
4. Run `npm run test-auth` again

---

### Step 12: Alternative - Bearer Token Method (5 minutes)

**If OAuth continues to fail, use Bearer Token:**

**Steps:**
1. Customer logs into qTest web interface
2. Goes to **Resources** → **API & SDK**
3. Clicks **Generate Token** button
4. Copies the generated token

5. Updates config.json:
```json
{
  "qTestUrl": "https://your-instance.qtestnet.com/",
  "auth": {
    "bearerToken": "paste-token-here"
  }
}
```

Note: Remove username, password, clientCredentials when using bearerToken.

6. Run `npm run test-auth` again

---

## 📊 Common Root Causes (from past cases)

| Issue | Frequency | Solution |
|-------|-----------|----------|
| Special characters in password not escaped | 40% | Escape " and \ characters |
| Wrong qTestUrl (missing / or wrong domain) | 25% | Copy exact URL from browser |
| Username not exact email | 15% | Use exact login email |
| Password wrong (customer doesn't realize) | 10% | Test web login, reset if needed |
| File saved as config.json.txt | 5% | Rename file (Windows: Show extensions) |
| Syntax error in JSON | 3% | Use JSON validator |
| Proxy/Network issues | 2% | Configure proxy settings |

---

## 🎬 Session Flow Script

**Opening (30 seconds):**
> "Thanks for joining. We'll diagnose the authentication issue together. This should take 10-15 minutes. Please share your screen and open a terminal in the tool's directory."

**During Steps (10-12 minutes):**
> "Let's walk through each verification step. I'll tell you exactly what to do..."

**If successful (1 minute):**
> "Great! Authentication is working. Let's now run the actual report..."

**If unsuccessful after all steps (2 minutes):**
> "We've verified everything. Let's try the Bearer Token method as an alternative..."

**Closing (1 minute):**
> "Perfect! You're all set. The tool is working now. Let me send you a summary of what we fixed..."

---

## 📝 Session Notes Template

**Date:** _______________
**Customer:** _______________
**Issue:** Authentication failure

**Findings:**
- qTest URL: _______________
- Auth method: OAuth / Bearer Token
- Root cause: _______________

**Solution applied:**
_______________________________________________
_______________________________________________

**Verification:**
- [ ] npm run test-auth → Success
- [ ] npm run report -- --days 7 → Success

**Follow-up needed:** YES / NO
**Details:** _______________

---

## 🚀 After Successful Authentication

Once authentication works, test the full report:

```bash
# Test with short timeframe first
npm run report -- --days 7

# If successful, run full report
npm run report -- --days 90
```

---

## 📧 Post-Session Email Template

Subject: qTest Reporting Tool - Session Summary

Dear [Customer],

Thank you for today's debugging session. Here's a summary:

**Issue:** Authentication was failing with "[error message]"

**Root Cause:** [describe what was found]

**Solution:** [describe what was changed]

**Verification:** Successfully ran test-auth and generated report

**Your working configuration:**
- qTest URL: [url]
- Authentication: [OAuth/Bearer Token]

**Next Steps:**
1. To generate reports, use: `npm run report -- --days [number]`
2. Configure testStageMapping (if needed) - see README.md
3. Configure userLabMapping (if needed) - see README.md

**Support:** If you encounter any issues, please reach out with:
- Output from `npm run test-auth`
- Any error messages

Best regards,
[Your name]

---

## 📞 Escalation

**If you cannot resolve after this guide:**

1. Capture full output from `npm run test-auth`
2. Capture screenshot of config.json (REDACT password)
3. Capture screenshot of qTest web interface showing URL
4. Check if customer has custom qTest setup
5. Contact qTest support to verify OAuth endpoint

---

## ✅ Success Criteria

Session is successful when:
- [ ] `npm run test-auth` shows "AUTHENTICATION SUCCESSFUL"
- [ ] `npm run report -- --days 7` generates report
- [ ] Customer understands how to run reports
- [ ] config.json is properly configured

---

**Good luck with your debugging session! 🎯**

