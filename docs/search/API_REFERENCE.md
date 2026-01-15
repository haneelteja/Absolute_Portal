# Enhanced Search & Filtering System - API Reference

## RESTful API Endpoints

### Search Endpoints

#### POST /api/search
Perform a search query across one or more modules.

**Request Body:**
```json
{
  "query": "search text",
  "module": "sales_transactions",
  "filters": {
    "conditions": [
      {
        "field": "status",
        "operator": "equals",
        "value": "active"
      }
    ],
    "logic": "AND"
  },
  "sortBy": "created_at",
  "sortOrder": "desc",
  "page": 1,
  "pageSize": 50,
  "highlight": true
}
```

**Response:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 50,
  "totalPages": 3,
  "highlights": {
    "0": ["sku: <mark>P 500 ML</mark>"]
  }
}
```

#### POST /api/search/cross-module
Search across multiple modules simultaneously.

**Request Body:**
```json
{
  "query": "john",
  "modules": ["customers", "user_management", "orders"],
  "page": 1,
  "pageSize": 20
}
```

**Response:**
```json
{
  "sales_transactions": {
    "data": [...],
    "total": 10
  },
  "orders": {
    "data": [...],
    "total": 5
  },
  "customers": {
    "data": [...],
    "total": 3
  }
}
```

#### GET /api/search/facets?module=sales_transactions&fields=status,transaction_type
Get facet counts for specified fields.

**Response:**
```json
[
  {
    "field": "status",
    "values": [
      { "value": "active", "count": 45 },
      { "value": "inactive", "count": 12 }
    ]
  }
]
```

### Saved Filters Endpoints

#### GET /api/saved-filters?module=sales_transactions
Get all saved filters for the current user.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Active Sales This Month",
    "description": "Shows active sales from current month",
    "module": "sales_transactions",
    "filter": {
      "conditions": [...],
      "logic": "AND"
    },
    "is_shared": false,
    "is_default": true,
    "tags": ["sales", "monthly"],
    "created_at": "2025-01-10T...",
    "updated_at": "2025-01-10T..."
  }
]
```

#### POST /api/saved-filters
Save a new filter.

**Request Body:**
```json
{
  "name": "My Filter",
  "description": "Optional description",
  "module": "sales_transactions",
  "filter": {
    "conditions": [...],
    "logic": "AND"
  },
  "is_shared": false,
  "is_default": false,
  "tags": ["tag1", "tag2"]
}
```

#### PUT /api/saved-filters/:id
Update an existing filter.

#### DELETE /api/saved-filters/:id
Delete a saved filter.

#### POST /api/saved-filters/:id/duplicate
Duplicate a saved filter.

### Bulk Operations Endpoints

#### POST /api/bulk-operations
Create and execute a bulk operation.

**Request Body:**
```json
{
  "type": "update",
  "module": "sales_transactions",
  "recordIds": ["id1", "id2", "id3"],
  "payload": {
    "status": "archived"
  }
}
```

**Response:**
```json
{
  "id": "operation-uuid",
  "status": "processing",
  "progress": 0
}
```

#### GET /api/bulk-operations/:id
Get bulk operation status.

**Response:**
```json
{
  "id": "operation-uuid",
  "type": "update",
  "status": "completed",
  "progress": 100,
  "success": 3,
  "failed": 0,
  "errors": []
}
```

## TypeScript API

### SearchService

```typescript
import { SearchService } from '@/lib/search/searchService';

// Single module search
const results = await SearchService.search<SalesTransaction>({
  query: 'search text',
  filters: {
    conditions: [
      { field: 'status', operator: 'equals', value: 'active' }
    ],
    logic: 'AND',
    module: 'sales_transactions'
  },
  page: 1,
  pageSize: 50
}, 'sales_transactions');

// Cross-module search
const crossModuleResults = await SearchService.searchAcrossModules({
  query: 'john',
  page: 1,
  pageSize: 20
}, ['customers', 'user_management']);

// Get facets
const facets = await SearchService.getFacets(
  'sales_transactions',
  ['status', 'transaction_type'],
  filters
);
```

### SavedFiltersService

```typescript
import { SavedFiltersService } from '@/lib/search/savedFiltersService';

// Get saved filters
const filters = await SavedFiltersService.getSavedFilters('sales_transactions', userId);

// Save filter
const saved = await SavedFiltersService.saveFilter(
  'My Filter',
  'sales_transactions',
  filterObject,
  {
    userId: '...',
    description: 'Optional description',
    isShared: false,
    isDefault: false,
    tags: ['tag1']
  }
);

// Update filter
await SavedFiltersService.updateFilter(filterId, {
  name: 'Updated Name',
  isDefault: true
});

// Delete filter
await SavedFiltersService.deleteFilter(filterId, userId);
```

