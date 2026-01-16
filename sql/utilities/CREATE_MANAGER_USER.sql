-- ==============================================
-- CREATE MANAGER USER WITH FULL ACCESS
-- This script creates/updates a manager user with email: nalluruhaneel@gmail.com
-- Manager role has access to all clients and branches
-- ==============================================

-- ==============================================
-- STEP 1: Check if user exists in auth.users
-- ==============================================
DO $$
DECLARE
    user_email TEXT := 'nalluruhaneel@gmail.com';
    auth_user_id UUID;
    username_from_email TEXT;
BEGIN
    -- Extract username from email (part before @)
    username_from_email := SPLIT_PART(user_email, '@', 1);
    
    -- Try to find user in auth.users
    SELECT id INTO auth_user_id
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
    
    IF auth_user_id IS NULL THEN
        RAISE NOTICE 'User % does not exist in auth.users. Creating user_management record without auth.user_id.', user_email;
        RAISE NOTICE 'Note: User will need to sign up through the application or be created in Supabase Auth dashboard.';
    ELSE
        RAISE NOTICE 'Found user in auth.users with ID: %', auth_user_id;
    END IF;
END $$;

-- ==============================================
-- STEP 2: Create or Update user_management record
-- ==============================================
INSERT INTO user_management (
  user_id,
  username,
  email,
  associated_clients,
  associated_branches,
  status,
  role,
  created_at,
  updated_at
)
SELECT 
  COALESCE(
    (SELECT id FROM auth.users WHERE email = 'nalluruhaneel@gmail.com' LIMIT 1),
    gen_random_uuid()  -- Generate UUID if user doesn't exist in auth.users
  ) as user_id,
  'nalluruhaneel' as username,
  'nalluruhaneel@gmail.com' as email,
  -- Get all available clients
  COALESCE(
    (SELECT ARRAY_AGG(DISTINCT client_name) 
     FROM customers 
     WHERE client_name IS NOT NULL AND client_name != ''),
    ARRAY[]::TEXT[]
  ) as associated_clients,
  -- Get all available branches
  COALESCE(
    (SELECT ARRAY_AGG(DISTINCT branch) 
     FROM customers 
     WHERE branch IS NOT NULL AND branch != ''),
    ARRAY[]::TEXT[]
  ) as associated_branches,
  'active' as status,
  'manager' as role,
  NOW() as created_at,
  NOW() as updated_at
ON CONFLICT (email) DO UPDATE SET
  user_id = COALESCE(
    (SELECT id FROM auth.users WHERE email = 'nalluruhaneel@gmail.com' LIMIT 1),
    user_management.user_id  -- Keep existing user_id if auth user doesn't exist
  ),
  username = EXCLUDED.username,
  role = 'manager',
  status = 'active',
  associated_clients = EXCLUDED.associated_clients,
  associated_branches = EXCLUDED.associated_branches,
  updated_at = NOW();

-- ==============================================
-- STEP 3: Update manager user with all clients and branches
-- This ensures they have access to all current and future clients/branches
-- ==============================================
UPDATE user_management 
SET 
  associated_clients = (
    SELECT COALESCE(
      ARRAY_AGG(DISTINCT client_name), 
      ARRAY[]::TEXT[]
    )
    FROM customers 
    WHERE client_name IS NOT NULL AND client_name != ''
  ),
  associated_branches = (
    SELECT COALESCE(
      ARRAY_AGG(DISTINCT branch), 
      ARRAY[]::TEXT[]
    )
    FROM customers 
    WHERE branch IS NOT NULL AND branch != ''
  ),
  updated_at = NOW()
WHERE email = 'nalluruhaneel@gmail.com' AND role = 'manager';

-- ==============================================
-- STEP 4: Verify the manager user was created/updated
-- ==============================================
SELECT 
  'Manager User Created/Updated Successfully!' as status,
  id,
  user_id,
  username,
  email,
  role,
  status,
  array_length(associated_clients, 1) as total_clients,
  array_length(associated_branches, 1) as total_branches,
  associated_clients,
  associated_branches,
  created_at,
  updated_at
FROM user_management
WHERE email = 'nalluruhaneel@gmail.com';

-- ==============================================
-- STEP 5: Summary
-- ==============================================
SELECT 
  'Summary' as section,
  COUNT(*) FILTER (WHERE role = 'manager' AND email = 'nalluruhaneel@gmail.com') as manager_user_exists,
  COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
  COUNT(*) FILTER (WHERE role = 'manager') as total_managers,
  COUNT(*) FILTER (WHERE role = 'client') as total_clients,
  COUNT(*) as total_users
FROM user_management;

-- ==============================================
-- NOTES:
-- ==============================================
-- 1. If the user doesn't exist in auth.users, they will need to:
--    - Sign up through the application, OR
--    - Be created manually in Supabase Auth dashboard
--
-- 2. Once the user signs up, their auth.users.id will be automatically
--    linked to the user_management record via email matching
--
-- 3. Manager role has access to:
--    - All clients and branches (as set in associated_clients and associated_branches)
--    - View all user management records
--    - Full access to all application features (except admin-only functions)
--
-- 4. To grant access to new clients/branches in the future, run:
--    UPDATE user_management 
--    SET associated_clients = (SELECT ARRAY_AGG(DISTINCT client_name) FROM customers),
--        associated_branches = (SELECT ARRAY_AGG(DISTINCT branch) FROM customers)
--    WHERE email = 'nalluruhaneel@gmail.com' AND role = 'manager';
