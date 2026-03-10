-- FIX: Inventory guard for sale inserts (concurrency-safe per SKU)
-- Run this once in Supabase SQL Editor.
-- Behavior:
-- 1) Validates requested quantity against current inventory (production - sold).
-- 2) Blocks oversell by default with a clear "Insufficient inventory..." error.
-- 3) Allows partial fulfillment only when explicitly configured:
--    - p_allow_partial = true in RPC call, OR
--    - invoice_configurations.config_key = 'sales_allow_partial_fulfillment' with value true/1/yes/on.
-- 4) Uses a transaction-scoped advisory lock per SKU to avoid concurrent overselling.

BEGIN;

CREATE OR REPLACE FUNCTION public.insert_sale_with_inventory_guard(
  p_customer_id uuid,
  p_area text,
  p_sku text,
  p_requested_quantity integer,
  p_amount numeric,
  p_description text DEFAULT NULL,
  p_transaction_date date DEFAULT CURRENT_DATE,
  p_allow_partial boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sku text := NULLIF(trim(p_sku), '');
  v_requested_qty integer := COALESCE(p_requested_quantity, 0);
  v_amount numeric := COALESCE(p_amount, 0);
  v_allow_partial boolean := false;
  v_partial_config text;

  v_produced integer := 0;
  v_sold integer := 0;
  v_available integer := 0;
  v_sold_qty integer := 0;
  v_backorder_qty integer := 0;
  v_amount_to_insert numeric := 0;

  v_has_area boolean := false;
  v_sale jsonb;
  v_insert_sql text;
BEGIN
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required';
  END IF;
  IF v_sku IS NULL THEN
    RAISE EXCEPTION 'sku is required';
  END IF;
  IF v_requested_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive number';
  END IF;
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive number';
  END IF;

  -- Resolve partial-fulfillment policy:
  -- explicit RPC argument > DB config > default false.
  IF p_allow_partial IS NOT NULL THEN
    v_allow_partial := p_allow_partial;
  ELSIF to_regclass('public.invoice_configurations') IS NOT NULL THEN
    SELECT config_value
    INTO v_partial_config
    FROM public.invoice_configurations
    WHERE config_key = 'sales_allow_partial_fulfillment'
    LIMIT 1;

    IF v_partial_config IS NOT NULL THEN
      v_allow_partial := lower(trim(v_partial_config)) IN ('true', '1', 'yes', 'on');
    END IF;
  END IF;

  -- Lock by SKU within this transaction to prevent concurrent overselling.
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(v_sku), 0));

  SELECT COALESCE(SUM(p.no_of_cases), 0)::integer
  INTO v_produced
  FROM public.production p
  WHERE lower(trim(p.sku)) = lower(v_sku);

  SELECT COALESCE(SUM(st.quantity), 0)::integer
  INTO v_sold
  FROM public.sales_transactions st
  WHERE st.transaction_type = 'sale'
    AND lower(trim(COALESCE(st.sku, ''))) = lower(v_sku);

  v_available := GREATEST(v_produced - v_sold, 0);

  IF v_requested_qty > v_available AND NOT v_allow_partial THEN
    RAISE EXCEPTION 'Insufficient inventory: Only % units available for %.', v_available, v_sku;
  END IF;

  v_sold_qty := CASE
    WHEN v_requested_qty <= v_available THEN v_requested_qty
    ELSE v_available
  END;

  IF v_sold_qty <= 0 THEN
    RAISE EXCEPTION 'Insufficient inventory: Only % units available for %.', v_available, v_sku;
  END IF;

  v_backorder_qty := GREATEST(v_requested_qty - v_sold_qty, 0);

  IF v_sold_qty = v_requested_qty THEN
    v_amount_to_insert := v_amount;
  ELSE
    v_amount_to_insert := ROUND((v_amount / NULLIF(v_requested_qty, 0)) * v_sold_qty, 2);
  END IF;

  IF v_amount_to_insert <= 0 THEN
    RAISE EXCEPTION 'Calculated sale amount is invalid';
  END IF;

  -- Backward compatibility for environments without sales_transactions.area
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales_transactions'
      AND column_name = 'area'
  ) INTO v_has_area;

  IF v_has_area THEN
    v_insert_sql := '
      WITH ins AS (
        INSERT INTO public.sales_transactions
          (customer_id, transaction_type, amount, total_amount, quantity, sku, description, transaction_date, area)
        VALUES
          ($1, ''sale'', $2, $2, $3, $4, $5, $6, $7)
        RETURNING *
      )
      SELECT to_jsonb(ins) FROM ins
    ';
    EXECUTE v_insert_sql
      INTO v_sale
      USING p_customer_id, v_amount_to_insert, v_sold_qty, v_sku, p_description, COALESCE(p_transaction_date, CURRENT_DATE), p_area;
  ELSE
    v_insert_sql := '
      WITH ins AS (
        INSERT INTO public.sales_transactions
          (customer_id, transaction_type, amount, total_amount, quantity, sku, description, transaction_date)
        VALUES
          ($1, ''sale'', $2, $2, $3, $4, $5, $6)
        RETURNING *
      )
      SELECT to_jsonb(ins) FROM ins
    ';
    EXECUTE v_insert_sql
      INTO v_sale
      USING p_customer_id, v_amount_to_insert, v_sold_qty, v_sku, p_description, COALESCE(p_transaction_date, CURRENT_DATE);
  END IF;

  IF v_sale IS NULL THEN
    RAISE EXCEPTION 'Failed to insert sale transaction';
  END IF;

  RETURN jsonb_build_object(
    'sale', v_sale,
    'requested_quantity', v_requested_qty,
    'sold_quantity', v_sold_qty,
    'available_before', v_available,
    'remaining_inventory', GREATEST(v_available - v_sold_qty, 0),
    'backorder_quantity', v_backorder_qty,
    'partial_fulfillment_allowed', v_allow_partial,
    'partial_fulfillment_applied', v_backorder_qty > 0
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.insert_sale_with_inventory_guard(
  uuid, text, text, integer, numeric, text, date, boolean
) TO anon;
GRANT EXECUTE ON FUNCTION public.insert_sale_with_inventory_guard(
  uuid, text, text, integer, numeric, text, date, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_sale_with_inventory_guard(
  uuid, text, text, integer, numeric, text, date, boolean
) TO service_role;

COMMIT;

