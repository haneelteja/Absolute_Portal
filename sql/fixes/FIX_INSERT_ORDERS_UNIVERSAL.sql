-- FIX: Universal insert_orders RPC for mixed/legacy orders schemas
-- Run this once in Supabase SQL Editor.
-- This script:
-- 1) Drops all existing public.insert_orders overloads (prevents RPC ambiguity)
-- 2) Creates one canonical insert_orders(jsonb)
-- 3) Supports legacy and new payload keys:
--    client/client_name/dealer_name, area/branch,
--    number_of_cases/quantity, tentative_delivery_date/tentative_delivery_time
-- 4) Inserts into whichever of these columns actually exist in public.orders
-- 5) Grants execute to anon/authenticated/service_role

BEGIN;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'insert_orders'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE;', fn.signature);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.insert_orders(orders_json jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  rec jsonb;
  new_id uuid;
  ids uuid[] := '{}';

  has_client boolean;
  has_client_name boolean;
  has_dealer_name boolean;
  has_area boolean;
  has_branch boolean;
  has_sku boolean;
  has_number_of_cases boolean;
  has_quantity boolean;
  has_date boolean;
  has_tentative_delivery_date boolean;
  has_tentative_delivery_time boolean;
  has_status boolean;

  v_client text;
  v_area text;
  v_sku text;
  v_cases integer;
  v_date date;
  v_delivery date;
  v_status text;

  col_list text;
  val_list text;
  sql_text text;
BEGIN
  -- Validate input
  IF orders_json IS NULL OR jsonb_typeof(orders_json) <> 'array' THEN
    RAISE EXCEPTION 'insert_orders expects a JSON array payload';
  END IF;

  -- Detect available columns once
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'client'
  ) INTO has_client;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'client_name'
  ) INTO has_client_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'dealer_name'
  ) INTO has_dealer_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'area'
  ) INTO has_area;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'branch'
  ) INTO has_branch;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'sku'
  ) INTO has_sku;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'number_of_cases'
  ) INTO has_number_of_cases;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'quantity'
  ) INTO has_quantity;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'date'
  ) INTO has_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_date'
  ) INTO has_tentative_delivery_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tentative_delivery_time'
  ) INTO has_tentative_delivery_time;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'status'
  ) INTO has_status;

  IF NOT (has_client OR has_client_name OR has_dealer_name) THEN
    RAISE EXCEPTION 'orders table has none of: client, client_name, dealer_name';
  END IF;
  IF NOT (has_area OR has_branch) THEN
    RAISE EXCEPTION 'orders table has none of: area, branch';
  END IF;
  IF NOT has_sku THEN
    RAISE EXCEPTION 'orders table missing required column: sku';
  END IF;
  IF NOT (has_number_of_cases OR has_quantity) THEN
    RAISE EXCEPTION 'orders table has none of: number_of_cases, quantity';
  END IF;
  IF NOT (has_tentative_delivery_date OR has_tentative_delivery_time) THEN
    RAISE EXCEPTION 'orders table has none of: tentative_delivery_date, tentative_delivery_time';
  END IF;

  FOR rec IN
    SELECT value
    FROM jsonb_array_elements(orders_json)
  LOOP
    v_client := NULLIF(trim(COALESCE(rec->>'client', rec->>'dealer_name', rec->>'client_name', '')), '');
    v_area := NULLIF(trim(COALESCE(rec->>'area', rec->>'branch', '')), '');
    v_sku := NULLIF(trim(COALESCE(rec->>'sku', '')), '');
    v_cases := COALESCE(NULLIF(rec->>'number_of_cases', '')::integer, NULLIF(rec->>'quantity', '')::integer, 0);
    v_date := COALESCE(NULLIF(rec->>'date', '')::date, CURRENT_DATE);
    v_delivery := COALESCE(
      NULLIF(rec->>'tentative_delivery_date', '')::date,
      NULLIF(rec->>'tentative_delivery_time', '')::date
    );
    v_status := COALESCE(NULLIF(trim(rec->>'status'), ''), 'pending');

    IF v_client IS NULL THEN
      RAISE EXCEPTION 'Order payload missing client/dealer_name/client_name: %', rec::text;
    END IF;
    IF v_area IS NULL THEN
      RAISE EXCEPTION 'Order payload missing area/branch: %', rec::text;
    END IF;
    IF v_sku IS NULL THEN
      RAISE EXCEPTION 'Order payload missing sku: %', rec::text;
    END IF;
    IF v_cases <= 0 THEN
      RAISE EXCEPTION 'Order payload invalid number_of_cases/quantity (must be > 0): %', rec::text;
    END IF;
    IF v_delivery IS NULL THEN
      RAISE EXCEPTION 'Order payload missing tentative_delivery_date/tentative_delivery_time: %', rec::text;
    END IF;

    col_list := '';
    val_list := '';

    IF has_client THEN
      col_list := col_list || 'client,';
      val_list := val_list || format('%L,', v_client);
    END IF;
    IF has_client_name THEN
      col_list := col_list || 'client_name,';
      val_list := val_list || format('%L,', v_client);
    END IF;
    IF has_dealer_name THEN
      col_list := col_list || 'dealer_name,';
      val_list := val_list || format('%L,', v_client);
    END IF;
    IF has_area THEN
      col_list := col_list || 'area,';
      val_list := val_list || format('%L,', v_area);
    END IF;
    IF has_branch THEN
      col_list := col_list || 'branch,';
      val_list := val_list || format('%L,', v_area);
    END IF;
    IF has_sku THEN
      col_list := col_list || 'sku,';
      val_list := val_list || format('%L,', v_sku);
    END IF;
    IF has_number_of_cases THEN
      col_list := col_list || 'number_of_cases,';
      val_list := val_list || format('%s,', v_cases);
    END IF;
    IF has_quantity THEN
      col_list := col_list || 'quantity,';
      val_list := val_list || format('%s,', v_cases);
    END IF;
    IF has_date THEN
      col_list := col_list || 'date,';
      val_list := val_list || format('%L,', v_date);
    END IF;
    IF has_tentative_delivery_date THEN
      col_list := col_list || 'tentative_delivery_date,';
      val_list := val_list || format('%L,', v_delivery);
    END IF;
    IF has_tentative_delivery_time THEN
      col_list := col_list || 'tentative_delivery_time,';
      val_list := val_list || format('%L,', v_delivery);
    END IF;
    IF has_status THEN
      col_list := col_list || 'status,';
      val_list := val_list || format('%L,', v_status);
    END IF;

    col_list := left(col_list, length(col_list) - 1);
    val_list := left(val_list, length(val_list) - 1);

    sql_text := format(
      'INSERT INTO public.orders (%s) VALUES (%s) RETURNING id',
      col_list,
      val_list
    );

    EXECUTE sql_text INTO new_id;
    ids := array_append(ids, new_id);
  END LOOP;

  RETURN jsonb_build_object('ids', ids);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.insert_orders(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.insert_orders(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_orders(jsonb) TO service_role;

COMMIT;

-- Quick verification
SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_function_identity_arguments(p.oid) AS identity_args,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'insert_orders'
ORDER BY p.oid;

