# Enhanced Search & Filtering System - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ AdvancedSearch│  │ FilterPanel  │  │ BulkOperations│   │
│  │  Component    │  │  Component   │  │  Component    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│  ┌─────────────────────────┴─────────────────────────┐     │
│  │              React Hooks Layer                     │     │
│  │  ┌────────────────┐  ┌──────────────────┐        │     │
│  │  │useAdvancedSearch│  │ useSavedFilters │        │     │
│  │  └────────────────┘  └──────────────────┘        │     │
│  └───────────────────────────────────────────────────┘     │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                      Service Layer                         │
├────────────────────────────┼────────────────────────────────┤
│                            │                                │
│  ┌─────────────────────────┴─────────────────────────┐     │
│  │  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │SearchService │  │SavedFilters  │              │     │
│  │  │              │  │Service       │              │     │
│  │  └──────────────┘  └──────────────┘              │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────────┐    │     │
│  │  │      BulkOperationsService               │    │     │
│  │  └──────────────────────────────────────────┘    │     │
│  └───────────────────────────────────────────────────┘     │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Database Layer                           │
├────────────────────────────┼────────────────────────────────┤
│                            │                                │
│  ┌─────────────────────────┴─────────────────────────┐     │
│  │  Supabase / PostgreSQL                             │     │
│  │                                                    │     │
│  │  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │ Business     │  │ saved_filters│              │     │
│  │  │ Tables       │  │ bulk_operations│            │     │
│  │  │ (sales,      │  │                              │     │
│  │  │  orders, etc)│  │                              │     │
│  │  └──────────────┘  └──────────────┘              │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────────┐    │     │
│  │  │  Full-Text Search Indexes (GIN)          │    │     │
│  │  │  - tsvector indexes for text search      │    │     │
│  │  │  - Composite indexes for filters         │    │     │
│  │  └──────────────────────────────────────────┘    │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Search Flow

```
User Input → AdvancedSearch Component
    ↓
useAdvancedSearch Hook (debounced)
    ↓
SearchService.search()
    ↓
Supabase Query Builder
    ↓
PostgreSQL with Full-Text Indexes
    ↓
Results → React Query Cache
    ↓
Component Re-render with Results
```

### Filter Flow

```
User Adds Filter → FilterPanel Component
    ↓
useAdvancedSearch.addFilterCondition()
    ↓
SearchService.search() with filters
    ↓
Supabase Query with WHERE clauses
    ↓
Filtered Results
```

### Saved Filters Flow

```
User Saves Filter → FilterPanel
    ↓
useSavedFilters.saveFilter()
    ↓
SavedFiltersService.saveFilter()
    ↓
Insert into saved_filters table
    ↓
Load on next visit
```

### Bulk Operations Flow

```
User Selects Records → BulkOperations Component
    ↓
User Triggers Action → BulkOperationsService
    ↓
Create bulk_operations record
    ↓
Execute operations in batches
    ↓
Update progress in real-time
    ↓
Complete and log results
```

## Component Hierarchy

```
App
└── PortalRouter
    └── Index
        └── Module Components (SalesEntry, Orders, etc.)
            ├── AdvancedSearch
            ├── FilterPanel (Sidebar/Collapsible)
            ├── BulkOperations
            └── Data Table/List
                └── BulkSelectCheckbox (per row)
```

## State Management

### Search State
- Managed by `useAdvancedSearch` hook
- Stored in React Query cache
- Debounced to reduce API calls
- URL-serializable for bookmarking

### Filter State
- Stored in `SearchFilter` object
- Conditions array with logic (AND/OR)
- Persisted in `saved_filters` table
- Loaded on component mount

### Selection State
- Managed locally in component
- `Set<string>` for selected record IDs
- Passed to BulkOperations component
- Cleared after operation completion

## Database Schema

### saved_filters
```sql
- id: UUID (PK)
- name: VARCHAR(255)
- description: TEXT
- module: VARCHAR(100)
- filter: JSONB (SearchFilter object)
- is_shared: BOOLEAN
- is_default: BOOLEAN
- created_by: UUID (FK → auth.users)
- tags: TEXT[]
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### bulk_operations
```sql
- id: UUID (PK)
- type: VARCHAR(50) (update|delete|archive|export|assign)
- module: VARCHAR(100)
- record_ids: UUID[]
- payload: JSONB
- status: VARCHAR(50) (pending|processing|completed|failed)
- progress: INTEGER (0-100)
- errors: JSONB (Array of {recordId, error})
- created_by: UUID (FK → auth.users)
- created_at: TIMESTAMP
- completed_at: TIMESTAMP
```

## Indexes

### Full-Text Search Indexes
- GIN indexes on text fields using `to_tsvector`
- Composite indexes for multi-field search
- Optimized for English language

### Performance Indexes
- Indexes on filterable fields (status, dates, amounts)
- Composite indexes for common filter combinations
- Indexes on foreign keys for joins

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only see their own saved filters
- Shared filters visible to all authenticated users
- Bulk operations tracked per user

### Access Control
- Search respects RLS policies
- Filters applied after RLS checks
- Bulk operations require proper permissions
- Audit trail for all bulk operations

## Performance Optimizations

1. **Debouncing**: 300ms delay on search input
2. **Pagination**: 50 items per page default
3. **Caching**: React Query with 30s stale time
4. **Indexes**: Full-text and composite indexes
5. **Selective Queries**: Only fetch required fields
6. **Batch Operations**: Process bulk operations in batches

## Scalability Considerations

1. **Database Indexes**: All searchable fields indexed
2. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
3. **Caching Strategy**: React Query + potential Redis layer
4. **Pagination**: Always paginate large result sets
5. **Async Processing**: Bulk operations can be queued

## Future Enhancements

1. **Elasticsearch Integration**: For advanced search features
2. **Search Analytics**: Track popular searches
3. **AI Suggestions**: ML-powered search suggestions
4. **Real-time Updates**: WebSocket for live search results
5. **Search History**: Track and suggest recent searches
