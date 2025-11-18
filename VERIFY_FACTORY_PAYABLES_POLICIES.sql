-- ==============================================
-- VERIFY FACTORY_PAYABLES RLS POLICIES
-- ==============================================

-- Step 1: Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'factory_payables';

-- Step 2: List ALL policies on factory_payables
SELECT 
    policyname,
    cmd as command,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'factory_payables'
ORDER BY cmd, policyname;

-- Step 3: Count policies by command type
SELECT 
    cmd as command,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'factory_payables'
GROUP BY cmd
ORDER BY cmd;

-- Step 4: Verify permissions (already confirmed by user)
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'factory_payables'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

