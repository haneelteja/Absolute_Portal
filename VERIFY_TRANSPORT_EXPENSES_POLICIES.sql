-- ==============================================
-- VERIFY TRANSPORT_EXPENSES RLS POLICIES
-- ==============================================

-- Step 1: Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'transport_expenses';

-- Step 2: List ALL policies on transport_expenses
SELECT 
    policyname,
    cmd as command,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'transport_expenses'
ORDER BY cmd, policyname;

-- Step 3: Count policies by command type
SELECT 
    cmd as command,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'transport_expenses'
GROUP BY cmd
ORDER BY cmd;

-- Step 4: Verify permissions (already confirmed by user)
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'transport_expenses'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

