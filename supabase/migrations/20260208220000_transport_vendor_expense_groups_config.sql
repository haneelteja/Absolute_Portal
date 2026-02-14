-- ==============================================
-- Transport Vendor, Expense Groups, Tentative Delivery Days
-- Invoice number simple sequence
-- ==============================================

-- 1. Add transport_vendor to transport_expenses
ALTER TABLE transport_expenses
ADD COLUMN IF NOT EXISTS transport_vendor TEXT;

-- 2. Add config rows for transport_vendors, expense_groups, tentative_delivery_days
INSERT INTO invoice_configurations (config_key, config_value, config_type, description)
VALUES 
  ('transport_vendors', '[]', 'string', 'Transport vendor list (JSON array) for Transport expenses dropdown'),
  ('expense_groups', '[]', 'string', 'Expense group list (JSON array) for Transport expenses dropdown'),
  ('tentative_delivery_days', '5', 'number', 'Number of days to add to order date for tentative delivery date calculation')
ON CONFLICT (config_key) DO NOTHING;

-- 3. Support simple invoice sequence (1, 2, 3...) - use year=0, month=0 for global sequence
-- Add config for invoice number format
INSERT INTO invoice_configurations (config_key, config_value, config_type, description)
VALUES 
  ('invoice_number_format', 'simple', 'string', 'Invoice number format: simple (1,2,3) or date_based (INV-2025-01-001)')
ON CONFLICT (config_key) DO NOTHING;

-- 4. Modify generate_invoice_number to support simple format
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_prefix VARCHAR DEFAULT 'INV',
  p_use_year BOOLEAN DEFAULT true,
  p_use_month BOOLEAN DEFAULT true
)
RETURNS VARCHAR AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_sequence INTEGER;
  v_invoice_number VARCHAR;
  v_prefix_key VARCHAR;
  v_format VARCHAR;
BEGIN
  -- Check config for invoice number format
  SELECT config_value INTO v_format
  FROM invoice_configurations
  WHERE config_key = 'invoice_number_format'
  LIMIT 1;

  -- If simple format, use global sequence (year=0, month=0)
  IF COALESCE(v_format, 'simple') = 'simple' THEN
    v_prefix_key := p_prefix;
    INSERT INTO invoice_number_sequence (prefix, year, month, current_sequence)
    VALUES (v_prefix_key, 0, 0, 1)
    ON CONFLICT (prefix, year, month) 
    DO UPDATE SET 
      current_sequence = invoice_number_sequence.current_sequence + 1,
      updated_at = NOW()
    RETURNING current_sequence INTO v_sequence;
    
    v_invoice_number := v_prefix_key || '-' || v_sequence::TEXT;
    RETURN v_invoice_number;
  END IF;

  -- Original date-based logic
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  IF p_use_year AND p_use_month THEN
    v_prefix_key := p_prefix || '-' || v_year || '-' || LPAD(v_month::TEXT, 2, '0');
  ELSIF p_use_year THEN
    v_prefix_key := p_prefix || '-' || v_year;
  ELSE
    v_prefix_key := p_prefix;
  END IF;
  
  INSERT INTO invoice_number_sequence (prefix, year, month, current_sequence)
  VALUES (v_prefix_key, v_year, v_month, 1)
  ON CONFLICT (prefix, year, month) 
  DO UPDATE SET 
    current_sequence = invoice_number_sequence.current_sequence + 1,
    updated_at = NOW()
  RETURNING current_sequence INTO v_sequence;
  
  IF p_use_year AND p_use_month THEN
    v_invoice_number := v_prefix_key || '-' || LPAD(v_sequence::TEXT, 3, '0');
  ELSIF p_use_year THEN
    v_invoice_number := v_prefix_key || '-' || LPAD(v_sequence::TEXT, 3, '0');
  ELSE
    v_invoice_number := v_prefix_key || '-' || LPAD(v_sequence::TEXT, 5, '0');
  END IF;
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;
