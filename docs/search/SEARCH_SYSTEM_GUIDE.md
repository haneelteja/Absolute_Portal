# Enhanced Search & Filtering System Guide

## Overview

The Enhanced Search & Filtering System provides comprehensive search capabilities across all application modules with advanced features including:

- **Multi-field search** with real-time results
- **Saved filter combinations** for quick access
- **Full-text search** using PostgreSQL
- **Bulk operations** for batch processing
- **Cross-module search** capabilities

## Architecture

### Components

1. **SearchService** (`src/lib/search/searchService.ts`)
   - Core search functionality
   - Full-text search implementation
   - Filter application
   - Faceted search support

2. **SavedFiltersService** (`src/lib/search/savedFiltersService.ts`)
   - Save/load filter combinations
   - Share filters across teams
   - Default filters per module

3. **BulkOperationsService** (`src/lib/search/bulkOperationsService.ts`)
   - Execute bulk updates/deletes
   - Track operation progress
   - Error handling and rollback

### Hooks

1. **useAdvancedSearch** (`src/hooks/useAdvancedSearch.ts`)
   - Debounced search queries
   - Real-time result updates
   - Filter management

2. **useSavedFilters** (`src/hooks/useSavedFilters.ts`)
   - Load saved filters
   - Save/update/delete filters
   - Default filter management

### UI Components

1. **AdvancedSearch** (`src/components/search/AdvancedSearch.tsx`)
   - Search input with real-time results
   - Sort controls
   - Quick filter access

2. **FilterPanel** (`src/components/search/FilterPanel.tsx`)
   - Multi-condition filters
   - Saved filters management
   - Filter operators

3. **BulkOperations** (`src/components/search/BulkOperations.tsx`)
   - Multi-select interface
   - Bulk action buttons
   - Progress tracking

## Database Schema

### saved_filters Table

