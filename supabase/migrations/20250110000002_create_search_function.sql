-- Enhanced Multi-Field Full-Text Search Function
-- This function provides better multi-field search capabilities

-- Function to search across multiple text fields in a table
CREATE OR REPLACE FUNCTION search_multiple_fields(
  table_name TEXT,
  search_text TEXT,
  field_names TEXT[]
)
RETURNS TABLE(id UUID, rank REAL) AS $$
DECLARE
  field_list TEXT;
  query_text TEXT;
BEGIN
  -- Build field list for tsvector (combine all fields)
  field_list := array_to_string(
    array_agg(format('COALESCE(%I, '''')', unnest(field_names))),
    ' || '' '' || '
  );
  
  -- Build dynamic query
  query_text := format('
    SELECT 
      id::UUID,
      ts_rank(
        to_tsvector(''english'', %s),
        plainto_tsquery(''english'', %L)
      ) as rank
    FROM %I
    WHERE to_tsvector(''english'', %s) @@ plainto_tsquery(''english'', %L)
    ORDER BY rank DESC
    LIMIT 1000
  ', field_list, search_text, table_name, field_list, search_text);
  
  RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_multiple_fields(TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION search_multiple_fields(TEXT, TEXT, TEXT[]) TO anon;

-- Example usage:
-- SELECT * FROM search_multiple_fields(
--   'sales_transactions',
--   'john',
--   ARRAY['sku', 'description']
-- );

-- Function to get search suggestions (autocomplete)
CREATE OR REPLACE FUNCTION get_search_suggestions(
  table_name TEXT,
  field_name TEXT,
  search_text TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(value TEXT, count BIGINT) AS $$
DECLARE
  query_text TEXT;
BEGIN
  query_text := format('
    SELECT 
      %I::TEXT as value,
      COUNT(*) as count
    FROM %I
    WHERE %I ILIKE %L
    GROUP BY %I
    ORDER BY count DESC, %I ASC
    LIMIT %s
  ', field_name, table_name, field_name, '%' || search_text || '%', field_name, field_name, limit_count);
  
  RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_search_suggestions(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_suggestions(TEXT, TEXT, TEXT, INTEGER) TO anon;

-- Example usage:
-- SELECT * FROM get_search_suggestions('customers', 'client_name', 'elma', 10);
