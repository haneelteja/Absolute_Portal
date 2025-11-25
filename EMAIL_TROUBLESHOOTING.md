# Email Troubleshooting Guide

## Issue: Email Not Being Sent to bhamini21@gmail.com

### Step 1: Check Edge Function Logs

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions

2. **Check create-user function logs:**
   - Click on `create-user` function
   - Go to "Logs" tab
   - Look for logs related to `bhamini21@gmail.com`
   - Check for:
     - "Attempting to send welcome email to:"
     - "Email function response:"
     - "Email function error:"
     - Any error messages

3. **Check send-welcome-email-resend function logs:**
   - Click on `send-welcome-email-resend` function
   - Go to "Logs" tab
   - Look for recent logs
   - Check for:
     - "RESEND_API_KEY not configured"
     - "Resend API error:"
     - "Welcome email sent successfully"

### Step 2: Verify RESEND_API_KEY Secret

1. **Check if secret exists:**
   - Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions
   - Scroll to "Secrets" section
   - Verify `RESEND_API_KEY` exists
   - Value should be: `re_deNLyfiL_AP3BiNLCHg3aNJSjwLHyRUjE`

2. **Verify secret is accessible:**
   - The secret should be available to Edge Functions automatically
   - If not visible, try deleting and recreating it

### Step 3: Check Function Deployment

1. **Verify send-welcome-email-resend is deployed:**
   - Dashboard → Functions
   - Should see `send-welcome-email-resend` in the list
   - Status should be "Active"

2. **If function doesn't exist:**
   - Create new function: `send-welcome-email-resend`
   - Copy code from: `supabase/functions/send-welcome-email-resend/index.ts`
   - Deploy

### Step 4: Test Email Function Directly

You can test the email function directly:

1. **Go to Edge Function:**
   - Dashboard → Functions → send-welcome-email-resend

2. **Use "Invoke" tab:**
   - Click "Invoke" tab
   - Use this test payload:
   ```json
   {
     "email": "bhamini21@gmail.com",
     "username": "bhamini21",
     "tempPassword": "Test123!",
     "appUrl": "https://sales-operations-portal.vercel.app"
   }
   ```
   - Click "Invoke"
   - Check response and logs

### Step 5: Check Resend Dashboard

1. **Go to Resend Dashboard:**
   - https://resend.com/emails

2. **Check email logs:**
   - Look for emails to `bhamini21@gmail.com`
   - Check status (sent, delivered, bounced, etc.)
   - Check for any errors

3. **Verify API key:**
   - Go to: https://resend.com/api-keys
   - Verify API key is active
   - Check usage limits (free tier: 3,000/month)

### Step 6: Common Issues and Fixes

#### Issue: "RESEND_API_KEY not configured"
**Fix:** 
- Go to Supabase Settings → Edge Functions → Secrets
- Add `RESEND_API_KEY` with your Resend API key
- Redeploy the function

#### Issue: "Function not found"
**Fix:**
- Deploy `send-welcome-email-resend` function
- Verify function name matches exactly

#### Issue: "Resend API error"
**Possible causes:**
- Invalid API key
- API key doesn't have sending permissions
- Rate limit exceeded
- Invalid email address

**Fix:**
- Verify API key in Resend dashboard
- Check API key permissions
- Verify email address format
- Check Resend account status

#### Issue: Email sent but not received
**Possible causes:**
- Email in spam folder
- Email address doesn't exist
- Domain reputation issue

**Fix:**
- Check spam folder
- Verify email address
- Check Resend email logs for delivery status

### Step 7: Manual Email Sending (Temporary)

If email function is not working, check logs for email details:

1. **Check create-user logs:**
   - Look for: `=== WELCOME EMAIL DETAILS (MANUAL SEND REQUIRED) ===`
   - Copy the details
   - Send email manually to user

2. **Email template:**
   ```
   To: bhamini21@gmail.com
   Subject: Welcome to Elma Operations Portal - Your Login Credentials
   
   Dear [username],
   
   Your account has been successfully created in the Elma Operations Portal. 
   Below are your login credentials:
   
   Username: [username]
   Password: [temporary_password]
   
   Please log in at: https://sales-operations-portal.vercel.app
   
   Important: Please change your password after your first login for security purposes.
   
   If you have any issues logging in, please contact support at nalluruhaneel@gmail.com
   
   Best regards,
   Elma Manufacturing Pvt. Ltd.
   ```

---

## Quick Diagnostic Commands

### Check Function Logs (via CLI)
```bash
# Set access token
$env:SUPABASE_ACCESS_TOKEN='sbp_f5eeb4c46a2638122e4c2a759b69998e79fc9694'

# Check create-user logs
npx supabase@latest functions logs create-user --project-ref qkvmdrtfhpcvwvqjuyuu

# Check send-welcome-email-resend logs
npx supabase@latest functions logs send-welcome-email-resend --project-ref qkvmdrtfhpcvwvqjuyuu
```

### Verify Secrets
```bash
npx supabase@latest secrets list --project-ref qkvmdrtfhpcvwvqjuyuu
```

---

## Next Steps

1. ✅ Check Edge Function logs (create-user and send-welcome-email-resend)
2. ✅ Verify RESEND_API_KEY secret exists and is correct
3. ✅ Verify send-welcome-email-resend function is deployed
4. ✅ Test email function directly via Dashboard
5. ✅ Check Resend dashboard for email status
6. ✅ Check spam folder for email

Share the logs you find, and I can help diagnose the specific issue!

