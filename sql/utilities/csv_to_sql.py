#!/usr/bin/env python3
"""
CSV to SQL Converter
Converts CSV files to SQL INSERT statements for database migration

Usage:
    python csv_to_sql.py <csv_file> <table_name> <columns> [--output <output_file>]

Example:
    python csv_to_sql.py customers.csv customers "client_name,branch,sku,price_per_case" --output customers_import.sql
"""

import csv
import sys
import argparse
from typing import List, Dict, Any


def escape_sql_string(value: str) -> str:
    """Escape single quotes in SQL strings"""
    if value is None:
        return 'NULL'
    return value.replace("'", "''")


def format_sql_value(value: str, column_type: str = 'text') -> str:
    """Format a value for SQL based on its type"""
    value = value.strip() if value else ''
    
    # Handle NULL/empty values
    if not value or value.lower() in ['null', 'none', '']:
        return 'NULL'
    
    # Handle numeric types
    if column_type in ['decimal', 'numeric', 'integer', 'int']:
        try:
            # Remove commas and convert
            cleaned = value.replace(',', '')
            if '.' in cleaned:
                return str(float(cleaned))
            else:
                return str(int(cleaned))
        except ValueError:
            return 'NULL'
    
    # Handle boolean types
    if column_type == 'boolean':
        return 'true' if value.lower() in ['true', '1', 'yes', 'y'] else 'false'
    
    # Handle date types (ensure YYYY-MM-DD format)
    if column_type == 'date':
        # Try to parse and reformat if needed
        # For now, just return as-is if it looks like a date
        if '/' in value:
            # Convert DD/MM/YYYY or MM/DD/YYYY to YYYY-MM-DD
            parts = value.split('/')
            if len(parts) == 3:
                # Assume MM/DD/YYYY format (adjust if needed)
                return f"'{parts[2]}-{parts[0]}-{parts[1]}'"
        return f"'{value}'"
    
    # Handle text types (default)
    escaped = escape_sql_string(value)
    return f"'{escaped}'"


def convert_csv_to_sql(
    csv_file: str,
    table_name: str,
    columns: List[str],
    column_types: Dict[str, str] = None,
    use_on_conflict: bool = True,
    conflict_columns: List[str] = None
) -> str:
    """
    Convert CSV to SQL INSERT statements
    
    Args:
        csv_file: Path to CSV file
        table_name: Target database table name
        columns: List of column names in order
        column_types: Dict mapping column names to types (text, integer, decimal, date, boolean)
        use_on_conflict: Whether to add ON CONFLICT clause
        conflict_columns: Columns for ON CONFLICT clause
    """
    if column_types is None:
        column_types = {}
    
    sql_lines = []
    sql_lines.append(f"-- Generated SQL for {table_name}")
    sql_lines.append(f"-- Source: {csv_file}")
    sql_lines.append("")
    sql_lines.append(f"INSERT INTO {table_name} ({', '.join(columns)})")
    sql_lines.append("VALUES")
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = []
            row_count = 0
            
            for row in reader:
                values = []
                for col in columns:
                    # Get value from CSV (case-insensitive match)
                    csv_value = None
                    for key in row.keys():
                        if key.strip().lower() == col.lower():
                            csv_value = row[key]
                            break
                    
                    if csv_value is None:
                        csv_value = ''
                    
                    # Get column type
                    col_type = column_types.get(col, 'text')
                    formatted_value = format_sql_value(csv_value, col_type)
                    values.append(formatted_value)
                
                rows.append(f"  ({', '.join(values)})")
                row_count += 1
            
            sql_lines.append(',\n'.join(rows))
            
            if use_on_conflict and conflict_columns:
                sql_lines.append(f"ON CONFLICT ({', '.join(conflict_columns)}) DO UPDATE SET")
                update_clauses = []
                for col in columns:
                    if col not in conflict_columns:
                        update_clauses.append(f"  {col} = EXCLUDED.{col}")
                sql_lines.append(',\n'.join(update_clauses))
                sql_lines.append("  updated_at = NOW();")
            elif use_on_conflict:
                sql_lines.append("ON CONFLICT DO NOTHING;")
            else:
                sql_lines.append(";")
            
            sql_lines.append("")
            sql_lines.append(f"-- Total rows: {row_count}")
    
    except FileNotFoundError:
        return f"Error: File '{csv_file}' not found"
    except Exception as e:
        return f"Error: {str(e)}"
    
    return '\n'.join(sql_lines)


def main():
    parser = argparse.ArgumentParser(
        description='Convert CSV files to SQL INSERT statements',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic conversion
  python csv_to_sql.py customers.csv customers "client_name,branch,sku"
  
  # With output file
  python csv_to_sql.py customers.csv customers "client_name,branch,sku" -o customers_import.sql
  
  # With column types
  python csv_to_sql.py transactions.csv sales_transactions "amount,quantity,transaction_date" --types "amount:decimal,quantity:integer,transaction_date:date"
        """
    )
    
    parser.add_argument('csv_file', help='Path to CSV file')
    parser.add_argument('table_name', help='Target database table name')
    parser.add_argument('columns', help='Comma-separated list of column names')
    parser.add_argument('-o', '--output', help='Output SQL file (default: stdout)')
    parser.add_argument('--types', help='Column types: "col1:type1,col2:type2" (types: text, integer, decimal, date, boolean)')
    parser.add_argument('--no-conflict', action='store_true', help='Do not add ON CONFLICT clause')
    parser.add_argument('--conflict-cols', help='Columns for ON CONFLICT clause (comma-separated)')
    
    args = parser.parse_args()
    
    # Parse columns
    columns = [col.strip() for col in args.columns.split(',')]
    
    # Parse column types
    column_types = {}
    if args.types:
        for type_spec in args.types.split(','):
            if ':' in type_spec:
                col, col_type = type_spec.split(':')
                column_types[col.strip()] = col_type.strip()
    
    # Parse conflict columns
    conflict_columns = None
    if args.conflict_cols:
        conflict_columns = [col.strip() for col in args.conflict_cols.split(',')]
    
    # Generate SQL
    sql = convert_csv_to_sql(
        args.csv_file,
        args.table_name,
        columns,
        column_types,
        use_on_conflict=not args.no_conflict,
        conflict_columns=conflict_columns
    )
    
    # Output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(sql)
        print(f"SQL written to {args.output}")
    else:
        print(sql)


if __name__ == '__main__':
    main()
