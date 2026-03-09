-- DIAGNOSTIC: Orders schema + insert_orders function
-- Run in Supabase SQL Editor as one script.
-- This script is READ-ONLY (no DDL/DML changes).

-- 0) Environment context
SELECT
  now() AS executed_at,
  current_database() AS database_name,
  current_schema() AS schema_name,
  current_user AS current_user,
  session_user AS session_user,
  version() AS postgres_version;

-- 1) Does orders table exist?
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'orders'
  ) AS orders_table_exists;

-- 2) Exact orders columns (name, type, nullability, default, generated)
SELECT
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  c.is_generated
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'orders'
ORDER BY c.ordinal_position;

-- 3) Quick compatibility matrix for known app variants
WITH required_cols AS (
  SELECT * FROM (VALUES
    ('client'),
    ('client_name'),
    ('dealer_name'),
    ('area'),
    ('branch'),
    ('sku'),
    ('number_of_cases'),
    ('quantity'),
    ('date'),
    ('tentative_delivery_date'),
    ('tentative_delivery_time'),
    ('status')
  ) AS t(col_name)
)
SELECT
  r.col_name,
  EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'orders'
      AND c.column_name = r.col_name
  ) AS exists_in_orders
FROM required_cols r
ORDER BY r.col_name;

-- 4) PK/unique/check/foreign key constraints on orders
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.table_schema = ccu.table_schema
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'orders'
ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

-- 5) Orders indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'orders'
ORDER BY indexname;

-- 6) RLS status on orders
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n
  ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'orders';

-- 7) Policies on orders
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'orders'
ORDER BY policyname;

-- 8) All insert_orders functions (overloads/signatures)
SELECT
  p.oid::regprocedure AS function_signature,
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_args,
  pg_get_function_arguments(p.oid) AS full_args,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS security_definer,
  l.lanname AS language
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
JOIN pg_language l
  ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.proname = 'insert_orders'
ORDER BY p.oid;

-- 9) Full function body for each insert_orders overload
SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'insert_orders'
ORDER BY p.oid;

-- 10) Grants on insert_orders overloads
SELECT
  p.oid::regprocedure AS function_signature,
  r.rolname AS grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
CROSS JOIN (
  SELECT rolname
  FROM pg_roles
  WHERE rolname IN ('anon', 'authenticated', 'service_role')
) r
WHERE n.nspname = 'public'
  AND p.proname = 'insert_orders'
ORDER BY p.oid, r.rolname;

-- 11) Optional: check if get_orders_sorted exists (used by UI read path)
SELECT
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_orders_sorted'
  ) AS get_orders_sorted_exists;

-- 12) Show get_orders_sorted body if present
SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_orders_sorted'
ORDER BY p.oid;

