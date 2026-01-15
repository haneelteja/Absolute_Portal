# Quick Start Guide - Enhanced Search & Filtering

Get up and running with the Enhanced Search & Filtering System in 5 minutes.

## Step 1: Run Database Migrations (2 minutes)

Open Supabase SQL Editor and run:

```sql
-- Migration 1: Create saved_filters and bulk_operations tables
-- File: supabase/migrations/20250110000000_create_saved_filters_table.sql

-- Migration 2: Create full-text search indexes
-- File: supabase/migrations/20250110000001_create_fulltext_search_indexes.sql
```

Or use Supabase CLI:
```bash
supabase migration up
```

## Step 2: Add Search to Your Component (3 minutes)

### Minimal Integration

```tsx
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';

const MyComponent = () => {
  const { results, isLoading } = useAdvancedSearch({
    module: 'sales_transactions', // Change to your module
  });

  return (
    <div>
      <AdvancedSearch module="sales_transactions" />
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {results?.data.map(item => (
            <div key={item.id}>{/* Render item */}</div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Full Integration (with Filters & Bulk Operations)

```tsx
import { 
  AdvancedSearch, 
  FilterPanel, 
  BulkOperations 
} from '@/components/search';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';

const MyComponent = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { results } = useAdvancedSearch({
    module: 'sales_transactions',
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <AdvancedSearch module="sales_transactions" />
      
      <div className="grid grid-cols-4 gap-4">
        {/* Filters Sidebar */}
        <div className="col-span-1">
          <FilterPanel module="sales_transactions" />
        </div>
        
        {/* Results */}
        <div className="col-span-3">
          <BulkOperations
            module="sales_transactions"
            records={results?.data || []}
            onSelectionChange={setSelectedIds}
          />
          
          {/* Your table/list */}
        </div>
      </div>
    </div>
  );
};
```

## Step 3: Test It Out

1. **Basic Search**: Type in the search box - results update in real-time
2. **Field Search**: Try `status:active` or `date:>2024-01-01`
3. **Filters**: Click "Add Filter" to add filter conditions
4. **Save Filter**: Click "Save" to save your filter combination
5. **Bulk Operations**: Select multiple records and use bulk actions

## Common Use Cases

### Search by Customer Name
```
Type: "Elma Manufacturing"
```

### Search with Date Range
```
Type: "date:>2024-01-01 date:<2024-12-31"
Or use filters: Add date filter with "between" operator
```

### Search Active Records
```
Type: "status:active"
Or use filter: Add status filter = "active"
```

### Save Common Filter
1. Add filters (e.g., status=active, date>this month)
2. Click "Save Filter"
3. Name it "Active This Month"
4. Next time, click the saved filter to apply instantly

### Bulk Update Status
1. Select multiple records using checkboxes
2. Click "Update" in bulk operations bar
3. Choose field and value
4. Confirm - all selected records update

## Troubleshooting

### Search Not Working?
- ✅ Check database migrations ran successfully
- ✅ Verify RLS policies allow search
- ✅ Check browser console for errors

### Filters Not Saving?
- ✅ Verify `saved_filters` table exists
- ✅ Check user is authenticated
- ✅ Verify RLS policies for saved_filters

### Slow Searches?
- ✅ Check full-text indexes are created
- ✅ Verify you're not searching too many fields
- ✅ Use specific field searches when possible

## Next Steps

1. **Customize**: Adjust search configs in `src/types/search.ts`
2. **Style**: Customize component styles to match your theme
3. **Extend**: Add custom search operators if needed
4. **Optimize**: Monitor performance and adjust indexes

## Need Help?

- 📖 [Full System Guide](./SEARCH_SYSTEM_GUIDE.md)
- 📚 [API Reference](./API_REFERENCE.md)
- 🏗️ [Architecture](./ARCHITECTURE.md)
- 💡 [Integration Examples](./INTEGRATION_EXAMPLE.md)

---

**Ready to use!** The search system is fully implemented and ready for integration.