### BulkOperationsService

```typescript
import { BulkOperationsService } from '@/lib/search/bulkOperationsService';

// Create bulk operation
const operation = await BulkOperationsService.createBulkOperation(
  'update',
  'sales_transactions',
  ['id1', 'id2', 'id3'],
  { status: 'archived' },
  userId
);

// Execute bulk update
const result = await BulkOperationsService.executeBulkUpdate(
  'sales_transactions',
  ['id1', 'id2'],
  { status: 'archived' }
);

// Execute bulk delete
const result = await BulkOperationsService.executeBulkDelete(
  'orders',
  ['id1', 'id2', 'id3']
);

// Execute bulk assign
const result = await BulkOperationsService.executeBulkAssign(
  'orders',
  ['id1', 'id2'],
  { field: 'assigned_to', value: 'user-id' }
);
```

## React Hooks

### useAdvancedSearch

```typescript
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';

const {
  // Results
  results,
  isLoading,
  error,
  refetch,
  
  // Query state
  searchQuery,
  searchText,
  
  // Actions
  setSearchText,
  setFilters,
  addFilterCondition,
  removeFilterCondition,
  updateFilterCondition,
  clearFilters,
  setPage,
  setSort,
  clearSearch,
} = useAdvancedSearch({
  module: 'sales_transactions',
  enabled: true,
  debounceMs: 300,
  defaultFilters: {...},
  onResultsChange: (results) => {
    console.log('Results updated:', results);
  }
});
```

### useSavedFilters

```typescript
import { useSavedFilters } from '@/hooks/useSavedFilters';

const {
  savedFilters,
  defaultFilter,
  isLoading,
  saveFilter,
  updateFilter,
  deleteFilter,
  duplicateFilter,
  isSaving,
  isUpdating,
  isDeleting,
} = useSavedFilters('sales_transactions');

// Save a filter
saveFilter({
  name: 'My Filter',
  module: 'sales_transactions',
  filter: filterObject,
  description: 'Optional',
  isShared: false,
  isDefault: false,
});

// Update filter
updateFilter({
  id: filterId,
  updates: { name: 'New Name' }
});

// Delete filter
deleteFilter(filterId);

// Duplicate filter
duplicateFilter({ id: filterId, newName: 'Copy of Filter' });
```

## Search Query Examples

### Simple Text Search
```typescript
{
  query: "john doe",
  module: "customers"
}
```

### Field-Specific Search
```typescript
{
  query: "status:active date:>2024-01-01",
  module: "sales_transactions"
}
```

### Complex Filters
```typescript
{
  filters: {
    conditions: [
      { field: "status", operator: "equals", value: "active" },
      { field: "amount", operator: "greater_than", value: 1000 },
      { field: "transaction_date", operator: "between", value: "2024-01-01", value2: "2024-12-31" }
    ],
    logic: "AND",
    module: "sales_transactions"
  }
}
```

### OR Logic Filters
```typescript
{
  filters: {
    conditions: [
      { field: "status", operator: "equals", value: "active" },
      { field: "status", operator: "equals", value: "pending" }
    ],
    logic: "OR",
    module: "orders"
  }
}
```

## Performance Considerations

### Indexing Strategy

Full-text search indexes are automatically created for:
- Text fields (sku, description, names, etc.)
- Combined fields for multi-field search

### Query Optimization

1. **Debouncing**: Search queries are debounced (300ms default)
2. **Pagination**: Results are paginated (50 items default)
3. **Caching**: React Query caches results for 30 seconds
4. **Selective Fields**: Only fetch required fields

### Best Practices

1. Use specific field searches when possible (`field:value`)
2. Limit filter conditions (prefer < 5 conditions)
3. Use saved filters for frequently used combinations
4. Enable highlighting only when needed
5. Use facets for dynamic filtering

## Error Handling

All services return proper error objects:

```typescript
try {
  const results = await SearchService.search(query, module);
} catch (error) {
  if (error instanceof Error) {
    console.error('Search failed:', error.message);
  }
}
```

Hooks provide error state:

```typescript
const { results, error, isLoading } = useAdvancedSearch({ module });

if (error) {
  return <div>Error: {error.message}</div>;
}
```
