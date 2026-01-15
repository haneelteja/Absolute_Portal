# Integration Example - Adding Search to SalesEntry Component

This guide shows how to integrate the Enhanced Search & Filtering System into the existing SalesEntry component.

## Step 1: Import Required Components

```tsx
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { FilterPanel } from '@/components/search/FilterPanel';
import { BulkOperations, BulkSelectCheckbox } from '@/components/search/BulkOperations';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
```

## Step 2: Replace Direct Queries with Search Hook

### Before:
```tsx
const { data: transactions } = useQuery({
  queryKey: ["sales-transactions"],
  queryFn: async () => {
    const { data } = await supabase
      .from("sales_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });
    return data;
  },
});
```

### After:
```tsx
const {
  results,
  searchText,
  setSearchText,
  isLoading: isSearching,
} = useAdvancedSearch({
  module: 'sales_transactions',
  defaultFilters: {
    conditions: [],
    logic: 'AND',
    module: 'sales_transactions',
  },
});

// Use results.data instead of direct query data
const transactions = results?.data || [];
```

## Step 3: Add Search UI Components

```tsx
return (
  <div className="space-y-6">
    {/* Search Bar */}
    <Card>
      <CardHeader>
        <CardTitle>Search Sales Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <AdvancedSearch
          module="sales_transactions"
          placeholder="Search by customer, SKU, description..."
          showFilters={true}
          showSort={true}
        />
      </CardContent>
    </Card>

    {/* Main Content with Filters */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filter Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <FilterPanel module="sales_transactions" />
          </CardContent>
        </Card>
      </div>

      {/* Results Area */}
      <div className="lg:col-span-3 space-y-4">
        {/* Bulk Operations */}
        <BulkOperations
          module="sales_transactions"
          records={transactions}
          onSelectionChange={(ids) => setSelectedIds(ids)}
        />

        {/* Your existing table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <BulkSelectCheckbox
                  recordId="select-all"
                  isSelected={selectedIds.length === transactions.length}
                  onSelect={() => {
                    // Handle select all
                  }}
                />
              </TableHead>
              {/* Other headers */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <BulkSelectCheckbox
                    recordId={transaction.id}
                    isSelected={selectedIds.includes(transaction.id)}
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
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
);
```

## Step 4: Combine with Existing Filters

If you have existing filters, merge them:

```tsx
const {
  results,
  setFilters,
} = useAdvancedSearch({
  module: 'sales_transactions',
  defaultFilters: {
    conditions: [
      // Merge with existing filters
      ...existingFilters,
      { field: 'transaction_type', operator: 'equals', value: 'sale' }
    ],
    logic: 'AND',
    module: 'sales_transactions',
  },
});
```

## Complete Integration Example

```tsx
import React, { useState } from 'react';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { FilterPanel } from '@/components/search/FilterPanel';
import { BulkOperations, BulkSelectCheckbox } from '@/components/search/BulkOperations';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SalesEntryWithSearch = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    results,
    searchText,
    isLoading,
  } = useAdvancedSearch({
    module: 'sales_transactions',
  });

  const transactions = results?.data || [];

  return (
    <div className="space-y-6 p-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancedSearch
            module="sales_transactions"
            placeholder="Search transactions, customers, SKUs..."
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <FilterPanel module="sales_transactions" />
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {/* Bulk Operations Bar */}
          {selectedIds.length > 0 && (
            <BulkOperations
              module="sales_transactions"
              records={transactions}
              onSelectionChange={setSelectedIds}
            />
          )}

          {/* Results Summary */}
          {results && (
            <div className="text-sm text-gray-600">
              Showing {transactions.length} of {results.total} transactions
            </div>
          )}

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <BulkSelectCheckbox
                            recordId={transaction.id}
                            isSelected={selectedIds.includes(transaction.id)}
                            onSelect={(id) => {
                              setSelectedIds(prev =>
                                prev.includes(id)
                                  ? prev.filter(i => i !== id)
                                  : [...prev, id]
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{transaction.customer_id}</TableCell>
                        <TableCell>{transaction.sku}</TableCell>
                        <TableCell>₹{transaction.amount}</TableCell>
                        <TableCell>
                          {/* Action buttons */}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {results && results.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {results.page} of {results.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={results.page === 1}
                  onClick={() => {/* Go to previous page */}}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={results.page === results.totalPages}
                  onClick={() => {/* Go to next page */}}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesEntryWithSearch;
```

## Migration Checklist

- [ ] Run database migrations
- [ ] Import search components
- [ ] Replace direct queries with `useAdvancedSearch`
- [ ] Add `AdvancedSearch` component
- [ ] Add `FilterPanel` component (optional sidebar)
- [ ] Add `BulkOperations` component
- [ ] Add `BulkSelectCheckbox` to table rows
- [ ] Update pagination to use search results
- [ ] Test search functionality
- [ ] Test saved filters
- [ ] Test bulk operations
- [ ] Update any existing filter logic

## Tips

1. **Start Simple**: Add `AdvancedSearch` first, then filters, then bulk operations
2. **Preserve Existing**: Keep existing functionality while adding search
3. **Test Incrementally**: Test each feature as you add it
4. **User Training**: Provide tooltips/help for advanced search features
5. **Performance**: Monitor query performance, adjust indexes if needed
