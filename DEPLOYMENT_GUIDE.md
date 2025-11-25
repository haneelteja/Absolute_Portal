# Deployment Guide - Edge Function & Email Configuration

## Task 1: Deploy create-user Edge Function

### Option A: Via Supabase Dashboard (Recommended - No CLI needed)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions

2. **Find create-user function:**
   - Click on `create-user` in the functions list
   - Or create it if it doesn't exist

3. **Copy the code:**
   - Open: `supabase/functions/create-user/index.ts` in your editor
   - Copy ALL the code (Ctrl+A, Ctrl+C)

4. **Paste and deploy:**
   - Paste the code into the Supabase Dashboard editor
   - Click "Deploy" button
   - Wait for deployment to complete

### Option B: Via Supabase CLI (If npm install is confirmed)

```powershell
# Set access token
$env:SUPABASE_ACCESS_TOKEN='sbp_f5eeb4c46a2638122e4c2a759b69998e79fc9694'

# Deploy function
npx supabase@latest functions deploy create-user --project-ref qkvmdrtfhpcvwvqjuyuu
```

**Note:** This will prompt to install `supabase@2.61.2`. Type `y` to proceed.

---

## Task 2: Configure RESEND_API_KEY

### Step 1: Get Resend API Key

1. **Sign up/Login to Resend:**
   - Go to: https://resend.com
   - Sign up for a free account (if you don't have one)
   - Free tier includes 3,000 emails/month

2. **Create API Key:**
   - Go to: https://resend.com/api-keys
   - Click "Create API Key"
   - Give it a name (e.g., "Elma Operations Portal")
   - Select permissions: "Sending access"
   - Click "Add"
   - **Copy the API key** (starts with `re_`)
   - ⚠️ **Important:** Save it now - you won't see it again!

### Step 2: Set Secret in Supabase

#### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Edge Functions Settings:**
   - Navigate to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions

2. **Add Secret:**
   - Scroll down to "Secrets" section
   - Click "Add new secret"
   - Name: `RESEND_API_KEY`
   - Value: Paste your Resend API key (starts with `re_`)
   - Click "Save"

#### Option B: Via Supabase CLI

```powershell
# Set access token
$env:SUPABASE_ACCESS_TOKEN='sbp_f5eeb4c46a2638122e4c2a759b69998e79fc9694'

# Set secret (replace YOUR_RESEND_API_KEY with actual key)
npx supabase@latest secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY --project-ref qkvmdrtfhpcvwvqjuyuu
```

### Step 3: Verify Configuration

1. **Check secrets are set:**
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN='sbp_f5eeb4c46a2638122e4c2a759b69998e79fc9694'
   npx supabase@latest secrets list --project-ref qkvmdrtfhpcvwvqjuyuu
   ```

2. **Test email sending:**
   - Create a new user via User Management
   - Check Edge Function logs: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions/send-welcome-email-resend/logs
   - Look for: "Welcome email sent successfully via Resend"
   - User should receive email with credentials

---

## Step 4: (Optional) Verify Domain in Resend

For better email deliverability:

1. **Go to Resend Domains:**
   - Navigate to: https://resend.com/domains

2. **Add Domain:**
   - Click "Add Domain"
   - Enter your domain (e.g., `yourdomain.com`)
   - Follow DNS verification steps

3. **Update Email From Address:**
   - Edit: `supabase/functions/send-welcome-email-resend/index.ts`
   - Change line 125:
     ```typescript
     from: 'Elma Operations <noreply@yourdomain.com>',
     ```
   - Redeploy the function

---

## Verification Checklist

After completing both tasks:

- [ ] `create-user` function deployed successfully
- [ ] `RESEND_API_KEY` secret configured in Supabase
- [ ] Test user creation - email should be sent automatically
- [ ] Check Edge Function logs for email status
- [ ] Verify user receives welcome email
- [ ] Test password reset flow on first login

---

## Troubleshooting

### Edge Function Deployment Failed

- **Check:** Function code syntax is correct
- **Check:** All imports are valid
- **Check:** Access token is correct
- **Solution:** Try Dashboard deployment instead

### Emails Not Sending

- **Check:** RESEND_API_KEY is set correctly
- **Check:** API key has "Sending access" permission
- **Check:** Resend account is active (not suspended)
- **Check:** Edge Function logs for error messages
- **Check:** Email address is valid

### Email Function Returns Success But No Email

- **Check:** Spam folder
- **Check:** Resend dashboard → Emails → Logs
- **Check:** Domain verification status
- **Check:** Email sending limits (free tier: 3,000/month)

---

## Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu
- **Edge Functions:** https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions
- **Function Secrets:** https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions
- **Resend Dashboard:** https://resend.com
- **Resend API Keys:** https://resend.com/api-keys

---

## Current Status

✅ **Code Ready:** All code changes complete
⏳ **Deployment:** Pending - Follow steps above
⏳ **Email Config:** Pending - Follow steps above

