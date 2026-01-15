# Enhanced Search & Filtering System

A comprehensive search and filtering solution for the Aamodha Operations Portal, providing advanced search capabilities across all application modules.

## Features

✅ **Multi-Field Search** - Search across all fields in any module  
✅ **Real-Time Results** - Instant search results as you type  
✅ **Saved Filters** - Save and reuse filter combinations  
✅ **Full-Text Search** - PostgreSQL-powered text search with highlighting  
✅ **Bulk Operations** - Batch update, delete, archive, and export  
✅ **Cross-Module Search** - Search across multiple modules simultaneously  
✅ **Advanced Operators** - Field-specific search operators  
✅ **Faceted Search** - Dynamic filter suggestions based on results  

## Quick Start

### 1. Run Database Migrations

```bash
# Apply the migrations in Supabase SQL Editor or via CLI
supabase migration up
```

Migrations:
- `20250110000000_create_saved_filters_table.sql`
- `20250110000001_create_fulltext_search_indexes.sql`

### 2. Import Components

```tsx
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { FilterPanel } from '@/components/search/FilterPanel';
import { BulkOperations } from '@/components/search/BulkOperations';
```

### 3. Use in Your Component

```tsx
const MyComponent = () => {
  const { results, isLoading } = useAdvancedSearch({
    module: 'sales_transactions',
  });

  return (
    <div>
      <AdvancedSearch module="sales_transactions" />
      {/* Your table/list with results.data */}
    </div>
  );
};
```

## Documentation

- [**System Guide**](./SEARCH_SYSTEM_GUIDE.md) - Complete usage guide
- [**API Reference**](./API_REFERENCE.md) - API documentation
- [**Architecture**](./ARCHITECTURE.md) - System architecture
- [**Integration Example**](./INTEGRATION_EXAMPLE.md) - Step-by-step integration

## Components

### AdvancedSearch
Real-time search input with instant results.

```tsx
<AdvancedSearch
  module="sales_transactions"
  placeholder="Search transactions..."
  showFilters={true}
  showSort={true}
/>
```

### FilterPanel
Advanced filtering with saved filters support.

```tsx
<FilterPanel
  module="sales_transactions"
  onFiltersChange={(filters) => console.log(filters)}
/>
```

### BulkOperations
Batch operations on selected records.

```tsx
<BulkOperations
  module="sales_transactions"
  records={data}
  onSelectionChange={setSelectedIds}
/>
```

## Hooks

### useAdvancedSearch
Main search hook with debouncing and real-time updates.

```tsx
const {
  results,
  searchText,
  setSearchText,
  isLoading,
  setFilters,
  clearFilters,
} = useAdvancedSearch({
  module: 'sales_transactions',
  debounceMs: 300,
});
```

### useSavedFilters
Manage saved filter combinations.

```tsx
const {
  savedFilters,
  saveFilter,
  deleteFilter,
  duplicateFilter,
} = useSavedFilters('sales_transactions');
```

## Search Syntax

### Simple Search
```
john doe
```

### Field-Specific Search
```
status:active
date:>2024-01-01
amount:>1000
```

### Combined Search
```
status:active date:>2024-01-01 amount:>1000
```

## Supported Modules

- `sales_transactions` - Sales and payment records
- `orders` - Order management
- `customers` - Customer database
- `user_management` - User accounts
- `factory_payables` - Factory transactions
- `transport_expenses` - Transport costs
- `label_purchases` - Label procurement
- `label_payments` - Label payments
- `adjustments` - Adjustments
- `sku_configurations` - SKU settings
- `factory_pricing` - Factory pricing

## Examples

See [Integration Example](./INTEGRATION_EXAMPLE.md) for complete examples.

## Performance

- **Debouncing**: 300ms default (configurable)
- **Pagination**: 50 items per page (configurable)
- **Caching**: 30s stale time via React Query
- **Indexes**: Full-text GIN indexes on all searchable fields

## Support

For issues or questions:
1. Check the [System Guide](./SEARCH_SYSTEM_GUIDE.md)
2. Review [API Reference](./API_REFERENCE.md)
3. See [Integration Example](./INTEGRATION_EXAMPLE.md)

## License

Internal use - Aamodha Enterprises
