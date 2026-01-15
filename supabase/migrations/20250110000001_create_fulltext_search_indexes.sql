-- Create Full-Text Search Indexes for Enhanced Search System
-- These indexes optimize search performance across all modules

-- ==============================================
-- SALES TRANSACTIONS FULL-TEXT SEARCH
-- ==============================================
-- Create GIN index for full-text search on text fields
CREATE INDEX IF NOT EXISTS idx_sales_transactions_fts_sku 
  ON sales_transactions USING GIN(to_tsvector('english', COALESCE(sku, '')));

CREATE INDEX IF NOT EXISTS idx_sales_transactions_fts_description 
  ON sales_transactions USING GIN(to_tsvector('english', COALESCE(description, '')));

-- Composite index for combined search
CREATE INDEX IF NOT EXISTS idx_sales_transactions_fts_combined 
  ON sales_transactions USING GIN(
    to_tsvector('english', 
      COALESCE(sku, '') || ' ' || COALESCE(description, '')
    )
  );

-- ==============================================
-- ORDERS FULL-TEXT SEARCH
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_orders_fts_combined 
  ON orders USING GIN(
    to_tsvector('english', 
      COALESCE(client, '') || ' ' || 
      COALESCE(branch, '') || ' ' || 
      COALESCE(sku, '')
    )
  );

-- ==============================================
-- CUSTOMERS FULL-TEXT SEARCH
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_customers_fts_combined 
  ON customers USING GIN(
    to_tsvector('english', 
      COALESCE(client_name, '') || ' ' || 
      COALESCE(branch, '') || ' ' || 
      COALESCE(contact_person, '') || ' ' || 
      COALESCE(email, '') || ' ' || 
      COALESCE(phone, '')
    )
  );

-- ==============================================
-- USER MANAGEMENT FULL-TEXT SEARCH
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_user_management_fts_combined 
  ON user_management USING GIN(
    to_tsvector('english', 
      COALESCE(username, '') || ' ' || 
      COALESCE(email, '')
    )
  );

-- ==============================================
-- FACTORY PAYABLES FULL-TEXT SEARCH
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_factory_payables_fts_combined 
  ON factory_payables USING GIN(
    to_tsvector('english', 
      COALESCE(description, '') || ' ' || 
      COALESCE(sku, '')
    )
  );

-- ==============================================
-- TRANSPORT EXPENSES FULL-TEXT SEARCH
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_transport_expenses_fts_combined 
  ON transport_expenses USING GIN(
    to_tsvector('english', 
      COALESCE(expense_group, '') || ' ' || 
      COALESCE(description, '')
    )
  );

-- ==============================================
-- LABEL PURCHASES FULL-TEXT SEARCH
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_label_purchases_fts_combined 
  ON label_purchases USING GIN(
    to_tsvector('english', 
      COALESCE(vendor_id, '') || ' ' || 
      COALESCE(sku, '') || ' ' || 
      COALESCE(description, '')
    )
  );

-- ==============================================
-- LABEL PAYMENTS FULL-TEXT SEARCH
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_label_payments_fts_combined 
  ON label_payments USING GIN(
    to_tsvector('english', 
      COALESCE(vendor, '') || ' ' || 
      COALESCE(payment_method, '')
    )
  );

-- ==============================================
-- FULL-TEXT SEARCH FUNCTION
-- ==============================================
-- Function to perform full-text search across multiple fields
CREATE OR REPLACE FUNCTION search_fulltext(
  table_name TEXT,
  search_text TEXT,
  fields TEXT[]
)
RETURNS TABLE(id UUID, rank REAL) AS $$
DECLARE
  field_list TEXT;
  query_text TEXT;
BEGIN
  -- Build field list for tsvector
  field_list := array_to_string(fields, ' || '' '' || ');
  
  -- Build dynamic query
  query_text := format('
    SELECT id, ts_rank(
      to_tsvector(''english'', %s),
      plainto_tsquery(''english'', %L)
    ) as rank
    FROM %I
    WHERE to_tsvector(''english'', %s) @@ plainto_tsquery(''english'', %L)
    ORDER BY rank DESC
  ', field_list, search_text, table_name, field_list, search_text);
  
  RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_fulltext(TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION search_fulltext(TEXT, TEXT, TEXT[]) TO anon;
