-- ==============================================
-- FIX RLS POLICIES FOR TRANSPORT_EXPENSES TABLE
-- This will allow INSERT operations for transport expenses
-- ==============================================

-- Step 1: Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'transport_expenses';

-- Step 2: Check current policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'transport_expenses';

-- Step 3: Remove ALL existing policies
DROP POLICY IF EXISTS "Allow all operations on transport_expenses" ON public.transport_expenses;
DROP POLICY IF EXISTS "Users can view transport expenses based on client/branch access" ON public.transport_expenses;
DROP POLICY IF EXISTS "Users can insert transport expenses based on client/branch access" ON public.transport_expenses;
DROP POLICY IF EXISTS "Users can update transport expenses based on client/branch access" ON public.transport_expenses;
DROP POLICY IF EXISTS "Users can delete transport expenses based on client/branch access" ON public.transport_expenses;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.transport_expenses;
DROP POLICY IF EXISTS "transport_expenses_select_policy" ON public.transport_expenses;
DROP POLICY IF EXISTS "transport_expenses_insert_policy" ON public.transport_expenses;
DROP POLICY IF EXISTS "transport_expenses_update_policy" ON public.transport_expenses;
DROP POLICY IF EXISTS "transport_expenses_delete_policy" ON public.transport_expenses;

-- Step 4: Create comprehensive policies (simplified - without TO clause)
CREATE POLICY "transport_expenses_select_policy" 
ON public.transport_expenses 
FOR SELECT 
USING (true);

CREATE POLICY "transport_expenses_insert_policy" 
ON public.transport_expenses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "transport_expenses_update_policy" 
ON public.transport_expenses 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "transport_expenses_delete_policy" 
ON public.transport_expenses 
FOR DELETE 
USING (true);

-- Step 5: Grant explicit table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_expenses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_expenses TO public;

-- Step 6: Verify policies were created
SELECT 
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'transport_expenses'
ORDER BY cmd, policyname;

-- Step 7: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'transport_expenses'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

