# Fix Deployment Issues

## Issue 1: Secret Name Incorrect ✅ FIXED

**Problem:** Secret was created as "Sales Operations" instead of "RESEND_API_KEY"

**Solution:** The secret name MUST be exactly `RESEND_API_KEY` (case-sensitive)

### Fix Steps:

1. **Go to Supabase Secrets:**
   - https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions

2. **Delete the incorrectly named secret:**
   - Find "Sales Operations" secret
   - Click the delete/trash icon
   - Confirm deletion

3. **Create correct secret:**
   - Click "Add new secret"
   - **Name:** `RESEND_API_KEY` (exactly this, case-sensitive)
   - **Value:** `re_deNLyfiL_AP3BiNLCHg3aNJSjwLHyRUjE`
   - Click "Save"

**Important:** The Edge Function looks for `RESEND_API_KEY` specifically. Any other name won't work.

---

## Issue 2: Edge Function Deployment Failed

**Error:** "Function deploy failed due to an internal error"

### Solution Options:

#### Option A: Try Dashboard Deployment Again

Sometimes Supabase has temporary issues. Try again:

1. **Go to Functions:**
   - https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions

2. **Open create-user function**

3. **Copy code from:** `supabase/functions/create-user/index.ts`

4. **Paste and deploy again**

#### Option B: Check Function Code for Issues

The code looks correct, but let's verify:

1. **Check for syntax errors:**
   - All brackets `{}` are closed
   - All parentheses `()` are closed
   - All strings have matching quotes

2. **Verify imports:**
   - `serve` from Deno std library ✅
   - `createClient` from Supabase JS ✅

#### Option C: Deploy via CLI (If npm install works)

```powershell
# Set access token
$env:SUPABASE_ACCESS_TOKEN='sbp_f5eeb4c46a2638122e4c2a759b69998e79fc9694'

# Deploy (will prompt for npm install - type 'y')
npx supabase@latest functions deploy create-user --project-ref qkvmdrtfhpcvwvqjuyuu
```

#### Option D: Create Function Fresh

If deployment keeps failing:

1. **Delete existing function** (if it exists):
   - Dashboard → Functions → create-user → Delete

2. **Create new function:**
   - Dashboard → Functions → "New Function"
   - Name: `create-user`
   - Copy code from `supabase/functions/create-user/index.ts`
   - Deploy

---

## Verification Steps

After fixing both issues:

1. **Verify Secret:**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN='sbp_f5eeb4c46a2638122e4c2a759b69998e79fc9694'
   npx supabase@latest secrets list --project-ref qkvmdrtfhpcvwvqjuyuu
   ```
   Should show: `RESEND_API_KEY`

2. **Verify Function:**
   - Dashboard → Functions → create-user
   - Should show "Active" status
   - Check logs for any errors

3. **Test User Creation:**
   - Create a new user via User Management
   - Check Edge Function logs
   - Should see: "Welcome email sent successfully via Resend"
   - User should receive email

---

## Quick Fix Checklist

- [ ] Delete "Sales Operations" secret
- [ ] Create "RESEND_API_KEY" secret with correct value
- [ ] Try deploying function again via Dashboard
- [ ] If still failing, try CLI deployment
- [ ] Verify function is active
- [ ] Test user creation and email sending

---

## Common Deployment Errors

### "Internal error"
- **Cause:** Temporary Supabase issue or code syntax error
- **Fix:** Try again, check code syntax, verify all brackets/quotes are closed

### "Function not found"
- **Cause:** Function doesn't exist yet
- **Fix:** Create new function first, then deploy code

### "Secret not found"
- **Cause:** Secret name mismatch
- **Fix:** Ensure secret is named exactly `RESEND_API_KEY`

### "Permission denied"
- **Cause:** Access token expired or incorrect
- **Fix:** Generate new access token from Supabase Dashboard