```sql
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(100) NOT NULL,
  filter JSONB NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### bulk_operations Table

```sql
CREATE TABLE bulk_operations (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_ids UUID[] NOT NULL,
  payload JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

## Usage Examples

### Basic Search Integration

```tsx
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';

const MyComponent = () => {
  const {
    results,
    searchText,
    setSearchText,
    isLoading,
  } = useAdvancedSearch({
    module: 'sales_transactions',
  });

  return (
    <div>
      <AdvancedSearch module="sales_transactions" />
      {isLoading && <div>Loading...</div>}
      {results?.data.map(item => (
        <div key={item.id}>{/* Render item */}</div>
      ))}
    </div>
  );
};
```

### Advanced Filtering

```tsx
import { FilterPanel } from '@/components/search/FilterPanel';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';

const MyComponent = () => {
  const {
    addFilterCondition,
    removeFilterCondition,
    updateFilterCondition,
    results,
  } = useAdvancedSearch({
    module: 'orders',
  });

  return (
    <div className="grid grid-cols-4">
      <div className="col-span-1">
        <FilterPanel module="orders" />
      </div>
      <div className="col-span-3">
        {/* Display filtered results */}
      </div>
    </div>
  );
};
```

### Bulk Operations

```tsx
import { BulkOperations, BulkSelectCheckbox } from '@/components/search/BulkOperations';

const MyComponent = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const records = [/* your records */];

  return (
    <div>
      <BulkOperations
        module="sales_transactions"
        records={records}
        onSelectionChange={setSelectedIds}
      />
      
      <Table>
        {records.map(record => (
          <TableRow key={record.id}>
            <TableCell>
              <BulkSelectCheckbox
                recordId={record.id}
                isSelected={selectedIds.includes(record.id)}
                onSelect={(id) => {
                  setSelectedIds(prev => 
                    prev.includes(id) 
                      ? prev.filter(i => i !== id)
                      : [...prev, id]
                  );
                }}
              />
            </TableCell>
            {/* Other cells */}
          </TableRow>
        ))}
      </Table>
    </div>
  );
};
```

## Search Operators

### Text Fields
- `equals` - Exact match
- `not_equals` - Not equal
- `contains` - Contains substring
- `not_contains` - Does not contain
- `starts_with` - Starts with
- `ends_with` - Ends with
- `is_null` - Is null
- `is_not_null` - Is not null

### Number/Date Fields
- `equals`, `not_equals`
- `greater_than` - Greater than
- `less_than` - Less than
- `greater_than_or_equal` - >=
- `less_than_or_equal` - <=
- `between` - Between two values
- `is_null`, `is_not_null`

### Select Fields
- `equals`, `not_equals`
- `in` - Value in array
- `not_in` - Value not in array
- `is_null`, `is_not_null`

## Search Query Syntax

### Field-Specific Search

Use the format `field:value` in the search box:

- `status:active` - Find records with status = active
- `date:>2024-01-01` - Find records after date
- `amount:>1000` - Find records with amount > 1000

### Full-Text Search

Regular text search automatically searches across all searchable fields:

- `"john doe"` - Searches for exact phrase
- `john OR doe` - Searches for john OR doe
- `john -doe` - Searches for john but not doe

## Performance Optimization

### Indexes

Full-text search indexes are created for optimal performance:

```sql
-- Example index for sales_transactions
CREATE INDEX idx_sales_transactions_fts_combined 
  ON sales_transactions USING GIN(
    to_tsvector('english', 
      COALESCE(sku, '') || ' ' || COALESCE(description, '')
    )
  );
```

### Debouncing

Search queries are automatically debounced (300ms default) to reduce database load.

### Pagination

Results are paginated by default (50 items per page) to improve performance.

## API Reference

### SearchService

```typescript
// Single module search
const results = await SearchService.search<SalesTransaction>({
  query: 'search text',
  filters: { conditions: [...], logic: 'AND', module: 'sales_transactions' },
  page: 1,
  pageSize: 50,
}, 'sales_transactions');

// Cross-module search
const results = await SearchService.searchAcrossModules({
  query: 'search text',
}, ['sales_transactions', 'orders', 'customers']);
```

### SavedFiltersService

```typescript
// Save filter
const saved = await SavedFiltersService.saveFilter(
  'My Filter',
  'sales_transactions',
  filterObject,
  { userId: '...', isShared: false }
);

// Load filters
const filters = await SavedFiltersService.getSavedFilters('sales_transactions', userId);
```

### BulkOperationsService

```typescript
// Bulk update
const result = await BulkOperationsService.executeBulkUpdate(
  'sales_transactions',
  ['id1', 'id2', 'id3'],
  { status: 'archived' }
);

// Bulk delete
const result = await BulkOperationsService.executeBulkDelete(
  'orders',
  ['id1', 'id2']
);
```

## Migration Guide

### Step 1: Run Database Migrations

```bash
# Apply migrations
supabase migration up
```

Or manually run:
- `supabase/migrations/20250110000000_create_saved_filters_table.sql`
- `supabase/migrations/20250110000001_create_fulltext_search_indexes.sql`

### Step 2: Update Component

Replace existing search/filter logic with new components:

```tsx
// Before
const [searchTerm, setSearchTerm] = useState('');
const filtered = data.filter(item => 
  item.name.includes(searchTerm)
);

// After
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';

const { results } = useAdvancedSearch({ module: 'sales_transactions' });
```

### Step 3: Add Bulk Operations (Optional)

```tsx
import { BulkOperations } from '@/components/search/BulkOperations';

<BulkOperations
  module="sales_transactions"
  records={results?.data || []}
  onSelectionChange={setSelectedIds}
/>
```

## Troubleshooting

### Search Not Working

1. Check if full-text indexes are created:
   ```sql
   SELECT * FROM pg_indexes WHERE indexname LIKE '%fts%';
   ```

2. Verify RLS policies allow search:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```

### Saved Filters Not Loading

1. Check user authentication
2. Verify `saved_filters` table exists
3. Check RLS policies for `saved_filters`

### Bulk Operations Failing

1. Verify user has permissions
2. Check RLS policies for target table
3. Review error logs in `bulk_operations.errors`

## Best Practices

1. **Use debouncing** - Already implemented in `useAdvancedSearch`
2. **Limit result size** - Use pagination (default 50 items)
3. **Index frequently searched fields** - Full-text indexes are pre-configured
4. **Save common filters** - Encourage users to save frequently used filters
5. **Monitor performance** - Check query execution times in Supabase dashboard

## Future Enhancements

- [ ] Elasticsearch integration for advanced search
- [ ] Search result caching
- [ ] Search analytics and insights
- [ ] AI-powered search suggestions
- [ ] Voice search support
- [ ] Search history and recent searches
