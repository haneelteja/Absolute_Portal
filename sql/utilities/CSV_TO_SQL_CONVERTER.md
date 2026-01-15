# CSV to SQL Converter Guide

This guide helps you convert your legacy CSV data into SQL INSERT statements for easy migration.

## Quick Conversion Methods

### Method 1: Using Excel/Google Sheets

1. **Open your CSV in Excel/Sheets**
2. **Add SQL formula columns:**

   For a table like `customers`, if your CSV has columns:
   - Client Name, Branch, SKU, Price Per Case, Contact Person, Phone, Email

   Add a new column with this formula (adjust for your columns):
   ```
   =CONCATENATE("('", A2, "', '", B2, "', '", C2, "', ", D2, ", '", E2, "', '", F2, "', '", G2, "'),")
   ```

3. **Copy all formula results**
4. **Paste into SQL template:**
   ```sql
   INSERT INTO customers (client_name, branch, sku, price_per_case, contact_person, phone, email)
   VALUES 
   -- Paste your converted rows here
   ;
   ```

### Method 2: Using Python Script

Create a file `convert_csv_to_sql.py`:

```python
import csv
import sys

def convert_csv_to_sql(csv_file, table_name, columns):
    """
    Convert CSV to SQL INSERT statements
    
    Args:
        csv_file: Path to CSV file
        table_name: Target database table name
        columns: List of column names in order
    """
    sql_statements = []
    sql_statements.append(f"INSERT INTO {table_name} ({', '.join(columns)})")
    sql_statements.append("VALUES")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = []
        
        for row in reader:
            values = []
            for col in columns:
                value = row.get(col, '').strip()
                # Handle NULL values
                if value == '' or value.lower() == 'null':
                    values.append('NULL')
                # Handle numeric values
                elif col in ['price_per_case', 'price_per_bottle', 'amount', 'quantity']:
                    try:
                        values.append(str(float(value)))
                    except:
                        values.append('NULL')
                # Handle boolean values
                elif col in ['is_active']:
                    values.append('true' if value.lower() in ['true', '1', 'yes'] else 'false')
                # Handle text values (escape quotes)
                else:
                    value = value.replace("'", "''")
                    values.append(f"'{value}'")
            
            rows.append(f"  ({', '.join(values)})")
        
        sql_statements.append(',\n'.join(rows))
        sql_statements.append("ON CONFLICT DO NOTHING;")
    
    return '\n'.join(sql_statements)

# Example usage
if __name__ == '__main__':
    # Example: Convert customers CSV
    columns = ['client_name', 'branch', 'sku', 'price_per_case', 'price_per_bottle', 
               'contact_person', 'phone', 'email', 'address']
    
    sql = convert_csv_to_sql('customers.csv', 'customers', columns)
    print(sql)
```

Run it:
```bash
python convert_csv_to_sql.py > customers_import.sql
```

### Method 3: Online Tools

Use online CSV to SQL converters:
- https://www.convertcsv.com/csv-to-sql.htm
- https://sqlizer.io/

**Steps:**
1. Upload your CSV
2. Select table name
3. Map columns
4. Download SQL file

### Method 4: Manual Template

For small datasets, use this template:

```sql
INSERT INTO table_name (column1, column2, column3)
VALUES 
  ('value1', 'value2', 'value3'),
  ('value4', 'value5', 'value6'),
  -- Add more rows...
ON CONFLICT DO NOTHING;
```

## CSV Format Examples

### Customers CSV
```csv
Client Name,Branch,SKU,Price Per Case,Price Per Bottle,Contact Person,Phone,Email,Address
Benguluru Bhavan,Gachibowli,P 500 ML,1200.00,60.00,John Doe,1234567890,john@example.com,123 Main St
Benguluru Bhavan,Kondapur,P 1000 ML,1800.00,150.00,Jane Doe,0987654321,jane@example.com,456 Oak Ave
```

### Sales Transactions CSV
```csv
Client Name,Branch,Transaction Type,Amount,Quantity,SKU,Description,Transaction Date
Benguluru Bhavan,Gachibowli,sale,12000.00,10,P 500 ML,Sale of 10 cases,2024-01-15
Benguluru Bhavan,Gachibowli,payment,5000.00,,,Payment received,2024-01-20
```

**Note:** For sales_transactions, you'll need to convert client_name + branch to customer_id using a lookup.

## Data Type Mapping

| CSV Value | SQL Type | Example |
|-----------|----------|---------|
| Text | TEXT | `'John Doe'` |
| Number | DECIMAL/INTEGER | `1200.00` or `10` |
| Date | DATE | `'2024-01-15'` |
| Boolean | BOOLEAN | `true` or `false` |
| NULL | NULL | `NULL` |
| Empty string | NULL | `NULL` |

## Common Issues & Solutions

### Issue 1: Quotes in Text
**Problem:** Text contains single quotes
**Solution:** Escape them: `'O''Brien'` or use `REPLACE(value, "'", "''")`

### Issue 2: Date Formats
**Problem:** Dates in different formats (DD/MM/YYYY, MM-DD-YYYY)
**Solution:** Convert to YYYY-MM-DD format before import

### Issue 3: Decimal Separators
**Problem:** Using commas instead of dots (1,200.50)
**Solution:** Replace commas with dots: `REPLACE(value, ',', '.')`

### Issue 4: Special Characters
**Problem:** Encoding issues with special characters
**Solution:** Ensure CSV is UTF-8 encoded

## Validation Before Import

1. **Check for duplicates:**
   ```sql
   -- In your CSV, identify duplicates
   SELECT column1, column2, COUNT(*) 
   FROM your_data 
   GROUP BY column1, column2 
   HAVING COUNT(*) > 1;
   ```

2. **Validate data types:**
   - Ensure numbers are actually numbers
   - Ensure dates are in correct format
   - Ensure booleans are true/false

3. **Check required fields:**
   - Ensure all NOT NULL columns have values
   - Handle NULL values appropriately

## Next Steps

After converting your CSV to SQL:
1. Review the generated SQL
2. Test with a small subset first
3. Run validation queries after import
4. Verify data integrity

See `LEGACY_DATA_MIGRATION_GUIDE.md` for complete migration process.
