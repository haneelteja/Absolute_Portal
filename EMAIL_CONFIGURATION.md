# Email Configuration Guide

## Welcome Email Setup

The system sends welcome emails to new users with their login credentials. Currently, the email service uses **Resend** API.

### Current Status

- ✅ Email function deployed: `send-welcome-email-resend`
- ⚠️ **RESEND_API_KEY not configured** - Emails are logged but not sent

### Option 1: Configure Resend API (Recommended)

1. **Get Resend API Key:**
   - Sign up at https://resend.com
   - Go to API Keys section
   - Create a new API key
   - Copy the key (starts with `re_`)

2. **Set Secret in Supabase:**
   ```bash
   # Using Supabase CLI
   npm exec -- supabase secrets set RESEND_API_KEY=re_your_api_key_here --project-ref qkvmdrtfhpcvwvqjuyuu
   ```

   Or via Dashboard:
   - Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/functions
   - Scroll to "Secrets"
   - Add `RESEND_API_KEY` with your Resend API key

3. **Verify Domain (Optional):**
   - In Resend dashboard, verify your sending domain
   - Update the `from` field in `supabase/functions/send-welcome-email-resend/index.ts`:
     ```typescript
     from: 'Elma Operations <noreply@yourdomain.com>',
     ```

### Option 2: Use Supabase Email Service

If you prefer to use Supabase's built-in email service:

1. **Configure SMTP in Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/qkvmdrtfhpcvwvqjuyuu/settings/auth
   - Scroll to "SMTP Settings"
   - Configure your SMTP provider (Gmail, SendGrid, etc.)

2. **Update Edge Function:**
   - Modify `supabase/functions/create-user/index.ts` to use Supabase's email API instead of Resend

### Current Behavior

**Without RESEND_API_KEY configured:**
- User creation succeeds ✅
- Email details are logged in Edge Function logs ✅
- Admin must manually send email to user ⚠️

**Email details are logged in:**
- Supabase Dashboard → Edge Functions → `send-welcome-email-resend` → Logs
- Look for: `=== WELCOME EMAIL DETAILS (MANUAL SEND REQUIRED) ===`

### Email Template

The welcome email includes:
- Username
- Temporary password
- Login URL
- Instructions to change password on first login
- Support contact information

### Testing

After configuring RESEND_API_KEY:
1. Create a new user
2. Check Edge Function logs for email status
3. Verify email is received by user
4. User should be forced to change password on first login

---

## Password Reset on First Login

✅ **Implemented and Working**

When a new user is created:
1. User receives welcome email with temporary password
2. User logs in with temporary password
3. System detects `requires_password_reset: true` flag
4. User is **blocked from accessing portal** until password is changed
5. Forced password reset dialog appears
6. User must set new password before continuing
7. After password change, user can access portal normally

### How It Works

- **User Creation:** `create-user` Edge Function sets:
  - `requires_password_reset: true`
  - `first_login: true`
  - `password_changed_at: null`

- **Login Detection:** `AuthContext` checks user metadata on sign-in

- **Access Block:** `PortalRouter` redirects to Auth page if password reset required

- **Password Update:** `updatePassword` clears the flags and sets `password_changed_at`

---

## Troubleshooting

### Emails Not Sending

1. **Check RESEND_API_KEY:**
   ```bash
   npm exec -- supabase secrets list --project-ref qkvmdrtfhpcvwvqjuyuu
   ```

2. **Check Edge Function Logs:**
   - Dashboard → Functions → `send-welcome-email-resend` → Logs
   - Look for error messages

3. **Verify Resend Account:**
   - Check Resend dashboard for API usage
   - Verify API key is active
   - Check sending limits

### Password Reset Not Working

1. **Check User Metadata:**
   - Verify `requires_password_reset` is set to `true` in `auth.users`
   - Check `user_metadata` in Supabase Dashboard

2. **Check Browser Console:**
   - Look for `requiresPasswordReset` flag
   - Verify AuthContext is detecting the flag

3. **Test Flow:**
   - Create new user
   - Log in with temporary password
   - Verify forced password reset dialog appears
   - Change password
   - Verify access to portal

