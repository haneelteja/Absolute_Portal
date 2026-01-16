# 📧 Email Domain Setup Guide - Send to Gmail Addresses

## Understanding the Issue

**You DON'T need to add Gmail as a domain!** 

Here's how it works:
- **You verify YOUR OWN domain** (like `elma.com` or `aamodha.com`)
- **You send FROM your domain** (e.g., `noreply@elma.com`)
- **You can send TO any email address** (including Gmail, Outlook, Yahoo, etc.)

## Step-by-Step Guide

### Step 1: Verify Your Domain in Resend

1. **Go to Resend Dashboard:**
   - Visit: https://resend.com/domains
   - Sign in to your Resend account

2. **Add Your Domain:**
   - Click "Add Domain" button
   - Enter your company domain (e.g., `elma.com`, `aamodha.com`, or `yourcompany.com`)
   - **DO NOT** try to add `gmail.com` - that won't work!

3. **Add DNS Records:**
   Resend will show you DNS records to add. Go to your domain registrar (where you bought the domain) and add:
   
   - **SPF Record** (TXT type)
   - **DKIM Records** (TXT type) 
   - **DMARC Record** (TXT type) - Optional but recommended
   
   Example records (Resend will give you exact values):
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   
   Type: TXT
   Name: resend._domainkey
   Value: [DKIM key from Resend]
   ```

4. **Wait for Verification:**
   - DNS changes can take 5 minutes to 48 hours
   - Resend will automatically verify when DNS is ready
   - Status will show "Verified" when complete

### Step 2: Update the From Address

Once your domain is verified, you need to set the `from` address:

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions
   - Scroll to "Secrets" section

2. **Add Environment Variable:**
   - Click "Add Secret"
   - **Key:** `RESEND_FROM_EMAIL`
   - **Value:** `Elma Operations <noreply@yourdomain.com>`
   
   **Replace `yourdomain.com` with your verified domain!**
   
   Examples:
   - If domain is `elma.com`: `Elma Operations <noreply@elma.com>`
   - If domain is `aamodha.com`: `Elma Operations <noreply@aamodha.com>`
   - If domain is `yourcompany.com`: `Elma Operations <noreply@yourcompany.com>`

3. **Save the Secret**

### Step 3: Test Email Sending

1. **Create a test user** with a Gmail address (e.g., `test@gmail.com`)
2. **Check if email is sent** - it should work now!
3. **Check Resend dashboard** for delivery status

## What Domain Should You Use?

You need to verify **YOUR COMPANY'S DOMAIN**, not Gmail. Examples:

- ✅ `elma.com` (if you own this domain)
- ✅ `aamodha.com` (if you own this domain)
- ✅ `yourcompany.com` (any domain you own)
- ❌ `gmail.com` (you can't verify this - it's Google's domain)
- ❌ `outlook.com` (you can't verify this - it's Microsoft's domain)

## Don't Have a Domain?

If you don't have a company domain, you have options:

### Option 1: Buy a Domain
- Buy a domain from Namecheap, GoDaddy, or Google Domains
- Cost: ~$10-15/year
- Then verify it in Resend

### Option 2: Use a Subdomain
- If you have a main domain, you can use a subdomain
- Example: If you have `yourcompany.com`, use `mail.yourcompany.com`
- Verify the subdomain in Resend

### Option 3: Continue Manual Sending
- For now, continue sending emails manually
- User credentials are logged in Supabase Edge Function logs
- This works but requires manual work

## Current Configuration

The email function has been updated to use the `RESEND_FROM_EMAIL` environment variable. 

**Current behavior:**
- If `RESEND_FROM_EMAIL` is set → Uses that address
- If not set → Falls back to `onboarding@resend.dev` (testing mode, only works for your verified email)

## Quick Checklist

- [ ] I understand I need to verify MY OWN domain, not Gmail
- [ ] I have a domain to verify (or I'll buy one)
- [ ] I've added the domain to Resend
- [ ] I've added DNS records to my domain registrar
- [ ] Domain is verified in Resend dashboard
- [ ] I've set `RESEND_FROM_EMAIL` secret in Supabase
- [ ] I've tested sending an email to a Gmail address

## Troubleshooting

**"Domain verification failed"**
- Check DNS records are correct
- Wait 24-48 hours for DNS propagation
- Use DNS checker tools to verify records are live

**"Still can't send to Gmail"**
- Make sure domain is fully verified (green checkmark in Resend)
- Verify `RESEND_FROM_EMAIL` secret is set correctly
- Check Resend dashboard for any errors

**"I don't have a domain"**
- Consider buying one (very affordable)
- Or continue with manual email sending for now

## Support

- **Resend Domain Docs:** https://resend.com/docs/dashboard/domains/introduction
- **Resend Support:** support@resend.com
