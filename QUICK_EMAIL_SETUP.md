# 🚀 Quick Email Setup - Send to Gmail Addresses

## Important: You DON'T Add Gmail as a Domain!

**How it works:**
1. You verify **YOUR OWN domain** (like `elma.com` or `aamodha.com`)
2. You send **FROM** your domain (e.g., `noreply@elma.com`)
3. You can send **TO** any email address (Gmail, Outlook, Yahoo, etc.)

## Quick Steps

### 1. Verify Your Domain in Resend

1. Go to: https://resend.com/domains
2. Click "Add Domain"
3. Enter **YOUR company domain** (e.g., `elma.com`, `aamodha.com`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (5 min - 48 hours)

### 2. Set the From Address in Supabase

1. Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions
2. Scroll to "Secrets"
3. Click "Add Secret"
4. **Key:** `RESEND_FROM_EMAIL`
5. **Value:** `Elma Operations <noreply@yourdomain.com>`
   - Replace `yourdomain.com` with your verified domain!
   - Example: If domain is `elma.com`, use: `Elma Operations <noreply@elma.com>`

### 3. Test It!

1. Create a test user with a Gmail address
2. Email should be sent successfully! ✅

## What Domain Should You Use?

You need **YOUR COMPANY'S DOMAIN**, not Gmail:

- ✅ `elma.com` (if you own it)
- ✅ `aamodha.com` (if you own it)  
- ✅ `yourcompany.com` (any domain you own)
- ❌ `gmail.com` (can't verify - it's Google's domain)

## Don't Have a Domain?

- **Option 1:** Buy one (~$10-15/year from Namecheap, GoDaddy, etc.)
- **Option 2:** Use a subdomain if you have a main domain
- **Option 3:** Continue manual email sending for now

## Current Status

✅ Email functions updated to use `RESEND_FROM_EMAIL` environment variable
✅ Both welcome emails and password reset emails will use your verified domain
✅ Once domain is verified and secret is set, emails will work for all recipients!

## Need More Details?

See `EMAIL_DOMAIN_SETUP_GUIDE.md` for complete instructions.
