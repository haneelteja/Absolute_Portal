-- ==============================================
-- FIX RLS POLICIES FOR LABEL_PAYMENTS TABLE
-- This will allow INSERT operations for label payments
-- ==============================================

-- Step 1: Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'label_payments';

-- Step 2: Check current policies
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'label_payments';

-- Step 3: Remove ALL existing policies
DROP POLICY IF EXISTS "Allow all operations on label_payments" ON public.label_payments;
DROP POLICY IF EXISTS "Allow public access for development" ON public.label_payments;
DROP POLICY IF EXISTS "Allow all operations for development" ON public.label_payments;
DROP POLICY IF EXISTS "Employees can view label payments" ON public.label_payments;
DROP POLICY IF EXISTS "Employees can manage label payments" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_select_policy" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_insert_policy" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_update_policy" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_delete_policy" ON public.label_payments;

-- Step 4: Create comprehensive policies (simplified - without TO clause)
CREATE POLICY "label_payments_select_policy" 
ON public.label_payments 
FOR SELECT 
USING (true);

CREATE POLICY "label_payments_insert_policy" 
ON public.label_payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "label_payments_update_policy" 
ON public.label_payments 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "label_payments_delete_policy" 
ON public.label_payments 
FOR DELETE 
USING (true);

-- Step 5: Grant explicit table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_payments TO public;

-- Step 6: Verify policies were created
SELECT 
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'label_payments'
ORDER BY cmd, policyname;

-- Step 7: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'label_payments'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

