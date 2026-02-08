# Absolute Portal – Custom Invite Email Template

Use this in **Supabase** to replace the default invite email with the Absolute Portal branding and copy.

---

## Where to set it

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project (**ksfkgzlwgvwijjkaoaqq**).
2. Open **Authentication** → **Email Templates**.
3. Select **Invite user**.
4. Paste the **Subject** and **Message** below, then click **Save**.

---

## Subject (copy exactly)

```
You're invited to join Absolute Portal
```

---

## Message (paste into the "Message" / body field)

Supabase supports HTML. Paste this entire block:

```html
Hello 👋<br><br>
You've been invited to join <strong>Absolute Portal</strong>.<br><br>
Click the link below to <strong>set your password</strong> and activate your account:<br><br>
👉 <a href="{{ .ConfirmationURL }}">Set your password &amp; accept invitation</a><br><br>
You will choose your own password when you open the link. No password is sent in this email for security.<br><br>
This link is valid for a limited time. If you didn't expect this invitation, you can safely ignore this email.<br><br>
We're excited to have you on board!<br><br>
—<br>
Team Absolute
```

---

## How the invited user gets access (no password in email)

- **No password is included in the invite email.** For security, Supabase does not send or generate a password in the email.
- When the user clicks the link in the email, they are taken to the app to **set their own password** and confirm their account. After that, they sign in with that password.
- Flow: **Invite email** → user clicks link → **set password** → **sign in** with that password → user is in the portal.

---

## Notes

- **`{{ .ConfirmationURL }}`** is required: Supabase replaces it with the real invite link. Do not remove or change it.
- Line breaks use `<br>`. If your dashboard shows a plain-text option, use the HTML version above for the best look.
- To test: invite a user from **Authentication → Users → Invite user** and check the email they receive.

---

# Reset Password (Recovery) Email Template

Use this in **Supabase** to replace the default reset-password email with Absolute Portal branding.

---

## Where to set it

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project (**ksfkgzlwgvwijjkaoaqq**).
2. Open **Authentication** → **Email Templates**.
3. Select **Reset password** (or **Magic Link** / **Recovery**, depending on label).
4. Paste the **Subject** and **Message** below, then click **Save**.

---

## Subject (copy exactly)

```
Reset your Absolute Portal password
```

---

## Message (paste into the "Message" / body field)

Use this block as-is. The first name appears only if the user has a name in their account (e.g. from sign-up or invite); otherwise the greeting is just "Hello 👋".

```html
Hello {{ if .Data.name }}{{ .Data.name }} {{ end }}👋<br><br>
We received a request to reset the password for your <strong>Absolute Portal</strong> account.<br><br>
Click the button below to set a new password:<br><br>
👉 <a href="{{ .ConfirmationURL }}">Reset Password</a><br><br>
For security reasons, this link will expire after a short time.<br>
If you did not request a password reset, you can safely ignore this email — your account will remain secure.<br><br>
If you need help, feel free to reach out to our support team.<br><br>
—<br>
Team Absolute
```

**If your Supabase project does not support `{{ .Data.name }}`** (or you prefer a generic greeting), use this version instead:

```html
Hello 👋<br><br>
We received a request to reset the password for your <strong>Absolute Portal</strong> account.<br><br>
Click the button below to set a new password:<br><br>
👉 <a href="{{ .ConfirmationURL }}">Reset Password</a><br><br>
For security reasons, this link will expire after a short time.<br>
If you did not request a password reset, you can safely ignore this email — your account will remain secure.<br><br>
If you need help, feel free to reach out to our support team.<br><br>
—<br>
Team Absolute
```

---

## Notes (reset password)

- **`{{ .ConfirmationURL }}`** is required: Supabase replaces it with the real reset link. Do not remove or change it.
- **`{{ .Data.name }}`** is optional: it comes from the user’s metadata (e.g. full name or first name). If missing, the first line will read "Hello 👋".
- To test: use **Forgot password** on the login page, enter an email, then check the inbox for the reset email.
