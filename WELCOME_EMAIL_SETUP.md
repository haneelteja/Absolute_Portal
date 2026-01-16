# 📧 Welcome Email Setup Guide

## Quick Setup (Recommended: Gmail SMTP)

The easiest way to get welcome emails working is using **Gmail SMTP** - no domain verification needed!

## 🚀 Step-by-Step Setup

### Step 1: Get Gmail App Password (2 minutes)

1. **Go to Google Account Settings:**
   - Visit: https://myaccount.google.com/apppasswords
   - Sign in with your Gmail account

2. **Enable 2-Step Verification** (if not already enabled):
   - Google will prompt you if needed
   - Follow the setup instructions

3. **Create App Password:**
   - Select "Mail" → "Other (Custom name)"
   - Name: `Supabase Email`
   - Click "Generate"
   - **Copy the 16-character password** (you'll need this!)

### Step 2: Configure Supabase Secrets (3 minutes)

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions
   - Scroll down to **"Secrets"** section

2. **Add these secrets** (click "Add new secret" for each):

   | Secret Name | Value | Example |
   |------------|-------|---------|
   | `SMTP_HOST` | `smtp.gmail.com` | `smtp.gmail.com` |
   | `SMTP_PORT` | `465` | `465` |
   | `SMTP_USER` | Your Gmail address | `nalluruhaneel@gmail.com` |
   | `SMTP_PASS` | Your 16-char App Password | `abcd efgh ijkl mnop` |
   | `SMTP_FROM_EMAIL` | Your Gmail address | `nalluruhaneel@gmail.com` |
   | `SMTP_FROM_NAME` | Display name | `Elma Operations` |

3. **Click "Save"** for each secret

### Step 3: Deploy Email Functions (2 minutes)

#### Option A: Using Supabase Dashboard (Easiest)

1. **Deploy `send-welcome-email-smtp`:**
   - Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions
   - Click "Deploy a new function"
   - Function name: `send-welcome-email-smtp`
   - Copy code from: `supabase/functions/send-welcome-email-smtp/index.ts`
   - Paste and click "Deploy"

2. **Update `create-user` function:**
   - Find `create-user` in functions list
   - Click "Edit"
   - Copy updated code from: `supabase/functions/create-user/index.ts`
   - Replace existing code
   - Click "Deploy"

#### Option B: Using Supabase CLI

```bash
# Navigate to project root
cd "c:\Users\Haneel Teja\Cursor Applications\Aamodha-Operations-Portal---V1"

# Deploy SMTP function
npx supabase functions deploy send-welcome-email-smtp --project-ref qkvmdrtfhpcvwvqjuyuu

# Update create-user function
npx supabase functions deploy create-user --project-ref qkvmdrtfhpcvwvqjuyuu
```

### Step 4: Test Email Sending (2 minutes)

1. **Create a test user:**
   - Go to your application's User Management page
   - Create a new user with your email address (to test)
   - Fill in all required fields
   - Click "Create User"

2. **Check the logs:**
   - Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions/create-user/logs
   - Look for:
     - `✅ Email sent successfully via SMTP` (success!)
     - OR `SMTP function not available or failed, trying Resend...` (SMTP not configured)

3. **Check your email:**
   - Check inbox (and spam folder)
   - You should receive a welcome email with login credentials

## ✅ Success Indicators

When everything is working, you'll see in the logs:
```
Trying SMTP email function first...
✅ Email sent successfully via SMTP
```

And the user will receive an email with:
- Welcome message
- Username
- Temporary password
- Login link

## 🔄 Fallback Chain

Your email system tries in this order:
1. **SMTP (Gmail)** ← Primary (if configured)
2. **Resend** ← Fallback (if SMTP fails)
3. **Manual sending** ← Last resort (details logged)

## 🐛 Troubleshooting

### Email Not Sending?

1. **Check SMTP Configuration:**
   - Verify all 6 secrets are set correctly
   - Make sure `SMTP_PASS` is the App Password (16 chars), not your regular password
   - Verify `SMTP_USER` is your full Gmail address

2. **Check Function Logs:**
   - Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/functions/create-user/logs
   - Look for error messages
   - Check `send-welcome-email-smtp` logs too

3. **Common Issues:**
   - **"Authentication failed"** → Use App Password, not regular password
   - **"Email not received"** → Check spam folder, verify Gmail daily limit (500/day)
   - **"Function not found"** → Deploy `send-welcome-email-smtp` function

### Gmail Limits

- **Free Gmail:** 500 emails/day
- **Google Workspace:** 2,000 emails/day

If you need more, consider:
- Resend (3,000/month free)
- Mailgun (5,000/month free)
- SendGrid (100/day free)

## 📋 Alternative: Resend Setup (If Gmail Doesn't Work)

If you prefer Resend:

1. **Sign up:** https://resend.com
2. **Get API Key:** Copy from dashboard (starts with `re_`)
3. **Add Secret:** `RESEND_API_KEY` = your API key
4. **Note:** Resend free tier only sends to verified emails or your own email

## 📋 Alternative: Mailgun Setup (Best Free Tier)

If you want the best free tier (5,000/month):

1. **Sign up:** https://mailgun.com
2. **Verify domain** (or use sandbox domain for testing)
3. **Get API Key:** Copy Private API key
4. **Add Secrets:**
   - `MAILGUN_API_KEY` = your API key
   - `MAILGUN_DOMAIN` = your domain (e.g., `mg.elma.com`)
   - `MAILGUN_FROM_EMAIL` = `noreply@yourdomain.com`
   - `MAILGUN_FROM_NAME` = `Elma Operations`
5. **Deploy:** `send-welcome-email-mailgun` function
6. **Update:** `create-user` to include Mailgun in fallback chain

See `MAILGUN_SETUP_GUIDE.md` for detailed instructions.

## 🎯 Next Steps

1. ✅ Configure SMTP secrets
2. ✅ Deploy email functions
3. ✅ Test with a real user
4. ✅ Monitor logs for any issues
5. ✅ Consider adding Mailgun for better reliability

## 📚 Additional Resources

- `QUICK_SMTP_SETUP.md` - Quick Gmail SMTP guide
- `SUPABASE_SMTP_SETUP.md` - Detailed SMTP setup
- `MAILGUN_SETUP_GUIDE.md` - Mailgun setup guide
- `EMAIL_SERVICE_ALTERNATIVES.md` - Compare email services

---

**Need Help?** Check the logs first, then review the troubleshooting section above.
