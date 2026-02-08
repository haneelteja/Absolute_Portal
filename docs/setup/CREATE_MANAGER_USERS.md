# Create Manager Users (Absolute Portal)

Manager users must exist in **Supabase Auth** first, then have a row in **user_management** with `role = 'manager'`.

---

## Step 1: User signs up in the app

1. Open **https://absolute-portal.vercel.app**
2. Click **Sign up**
3. Enter the manager’s **email** and **password**
4. Complete email verification (check inbox / confirm link)
5. Sign in once so Supabase creates the user in **Authentication → Users**

---

## Step 2: Add them as manager in the database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project (**ksfkgzlwgvwijjkaoaqq**)
2. Open **SQL Editor** → **New query**
3. Run the SQL below, then replace the email and run again for each manager.

**Replace `manager@example.com` with the actual email** used in Step 1:

```sql
-- Add (or update) a user as manager
INSERT INTO user_management (
  user_id,
  username,
  email,
  role,
  status,
  associated_clients,
  associated_branches
)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email,
  'manager',
  'active',
  '{}',
  '{}'
FROM auth.users
WHERE email = 'manager@example.com'
ON CONFLICT (email) DO UPDATE SET
  role = 'manager',
  status = 'active',
  user_id = EXCLUDED.user_id,
  username = COALESCE(EXCLUDED.username, user_management.username),
  updated_at = NOW();
```

4. Click **Run**. You should see “Success. No rows returned” or “1 row affected”.

---

## Step 3: Confirm

- The user signs out and signs in again at **https://absolute-portal.vercel.app**
- They should have manager access (e.g. User Management, broader data access).

---

## Multiple managers

Run the same SQL once per manager, changing only the email:

- `WHERE email = 'first.manager@company.com'`
- `WHERE email = 'second.manager@company.com'`
- etc.

---

## First manager when there are no admins

If **no one** is in `user_management` yet, the first user must be added via SQL (as above). After that, an **admin** can create or promote users from the app’s User Management screen (if your app supports it). To make the first user an **admin** instead of manager, use the same SQL but set `role = 'admin'`.
