-- ==============================================
-- FIX RLS POLICIES FOR ALL LABEL-RELATED TABLES
-- This script fixes RLS for: label_purchases, label_payments, label_vendors
-- ==============================================

-- ==============================================
-- LABEL_PURCHASES TABLE
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on label_purchases" ON public.label_purchases;
DROP POLICY IF EXISTS "Allow public access on label_purchases" ON public.label_purchases;
DROP POLICY IF EXISTS "Employees can view label purchases" ON public.label_purchases;
DROP POLICY IF EXISTS "Employees can manage label purchases" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_select_policy" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_insert_policy" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_update_policy" ON public.label_purchases;
DROP POLICY IF EXISTS "label_purchases_delete_policy" ON public.label_purchases;

CREATE POLICY "label_purchases_select_policy" ON public.label_purchases FOR SELECT USING (true);
CREATE POLICY "label_purchases_insert_policy" ON public.label_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "label_purchases_update_policy" ON public.label_purchases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "label_purchases_delete_policy" ON public.label_purchases FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_purchases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_purchases TO public;

-- ==============================================
-- LABEL_PAYMENTS TABLE
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on label_payments" ON public.label_payments;
DROP POLICY IF EXISTS "Allow public access for development" ON public.label_payments;
DROP POLICY IF EXISTS "Allow all operations for development" ON public.label_payments;
DROP POLICY IF EXISTS "Employees can view label payments" ON public.label_payments;
DROP POLICY IF EXISTS "Employees can manage label payments" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_select_policy" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_insert_policy" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_update_policy" ON public.label_payments;
DROP POLICY IF EXISTS "label_payments_delete_policy" ON public.label_payments;

CREATE POLICY "label_payments_select_policy" ON public.label_payments FOR SELECT USING (true);
CREATE POLICY "label_payments_insert_policy" ON public.label_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "label_payments_update_policy" ON public.label_payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "label_payments_delete_policy" ON public.label_payments FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_payments TO public;

-- ==============================================
-- LABEL_VENDORS TABLE (if exists)
-- ==============================================
DROP POLICY IF EXISTS "Allow all operations on label_vendors" ON public.label_vendors;
DROP POLICY IF EXISTS "Allow public access for development" ON public.label_vendors;
DROP POLICY IF EXISTS "Allow all operations for development" ON public.label_vendors;
DROP POLICY IF EXISTS "label_vendors_select_policy" ON public.label_vendors;
DROP POLICY IF EXISTS "label_vendors_insert_policy" ON public.label_vendors;
DROP POLICY IF EXISTS "label_vendors_update_policy" ON public.label_vendors;
DROP POLICY IF EXISTS "label_vendors_delete_policy" ON public.label_vendors;

CREATE POLICY "label_vendors_select_policy" ON public.label_vendors FOR SELECT USING (true);
CREATE POLICY "label_vendors_insert_policy" ON public.label_vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "label_vendors_update_policy" ON public.label_vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "label_vendors_delete_policy" ON public.label_vendors FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_vendors TO public;

-- ==============================================
-- VERIFICATION
-- ==============================================
SELECT 
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('label_purchases', 'label_payments', 'label_vendors')
ORDER BY tablename, cmd, policyname;

